// /src/app/api/odoo/smart-products/lib/db.js
import { Pool } from "pg";

let _pool = null;

function getPgPool() {
  if (_pool) return _pool;

  // NEW: dedicated helper DB URL
  const connectionString =
    process.env.DATABASE_HELPER_URL

  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_HELPER_URL (or RP_IMOS_HELPER_DATABASE_URL / DATABASE_URL / POSTGRES_URL / PG_CONNECTION_STRING)."
    );
  }

  _pool = new Pool({ connectionString });
  return _pool;
}

function normalizeLikePattern(wsLike) {
  const s = String(wsLike || "").trim();
  if (!s) return "%WS%";
  if (s.includes("%") || s.includes("_")) return s;
  return `%${s}%`;
}

/**
 * IMPORTANT:
 * - Old source: public."CONNDESC" (quoted uppercase cols)
 * - New source: public.conndesc_helper (assumed normal lowercase cols)
 *
 * Required columns for current pipeline (keep everything same):
 * - article_id  (used for matchField=ref_imos values)
 * - order_id    (used for categorization flags)
 * - cfg_name    (NEW: injected into product records)
 *
 * Optional fields kept for compatibility / debugging:
 * - text_short, name, price, supplier, etc (if present in table)
 *
 * If your conndesc_helper table has fewer columns, keep the SELECT minimal.
 */
export async function fetchConndescWsRows({
  wsLike = "WS",
  limit = 500,
  offset = 0,
}) {
  const pool = getPgPool();
  const like = normalizeLikePattern(wsLike);

  const lim = Number(limit);
  const off = Number(offset) || 0;

  const params = [like];
  let p = 1;

  // Minimal + compatible shape (aliases match what route.js expects)
  let sql = `
    SELECT
      article_id  AS article_id,
      text_short  AS text_short,
      order_id    AS order_id,
      name        AS name,

      -- NEW: configuration name (can be NULL)
      cfg_name    AS cfg_name

    FROM public.conndesc_helper
    WHERE order_id ILIKE $1
    ORDER BY article_id ASC
  `;

  // limit_rows=0 => ALL (no LIMIT clause)
  if (Number.isFinite(lim) && lim > 0) {
    params.push(lim);
    p++;
    sql += ` LIMIT $${p}`;
  }

  if (off > 0) {
    params.push(off);
    p++;
    sql += ` OFFSET $${p}`;
  }

  const res = await pool.query(sql, params);
  return res.rows || [];
}
