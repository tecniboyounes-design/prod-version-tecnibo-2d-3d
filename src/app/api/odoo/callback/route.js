// src/app/api/odoo/callback/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

const ODOO_BASE_RAW = process.env.ODOO_BASE;
const CLIENT_ID = process.env.ODOO_CLIENT_ID;
const CLIENT_SECRET = process.env.ODOO_CLIENT_SECRET;

const LOG_PREFIX = "[odoo/callback]";
const log = (...args) => console.log(LOG_PREFIX, ...args);

const normalizeBase = (base) => (base ? String(base).trim().replace(/\/+$/, "") : "");


function responseWithCors(req, body, { status = 200, headers } = {}) {
  const responseHeaders = new Headers(headers || {});
  const corsHeaders = getCorsHeaders(req);

  for (const [key, value] of Object.entries(corsHeaders)) {
    if (key.toLowerCase() === "content-type") continue;
    responseHeaders.set(key, value);
  }

  return new Response(body, { status, headers: responseHeaders });
}

function isHttpsRequest(req) {
  const xfProto = req.headers.get("x-forwarded-proto");
  if (xfProto) return xfProto.split(",")[0].trim().toLowerCase() === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return true;
  }
}

function requestOrigin(req) {
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "rp.tecnibo.com")
    .split(",")[0]
    .trim();
  return `${proto}://${host}`;
}

function setCookie(
  headers,
  name,
  value,
  { maxAge, secure, path = "/", httpOnly = true, sameSite = "Lax", domain } = {}
) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (typeof maxAge === "number") parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  if (domain) parts.push(`Domain=${domain}`);
  headers.append("Set-Cookie", parts.join("; "));
}


function getCookie(req, name) {
  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}



function safeReturnTo(raw, origin) {
  const DEFAULT = `${origin}/`;
  if (!raw) return DEFAULT;

  if (raw.startsWith("/") && !raw.startsWith("//")) return `${origin}${raw}`;

  try {
    const u = new URL(raw);
    const okHost = u.hostname === "rp.tecnibo.com" || u.hostname === "backend.tecnibo.com";
    if (u.protocol === "https:" && okHost) return u.toString();
  } catch {}

  return DEFAULT;
}

function clearCookieBoth(headers, name, secure) {
  // host-only delete
  setCookie(headers, name, "", { maxAge: 0, secure });
  // cleanup old domain cookie from previous deploys
  setCookie(headers, name, "", { maxAge: 0, secure, domain: ".tecnibo.com" });
}

async function exchangeToken({ tokenURL, code, redirectUri, useBasicAuth, includeClientCredsInBody }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    ...(includeClientCredsInBody ? { client_id: CLIENT_ID, client_secret: CLIENT_SECRET } : {}),
  });

  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };

  if (useBasicAuth) {
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    headers.authorization = `Basic ${basic}`;
  }

  const res = await fetch(tokenURL, { method: "POST", headers, body });
  const text = await res.text();
  return { res, text };
}

export async function GET(req) {
  const ODOO_BASE = normalizeBase(ODOO_BASE_RAW);
  if (!ODOO_BASE || !CLIENT_ID || !CLIENT_SECRET) {
    return responseWithCors(req, "Missing OAuth env", { status: 500 });
  }

  const origin = requestOrigin(req);
  const secure = isHttpsRequest(req);

  // must match what /login used
  const redirectUri = `${origin}/api/odoo/callback`;

  const url = new URL(req.url);

  // provider error (like invalid_scope)
  const oauthError = url.searchParams.get("error");
  const oauthErrorDesc = url.searchParams.get("error_description");
  if (oauthError) {
    log("oauth error callback", { oauthError, oauthErrorDesc: oauthErrorDesc || null, origin });

    // redirect back to app with an error marker (optional but helpful)
    const returnToCookie = getCookie(req, "odoo_return_to");
    const returnTo = safeReturnTo(returnToCookie, origin);
    const back = new URL(returnTo);
    back.searchParams.set("oauth_error", oauthError);
    if (oauthErrorDesc) back.searchParams.set("oauth_error_description", oauthErrorDesc);

    const h = new Headers();
    clearCookieBoth(h, "odoo_oauth_state", secure);
    clearCookieBoth(h, "odoo_return_to", secure);
    h.set("Location", back.toString());
    return responseWithCors(req, null, { status: 302, headers: h });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = getCookie(req, "odoo_oauth_state");

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return responseWithCors(req, "Invalid or missing code/state", { status: 400 });
  }

  const returnToCookie = getCookie(req, "odoo_return_to");
  const returnTo = safeReturnTo(returnToCookie || url.searchParams.get("returnTo"), origin);

  const tokenURL = `${ODOO_BASE}/oauth/token`;

  let tokenRes, text;

  ({ res: tokenRes, text } = await exchangeToken({
    tokenURL,
    code,
    redirectUri,
    useBasicAuth: true,
    includeClientCredsInBody: false,
  }));

  if (!tokenRes.ok) {
    ({ res: tokenRes, text } = await exchangeToken({
      tokenURL,
      code,
      redirectUri,
      useBasicAuth: false,
      includeClientCredsInBody: true,
    }));
  }

  if (!tokenRes.ok) {
    return responseWithCors(req, `Token exchange failed: ${tokenRes.status}\n${text}`, { status: 400 });
  }

  let tk;
  try {
    tk = JSON.parse(text);
  } catch {
    return responseWithCors(req, "Bad JSON from token endpoint", { status: 400 });
  }

  const accessToken = tk.access_token;
  const refreshToken = tk.refresh_token;
  const sessionId = tk.session_id || tk.sid;
  const expiresIn = Number(tk.expires_in || 3600);

  if (!accessToken) return responseWithCors(req, "No access_token in token response", { status: 400 });

  const respHeaders = new Headers();

  // clean old variants
  clearCookieBoth(respHeaders, "session_id", secure);
  clearCookieBoth(respHeaders, "odoo_at", secure);
  clearCookieBoth(respHeaders, "odoo_rt", secure);
  clearCookieBoth(respHeaders, "odoo_oauth_state", secure);
  clearCookieBoth(respHeaders, "odoo_return_to", secure);

  // set host-only cookies
  setCookie(respHeaders, "odoo_at", accessToken, { maxAge: Math.max(300, expiresIn - 60), secure });
  if (refreshToken) setCookie(respHeaders, "odoo_rt", refreshToken, { maxAge: 60 * 60 * 24 * 30, secure });
  if (sessionId) setCookie(respHeaders, "session_id", sessionId, { maxAge: 60 * 60 * 24 * 7, secure });

  // clear transient cookies
  setCookie(respHeaders, "odoo_oauth_state", "", { maxAge: 0, secure });
  setCookie(respHeaders, "odoo_return_to", "", { maxAge: 0, secure });

  respHeaders.set("Location", returnTo);
  log("redirecting", { origin, redirectUri, returnTo });

  return responseWithCors(req, null, { status: 302, headers: respHeaders });
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}
