import { ensureInt } from "./primitives";

/**
 * ✅ IMPORTANT:
 * We DO NOT use item.id anymore (that’s product.template in your payload).
 * We only use product_variant_id (product.product id).
 */
export function itemVariantId(it) {
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

export function itemQty(it) {
  const q = Number(it?.quantity ?? it?.qty ?? 1);
  if (!Number.isFinite(q) || q <= 0) return 1;
  return q;
}
