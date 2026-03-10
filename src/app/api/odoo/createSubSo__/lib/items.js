import { callOdoo } from "./odooRpc.js";

/** Ensure all product.product ids exist and are accessible in the given context. */
export async function ensureProductProductIds(session_id, productIds, ctx) {
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
 * Build a safe dynamic description from item.variables.
 * - Plain object only (no arrays/primitives).
 * - Filters null / empty values.
 * - Hard cap at maxPairs entries and maxTotalChars characters.
 */
export function buildLineDescriptionFromVariables(it, opts = {}) {
    const {
        header = "Configuration",
        emptyText = "Not configurable",
        maxPairs = 60,
        maxTotalChars = 1800,
    } = opts;

    const vars = it?.variables;

    const isPlainObject =
        vars &&
        typeof vars === "object" &&
        !Array.isArray(vars) &&
        Object.prototype.toString.call(vars) === "[object Object]";

    if (!isPlainObject) return emptyText;

    const entries = Object.entries(vars)
        .filter(([k]) => typeof k === "string" && k.trim().length > 0)
        .map(([k, v]) => {
            if (v == null) return [k, null];
            if (typeof v === "string") {
                const t = v.trim();
                return [k, t.length ? t : null];
            }
            if (typeof v === "number" || typeof v === "boolean") return [k, String(v)];
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
        lines.push(`- ${k}: ${v}`);
    }

    let out = lines.join("\n");
    if (out.length > maxTotalChars) {
        out = out.slice(0, maxTotalChars - 3) + "...";
    }
    return out;
}