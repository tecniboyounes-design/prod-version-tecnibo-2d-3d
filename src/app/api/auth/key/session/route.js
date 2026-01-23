// src/app/api/auth/key/session/route.js
import crypto from "crypto";

const ODOO_URL = process.env.ODOO_URL;
if (!ODOO_URL) throw new Error("[auth/key/session] ODOO_URL env is required");

async function odooGetSessionContext(sessionId) {
  const res = await fetch(`${ODOO_URL}/web/session/get_session_info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Cookie": `session_id=${sessionId}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: Date.now() }),
  });

  const data = await res.json().catch(() => null);
  const r = (data && data.result) || {};
  const userCtx = r.user_context || r.context || {};

  const lang = userCtx.lang || "en_US";
  const tz = userCtx.tz || "Africa/Casablanca";
  const uid = (typeof r.uid === "number" ? r.uid : userCtx.uid) ?? undefined;

  let allowed_company_ids = undefined;
  try {
    if (Array.isArray(r.allowed_company_ids)) allowed_company_ids = r.allowed_company_ids;
    else if (r.user_companies) {
      const uc = r.user_companies;
      const takeIds = (v) => {
        if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? x.id : x)).filter(Boolean);
        if (v && typeof v === "object") return Object.values(v).map((x) => (typeof x === "object" ? x.id : Number(x))).filter(Boolean);
        return undefined;
      };
      allowed_company_ids =
        takeIds(uc.allowed_companies) ||
        takeIds(uc.companies) ||
        (typeof uc.current_company === "object" && uc.current_company.id ? [uc.current_company.id] : undefined);
    } else if (typeof r.company_id === "number") {
      allowed_company_ids = [r.company_id];
    }
  } catch { /* ignore */ }

  const ctx = { lang, tz };
  if (uid !== undefined) ctx.uid = uid;
  if (allowed_company_ids?.length) ctx.allowed_company_ids = allowed_company_ids;
  return ctx;
}

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const m = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
    const sessionId = m ? m[1] : null;

    if (!sessionId) {
      return new Response(JSON.stringify({ result: false, message: "No session" }), {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const ctx = await odooGetSessionContext(sessionId);
    return new Response(JSON.stringify({ result: true, context: ctx }), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ result: false, message: "Failed to read session", error: String(e) }), {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
