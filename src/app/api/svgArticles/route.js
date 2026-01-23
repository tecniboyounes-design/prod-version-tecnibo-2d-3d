// src/app/api/svgArticles/route.js
import { NextResponse } from "next/server";
import { getCorsHeaders } from "../../../lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TARGET_BASE = "http://192.168.30.92:7000";

function buildTargetUrl(req) {
  const url = new URL(req.url);
  const qs = url.search || "";
  return `${TARGET_BASE}${qs}`;
}

async function proxy(req) {
  const corsHeaders = getCorsHeaders(req);
  const targetUrl = buildTargetUrl(req);

  // Forward headers minimally (avoid Host, Connection, etc.)
  const fwdHeaders = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) fwdHeaders.set("content-type", ct);
  const accept = req.headers.get("accept");
  if (accept) fwdHeaders.set("accept", accept);

  const method = req.method || "GET";
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(targetUrl, {
    method,
    headers: fwdHeaders,
    body,
    cache: "no-store",
  });

  const respHeaders = new Headers(corsHeaders);
  // Pass through upstream headers (keep content-type, etc.)
  upstream.headers.forEach((v, k) => respHeaders.set(k, v));

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export async function OPTIONS(req) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req)    { return proxy(req); }
export async function POST(req)   { return proxy(req); }
export async function PUT(req)    { return proxy(req); }
export async function PATCH(req)  { return proxy(req); }
export async function DELETE(req) { return proxy(req); }
export async function HEAD(req)   { return proxy(req); }
