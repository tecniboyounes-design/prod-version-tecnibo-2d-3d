import { callOdoo } from "./odooRpc.js";

/** Resolve the relation model for a many2one field (e.g. sale.order.phase_id → some model). */
export async function getM2ORelationModel(session_id, model, field, ctx) {
    const meta = await callOdoo(session_id, model, "fields_get", [[field], ["type", "relation"]], {
        context: ctx,
    });
    const f = meta?.[field];
    if (!f || f.type !== "many2one" || !f.relation) return null;
    return f.relation;
}

/** Find which field on project.task points to the phase model (phase_id / x_phase_id / etc.). */
export async function findTaskPhaseField(session_id, phaseModel, ctx) {
    try {
        const meta = await callOdoo(session_id, "project.task", "fields_get", [[], ["type", "relation"]], {
            context: ctx,
        });
        const entries = Object.entries(meta || {});
        const phaseish = entries.find(
            ([name, info]) =>
                info?.type === "many2one" && info?.relation === phaseModel && /phase/i.test(name)
        );
        const any = entries.find(
            ([_, info]) => info?.type === "many2one" && info?.relation === phaseModel
        );
        return phaseish?.[0] || any?.[0] || null;
    } catch {
        return null;
    }
}

/**
 * Non-blocking check: does the phase contain a task "6.2 Livraison #L"?
 * Tries strict match first, falls back to loose ilike match.
 * Never throws — errors go into out.errors[].
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
        const phaseField = phaseModel
            ? await findTaskPhaseField(session_id, phaseModel, ctx)
            : null;
        out.phase_field_on_task = phaseField;

        const base = [["project_id", "=", project_id]];
        if (phaseField) base.push([phaseField, "=", phase_id]);

        const strict = [...base, ["name", "=", "6.2 Livraison #L"]];
        let rows = await callOdoo(
            session_id,
            "project.task",
            "search_read",
            [strict, ["id", "name"]],
            { context: ctx, limit: 1 }
        );
        if (rows?.length) {
            out.exists = true;
            out.matched = rows[0];
            out.mode = "strict";
            return out;
        }

        const loose = [
            ...base,
            ["name", "ilike", "Livraison"],
            ["name", "ilike", "#L"],
        ];
        rows = await callOdoo(
            session_id,
            "project.task",
            "search_read",
            [loose, ["id", "name"]],
            { context: ctx, limit: 1 }
        );
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