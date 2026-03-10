/** Returns a positive integer or false. */
export function ensureInt(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : false;
}

/**
 * Many2one id extractor.
 * Supports: number | [id, name] | { id, display_name }
 */
export function m2oId(v) {
    if (!v) return false;
    if (typeof v === "number") return v;
    if (Array.isArray(v)) return v[0] || false;
    if (typeof v === "object" && typeof v.id === "number") return v.id;
    return false;
}

/**
 * Extract product.product id from an item.
 * Priority: product_variant_id → product_variant_ids[0] → product_id (legacy).
 * Never uses item.id — that is product.template.
 */
export function itemVariantId(it) {
    const pv = ensureInt(it?.product_variant_id);
    if (pv) return pv;

    const pvs = it?.product_variant_ids;
    if (Array.isArray(pvs) && pvs.length) {
        const first = pvs[0];
        const id = ensureInt(first?.id) || ensureInt(first);
        if (id) return id;
    }

    const legacy = ensureInt(it?.product_id);
    if (legacy) return legacy;

    return false;
}

export function itemQty(it) {
    const q = Number(it?.quantity ?? it?.qty ?? 1);
    if (!Number.isFinite(q) || q <= 0) return 1;
    return q;
}