import { NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/cors";

// ── Force 4444-first precedence ───────────────────────────────────────────────
const HOST        = process.env.COMPATIBILITY_HOST ?? "192.168.30.92";
const COMPAT_PORT = process.env.COMPATIBILITY_PORT ?? "9004";

// Prefer explicit COMPATIBILITY_BASE_URL, else build from HOST:PORT
const TARGET_BASE =
  (process.env.COMPATIBILITY_BASE_URL ||
   `http://${HOST}:${COMPAT_PORT}/compatibility`).replace(/\/+$/,"");

// Only used for CORS Origin header when forwarding non-GET
const PROXY_PORT  = process.env.NEXT_PUBLIC_APP_PORT ?? process.env.PROXY_PORT ?? "3009";
const UPSTREAM_ALLOWED_ORIGIN =
  process.env.UPSTREAM_ALLOWED_ORIGIN ?? `http://${HOST}:${PROXY_PORT}`;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORWARD_HEADER_ALLOWLIST = [
  "content-type",
  "authorization",
  "cookie",
  "accept",
  "accept-language",
  "x-request-id",
  "x-forwarded-for",
  "x-forwarded-proto",
  "x-forwarded-host",
];

const PATH_ALIASES = { list: "descriptors" }; // /api/descriptor/list → /compatibility/descriptors





// Normalize slug: strip accidental leading "compatibility"
function normalizeSlugParts(slug) {
  let parts = (Array.isArray(slug) ? slug : []).map(String);
  if (parts[0] && parts[0].toLowerCase() === "compatibility") {
    parts = parts.slice(1);
  }
  if (parts[0]) {
    const k = parts[0].toLowerCase();
    if (PATH_ALIASES[k]) parts[0] = PATH_ALIASES[k];
  }
  return parts;
}

function buildTargetUrl(req, params) {
  const parts = normalizeSlugParts(params?.slug);
  const slugPath = parts.length ? "/" + parts.map(encodeURIComponent).join("/") : "";
  const search = req.nextUrl?.search ?? "";
  return `${TARGET_BASE}${slugPath}${search}`;
}

async function makeInitFromRequest(req, signal) {
  const init = { method: req.method, headers: new Headers(), signal };

  const hasBody = !["GET", "HEAD"].includes(req.method);
  if (hasBody) {
    const len = Number(req.headers.get("content-length") || "0");
    const STREAM_THRESHOLD = 256 * 1024;
    if (len && len <= STREAM_THRESHOLD) {
      init.body = await req.arrayBuffer();
    } else {
      init.body = req.body;
      // @ts-expect-error undici extension
      init.duplex = "half";
    }
    // Let upstream accept via CORS (only matters if cross-origin)
    init.headers.set("origin", UPSTREAM_ALLOWED_ORIGIN);
    init.headers.set("referer", `${UPSTREAM_ALLOWED_ORIGIN}/`);
  }

  for (const [k, v] of req.headers) {
    if (FORWARD_HEADER_ALLOWLIST.includes(k.toLowerCase())) {
      init.headers.set(k, v);
    }
  }
  if (!init.headers.has("x-forwarded-proto")) {
    init.headers.set("x-forwarded-proto", req.nextUrl.protocol.replace(":", ""));
  }
  if (!init.headers.has("x-forwarded-host")) {
    init.headers.set("x-forwarded-host", req.headers.get("host") || "");
  }
  return init;
}

async function forward(req, { params }) {
  const cors = getCorsHeaders(req);
  const targetUrl = buildTargetUrl(req, params);

  // Incoming log
  // console.log(
  //   "🟦 [INCOMING]",
  //   JSON.stringify({
  //     method: req.method,
  //     path: req.nextUrl.pathname,
  //     search: req.nextUrl.search || "",
  //     host: req.headers.get("host"),
  //     TARGET_BASE,
  //   })
  // );

  // Self-call & :9004 hard block
  
  try {
    const target = new URL(targetUrl);
    const incomingHost = req.headers.get("host") || "";
    if (target.host === incomingHost) {
      console.error("⛔ Refusing to forward to self (loop risk):", targetUrl);
      return NextResponse.json(
        { error: "Misconfigured DESCRIPTOR_SERVICE_BASE_URL (points to this server)" },
        { status: 502, headers: cors }
      );
    }
   
  } catch {
    // ignore URL parse errors (fetch will throw later)
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);

  try {
    const init = await makeInitFromRequest(req, ctrl.signal);

    // console.log(
    //   "🟨 [FORWARD → UPSTREAM]",
    //   JSON.stringify({
    //     targetUrl,
    //     method: init.method,
    //     headers: headersToObject(init.headers),
    //     hasBody: !!init.body,
    // }));    

    const t0 = Date.now();
    const upstream = await fetch(targetUrl, init);
    const ms = Date.now() - t0;

    const out = new Headers(cors);
    const ct = upstream.headers.get("content-type");
    if (ct) out.set("content-type", ct);

    const cd = upstream.headers.get("content-disposition");
    if (cd) out.set("content-disposition", cd);
    else if (req.method === "POST" && req.nextUrl.pathname.endsWith("/sql")) {
      out.set(
        "content-disposition",
        `attachment; filename="${
          new URL(req.url).searchParams.get("name") ?? "update"
        }.sql"`
      );
    }

    out.set("cache-control", upstream.headers.get("cache-control") ?? "no-store");

    const cookies =
      upstream.headers.getSetCookie?.() ??
      upstream.headers.getAll?.("set-cookie") ??
      [];
    for (const c of cookies) out.append("set-cookie", c);

    // Short body preview for logs (text/json/sql only)
    let preview = "";
    try {
      const clone = upstream.clone();
      const ctype = (clone.headers.get("content-type") || "").toLowerCase();
      if (ctype.includes("application/json") || ctype.startsWith("text/") || ctype.includes("application/sql")) {
        preview = await clone.text();
        const MAX = 1024;
        if (preview.length > MAX) preview = preview.slice(0, MAX) + "…";
      } else {
        preview = `<non-text body: ${ctype || "unknown"}>`;
      }
    } catch (e) {
      preview = `<preview-error: ${e?.message || e}>`;
    }

    // console.log(
    //   "🟩 [UPSTREAM ↩]",
    //   JSON.stringify({
    //     targetUrl,
    //     status: upstream.status,
    //     durationMs: ms,
    //     headers: headersToObject(upstream.headers),
    //     bodyPreview: preview,
    //   })
    // );

    if (req.method === "HEAD") {
      return new NextResponse(null, { status: upstream.status, headers: out });
    }
    return new NextResponse(upstream.body, { status: upstream.status, headers: out });
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    const msg = isAbort ? "Upstream timed out" : err?.message ?? "Proxy failed";
    console.error(
      "❌ [PROXY ERROR]",
      JSON.stringify({
        targetUrl,
        error: msg,
        name: err?.name,
        stack: err?.stack?.split("\n").slice(0, 3).join(" \\ "),
      })
    );
    return NextResponse.json({ error: msg }, { status: 502, headers: cors });
  } finally {
    clearTimeout(timer);
  }
}

export async function OPTIONS(req) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
export async function GET(req, ctx)    { return forward(req, ctx); }
export async function HEAD(req, ctx)   { return forward(req, ctx); }
export async function POST(req, ctx)   { return forward(req, ctx); }
export async function PUT(req, ctx)    { return forward(req, ctx); }
export async function PATCH(req, ctx)  { return forward(req, ctx); }

export async function DELETE(req, ctx) {
  const raw = ctx?.params?.slug;
  let parts = normalizeSlugParts(raw); // strips accidental "compatibility" + applies aliases

  if (Array.isArray(parts) && parts.length === 1) {
    parts = ['descriptors', String(parts[0] ?? '')];
  }

  const nextCtx = { ...ctx, params: { ...(ctx?.params || {}), slug: parts } };
  return forward(req, nextCtx);
}
