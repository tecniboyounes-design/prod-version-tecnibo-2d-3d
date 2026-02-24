// src/app/api/createSubSO/route.js
import { NextResponse } from "next/server";
import axios from "axios";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { getCookie } from "@/lib/cookies";

export const runtime = "nodejs";


/**
 * Odoo endpoint normalization:
 * - If env ODOO_BASE is host only (https://erptest.tecnibo.com) -> add /web/dataset/call_kw
 * - If env already includes /web/dataset/call_kw -> keep it
 * - Always strip trailing slash
 *
 * IMPORTANT FIX:
 * We must separate:
 * - ODOO_ROOT: root host (https://erptest.tecnibo.com)
 * - ODOO_CALL_KW: JSON-RPC endpoint (/web/dataset/call_kw)
 *
 * Because some endpoints (session info, mail post) are NOT under /web/dataset/call_kw.
 */


const RAW_ODOO = (process.env.ODOO_BASE || "").replace(/\/$/, "");
if (!RAW_ODOO) throw new Error("Missing ODOO_BASE (set to https://erptest.tecnibo.com or https://www.tecnibo.com)");
// Never call RPC with /odoo prefix. Normalize host to root + /web/dataset/call_kw only.
const ODOO_ROOT = RAW_ODOO
  .replace(/\/web\/dataset\/call_kw\/?$/, "")
  .replace(/\/odoo\/?$/, "");
const ODOO_CALL_KW = `${ODOO_ROOT}/web/dataset/call_kw`;

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


/** Simple in-memory cache for fields_get (per node process). */
const FIELD_CACHE = (globalThis.__ODOO_FIELD_CACHE__ ??= new Map());
const FIELD_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Low-level JSON-RPC call to Odoo (auth comes ONLY from session_id cookie). */
async function callOdoo(session_id, model, method, args = [], kwargs = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Cookie: `session_id=${session_id}`,
  };

  const payload = {
    jsonrpc: "2.0",
    method: "call",
    id: Date.now(),
    params: { model, method, args, kwargs },
  };

  const url = `${ODOO_CALL_KW}/${model}/${method}`;
  const { data } = await axios.post(url, payload, { headers });

  if (data?.error) {
    const msg = data.error?.data?.message || data.error?.message || "Odoo error";
    const dbg = data.error?.data?.debug;
    throw new Error(`${msg}${dbg ? `\n${dbg}` : ""}`);
  }

  return data?.result;
}

function ensureInt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : false;
}

/** Many2one id extractor supporting: number | [id, name] | {id, display_name} */
function m2oId(v) {
  if (!v) return false;
  if (typeof v === "number") return v;
  if (Array.isArray(v)) return v[0] || false;
  if (typeof v === "object" && typeof v.id === "number") return v.id;
  return false;
}

/**
 * ✅ IMPORTANT:
 * We DO NOT use item.id anymore (that’s product.template in your payload).
 * We only use product_variant_id (product.product id).
 */
function itemVariantId(it) {
  const pv = ensureInt(it?.product_variant_id);
  if (pv) return pv;

  // fallback: product_variant_ids: [{id,...}] or [id]
  const pvs = it?.product_variant_ids;
  if (Array.isArray(pvs) && pvs.length) {
    const first = pvs[0];
    const id = ensureInt(first?.id) || ensureInt(first);
    if (id) return id;
  }

  // legacy support: allow product_id
  const legacy = ensureInt(it?.product_id);
  if (legacy) return legacy;

  return false;
}

function itemQty(it) {
  const q = Number(it?.quantity ?? it?.qty ?? 1);
  if (!Number.isFinite(q) || q <= 0) return 1;
  return q;
}

/** Fetch model fields (cached) so we can avoid sending invalid fields. */
async function getModelFieldSet(session_id, model, ctx) {
  const companyKey = String(ctx?.force_company || ctx?.current_company_id || "na");
  const key = `${companyKey}:${model}`;
  const now = Date.now();

  const hit = FIELD_CACHE.get(key);
  if (hit && now - hit.t < FIELD_TTL_MS) return hit.v;

  const res = await callOdoo(session_id, model, "fields_get", [[], ["type", "relation"]], {
    context: ctx,
  });

  const v = new Set(Object.keys(res || {}));
  FIELD_CACHE.set(key, { t: now, v });
  return v;
}

/** Ensure product.product ids exist. */
async function ensureProductProductIds(session_id, productIds, ctx) {
  const uniq = [...new Set((productIds || []).map(Number).filter(Boolean))];
  if (!uniq.length) return [];

  const rows = await callOdoo(
    session_id,
    "product.product",
    "search_read",
    [[["id", "in", uniq]], ["id"]],
    { context: ctx }
  );

  const found = new Set((rows || []).map((r) => r.id));
  const missing = uniq.filter((id) => !found.has(id));
  if (missing.length) throw new Error(`Invalid product.product ids: ${missing.join(", ")}`);
  return uniq;
}

/**
 * ✅ NEW: Build safe dynamic description from item.variables
 * - If variables is empty/missing => "Not configurable"
 * - Filters null/undefined/"" values
 * - Limits size to avoid Odoo choking on giant strings
 */
function buildLineDescriptionFromVariables(it, opts = {}) {
  const {
    header = "Configuration",
    emptyText = "Not configurable",
    maxPairs = 60,
    maxTotalChars = 1800,
  } = opts;

  const vars = it?.variables;

  // only accept plain objects
  const isPlainObject =
    vars &&
    typeof vars === "object" &&
    !Array.isArray(vars) &&
    Object.prototype.toString.call(vars) === "[object Object]";

  if (!isPlainObject) {
    return emptyText;
  }

  const entries = Object.entries(vars)
    .filter(([k]) => typeof k === "string" && k.trim().length > 0)
    .map(([k, v]) => {
      if (v == null) return [k, null];
      if (typeof v === "string") {
        const t = v.trim();
        return [k, t.length ? t : null];
      }
      if (typeof v === "number" || typeof v === "boolean") return [k, String(v)];
      // objects/arrays -> safe stringify
      try {
        const s = JSON.stringify(v);
        return [k, s && s !== "null" ? s : null];
      } catch {
        return [k, String(v)];
      }
    })
    .filter(([, v]) => v != null);

  if (!entries.length) return emptyText;

  const lines = [`${header}:`];
  for (const [k, v] of entries.slice(0, maxPairs)) {
    // keep it readable
    lines.push(`- ${k}: ${v}`);
  }

  let out = lines.join("\n");

  // hard cap to avoid gigantic chatter/line text
  if (out.length > maxTotalChars) {
    out = out.slice(0, maxTotalChars - 3) + "...";
  }

  return out;
}

/**
 * Find reference SO for a project.
 * Prefer sub_so=false, fallback to latest order of that project.
 */
async function findReferenceSO(session_id, project_id, ctx) {
  const spec = {
    id: {},
    name: {},
    sub_so: {},
    company_id: { fields: { id: {}, display_name: {} } },
    partner_id: { fields: { id: {}, display_name: {} } },
    partner_shipping_id: { fields: { id: {}, display_name: {} } },
    route_id: { fields: { id: {}, display_name: {} } },
    warehouse_id: { fields: { id: {}, display_name: {} } },
    pricelist_id: { fields: { id: {}, display_name: {} } },
    analytic_account_id: { fields: { id: {}, display_name: {} } },
    user_id: { fields: { id: {}, display_name: {} } },
    team_id: { fields: { id: {}, display_name: {} } },
    website_id: { fields: { id: {}, display_name: {} } },
    phase_id: { fields: { id: {}, display_name: {} } },
  };

  const main = await callOdoo(session_id, "sale.order", "web_search_read", [], {
    domain: [
      ["relatedproject_id", "=", project_id],
      ["sub_so", "=", false],
    ],
    order: "id desc",
    limit: 1,
    specification: spec,
    context: ctx,
  });

  const mainRec = main?.records?.[0];
  if (mainRec) return { rec: mainRec, pickedBy: "sub_so=false" };

  const any = await callOdoo(session_id, "sale.order", "web_search_read", [], {
    domain: [["relatedproject_id", "=", project_id]],
    order: "id desc",
    limit: 1,
    specification: spec,
    context: ctx,
  });

  const anyRec = any?.records?.[0];
  if (anyRec) return { rec: anyRec, pickedBy: "fallback:any" };

  return null;
}

/** Extract pickings generated by a sale order. */
async function fetchPickingsForSaleOrder(session_id, saleOrderId, ctx) {
  try {
    const so = await callOdoo(
      session_id,
      "sale.order",
      "read",
      [[Number(saleOrderId)], ["id", "name", "picking_ids"]],
      { context: ctx }
    );

    const pickingIds = so?.[0]?.picking_ids || [];
    if (!Array.isArray(pickingIds) || pickingIds.length === 0) return [];

    const pickings = await callOdoo(
      session_id,
      "stock.picking",
      "read",
      [pickingIds, ["id", "name", "state", "scheduled_date", "location_id", "location_dest_id", "picking_type_id"]],
      { context: ctx }
    );

    return pickings || [];
  } catch (e) {
    log("fetchPickingsForSaleOrder failed (non-fatal):", e?.message || e);
    return [];
  }
}

/** Get actual session user uid from Odoo session (best-effort). */
async function getSessionUid(session_id) {
  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: `session_id=${session_id}`,
    };

    // ✅ MUST use root host
    const url = `${ODOO_ROOT}/web/session/get_session_info`;
    const { data } = await axios.post(url, {}, { headers });

    const uid = data?.result?.uid ?? data?.uid;
    return ensureInt(uid) || false;
  } catch {
    return false;
  }
}

/** Resolve the relation model for a many2one field (sale.order.phase_id -> some model). */
async function getM2ORelationModel(session_id, model, field, ctx) {
  const meta = await callOdoo(session_id, model, "fields_get", [[field], ["type", "relation"]], {
    context: ctx,
  });
  const f = meta?.[field];
  if (!f || f.type !== "many2one" || !f.relation) return null;
  return f.relation;
}

/** Find which field on project.task points to the phase model (phase_id / x_phase_id / etc.). */
async function findTaskPhaseField(session_id, phaseModel, ctx) {
  try {
    const meta = await callOdoo(session_id, "project.task", "fields_get", [[], ["type", "relation"]], {
      context: ctx,
    });
    const entries = Object.entries(meta || {});
    const phaseish = entries.find(
      ([name, info]) => info?.type === "many2one" && info?.relation === phaseModel && /phase/i.test(name)
    );
    const any = entries.find(([_, info]) => info?.type === "many2one" && info?.relation === phaseModel);
    return phaseish?.[0] || any?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Non-blocking check: does phase contain a task "6.2 Livraison #L" (or at least Livraison + #L)?
 */
async function checkLivraisonTask(session_id, { project_id, phase_id, phaseModel }, ctx) {
  const out = {
    exists: false,
    matched: null,
    mode: null,
    phase_model: phaseModel || null,
    phase_field_on_task: null,
    errors: [],
  };

  try {
    const phaseField = phaseModel ? await findTaskPhaseField(session_id, phaseModel, ctx) : null;
    out.phase_field_on_task = phaseField;

    const base = [["project_id", "=", project_id]];
    if (phaseField) base.push([phaseField, "=", phase_id]);

    const strict = [...base, ["name", "=", "6.2 Livraison #L"]];
    let rows = await callOdoo(session_id, "project.task", "search_read", [strict, ["id", "name"]], {
      context: ctx,
      limit: 1,
    });
    if (rows?.length) {
      out.exists = true;
      out.matched = rows[0];
      out.mode = "strict";
      return out;
    }

    const loose = [...base, ["name", "ilike", "Livraison"], ["name", "ilike", "#L"]];
    rows = await callOdoo(session_id, "project.task", "search_read", [loose, ["id", "name"]], {
      context: ctx,
      limit: 1,
    });
    if (rows?.length) {
      out.exists = true;
      out.matched = rows[0];
      out.mode = "loose";
      return out;
    }

    out.exists = false;
    out.mode = phaseField ? "phase+project" : "project-only";
    return out;
  } catch (e) {
    out.errors.push(String(e?.message || e));
    return out;
  }
}

/** Try to assign/validate pickings (best-effort, collect warnings). */
async function fulfillPickings(session_id, pickings, ctx, opts) {
  const warnings = [];
  const fulfillment = { pickings: [] };

  const {
    logistic_user_id = false,
    scheduled_date = false,
    auto_assign_delivery = false,
    auto_validate_delivery = false,
  } = opts || {};

  if (!Array.isArray(pickings) || pickings.length === 0) return { warnings, fulfillment };

  let pickingFields = null;
  try {
    pickingFields = await getModelFieldSet(session_id, "stock.picking", ctx);
  } catch (e) {
    warnings.push(`Could not inspect stock.picking fields: ${String(e?.message || e)}`);
    pickingFields = new Set();
  }

  for (const p of pickings) {
    const pid = Number(p?.id);
    if (!pid) continue;

    const steps = [];

    // 1) write scheduled_date + responsible (if fields exist)
    try {
      const writeVals = {};
      if (scheduled_date && pickingFields.has("scheduled_date")) writeVals.scheduled_date = scheduled_date;
      if (logistic_user_id && pickingFields.has("user_id")) writeVals.user_id = logistic_user_id;

      if (Object.keys(writeVals).length) {
        await callOdoo(session_id, "stock.picking", "write", [[pid], writeVals], { context: ctx });
        steps.push({ write: writeVals });
      }
    } catch (e) {
      warnings.push(`Picking ${pid}: write failed: ${String(e?.message || e)}`);
    }

    // 2) action_assign
    if (auto_assign_delivery) {
      try {
        await callOdoo(session_id, "stock.picking", "action_assign", [[pid]], { context: ctx });
        steps.push({ action_assign: true });
      } catch (e) {
        warnings.push(`Picking ${pid}: action_assign failed: ${String(e?.message || e)}`);
      }
    }

    // 3) button_validate (best-effort)
    if (auto_validate_delivery) {
      try {
        const res = await callOdoo(session_id, "stock.picking", "button_validate", [[pid]], { context: ctx });

        if (res && typeof res === "object" && res.res_model && res.res_id) {
          const model = res.res_model;
          const rid = res.res_id;

          if (model === "stock.immediate.transfer") {
            await callOdoo(session_id, model, "process", [[rid]], { context: ctx });
            steps.push({ button_validate: true, wizard: "stock.immediate.transfer.process" });
          } else if (model === "stock.backorder.confirmation") {
            await callOdoo(session_id, model, "process", [[rid]], { context: ctx });
            steps.push({ button_validate: true, wizard: "stock.backorder.confirmation.process" });
          } else {
            steps.push({ button_validate: true, wizard: `${model}#${rid} (not auto-processed)` });
          }
        } else {
          steps.push({ button_validate: true });
        }
      } catch (e) {
        warnings.push(`Picking ${pid}: button_validate failed: ${String(e?.message || e)}`);
      }
    }

    fulfillment.pickings.push({ id: pid, steps });
  }

  return { warnings, fulfillment };
}

/** HTML escaping for chatter note */
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Post chatter note on sale.order using /mail/message/post */
async function postSaleOrderNote(session_id, { soId, bodyHtml, ctx }) {
  // ✅ MUST use root host
  const url = `${ODOO_ROOT}/mail/message/post`;

  const payload = {
    id: Date.now(),
    jsonrpc: "2.0",
    method: "call",
    params: {
      context: {
        lang: ctx.lang || "en_US",
        tz: ctx.tz || "Africa/Casablanca",
        uid: ctx.uid,
        allowed_company_ids: ctx.allowed_company_ids || [],
        mail_post_autofollow: false,
        temporary_id: Date.now() + Math.random(),
      },
      post_data: {
        body: bodyHtml,
        attachment_ids: [],
        attachment_tokens: [],
        canned_response_ids: [],
        message_type: "comment",
        partner_ids: [],
        subtype_xmlid: "mail.mt_note",
        partner_emails: [],
        partner_additional_values: {},
      },
      thread_id: Number(soId),
      thread_model: "sale.order",
    },
  };

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Cookie: `session_id=${session_id}`,
  };

  const { data } = await axios.post(url, payload, { headers });

  if (data?.error) {
    const msg = data.error?.data?.message || data.error?.message || "Odoo error (mail/message/post)";
    throw new Error(msg);
  }

  return data?.result || null;
}

function buildNoteHtml({ notes }) {
  const n =
    typeof notes === "string"
      ? notes.trim()
      : notes
        ? String(notes).trim()
        : "";

  return `<p><b>Notes:</b> ${n ? escapeHtml(n) : "(none)"}</p>`;
}

/** Optional: recompute prices if you want draft correctness (slow-ish). */
async function tryUpdatePrices(session_id, soId, ctx, warnings) {
  try {
    await callOdoo(session_id, "sale.order", "action_update_prices", [[Number(soId)]], { context: ctx });
  } catch (e) {
    warnings.push(`Price update failed (non-fatal): ${String(e?.message || e)}`);
  }
}

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/createSubSo
 *
 * - items[] must include product_variant_id (product.product id)
 * - commitment_date is REQUIRED and is the ONLY source of date (no phase_id fallback for date)
 * - phase_id is OPTIONAL (if provided and the Odoo field exists, we write it on SO + lines)
 */
export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);

  // timings
  const t0 = Date.now();
  const timings = {};
  const mark = (k) => (timings[k] = Date.now() - t0);

  try {
    const body = await req.json().catch(() => ({}));
    log("Incoming body:", safe(body));
    mark("parsed_body");

    // session
    const session_id = getCookie(req, 'session_id');

    if (!session_id) {
      return NextResponse.json({ success: false, error: "Missing session_id" }, { status: 401, headers: corsHeaders });
    }

    const project_id = ensureInt(body.project_id);
    const phase_id = ensureInt(body.phase_id) || false; // ✅ OPTIONAL now

    if (!project_id) {
      return NextResponse.json(
        { success: false, error: "Missing/invalid project_id" },
        { status: 400, headers: corsHeaders }
      );
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ success: false, error: "Missing items[]" }, { status: 400, headers: corsHeaders });
    }

    // ✅ commitment_date is REQUIRED and is the ONLY date source now
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

    // light sanity check (accepts YYYY-MM-DD or YYYY-MM-DD HH:mm:ss)
    if (!/^\d{4}-\d{2}-\d{2}/.test(commitment_date)) {
      return NextResponse.json(
        { success: false, error: "Invalid commitment_date format (expected YYYY-MM-DD)" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Context hints (auth is session user anyway)
    const uidFallback = ensureInt(body.user_id) || 447;
    const requestedCompanyId = ensureInt(body.company_id) || false;

    const ctxBase = {
      lang: "en_US",
      tz: "Africa/Casablanca",
      uid: uidFallback,
      params: {
        model: "sale.order",
        view_type: "form",
      },
      bin_size: true,
    };

    // Find reference SO
    const requestedCompanyCtx = requestedCompanyId
      ? {
          ...ctxBase,
          allowed_company_ids: [requestedCompanyId],
          force_company: requestedCompanyId,
          params: { ...ctxBase.params, cids: requestedCompanyId },
        }
      : null;

    let ref = requestedCompanyCtx ? await findReferenceSO(session_id, project_id, requestedCompanyCtx) : null;

    // If caller sent a company_id that does not own the project/SO, retry across allowed companies.
    if (!ref) {
      ref = await findReferenceSO(session_id, project_id, ctxBase);
    }
    mark("ref_so");

    if (!ref) {
      return NextResponse.json(
        {
          success: false,
          error: "Parent SO not found for this project",
          details: "No sale.order found with relatedproject_id=project_id",
          meta: { project_id },
        },
        { status: 404, headers: corsHeaders }
      );
    }

    const refSO = ref.rec;
    const companyId = m2oId(refSO.company_id) || requestedCompanyId || false;

    const ctx2 = {
      ...ctxBase,
      ...(companyId ? { allowed_company_ids: [companyId] } : {}),
      ...(companyId ? { force_company: companyId } : {}),
      params: {
        model: "sale.order",
        view_type: "form",
        ...(companyId ? { cids: companyId } : {}),
      },
      ...(companyId ? { current_company_id: companyId } : {}),
    };

    // Base partners from reference
    const partner_id = m2oId(refSO.partner_id);
    const ref_partner_shipping_id = m2oId(refSO.partner_shipping_id) || partner_id;

    if (!partner_id) throw new Error(`Reference SO is missing partner_id. refSO.id=${refSO.id}`);

    // Dynamic shipping partner default
    const shipping_partner_id = ensureInt(body.shipping_partner_id) || ref_partner_shipping_id;

    const analytic_account_id = m2oId(refSO.analytic_account_id) || false;
    const pricelist_id = m2oId(refSO.pricelist_id) || false;
    const warehouse_id = m2oId(refSO.warehouse_id) || false;
    const so_route_id = m2oId(refSO.route_id) || false;

    const team_id = m2oId(refSO.team_id) || false;
    const website_id = m2oId(refSO.website_id) || false;

    // Validate product.product ids (variant ids)
    const productIds = items.map(itemVariantId).filter(Boolean);
    if (productIds.length !== items.length) {
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

    const solFields = await getModelFieldSet(session_id, "sale.order.line", ctx2);
    const soFields = await getModelFieldSet(session_id, "sale.order", ctx2);
    mark("fields_loaded");

    const confirmRequested = body.confirm !== false; // default true
    const sub_so = body.sub_so !== false; // default true
    const origin = body.origin || `Project #${project_id}${phase_id ? ` / Phase #${phase_id}` : ""}`;

    // Only recompute prices when confirming OR when explicitly requested.
    const recompute_prices = body.recompute_prices === true || confirmRequested === true;

    // Notes can be provided either at top-level (`body.notes`) or nested as `body.knobs.notes`
    const notesRaw = body?.knobs?.notes ?? body?.notes ?? false;
    const notes =
      typeof notesRaw === "string"
        ? notesRaw.trim() || false
        : notesRaw
          ? String(notesRaw).trim() || false
          : false;

    const sessionUid = (await getSessionUid(session_id)) || uidFallback;

    // salesperson on SO
    const assign_user_id = body.assign_user_id === false ? false : ensureInt(body.assign_user_id) || sessionUid;

    // phase model (only useful for livraison check or when writing phase_id)
    const phaseModel =
      phase_id && soFields.has("phase_id")
        ? await getM2ORelationModel(session_id, "sale.order", "phase_id", ctx2)
        : null;

    // logistic user default = session user (dynamic)
    const logistic_user_id = ensureInt(body.logistic_user_id) || sessionUid;

    // fulfillment knobs
    const auto_assign_delivery =
      typeof body.auto_assign_delivery === "boolean" ? body.auto_assign_delivery : !!confirmRequested;

    const auto_validate_delivery = body.auto_validate_delivery === true; // explicit only

    // Livraison check becomes opt-in (debug feature) and requires phase_id
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

    // ✅ NEW: whether we can write line descriptions
    const canWriteLineName = solFields.has("name");

    // Build order lines using product_variant_id ONLY
    const order_lines = items.map((it, idx) => {
      const product_id = itemVariantId(it);
      const qty = itemQty(it);
      const lineRouteId = ensureInt(it?.route_id) || so_route_id || false;

      const lineVals = {
        sequence: (idx + 1) * 10,
        display_type: false,
        product_id, // ✅ product.product id
        product_uom_qty: qty,
      };

      if (lineRouteId && solFields.has("route_id")) lineVals.route_id = lineRouteId;

      // ✅ phase_id is OPTIONAL: write only if provided + exists
      if (phase_id && solFields.has("phase_id")) lineVals.phase_id = phase_id;

      // ✅ scheduled_date always comes from commitment_date payload
      if (commitment_date && solFields.has("scheduled_date")) lineVals.scheduled_date = commitment_date;

      if (solFields.has("analytic_distribution")) {
        lineVals.analytic_distribution = analytic_account_id ? { [analytic_account_id]: 100 } : {};
      }

      // ✅ NEW: dynamic description based on it.variables
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

        // Keep base product name first, then config
        // If baseName is empty, we still provide cfg (Odoo will fill product name in UI, but we store ours anyway).
        const full = baseName ? `${baseName}\n${cfg}` : cfg;

        // Odoo sometimes dislikes super long "name"
        lineVals.name = full;
      }

      return [0, 0, lineVals];
    });

    const soVals = {
      partner_id,
      partner_invoice_id: partner_id,
      partner_shipping_id: shipping_partner_id,
      company_id: companyId,

      origin,
      note: notes || false,

      relatedproject_id: project_id,

      // ✅ phase_id is OPTIONAL: write only if provided + exists
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

    // ✅ commitment_date comes from payload only
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

    // Create SO
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

    // Recompute prices (optional, can be slow)
    if (recompute_prices) {
      await tryUpdatePrices(session_id, createdSoId, ctx2, extraWarnings);
      mark("prices_updated");
    }

    // Confirm SO (optional)
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

    // Read summary
    const readFields = ["id", "name", "state", "picking_ids", "partner_shipping_id", "warehouse_id", "route_id"];
    if (soFields.has("commitment_date")) readFields.push("commitment_date");

    const soRead = await callOdoo(session_id, "sale.order", "read", [[createdSoId], readFields], { context: ctx2 });

    // Post note only if notes exist
    let notePost = null;
    if (notes) {
      try {
        const noteHtml = buildNoteHtml({ notes });
        notePost = await postSaleOrderNote(session_id, { soId: createdSoId, bodyHtml: noteHtml, ctx: ctx2 });
      } catch (e) {
        extraWarnings.push(`Note post failed (non-fatal): ${String(e?.message || e)}`);
      }
    }
    mark("read_and_note");

    // Pickings
    const pickings = confirmRequested ? await fetchPickingsForSaleOrder(session_id, createdSoId, ctx2) : [];

    // Fulfillment steps
    const { warnings: fulfillWarnings, fulfillment } = confirmRequested
      ? await fulfillPickings(session_id, pickings, ctx2, {
          logistic_user_id,
          scheduled_date: commitment_date || false,
          auto_assign_delivery,
          auto_validate_delivery,
        })
      : { warnings: [], fulfillment: { pickings: [] } };

    const warnings = [...extraWarnings, ...fulfillWarnings];
    mark("done");

    // Only reveal Odoo endpoint info when explicitly debugging.
    const debug = body?.debug === true;
    const sale_order_url = `${ODOO_ROOT}/web#id=${createdSoId}&model=sale.order&view_type=form`;

    return NextResponse.json(
      {
        success: true,
        message: "Sub SO created",
        sale_order_id: createdSoId,
        sale_order_url: sale_order_url,
        sale_order: soRead?.[0] || null,
        delivery_pickings: pickings || [],
        fulfillment,
        warnings,
        livraison_task,
        note: notePost ? { ok: true, message_id: notePost.id } : { ok: false },
        meta: {
          flow: body.flow || null,
          confirm_requested: confirmRequested,
          confirm_ok,
          project_id,
          phase_id: phase_id || null,
          reference_so_id: refSO.id,
          reference_so_name: refSO.name,
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
                  raw_env: RAW_ODOO,
                  root: ODOO_ROOT,
                  call_kw: ODOO_CALL_KW,
                },
              }
            : {}),
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[/api/createSubSO] Error:", error?.stack || error);
    return NextResponse.json(
      { success: false, error: "Sub SO creation failed", details: String(error?.message || error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
