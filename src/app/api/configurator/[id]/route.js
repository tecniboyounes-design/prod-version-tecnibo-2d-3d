import { NextResponse } from "next/server";
const ORIGIN = process.env.BACKEND_ORIGIN || "http://192.168.30.92:4444";

export async function GET(_req, { params }) {
  const r = await fetch(`${ORIGIN}/configurator/${encodeURIComponent(params.id)}`, { cache: "no-store" });
  const data = await r.json(); return NextResponse.json(data, { status: r.status });
}

export async function PATCH(req, { params }) {
  const body = await req.text();
  const r = await fetch(`${ORIGIN}/configurator/${encodeURIComponent(params.id)}`, {
    method: "PATCH", headers: { "Content-Type":"application/json" }, body
  });
  const type = r.headers.get("content-type") || "";
  if (type.includes("application/json")) { const j = await r.json(); return NextResponse.json(j, { status: r.status }); }
  const t = await r.text(); return new NextResponse(t, { status: r.status, headers: type ? { "content-type": type } : {} });
}
