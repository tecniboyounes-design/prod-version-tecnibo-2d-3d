// /src/app/api/odoo/smart-products/lib/db.js
import { Pool } from "pg";

let _pool = null;

function getPgPool() {
  if (_pool) return _pool;

  // dedicated helper DB URL
  const connectionString = process.env.DATABASE_HELPER_URL;

  if (!connectionString) {
    throw new Error("Missing DATABASE_HELPER_URL");
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
 * Source: public.conndesc_helper
 *
 * Required columns:
 * - article_id
 * - order_id
 * - cfg_name
 * - routing  (NEW)
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

  let sql = `
    SELECT
      article_id  AS article_id,
      text_short  AS text_short,
      order_id    AS order_id,
      name        AS name,
      cfg_name    AS cfg_name,
      routing     AS routing
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
