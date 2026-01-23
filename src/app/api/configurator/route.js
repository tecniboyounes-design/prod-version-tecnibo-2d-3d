import { NextResponse } from "next/server";
const ORIGIN = process.env.BACKEND_ORIGIN || "http://192.168.30.92:4444";

export async function GET() {
  const r = await fetch(`${ORIGIN}/configurator`, { cache: "no-store" });
  const data = await r.json(); return NextResponse.json(data, { status: r.status });
}

export async function POST(req) {
  const body = await req.text();
  const r = await fetch(`${ORIGIN}/configurator`, { method: "POST", headers: { "Content-Type":"application/json" }, body });
  const data = await r.json(); return NextResponse.json(data, { status: r.status });
}
