import { NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/cors";

const TARGET = "http://192.168.30.92:4444/compatibility";

export async function OPTIONS(req) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const body = await req.json();

    const res = await fetch(TARGET, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json();
      console.log("⬅️ Response from 4444 service:", data);
      return NextResponse.json(data, { status: res.status, headers: corsHeaders });
    } else {
      const text = await res.text();
      console.log("⬅️ Text response from 4444 service:", text);
      return new Response(text, {
        status: res.status,
        headers: { ...corsHeaders, "content-type": ct || "text/plain; charset=utf-8" },
      });
    }
  } catch (err) {
    console.error("❌ Forwarding failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
