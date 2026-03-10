import { callOdoo } from "./odooRpc.js";
import { m2oId } from "./primitives.js";
import { classifyOdooError } from "./odooError.js";

/**
 * Find the reference SO for a project.
 * Prefers sub_so=false (master order), falls back to latest any order.
 */
export async function findReferenceSO(session_id, project_id, ctx) {
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

/** Read project core fields to derive the correct company context. */
export async function readProjectCore(session_id, project_id, ctx) {
    const rows = await callOdoo(
        session_id,
        "project.project",
        "read",
        [
            [Number(project_id)],
            ["id", "display_name", "partner_id", "analytic_account_id", "company_id", "sale_order_id"],
        ],
        { context: ctx }
    );
    const p = rows?.[0];
    if (!p?.id) return null;
    return p;
}

/**
 * Probe whether the session has CREATE rights on sale.order.
 * Uses check_access_rights('create', false) — returns a bool without raising.
 * This is more accurate than fields_get, which only tests read access.
 */
export async function assertSaleOrderCreatable(session_id, ctx) {
    try {
        const result = await callOdoo(
            session_id,
            "sale.order",
            "check_access_rights",
            ["create", false], // raise_exception=false → returns bool
            { context: ctx }
        );
        if (result === true) return { ok: true };
        return {
            ok: false,
            kind: "access_error",
            message: "check_access_rights('create') returned false — user lacks CREATE on sale.order",
        };
    } catch (err) {
        const c = classifyOdooError(err, { model: "sale.order", method: "check_access_rights" });
        return { ok: false, kind: c.kind, message: c.details };
    }
}

/** Optional: recompute pricelist prices on a draft SO (slow-ish, non-fatal). */
export async function tryUpdatePrices(session_id, soId, ctx, warnings) {
    try {
        await callOdoo(
            session_id,
            "sale.order",
            "action_update_prices",
            [[Number(soId)]],
            { context: ctx }
        );
    } catch (e) {
        warnings.push(`Price update failed (non-fatal): ${String(e?.message || e)}`);
    }
}