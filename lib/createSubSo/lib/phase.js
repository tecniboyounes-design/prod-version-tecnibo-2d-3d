import { callOdoo } from "./odooRpc";

/** Resolve the relation model for a many2one field (sale.order.phase_id -> some model). */
export async function getM2ORelationModel(session_id, model, field, ctx) {
  const meta = await callOdoo(session_id, model, "fields_get", [[field], ["type", "relation"]], {
    context: ctx,
  });
  const f = meta?.[field];
  if (!f || f.type !== "many2one" || !f.relation) return null;
  return f.relation;
}

/** Read phase start date field (best-effort via introspection). */
export async function readPhaseStartDate(session_id, phaseModel, phase_id, ctx) {
  try {
    const meta = await callOdoo(session_id, phaseModel, "fields_get", [[], ["type"]], { context: ctx });
    const keys = new Set(Object.keys(meta || {}));

    const candidates = [
      "start_date",
      "date_start",
      "planned_date_begin",
      "planning_date_begin",
      "x_start_date",
    ].filter((k) => keys.has(k));

    const readFields = ["id", "name", "display_name", ...candidates];
    const rec = (await callOdoo(session_id, phaseModel, "read", [[phase_id], readFields], { context: ctx }))?.[0];
    if (!rec) return { start_date: false, start_field: false, rec: null };

    const startField = candidates.find((k) => rec[k]);
    return {
      start_date: startField ? rec[startField] : false,
      start_field: startField || false,
      rec,
    };
  } catch {
    return { start_date: false, start_field: false, rec: null };
  }
}

/** Find which field on project.task points to the phase model (phase_id / x_phase_id / etc.). */
export async function findTaskPhaseField(session_id, phaseModel, ctx) {
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
export async function checkLivraisonTask(session_id, { project_id, phase_id, phaseModel }, ctx) {
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
