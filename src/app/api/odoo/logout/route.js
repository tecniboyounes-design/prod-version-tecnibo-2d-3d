// src/app/api/odoo/logout/route.js
export const dynamic = "force-dynamic";

import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

function responseWithCors(req, body, { status = 200, headers } = {}) {
  const responseHeaders = new Headers(headers || {});
  const corsHeaders = getCorsHeaders(req);

  for (const [key, value] of Object.entries(corsHeaders)) {
    if (key.toLowerCase() === "content-type") continue;
    responseHeaders.set(key, value);
  }

  return new Response(body, { status, headers: responseHeaders });
}

function isHttps(req) {
  const xf = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  if (xf) return xf === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return true;
  }
}

function setCookie(headers, name, value, { maxAge = 0, secure, domain } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
  ];
  if (secure) parts.push("Secure");
  if (domain) parts.push(`Domain=${domain}`);
  headers.append("Set-Cookie", parts.join("; "));
}

function clearCookieBoth(headers, name, secure) {
  // host-only
  setCookie(headers, name, "", { maxAge: 0, secure });
  // cleanup old domain cookies from older deployments
  setCookie(headers, name, "", { maxAge: 0, secure, domain: ".tecnibo.com" });
}

function detectCallerOrigin(req) {
  // Prefer Origin header (often present for same-site navigations)
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const u = new URL(origin);
      if (u.protocol === "https:" && (u.hostname === "rp.tecnibo.com" || u.hostname === "backend.tecnibo.com")) {
        return u.origin;
      }
    } catch {}
  }

  // Fallback to Referer
  const ref = req.headers.get("referer");
  if (ref) {
    try {
      const u = new URL(ref);
      if (u.protocol === "https:" && (u.hostname === "rp.tecnibo.com" || u.hostname === "backend.tecnibo.com")) {
        return u.origin;
      }
    } catch {}
  }

  // Default
  return "https://rp.tecnibo.com";
}

/**
 * ✅ Always returns ABSOLUTE url:
 * - absolute allowed only to rp/backend
 * - relative "/x" attaches to callerOrigin
 * - default -> callerOrigin "/"
 */
function safeReturnTo(raw, callerOrigin) {
  const DEFAULT = `${callerOrigin}/`;

  if (!raw) return DEFAULT;

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return `${callerOrigin}${raw}`;
  }

  try {
    const u = new URL(raw);
    const okHost = u.hostname === "rp.tecnibo.com" || u.hostname === "backend.tecnibo.com";
    if (u.protocol === "https:" && okHost) return u.toString();
  } catch {}

  return DEFAULT;
}

export async function GET(req) {
  const headers = new Headers();
  const secure = isHttps(req);
  const url = new URL(req.url);

  const callerOrigin = detectCallerOrigin(req);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"), callerOrigin);

  clearCookieBoth(headers, "odoo_at", secure);
  clearCookieBoth(headers, "odoo_rt", secure);
  clearCookieBoth(headers, "session_id", secure);
  clearCookieBoth(headers, "odoo_oauth_state", secure);
  clearCookieBoth(headers, "odoo_return_to", secure);

  headers.set("Location", returnTo);
  return responseWithCors(req, null, { status: 302, headers });
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}
