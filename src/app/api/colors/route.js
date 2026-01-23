// src/app/api/colors/route.ts (or .js)
import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pool = (globalThis ).__colorsPool ?? new Pool({
  connectionString: "postgresql://postgres:password@192.168.30.92:5432/imos_helper",
});
if (!(globalThis ).__colorsPool) (globalThis ).__colorsPool = pool;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("ral");
  const hex  = searchParams.get("hex");

  try {
    if (code) {
      const { rows } = await pool.query(
        `SELECT ral_code, hex, COALESCE(opacity, 1) AS opacity
           FROM render
          WHERE ral_code = UPPER(regexp_replace(trim($1), '\s+', '', 'g'))
          LIMIT 1`,
        [code]
      );
      return NextResponse.json(rows[0] ?? null);
    }

    if (hex) {
      const { rows } = await pool.query(
        `SELECT ral_code, hex, COALESCE(opacity, 1) AS opacity
           FROM render
          WHERE hex = UPPER(CASE WHEN LEFT($1,1)='#' THEN $1 ELSE '#'||$1 END)
          LIMIT 1`,
        [hex]
      );
      return NextResponse.json(rows[0] ?? null);
    }

    const { rows } = await pool.query(
      `SELECT ral_code, hex, COALESCE(opacity, 1) AS opacity
         FROM render
        ORDER BY ral_code
        LIMIT 500`
    );
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
