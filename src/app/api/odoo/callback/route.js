// src/app/api/odoo/callback/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ODOO_BASE_RAW = process.env.ODOO_BASE;
const CLIENT_ID = process.env.ODOO_CLIENT_ID;
const CLIENT_SECRET = process.env.ODOO_CLIENT_SECRET;
const REDIRECT_URI = process.env.ODOO_REDIRECT_URI;

// Shared cookies across subdomains
const COOKIE_DOMAIN = process.env.ODOO_COOKIE_DOMAIN || ""; // ".tecnibo.com"

const LOG_PREFIX = "[odoo/callback]";
const log = (...args) => console.log(LOG_PREFIX, ...args);

const mask = (value, { showStart = 4, showEnd = 4, max = 240 } = {}) => {
  if (value == null) return value;
  const str = String(value);
  const truncated = str.length > max ? `${str.slice(0, max)}…` : str;
  if (truncated.length <= showStart + showEnd) return "*".repeat(truncated.length);
  return `${truncated.slice(0, showStart)}…${truncated.slice(-showEnd)}`;
};

const normalizeBase = (base) => {
  if (!base) return "";
  return String(base).trim().replace(/\/+$/, "");
};

function setCookie(
  headers,
  name,
  value,
  {
    maxAge,
    secure,
    path = "/",
    httpOnly = true,
    sameSite = "Lax",
    domain = COOKIE_DOMAIN,
  } = {}
) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (typeof maxAge === "number") parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  if (domain) parts.push(`Domain=${domain}`);
  headers.append("Set-Cookie", parts.join("; "));
}

function json(data, status = 200, extraHeaders) {
  const headers = new Headers(extraHeaders || {});
  headers.set("content-type", "application/json");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function getCookie(req, name) {
  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function isHttpsRequest(req) {
  const xfProto = req.headers.get("x-forwarded-proto");
  if (xfProto) return xfProto.split(",")[0].trim().toLowerCase() === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Safe returnTo:
 * - allow absolute URLs ONLY to rp.tecnibo.com (or subpaths)
 * - allow relative paths like "/something" -> will be attached to rp.tecnibo.com
 * - anything else -> rp home
 */
function safeReturnTo(raw) {
  const DEFAULT = "https://rp.tecnibo.com/";
  if (!raw) return DEFAULT;

  // Relative path: attach to rp
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return `https://rp.tecnibo.com${raw}`;
  }

  // Absolute URL: allow only rp.tecnibo.com
  try {
    const u = new URL(raw);
    if (u.protocol === "https:" && u.hostname === "rp.tecnibo.com") return u.toString();
  } catch {
    // ignore
  }
  return DEFAULT;
}

async function exchangeToken({ tokenURL, code, useBasicAuth, includeClientCredsInBody }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
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

  log("start", { url: req.url, method: "GET" });
  log("env", {
    hasOdooBase: Boolean(ODOO_BASE),
    hasClientId: Boolean(CLIENT_ID),
    hasClientSecret: Boolean(CLIENT_SECRET),
    hasRedirectUri: Boolean(REDIRECT_URI),
    odooBase: ODOO_BASE || null,
    clientId: CLIENT_ID ? mask(CLIENT_ID) : null,
    clientSecret: CLIENT_SECRET ? mask(CLIENT_SECRET) : null,
    redirectUri: REDIRECT_URI || null,
    cookieDomain: COOKIE_DOMAIN || null,
  });

  if (!ODOO_BASE || !CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    log("missing env; aborting");
    return json({ error: "Missing OAuth env" }, 500);
  }

  const url = new URL(req.url);

  // OAuth error callback
  const oauthError = url.searchParams.get("error");
  const oauthErrorDesc = url.searchParams.get("error_description");
  if (oauthError) {
    log("oauth error callback", { error: oauthError, desc: oauthErrorDesc || null });
    return json({ error: oauthError, error_description: oauthErrorDesc || null }, 400);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));

  const stateCookie = getCookie(req, "odoo_oauth_state");
  log("params", {
    code: code ? mask(code) : null,
    state: state ? mask(state) : null,
    stateCookie: stateCookie ? mask(stateCookie) : null,
    returnTo,
  });

  if (!code || !state || !stateCookie || state !== stateCookie) {
    log("invalid code/state", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasStateCookie: Boolean(stateCookie),
      stateMatchesCookie: Boolean(state && stateCookie && state === stateCookie),
    });
    return new Response("Invalid or missing code/state", { status: 400 });
  }

  const tokenURL = `${ODOO_BASE}/oauth/token`;
  log("token request", { tokenURL });

  // Attempt 1: Basic Auth
  let tokenRes, text;
  {
    const r = await exchangeToken({
      tokenURL,
      code,
      useBasicAuth: true,
      includeClientCredsInBody: false,
    });
    tokenRes = r.res;
    text = r.text;

    log("token response attempt1", {
      ok: tokenRes.ok,
      status: tokenRes.status,
      contentType: tokenRes.headers.get("content-type"),
      textLength: text.length,
      textPreview: text ? mask(text, { max: 320 }) : "",
    });
  }

  // Attempt 2: fallback with body creds
  if (!tokenRes.ok) {
    const r = await exchangeToken({
      tokenURL,
      code,
      useBasicAuth: false,
      includeClientCredsInBody: true,
    });
    tokenRes = r.res;
    text = r.text;

    log("token response attempt2", {
      ok: tokenRes.ok,
      status: tokenRes.status,
      contentType: tokenRes.headers.get("content-type"),
      textLength: text.length,
      textPreview: text ? mask(text, { max: 320 }) : "",
    });
  }

  if (!tokenRes.ok) {
    log("token exchange failed", { status: tokenRes.status });
    return new Response(`Token exchange failed: ${tokenRes.status}\n${text}`, { status: 400 });
  }

  let tk;
  try {
    tk = JSON.parse(text);
  } catch {
    log("token response JSON parse failed");
    return new Response("Bad JSON from token endpoint", { status: 400 });
  }

  const accessToken = tk.access_token;
  const refreshToken = tk.refresh_token;

  // ✅ accept both shapes
  const sessionId = tk.session_id || tk.sid;

  const expiresIn = Number(tk.expires_in || 3600);

  log("token parsed", {
    keys: Object.keys(tk || {}),
    accessToken: accessToken ? mask(accessToken) : null,
    refreshToken: refreshToken ? mask(refreshToken) : null,
    sessionId: sessionId ? mask(sessionId) : null,
    expiresIn,
  });

  if (!accessToken) {
    log("no access_token in response");
    return new Response("No access_token in token response", { status: 400 });
  }

  const respHeaders = new Headers();
  const secure = isHttpsRequest(req);

  // Tokens
  setCookie(respHeaders, "odoo_at", accessToken, {
    maxAge: Math.max(300, expiresIn - 60),
    secure,
  });

  if (refreshToken) {
    setCookie(respHeaders, "odoo_rt", refreshToken, {
      maxAge: 60 * 60 * 24 * 30,
      secure,
    });
  }

  // Odoo web session cookie
  if (sessionId) {
    setCookie(respHeaders, "session_id", sessionId, {
      maxAge: 60 * 60 * 24 * 7,
      secure,
    });
  }

  // Clear state cookie (same domain)
  setCookie(respHeaders, "odoo_oauth_state", "", { maxAge: 0, secure });

  respHeaders.set("Location", returnTo);
  log("redirecting", { location: returnTo });

  return new Response(null, { status: 302, headers: respHeaders });
}
