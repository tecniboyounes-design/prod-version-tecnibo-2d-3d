import { log } from "./logger";
import { callOdoo } from "./odooRpc";
import { getModelFieldSet } from "./odooModels";

/** Try to assign/validate pickings (best-effort, collect warnings). */
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
