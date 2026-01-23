// src/app/api/auth/key/verify/route.js
const ODOO_URL = process.env.ODOO_URL;
const DATABASE_NAME = process.env.ODOO_DB;
if (!ODOO_URL) throw new Error("[auth/key] ODOO_URL env is required");
if (!DATABASE_NAME) throw new Error("[auth/key] ODOO_DB env is required");

const PFX = "[auth/key/verify]";
const mask = (s) => (!s ? "" : (String(s).length <= 8 ? "***" : `${String(s).slice(0,4)}…${String(s).slice(-4)}`));
const sId  = (id) => (id ? `${id.slice(0,6)}…${id.slice(-4)}` : "null");

function pickOdooError(data) {
  const e = data?.error || {};
  const info = {
    name: e?.data?.name || e?.name || null,
    message: e?.message || null,
    code: e?.code || e?.data?.code || null,
    debug: e?.data?.debug ? String(e.data.debug).slice(0, 320) : null,
  };
  // drop nulls
  Object.keys(info).forEach(k => info[k] == null && delete info[k]);
  return Object.keys(info).length ? info : null;
}

/* ------ Helpers ------ */
async function odooAuthenticate({ login, key, reqId }) {
  console.log(PFX, reqId, "authenticate.begin", { login, key: mask(key), db: DATABASE_NAME });

  const payload = { jsonrpc: "2.0", method: "call", params: { db: DATABASE_NAME, login, password: key }, id: Date.now() };

  console.time(`${PFX} ${reqId} authenticate.fetch`);
  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  console.timeEnd(`${PFX} ${reqId} authenticate.fetch`);

  // capture text for robust parsing + logging
  const txt = await res.text().catch(() => "");
  let data = null; try { data = txt ? JSON.parse(txt) : null; } catch {}

  const setCookie = res.headers.get("set-cookie") || "";
  const m = setCookie.match(/session_id=([^;]+)/);
  const sessionId = m ? m[1] : null;

  const ok = Boolean(data?.result && sessionId);
  const err = ok ? null : pickOdooError(data);

  console.log(PFX, reqId, "authenticate.done", {
    status: res.status,
    ok,
    hasResult: !!data?.result,
    hasError: !!data?.error,
    cookieFound: !!setCookie,
    sessionId: sId(sessionId),
    errorShort: err ? { name: err.name, message: err.message } : null,
  });

  return { ok, status: res.status, sessionId, raw: data, err };
}

async function odooGetSessionContext(sessionId, reqId) {
  console.log(PFX, reqId, "ctx.begin", { sessionId: sId(sessionId) });
  console.time(`${PFX} ${reqId} ctx.fetch`);
  const res = await fetch(`${ODOO_URL}/web/session/get_session_info`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Cookie: `session_id=${sessionId}` },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: Date.now() }),
  });
  console.timeEnd(`${PFX} ${reqId} ctx.fetch`);

  const data = await res.json().catch(() => null);
  const r = data?.result || {};
  const userCtx = r.user_context || r.context || {};
  const lang = userCtx.lang || "en_US";
  const tz = userCtx.tz || "Africa/Casablanca";
  const uid = (typeof r.uid === "number" ? r.uid : userCtx.uid) ?? undefined;

  let allowed_company_ids;
  try {
    if (Array.isArray(r.allowed_company_ids)) allowed_company_ids = r.allowed_company_ids;
    else if (r.user_companies) {
      const uc = r.user_companies;
      const takeIds = (v) => Array.isArray(v)
        ? v.map(x => (typeof x === "object" ? x.id : x)).filter(Boolean)
        : (v && typeof v === "object" ? Object.values(v).map(x => (typeof x === "object" ? x.id : Number(x))).filter(Boolean) : undefined);
      allowed_company_ids = takeIds(uc.allowed_companies) || takeIds(uc.companies) ||
        (uc.current_company && typeof uc.current_company === "object" && uc.current_company.id ? [uc.current_company.id] : undefined);
    } else if (typeof r.company_id === "number") allowed_company_ids = [r.company_id];
  } catch {}

  const ctx = { lang, tz };
  if (uid !== undefined) ctx.uid = uid;
  if (allowed_company_ids?.length) ctx.allowed_company_ids = allowed_company_ids;
  if (r.username) ctx.username = r.username;
  if (r.db) ctx.db = r.db;

  console.log(PFX, reqId, "ctx.done", { status: res.status, uid: ctx.uid, lang: ctx.lang, tz: ctx.tz, companies: ctx.allowed_company_ids?.length || 0, username: ctx.username || null, db: ctx.db || null });
  return ctx;
}

async function odooReadSelf(sessionId, uid, reqId) {
  if (!uid) { console.log(PFX, reqId, "readSelf.skip (no uid)"); return null; }
  console.log(PFX, reqId, "readSelf.begin", { uid, sessionId: sId(sessionId) });
  const body = { jsonrpc: "2.0", method: "call", params: { model: "res.users", method: "read", args: [[uid], ["name","login","email","company_id","company_ids"]], kwargs: { context: {} } }, id: Date.now() };
  console.time(`${PFX} ${reqId} readSelf.fetch`);
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Cookie: `session_id=${sessionId}` },
    body: JSON.stringify(body),
  });
  console.timeEnd(`${PFX} ${reqId} readSelf.fetch`);
  const j = await res.json().catch(() => null);
  const rec = Array.isArray(j?.result) ? j.result[0] : null;
  if (!rec) { console.log(PFX, reqId, "readSelf.none", { status: res.status }); return null; }
  const m2oName = (v) => (Array.isArray(v) && v.length >= 2 ? { id: v[0], name: v[1] } : null);
  const user = { uid, name: rec.name ?? null, login: rec.login ?? null, email: rec.email ?? null, company: m2oName(rec.company_id), companies: Array.isArray(rec.company_ids) ? rec.company_ids.map(id => ({ id })) : [] };
  console.log(PFX, reqId, "readSelf.done", { status: res.status, name: user.name, login: user.login, email: user.email, company: user.company ? `${user.company.id}:${user.company.name}` : null, companiesCount: user.companies.length });
  return user;
}

function buildHttpOnlyCookie(name, value, maxAgeSec = 20 * 60) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSec}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/* ------ Route ------ */
export async function POST(request) {
  const reqId = Math.random().toString(36).slice(2, 8);
  console.log(PFX, reqId, "request.begin");

  try {
    const authz = request.headers.get("authorization") || "";
    const m = authz.match(/^Bearer\s+(.+)$/i);
    const bearerKey = m ? m[1] : "";

    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim();
    const bodyKey = String(body?.apiKey || "").trim();
    const apiKey = bodyKey || bearerKey;       // body or Bearer
    const setCookie = body?.setCookie !== false;

    console.log(PFX, reqId, "request.body", {
      email,
      apiKey_present: Boolean(apiKey),
      apiKey_len: apiKey?.length || 0,
      apiKey_masked: mask(apiKey),
      source: bodyKey ? "body.apiKey" : (bearerKey ? "Authorization.Bearer" : "none"),
      setCookie,
      odoo_url: ODOO_URL,
      db: DATABASE_NAME,
    });

    if (!email || !apiKey) {
      console.log(PFX, reqId, "request.invalid");
      return new Response(JSON.stringify({ result: false, message: "email and apiKey are required" }), { status: 400 });
    }

    const auth = await odooAuthenticate({ login: email, key: apiKey, reqId });
    if (!auth.ok) {
      // surface Odoo error details to the client (safe subset)
      return new Response(JSON.stringify({ result: false, message: "Invalid email/apiKey", odoo_error: auth.err || null }), { status: 401 });
    }

    const sessionId = auth.sessionId;
    const context = await odooGetSessionContext(sessionId, reqId);
    const user = await odooReadSelf(sessionId, context.uid, reqId);

    console.log(PFX, reqId, "success", { sessionId: sId(sessionId), uid: context.uid, name: user?.name || null, login: user?.login || null });

    const payload = { result: true, session_id: sessionId, context, user };
    const respHeaders = setCookie ? { "Set-Cookie": buildHttpOnlyCookie("session_id", sessionId) } : {};
    return new Response(JSON.stringify(payload), { status: 200, headers: respHeaders });
  } catch (e) {
    console.error(PFX, reqId, "ERROR", e?.stack || e?.message || e);
    return new Response(JSON.stringify({ result: false, message: "Server error", error: String(e?.message || e) }), { status: 500 });
  } finally {
    console.log(PFX, reqId, "request.end");
  }
}
