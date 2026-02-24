// src/app/api/odoo/login/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import crypto from "crypto";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

const ODOO_BASE = (process.env.ODOO_BASE || "https://www.tecnibo.com").replace(/\/+$/, "");
const CLIENT_ID = process.env.ODOO_CLIENT_ID;
const REDIRECT_URI = process.env.ODOO_REDIRECT_URI; // ✅ MUST be https://backend.tecnibo.com/api/odoo/callback

// Optional: only include if your Odoo OAuth app expects it
const ODOO_SCOPE = (process.env.ODOO_SCOPES || process.env.ODOO_SCOPE || "").trim();

const LOG_PREFIX = "[odoo/login]";
const log = (...a) => console.log(LOG_PREFIX, ...a);


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
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "backend.tecnibo.com")
    .split(",")[0]
    .trim();
  return `${proto}://${host}`;
}


function setCookie(headers, name, value, { maxAge, secure, path = "/", httpOnly = true, sameSite = "Lax" } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (typeof maxAge === "number") parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  headers.append("Set-Cookie", parts.join("; "));
}


function safeReturnTo(raw, origin) {
  const DEFAULT = `${origin}/`;
  if (!raw) return DEFAULT;

  if (raw.startsWith("/") && !raw.startsWith("//")) return `${origin}${raw}`;

  try {
    const u = new URL(raw);
    const okHost =
      u.hostname === "rp.tecnibo.com" ||
      u.hostname === "backend.tecnibo.com" ||
      u.hostname === "localhost";
    const okProto = u.protocol === "https:" || u.protocol === "http:";
    if (okProto && okHost) return u.toString();
  } catch {}

  return DEFAULT;
}


export async function GET(req) {
  if (!CLIENT_ID) return responseWithCors(req, "Missing ODOO_CLIENT_ID", { status: 500 });
  if (!REDIRECT_URI) return responseWithCors(req, "Missing ODOO_REDIRECT_URI", { status: 500 });

  const origin = requestOrigin(req);
  const secure = isHttpsRequest(req);

  const url = new URL(req.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"), origin);

  const state = crypto.randomBytes(24).toString("hex");

  const headers = new Headers();
  setCookie(headers, "odoo_oauth_state", state, { maxAge: 600, secure });
  setCookie(headers, "odoo_return_to", returnTo, { maxAge: 600, secure });

  const auth = new URL(`${ODOO_BASE}/oauth/authorize`);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("client_id", CLIENT_ID);
  auth.searchParams.set("redirect_uri", REDIRECT_URI); // ✅ pinned
  auth.searchParams.set("state", state);

  if (ODOO_SCOPE) auth.searchParams.set("scope", ODOO_SCOPE);

  log("authorize redirect", {
    origin,
    redirectUri: REDIRECT_URI,
    returnTo,
    scope: ODOO_SCOPE || "(omitted)",
    auth: auth.toString(),
  });

  headers.set("Location", auth.toString());
  return responseWithCors(req, null, { status: 302, headers });
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}
