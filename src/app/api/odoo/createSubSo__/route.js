// src/app/api/odoo/createSubSo/route.js
import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { getCookie } from "@/lib/cookies";

import {
    // error handling
    OdooError,
    classifyOdooError,
    // rpc
    callOdoo,
    getModelFieldSet,
    ODOO_ROOT,
    // value helpers
    ensureInt,
    m2oId,
    itemVariantId,
    itemQty,
    // session
    getSessionUid,
    assertSessionActive,
    getSessionUserName,
    // products / lines
    ensureProductProductIds,
    buildLineDescriptionFromVariables,
    // sale order
    findReferenceSO,
    readProjectCore,
    assertSaleOrderCreatable,
    tryUpdatePrices,
    // delivery
    fetchPickingsForSaleOrder,
    fulfillPickings,
    // notes
    postSaleOrderNote,
    buildNoteHtml,
    // phase / livraison
    getM2ORelationModel,
    checkLivraisonTask,
    
} from "./lib/index.js";
import { handleImosItems } from "./lib/imosHandler.js";

export const runtime = "nodejs";

/** Safe JSON stringify for logs. */
const safe = (obj) => {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
};

function log(...a) {
    console.log("[/api/createSubSO]", ...a);
}

export async function OPTIONS(request) {
    return handleCorsPreflight(request);
}

/**
 * POST /api/odoo/createSubSo
 *
 * Required: project_id, items[] (each with product_variant_id), commitment_date (YYYY-MM-DD)
 * Optional: phase_id, company_id, confirm, sub_so, notes, shipping_partner_id, ...
 */
export async function POST(req) {
    const corsHeaders = getCorsHeaders(req);

    const t0 = Date.now();
    const timings = {};
    const mark = (k) => (timings[k] = Date.now() - t0);

    try {
        const body = await req.json().catch(() => ({}));
        log("Incoming body:", safe(body));
        mark("parsed_body");

        // ── Auth ────────────────────────────────────────────────────────────────
        const session_id = getCookie(req, "session_id");

        if (!session_id) {
            return NextResponse.json(
                { success: false, error: "odoo_session_missing", details: "Missing session_id cookie." },
                { status: 401, headers: corsHeaders }
            );
        }

        // Guard 1: expired Odoo session (cookie present but uid gone)
        const sessionCheck = await assertSessionActive(session_id);
        if (!sessionCheck.active) {
            return NextResponse.json(
                {
                    success: false,
                    error: "odoo_session_expired",
                    details: "Your Odoo session has expired. Please log in again and retry.",
                    meta: { hint: "session_id cookie present but Odoo reports no active uid" },
                },
                { status: 401, headers: corsHeaders }
            );
        }

        // ── Resolve session user name (for employee auto-fill) ─────────────────
        const sessionUser = await getSessionUserName(session_id, sessionCheck.uid);
        const resolvedEmployee = body.employee || body.user_name || sessionUser?.name || "";
        mark("session_user");

        // ── Input validation ────────────────────────────────────────────────────
        const project_id = ensureInt(body.project_id);
        const phase_id = ensureInt(body.phase_id) || false; // optional

        if (!project_id) {
            return NextResponse.json(
                { success: false, error: "Missing/invalid project_id" },
                { status: 400, headers: corsHeaders }
            );
        }

        const items = Array.isArray(body.items) ? body.items : [];
        if (!items.length) {
            return NextResponse.json(
                { success: false, error: "Missing items[]" },
                { status: 400, headers: corsHeaders }
            );
        }

        // ── Split items by routing ───────────────────────────────────────────────
        const odooItems = items.filter(it => String(it.routing || "odoo").toLowerCase() !== "imos");
        const imosItems = items.filter(it => String(it.routing || "").toLowerCase() === "imos");
        log(`Items split: ${odooItems.length} odoo, ${imosItems.length} imos`);

        // commitment_date is REQUIRED and is the ONLY date source
        const commitment_date_raw = body.commitment_date;
        const commitment_date =
            typeof commitment_date_raw === "string"
                ? commitment_date_raw.trim()
                : commitment_date_raw
                    ? String(commitment_date_raw).trim()
                    : "";

        if (!commitment_date) {
            return NextResponse.json(
                { success: false, error: "Missing commitment_date (expected YYYY-MM-DD)" },
                { status: 400, headers: corsHeaders }
            );
        }

        if (!/^\d{4}-\d{2}-\d{2}/.test(commitment_date)) {
            return NextResponse.json(
                { success: false, error: "Invalid commitment_date format (expected YYYY-MM-DD)" },
                { status: 400, headers: corsHeaders }
            );
        }
        // ── IMOS-only fast path ──────────────────────────────────────────────
        // When ALL items are IMOS, skip the Odoo SO creation but still
        // resolve client/origin from the project context for smart XML.
        if (odooItems.length === 0 && imosItems.length > 0) {
            log("All items are IMOS — skipping Odoo SO creation.");
            mark("imos_only");

            // Lightweight context resolution for XML metadata
            let resolvedClient = body.client || body.user_email || "";
            let resolvedOrigin = body.origin || null;
            let resolvedPartnerId = null;

            const imosFastCtx = { lang: "en_US", tz: "Africa/Casablanca", uid: sessionCheck.uid };

            try {
                const imosProject = await readProjectCore(session_id, project_id, imosFastCtx);
                mark("imos_project_read");

                if (imosProject) {
                    const pid = m2oId(imosProject.partner_id);
                    resolvedPartnerId = pid;

                    if (pid && !resolvedClient) {
                        const partnerRows = await callOdoo(session_id, "res.partner", "read",
                            [[pid], ["email", "name"]], { context: imosFastCtx });
                        resolvedClient = partnerRows?.[0]?.email || partnerRows?.[0]?.name || "";
                    }

                    if (!resolvedOrigin) {
                        const ref = await findReferenceSO(session_id, project_id, imosFastCtx);
                        resolvedOrigin = ref?.rec?.name || `Project #${project_id}`;
                    }
                }
            } catch (e) {
                log("IMOS fast path context resolution failed (non-fatal):", e?.message);
            }

            const imos_result = await handleImosItems(imosItems, {
                project_id,
                phase_id,
                commitment_date,
                origin: resolvedOrigin || `Project #${project_id}`,
                partner_id: resolvedPartnerId,
                client: resolvedClient,
                employee: resolvedEmployee,
            });

            mark("done");
            return NextResponse.json(
                {
                    success: true,
                    mode: "imos_only",
                    imos_result,
                    timings,
                },
                { status: 200, headers: corsHeaders }
            );
        }

        // ── Context setup ───────────────────────────────────────────────────────
        const uidFallback = ensureInt(body.user_id) || 447;
        const requestedCompanyId = ensureInt(body.company_id) || false;

        const ctxBase = {
            lang: "en_US",
            tz: "Africa/Casablanca",
            uid: uidFallback,
            params: { model: "sale.order", view_type: "form" },
            bin_size: true,
        };

        const ctxForProjectRead = requestedCompanyId
            ? {
                ...ctxBase,
                allowed_company_ids: [requestedCompanyId],
                force_company: requestedCompanyId,
                current_company_id: requestedCompanyId,
                params: { ...ctxBase.params, cids: requestedCompanyId },
            }
            : ctxBase;

        // ── Project read → derive company ────────────────────────────────────────
        // Guard 2: project ACL — distinguish "not found" from "access denied"
        let project;
        try {
            project = await readProjectCore(session_id, project_id, ctxForProjectRead);
        } catch (err) {
            const c = classifyOdooError(err, { model: "project.project", method: "read", project_id });
            if (c.kind === "access_error") {
                return NextResponse.json(
                    {
                        success: false,
                        error: "odoo_project_access_denied",
                        details:
                            "The project exists but your account has no read access to it. Check ir.model.access or ir.rule for project.project.",
                        meta: { project_id, odoo: c.meta },
                    },
                    { status: 403, headers: corsHeaders }
                );
            }
            throw err; // unknown → outer catch → 500
        }
        mark("project_read");

        if (!project) {
            return NextResponse.json(
                { success: false, error: "Project not found or not accessible", meta: { project_id } },
                { status: 404, headers: corsHeaders }
            );
        }

        const projectCompanyId = m2oId(project.company_id);
        if (!projectCompanyId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Project has no company_id; cannot determine correct company context",
                    meta: { project_id, project_name: project.display_name || null },
                },
                { status: 400, headers: corsHeaders }
            );
        }

        // Always work under the project's company context
        const projectCtx = {
            ...ctxBase,
            allowed_company_ids: [projectCompanyId],
            force_company: projectCompanyId,
            current_company_id: projectCompanyId,
            params: { ...ctxBase.params, cids: projectCompanyId },
        };

        // Guard 3: sale.order CREATE permission (replaces the old read-only fields_get probe)
        const soAccess = await assertSaleOrderCreatable(session_id, projectCtx);
        mark("sale_order_access_check");
        if (!soAccess.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: "odoo_so_create_denied",
                    details:
                        "Your account cannot create sale.order records in this company. Ask admin to grant 'Sales / User' role or equivalent.",
                    meta: {
                        project_id,
                        project_name: project.display_name || null,
                        project_company_id: projectCompanyId,
                        probe_kind: soAccess.kind,
                        odoo_message: soAccess.message,
                    },
                },
                { status: 403, headers: corsHeaders }
            );
        }

        // ── Reference SO ─────────────────────────────────────────────────────────
        const requestedCompanyCtx = requestedCompanyId
            ? {
                ...ctxBase,
                allowed_company_ids: [requestedCompanyId],
                force_company: requestedCompanyId,
                current_company_id: requestedCompanyId,
                params: { ...ctxBase.params, cids: requestedCompanyId },
            }
            : null;

        let ref = requestedCompanyCtx
            ? await findReferenceSO(session_id, project_id, requestedCompanyCtx)
            : null;
        if (!ref) ref = await findReferenceSO(session_id, project_id, projectCtx);
        mark("ref_so");

        if (!ref) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Parent SO not found for this project",
                    details:
                        "No sale.order found with relatedproject_id=project_id in the project's company context. This is a data issue (not a company context issue).",
                    meta: {
                        project_id,
                        project_company_id: projectCompanyId,
                        project_name: project.display_name || null,
                    },
                },
                { status: 404, headers: corsHeaders }
            );
        }

        const refSO = ref.rec;

        // enforce project company context for the entire flow
        const companyId = projectCompanyId;
        const ctx2 = projectCtx;

        // ── Partners / fields from reference SO ──────────────────────────────────
        const partner_id = m2oId(refSO.partner_id);
        const ref_partner_shipping_id = m2oId(refSO.partner_shipping_id) || partner_id;

        if (!partner_id) throw new Error(`Reference SO is missing partner_id. refSO.id=${refSO.id}`);

        const shipping_partner_id = ensureInt(body.shipping_partner_id) || ref_partner_shipping_id;

        const analytic_account_id = m2oId(refSO.analytic_account_id) || false;
        const pricelist_id = m2oId(refSO.pricelist_id) || false;
        const warehouse_id = m2oId(refSO.warehouse_id) || false;
        const so_route_id = m2oId(refSO.route_id) || false;
        const team_id = m2oId(refSO.team_id) || false;
        const website_id = m2oId(refSO.website_id) || false;

        // ── Validate product.product ids ─────────────────────────────────────────
        const productIds = odooItems.map(itemVariantId).filter(Boolean);
        if (productIds.length !== odooItems.length) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Each item must include product_variant_id (product.product id). Do not send product.template id.",
                    details: {
                        hint: "Your payload item.id is product.template. Use item.product_variant_id for sale.order.line.product_id.",
                    },
                },
                { status: 400, headers: corsHeaders }
            );
        }
        await ensureProductProductIds(session_id, productIds, ctx2);
        mark("validated_products");

        // ── Field introspection (cached 5 min) ───────────────────────────────────
        const solFields = await getModelFieldSet(session_id, "sale.order.line", ctx2);
        const soFields = await getModelFieldSet(session_id, "sale.order", ctx2);
        mark("fields_loaded");

        // ── Knobs ────────────────────────────────────────────────────────────────
        const confirmRequested = body.confirm !== false;               // default true
        const sub_so = body.sub_so !== false;                // default true
        const origin = body.origin || refSO.name || `Project #${project_id}${phase_id ? ` / Phase #${phase_id}` : ""}`;
        const recompute_prices = body.recompute_prices === true || confirmRequested === true;

        const notesRaw = body?.knobs?.notes ?? body?.notes ?? false;
        const notes =
            typeof notesRaw === "string"
                ? notesRaw.trim() || false
                : notesRaw
                    ? String(notesRaw).trim() || false
                    : false;

        const sessionUid = sessionCheck.uid || uidFallback; // reuse the liveness-check result

        const assign_user_id = body.assign_user_id === false ? false : ensureInt(body.assign_user_id) || sessionUid;
        const logistic_user_id = ensureInt(body.logistic_user_id) || sessionUid;

        const phaseModel =
            phase_id && soFields.has("phase_id")
                ? await getM2ORelationModel(session_id, "sale.order", "phase_id", ctx2)
                : null;

        const auto_assign_delivery = typeof body.auto_assign_delivery === "boolean"
            ? body.auto_assign_delivery
            : !!confirmRequested;

        const auto_validate_delivery = body.auto_validate_delivery === true;

        const check_livraison = body.check_livraison_task === true && !!phase_id;
        const livraison_task = check_livraison
            ? await checkLivraisonTask(session_id, { project_id, phase_id, phaseModel }, ctx2)
            : {
                exists: false,
                matched: null,
                mode: phase_id ? "skipped" : "skipped(no-phase_id)",
                phase_model: phaseModel || null,
                phase_field_on_task: null,
                errors: [],
            };

        const extraWarnings = [];
        if (check_livraison && !livraison_task.exists) {
            extraWarnings.push(`No "6.2 Livraison #L" task found for this phase/project (non-blocking).`);
        }

        const canWriteLineName = solFields.has("name");

        // ── Build order lines ────────────────────────────────────────────────────
        const order_lines = odooItems.map((it, idx) => {
            const product_id = itemVariantId(it);
            const qty = itemQty(it);
            const lineRouteId = ensureInt(it?.route_id) || so_route_id || false;

            const lineVals = {
                sequence: (idx + 1) * 10,
                display_type: false,
                product_id,
                product_uom_qty: qty,
            };

            if (lineRouteId && solFields.has("route_id")) lineVals.route_id = lineRouteId;
            if (phase_id && solFields.has("phase_id")) lineVals.phase_id = phase_id;
            if (commitment_date && solFields.has("scheduled_date")) lineVals.scheduled_date = commitment_date;

            if (solFields.has("analytic_distribution")) {
                lineVals.analytic_distribution = analytic_account_id ? { [analytic_account_id]: 100 } : {};
            }

            if (canWriteLineName) {
                const baseName =
                    (typeof it?.name === "string" && it.name.trim()) ||
                        (typeof it?.default_code === "string" && it.default_code.trim())
                        ? `${it.name || ""}`.trim()
                        : "";

                const cfg = buildLineDescriptionFromVariables(it, {
                    header: "Configuration",
                    emptyText: "Not configurable",
                });

                lineVals.name = baseName ? `${baseName}\n${cfg}` : cfg;
            }

            return [0, 0, lineVals];
        });

        // ── Build SO values ──────────────────────────────────────────────────────
        const soVals = {
            partner_id,
            partner_invoice_id: partner_id,
            partner_shipping_id: shipping_partner_id,
            company_id: companyId,
            origin,
            note: notes || false,
            relatedproject_id: project_id,
            ...(phase_id && soFields.has("phase_id") ? { phase_id } : {}),
            sub_so: !!sub_so,
            order_line: order_lines,
        };

        if (soFields.has("user_id")) soVals.user_id = assign_user_id || false;
        if (soFields.has("analytic_account_id")) soVals.analytic_account_id = analytic_account_id || false;
        if (soFields.has("pricelist_id")) soVals.pricelist_id = pricelist_id || false;
        if (soFields.has("warehouse_id")) soVals.warehouse_id = warehouse_id || false;
        if (soFields.has("route_id")) soVals.route_id = so_route_id || false;
        if (soFields.has("team_id")) soVals.team_id = team_id || false;
        if (soFields.has("website_id")) soVals.website_id = website_id || false;
        if (commitment_date && soFields.has("commitment_date")) soVals.commitment_date = commitment_date;

        const specification = {
            id: {},
            name: {},
            state: {},
            sub_so: {},
            partner_shipping_id: { fields: { display_name: {} } },
            warehouse_id: { fields: { id: {}, display_name: {} } },
            route_id: { fields: { id: {}, display_name: {} } },
            commitment_date: {},
            picking_ids: { fields: { id: {}, name: {}, state: {} } },
        };

        // ── Create SO ────────────────────────────────────────────────────────────
        const result = await callOdoo(session_id, "sale.order", "web_save", [[], soVals], {
            context: {
                ...ctx2,
                mail_create_nosubscribe: true,
                tracking_disable: true,
                mail_notrack: true,
            },
            specification,
        });

        let createdSoId = null;
        if (Array.isArray(result) && typeof result?.[0]?.id === "number") createdSoId = result[0].id;
        if (!createdSoId && typeof result?.id === "number") createdSoId = result.id;
        if (!createdSoId && typeof result?.res_id === "number") createdSoId = result.res_id;
        if (!createdSoId && typeof result?.record?.id === "number") createdSoId = result.record.id;
        if (!createdSoId && typeof result?.data?.id === "number") createdSoId = result.data.id;

        if (!createdSoId) {
            const last = await callOdoo(
                session_id,
                "sale.order",
                "search_read",
                [[["origin", "=", origin], ["relatedproject_id", "=", project_id]], ["id"]],
                { context: ctx2, limit: 1, order: "id desc" }
            );
            createdSoId = last?.[0]?.id || null;
        }

        if (!createdSoId) throw new Error("Created sale.order id not found in web_save result.");
        log("SO created:", createdSoId);
        mark("created_so");

        // ── Recompute prices (optional) ──────────────────────────────────────────
        if (recompute_prices) {
            await tryUpdatePrices(session_id, createdSoId, ctx2, extraWarnings);
            mark("prices_updated");
        }

        // ── Confirm SO (optional) ────────────────────────────────────────────────
        let confirm_ok = false;
        if (confirmRequested) {
            await callOdoo(session_id, "sale.order", "action_confirm", [[createdSoId]], {
                context: {
                    ...ctx2,
                    tracking_disable: true,
                    mail_notrack: true,
                    mail_create_nosubscribe: true,
                },
            });
            confirm_ok = true;
            mark("confirmed");
        }

        // ── Read summary ─────────────────────────────────────────────────────────
        const readFields = ["id", "name", "state", "picking_ids", "partner_shipping_id", "warehouse_id", "route_id"];
        if (soFields.has("commitment_date")) readFields.push("commitment_date");

        const soRead = await callOdoo(
            session_id,
            "sale.order",
            "read",
            [[createdSoId], readFields],
            { context: ctx2 }
        );

        // ── Post chatter note ────────────────────────────────────────────────────
        let notePost = null;
        if (notes) {
            try {
                const noteHtml = buildNoteHtml({ notes });
                notePost = await postSaleOrderNote(session_id, { soId: createdSoId, bodyHtml: noteHtml, ctx: ctx2 });
            } catch (e) {
                const c = classifyOdooError(e, { model: "sale.order", method: "mail/message/post", sale_order_id: createdSoId });
                extraWarnings.push({
                    type: c.kind === "access_error" ? "chatter_note_permission_denied" : "chatter_note_failed",
                    error: c.error,
                    details: c.details,
                    odoo_name: e instanceof OdooError ? e.odooName : null,
                });
            }
        }
        mark("read_and_note");

        // ── Delivery pickings ────────────────────────────────────────────────────
        const pickings = confirmRequested
            ? await fetchPickingsForSaleOrder(session_id, createdSoId, ctx2)
            : [];

        const { warnings: fulfillWarnings, fulfillment } = confirmRequested
            ? await fulfillPickings(session_id, pickings, ctx2, {
                logistic_user_id,
                scheduled_date: commitment_date || false,
                auto_assign_delivery,
                auto_validate_delivery,
            })
            : { warnings: [], fulfillment: { pickings: [] } };

        const warnings = [...extraWarnings, ...fulfillWarnings];

        // ── Handle IMOS items ────────────────────────────────────────────────────
        let imos_result = null;
        if (imosItems.length > 0) {
            // Auto-resolve client from partner if not provided in payload
            let resolvedClient = body.client || body.user_email || "";
            if (!resolvedClient && partner_id) {
                try {
                    const partnerRows = await callOdoo(session_id, "res.partner", "read",
                        [[partner_id], ["email", "name"]], { context: ctx2 });
                    resolvedClient = partnerRows?.[0]?.email || partnerRows?.[0]?.name || "";
                } catch (e) {
                    log("Partner read for IMOS client failed (non-fatal):", e?.message);
                }
            }

            imos_result = await handleImosItems(imosItems, {
                project_id,
                phase_id,
                commitment_date,
                origin,
                partner_id,
                client: resolvedClient,
                employee: resolvedEmployee,
            });
        }
        mark("done");

        const debug = body?.debug === true;
        const sale_order_url = `${ODOO_ROOT}/web#id=${createdSoId}&model=sale.order&view_type=form`;

        return NextResponse.json(
            {
                success: true,
                message: "Sub SO created",
                sale_order_id: createdSoId,
                sale_order_url,
                imos_result,
                sale_order: soRead?.[0] || null,
                delivery_pickings: pickings || [],
                fulfillment,
                warnings,
                livraison_task,
                note: notePost
                    ? { ok: true, message_id: notePost.id }
                    : {
                        ok: false,
                        warning: warnings.find((w) => w?.type?.startsWith?.("chatter_note")) ?? null,
                    },
                meta: {
                    flow: body.flow || null,
                    confirm_requested: confirmRequested,
                    confirm_ok,
                    project_id,
                    phase_id: phase_id || null,
                    reference_so_id: refSO.id,
                    reference_so_name: refSO.name,
                    project_company_id: projectCompanyId,
                    has_picking_permission_failures: warnings.some((w) => w?.type === "picking_permission_denied"),
                    applied: {
                        shipping_partner_id,
                        commitment_date: commitment_date || null,
                        logistic_user_id: logistic_user_id || null,
                        user_id_on_so: assign_user_id || false,
                        auto_assign_delivery,
                        auto_validate_delivery,
                        recompute_prices,
                        check_livraison,
                        line_name_written: canWriteLineName,
                    },
                    phase: {
                        model: phaseModel || null,
                        start_field: null,
                    },
                    timings,
                    ...(debug
                        ? {
                            odoo: {
                                root: ODOO_ROOT,
                            },
                        }
                        : {}),
                },
            },
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error("[/api/createSubSO] Error:", error?.stack || error);
        // Guard 4: classify escaped Odoo errors (AccessError from web_save, action_confirm, etc.)
        const c = classifyOdooError(error, { stage: "post_handler" });
        return NextResponse.json(
            {
                success: false,
                error: c.error,
                details: c.details,
                meta: c.meta,
            },
            { status: c.httpStatus, headers: corsHeaders }
        );
    }
}