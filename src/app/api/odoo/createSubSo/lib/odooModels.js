import { callOdoo } from "./odooRpc";

/** Fetch model fields (so we can avoid sending invalid fields). */
export async function getModelFieldSet(session_id, model, ctx) {
  const res = await callOdoo(session_id, model, "fields_get", [[], ["type", "relation"]], {
    context: ctx,
  });
  return new Set(Object.keys(res || {}));
}

/** Ensure product.product ids exist. */
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
