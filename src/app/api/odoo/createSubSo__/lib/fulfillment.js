import { callOdoo, getModelFieldSet } from "./odooRpc.js";
import { classifyOdooError } from "./odooError.js";

/** Extract pickings linked to a sale order. Non-fatal — returns [] on error. */
export async function fetchPickingsForSaleOrder(session_id, saleOrderId, ctx) {
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
            [
                pickingIds,
                ["id", "name", "state", "scheduled_date", "location_id", "location_dest_id", "picking_type_id"],
            ],
            { context: ctx }
        );

        return pickings || [];
    } catch (e) {
        console.log("[fulfillment] fetchPickingsForSaleOrder failed (non-fatal):", e?.message || e);
        return [];
    }
}

/**
 * Best-effort: write date/responsible, action_assign, button_validate on each picking.
 *
 * All errors are collected as structured warnings (never throws).
 * Permission errors (access_error kind) are flagged with type "picking_permission_denied"
 * so the client can render an explicit "delivery incomplete — permission issue" message.
 */
export async function fulfillPickings(session_id, pickings, ctx, opts) {
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

        // 1) write scheduled_date + responsible (if fields exist on this Odoo instance)
        try {
            const writeVals = {};
            if (scheduled_date && pickingFields.has("scheduled_date")) writeVals.scheduled_date = scheduled_date;
            if (logistic_user_id && pickingFields.has("user_id")) writeVals.user_id = logistic_user_id;

            if (Object.keys(writeVals).length) {
                await callOdoo(session_id, "stock.picking", "write", [[pid], writeVals], { context: ctx });
                steps.push({ write: writeVals });
            }
        } catch (e) {
            const c = classifyOdooError(e, { model: "stock.picking", method: "write", picking_id: pid });
            warnings.push({
                type: c.kind === "access_error" ? "picking_permission_denied" : "picking_operation_failed",
                picking_id: pid,
                operation: "write",
                error: c.error,
                details: c.details,
                odoo_name: e.odooName ?? null,
            });
        }

        // 2) action_assign
        if (auto_assign_delivery) {
            try {
                await callOdoo(session_id, "stock.picking", "action_assign", [[pid]], { context: ctx });
                steps.push({ action_assign: true });
            } catch (e) {
                const c = classifyOdooError(e, { model: "stock.picking", method: "action_assign", picking_id: pid });
                warnings.push({
                    type: c.kind === "access_error" ? "picking_permission_denied" : "picking_operation_failed",
                    picking_id: pid,
                    operation: "action_assign",
                    error: c.error,
                    details: c.details,
                    odoo_name: e.odooName ?? null,
                });
            }
        }

        // 3) button_validate (best-effort, handles wizard redirects)
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
                const c = classifyOdooError(e, { model: "stock.picking", method: "button_validate", picking_id: pid });
                warnings.push({
                    type: c.kind === "access_error" ? "picking_permission_denied" : "picking_operation_failed",
                    picking_id: pid,
                    operation: "button_validate",
                    error: c.error,
                    details: c.details,
                    odoo_name: e.odooName ?? null,
                });
            }
        }

        fulfillment.pickings.push({ id: pid, steps });
    }

    return { warnings, fulfillment };
}