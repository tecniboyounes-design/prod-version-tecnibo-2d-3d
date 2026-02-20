export function ensureInt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : false;
}

/** Many2one id extractor supporting: number | [id, name] | {id, display_name} */
export function m2oId(v) {
  if (!v) return false;
  if (typeof v === "number") return v;
  if (Array.isArray(v)) return v[0] || false;
  if (typeof v === "object" && typeof v.id === "number") return v.id;
  return false;
}
