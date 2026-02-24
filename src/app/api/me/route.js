export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

const ODOO_BASE = process.env.ODOO_BASE;
const ODOO_DB = process.env.ODOO_DB;

const PARTNER_FIELDS = [
  "id",
  "name",
  "email",
  "phone",
  "mobile",
  "street",
  "street2",
  "city",
  "zip",
  "state_id",
  "country_id",
  "function",
  "company_name",
];


function jsonResponse(req, data, { status = 200, headers } = {}) {
  const responseHeaders = new Headers(headers || {});
  const corsHeaders = getCorsHeaders(req);
  for (const [key, value] of Object.entries(corsHeaders)) {
    if (key.toLowerCase() === "content-type") continue;
    responseHeaders.set(key, value);
  }
  if (!responseHeaders.has("content-type")) {
    responseHeaders.set("content-type", "application/json");
  }
  if (!responseHeaders.has("cache-control")) {
    responseHeaders.set("cache-control", "no-store");
  }

  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

function buildOdooUrl(host, pathname) {
  const base = (host || "").replace(/\/$/, "");
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}




function withOptionalDb(url) {
  if (!ODOO_DB) return url;
  const u = new URL(url);
  if (!u.searchParams.has("db")) u.searchParams.set("db", ODOO_DB);
  return u.toString();
}



function getCookie(req, name) {
  const c = req.headers.get("cookie") || "";
  const m = c.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function ensurePositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
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

function setCookie(headers, name, value, { maxAge, secure, httpOnly = true, sameSite = "Lax", path = "/" } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (typeof maxAge === "number") parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  headers.append("Set-Cookie", parts.join("; "));
}

function authMeta(req, extra = {}) {
  return {
    has_odoo_at: Boolean(getCookie(req, "odoo_at")),
    has_odoo_rt: Boolean(getCookie(req, "odoo_rt")),
    has_session_id: Boolean(getCookie(req, "session_id")),
    ...extra,
  };
}

function summarizeUser(userinfo, fallback = {}) {
  const partnerId = Array.isArray(userinfo?.partner_id)
    ? ensurePositiveInt(userinfo.partner_id[0])
    : ensurePositiveInt(userinfo?.partner_id);

  const companyId = Array.isArray(userinfo?.company_id)
    ? ensurePositiveInt(userinfo.company_id[0])
    : ensurePositiveInt(userinfo?.company_id);

  return {
    id: ensurePositiveInt(userinfo?.sub) || ensurePositiveInt(userinfo?.uid) || fallback.id || null,
    name: userinfo?.name || fallback.name || null,
    email: userinfo?.email || fallback.email || null,
    login: userinfo?.login || userinfo?.preferred_username || fallback.login || null,
    db: userinfo?.db || fallback.db || ODOO_DB || null,
    company_id: companyId || fallback.company_id || null,
    partner_id: partnerId || fallback.partner_id || null,
  };
}

/** Normalize raw Odoo session_info (or OAuth user) into the shape transformProjectData expects. */
function buildSessionInfoShape(rawSessionInfo, user) {
  const partnerRaw = rawSessionInfo?.partner_id;
  const partnerId = Array.isArray(partnerRaw)
    ? ensurePositiveInt(partnerRaw[0])
    : ensurePositiveInt(partnerRaw) || user?.partner_id || null;

  const companyRaw = rawSessionInfo?.company_id;
  const companyId = Array.isArray(companyRaw)
    ? ensurePositiveInt(companyRaw[0])
    : ensurePositiveInt(companyRaw) || user?.company_id || null;

  return {
    uid:        ensurePositiveInt(rawSessionInfo?.uid) || user?.id || null,
    name:       rawSessionInfo?.name       || user?.name  || null,
    username:   rawSessionInfo?.username   || user?.email || user?.login || null,
    partner_id: partnerId,
    db:         rawSessionInfo?.db         || user?.db    || ODOO_DB || null,
    user_context: {
      current_company: rawSessionInfo?.user_context?.current_company || companyId || null,
      tz:   rawSessionInfo?.user_context?.tz   || "Africa/Casablanca",
      lang: rawSessionInfo?.user_context?.lang || "en_US",
    },
  };
}

/** Fetch job_title from hr.employee for this uid (best-effort, non-blocking). */
async function fetchJobPosition(uid, companyId, sessionId) {
  try {
    const payload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "hr.employee",
        method: "search_read",
        args: [[["user_id", "=", uid]]],
        kwargs: {
          fields: ["id", "job_title"],
          limit: 1,
          context: {
            lang: "en_US",
            tz: "Africa/Casablanca",
            uid,
            allowed_company_ids: [companyId].filter(Boolean),
          },
        },
      },
      id: Date.now(),
    };

    const res = await fetch(
      buildOdooUrl(ODOO_BASE, "/web/dataset/call_kw/hr.employee/search_read"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { Cookie: `session_id=${sessionId}` } : {}),
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      }
    );

    const data = await res.json().catch(() => null);
    if (!data || data.error) return null;
    // Normalize to { result: { records: [...] } } — aligns with projects/route.js
    // call_kw search_read returns result as a flat array; web_search_read returns { records }
    const raw = data.result;
    const records = Array.isArray(raw) ? raw : (raw?.records ?? []);
    return { result: { records } };
  } catch {
    return null;
  }
}

async function callUserInfo(accessToken) {
  const userinfoUrls = [
    withOptionalDb(buildOdooUrl(ODOO_BASE, "/oauth/userinfo")),
    withOptionalDb(buildOdooUrl(ODOO_BASE, "/oauth2/userinfo")),
  ];
  
  let last = null;
  for (const url of userinfoUrls) {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      cache: "no-store",
    });
    last = res;
    if (res.status === 404 && url !== userinfoUrls[userinfoUrls.length - 1]) continue;
    return res;
  }
  return last;
}

async function refreshAccessToken(refreshToken) {
  const tokenUrls = [buildOdooUrl(ODOO_BASE, "/oauth/token"), buildOdooUrl(ODOO_BASE, "/oauth2/token")];

  let tokenRes = null;
  for (const tokenURL of tokenUrls) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.ODOO_CLIENT_ID || "",
      client_secret: process.env.ODOO_CLIENT_SECRET || "",
    });

    if (ODOO_DB) body.set("db", ODOO_DB);

    tokenRes = await fetch(tokenURL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
    });

    if (tokenRes.status === 404 && tokenURL !== tokenUrls[tokenUrls.length - 1]) continue;
    break;
  }

  if (!tokenRes?.ok) return { ok: false, tokenRes };
  const payload = await tokenRes.json().catch(() => null);
  return { ok: true, tokenRes, payload };
}

async function getSessionInfo(sessionId) {
  const response = await fetch(buildOdooUrl(ODOO_BASE, "/web/session/get_session_info"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      cookie: `session_id=${encodeURIComponent(sessionId)}`,
    },
    body: "{}",
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) return null;
  return body?.result || null;
}

async function fetchPartner({ sessionId, user }) {
  if (!sessionId || !user?.id) return { partner: null };

  const domain = user.partner_id ? [["id", "=", user.partner_id]] : [["user_ids", "in", [user.id]]];
  const context = { lang: "en_US" };
  if (user.company_id) {
    context.allowed_company_ids = [user.company_id];
    context.force_company = user.company_id;
  }

  const rpcRes = await fetch(buildOdooUrl(ODOO_BASE, "/web/dataset/call_kw/res.partner/search_read"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${encodeURIComponent(sessionId)}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "res.partner",
        method: "search_read",
        args: [domain, PARTNER_FIELDS],
        kwargs: { limit: 1, context },
      },
      id: Date.now(),
    }),
    cache: "no-store",
  });

  const rpcData = await rpcRes.json().catch(() => null);
  if (!rpcRes.ok) {
    return { partner: null, error: `Partner RPC failed (${rpcRes.status})` };
  }
  if (rpcData?.error) {
    return { partner: null, error: rpcData.error?.data?.message || "Partner RPC error" };
  }

  return { partner: rpcData?.result?.[0] || null };
}

export async function GET(req) {
  if (!ODOO_BASE) {
    return jsonResponse(req, { success: false, authenticated: false, error: "Missing ODOO_BASE" }, { status: 500 });
  }

  const url = new URL(req.url);
  const includePartner = url.searchParams.get("include_partner") === "1";
  const debug = url.searchParams.get("debug") === "1";

  let accessToken = getCookie(req, "odoo_at");
  const refreshToken = getCookie(req, "odoo_rt");
  let sessionId = getCookie(req, "session_id");

  let responseHeaders = new Headers();
  let refreshed = false;

  if (!accessToken) {
    if (!sessionId) {
      return jsonResponse(
        req,
        {
          success: false,
          authenticated: false,
          error: "no_access_token",
          auth: authMeta(req, { mode: "missing" }),
        },
        { status: 401 }
      );
    }

    const sessionInfo = await getSessionInfo(sessionId);
    if (!sessionInfo?.uid) {
      return jsonResponse(
        req,
        {
          success: false,
          authenticated: false,
          error: "invalid_session",
          auth: authMeta(req, { mode: "session" }),
        },
        { status: 401 }
      );
    }

    const user = summarizeUser(
      {
        sub: sessionInfo.uid,
        name: sessionInfo.name,
        login: sessionInfo.username,
        db: sessionInfo.db,
      },
      {
        id: ensurePositiveInt(sessionInfo.uid),
        name: sessionInfo.name || null,
        login: sessionInfo.username || null,
        db: sessionInfo.db || ODOO_DB || null,
      }
    );

    const job_position = await fetchJobPosition(user.id, user.company_id, sessionId);

    const body = {
      uid: user.id,
      success: true,
      authenticated: true,
      session_info: buildSessionInfoShape(sessionInfo, user),
      job_position,
      user,
      auth: authMeta(req, { mode: "session", refreshed: false }),
      meta: {
        odoo_base: ODOO_BASE,
        db: user.db,
      },
    };

    if (includePartner) {
      const partnerResult = await fetchPartner({ sessionId, user });
      if (partnerResult.partner) body.partner = partnerResult.partner;
      if (partnerResult.error) body.partner_error = partnerResult.error;
    }

    return jsonResponse(req, body);
  }

  let userInfoResponse = await callUserInfo(accessToken);

  if (userInfoResponse.status === 401 && refreshToken) {
    const refreshedToken = await refreshAccessToken(refreshToken);
    if (refreshedToken.ok && refreshedToken.payload?.access_token) {
      const tk = refreshedToken.payload;
      refreshed = true;
      accessToken = tk.access_token;
      sessionId = tk.session_id || sessionId;

      const secure = isHttpsRequest(req);
      const reqOrigin = req.headers.get("origin") || "";
      const isCrossSite = (() => {
        if (!reqOrigin) return false;
        try { return new URL(reqOrigin).hostname !== new URL(req.url).hostname; } catch { return false; }
      })();
      const sameSite = isCrossSite ? "None" : "Lax";
      const effectiveSecure = isCrossSite ? true : secure;
      setCookie(responseHeaders, "odoo_at", tk.access_token, {
        maxAge: Math.max(300, Number(tk.expires_in || 3600) - 60),
        secure: effectiveSecure,
        sameSite,
      });
      if (tk.refresh_token) {
        setCookie(responseHeaders, "odoo_rt", tk.refresh_token, {
          maxAge: 60 * 60 * 24 * 30,
          secure: effectiveSecure,
          sameSite,
        });
      }
      if (tk.session_id) {
        setCookie(responseHeaders, "session_id", tk.session_id, {
          maxAge: 60 * 60 * 24 * 7,
          secure: effectiveSecure,
          sameSite,
        });
      }

      userInfoResponse = await callUserInfo(accessToken);
    }
  }

  if (!userInfoResponse?.ok) {
    const upstreamText = await userInfoResponse.text().catch(() => "");
    if (debug) {
      console.log("[api/me] userinfo failed", userInfoResponse?.status, upstreamText.slice(0, 300));
    }

    return jsonResponse(
      req,
      {
        success: false,
        authenticated: false,
        error: "userinfo_failed",
        upstream_status: userInfoResponse?.status || 500,
        auth: authMeta(req, { mode: "oauth", refreshed }),
      },
      { status: 401, headers: responseHeaders }
    );
  }

  const userinfo = await userInfoResponse.json().catch(() => ({}));
  const user = summarizeUser(userinfo);

  const job_position = await fetchJobPosition(user.id, user.company_id, sessionId);

  const body = {
    uid: user.id,
    success: true,
    authenticated: true,
    session_info: buildSessionInfoShape(null, user),
    job_position,
    userinfo,
    user,
    auth: authMeta(req, { mode: "oauth", refreshed }),
    meta: {
      odoo_base: ODOO_BASE,
      db: user.db,
    },
  };

  if (includePartner) {
    const partnerResult = await fetchPartner({ sessionId, user });
    if (partnerResult.partner) body.partner = partnerResult.partner;
    if (partnerResult.error) body.partner_error = partnerResult.error;
  }

  return jsonResponse(req, body, { headers: responseHeaders });
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}
