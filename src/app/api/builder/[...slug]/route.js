import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { NextResponse } from "next/server";

export async function OPTIONS(request) {
  console.log("Handling CORS preflight request");
  return handleCorsPreflight(request);
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.30.92:4444";

async function executeQuery({ db, query }) {
  const res = await fetch(`${BASE_URL}/meta/q/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ db, query }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`exec failed ${res.status}: ${text || res.statusText}`);
  }
  return res.json(); // { code?: string, id?: string }
}

async function getPreviewData(code) {
  const res = await fetch(`${BASE_URL}/meta/q/${code}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`preview failed ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}




// ✅ NEW: handle GET /api/builder/meta/q/:code
export async function GET(request, { params }) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const [seg0, seg1, code] = params?.slug || [];
    if (seg0 === "meta" && seg1 === "q" && code) {
      // call your microservice endpoint which now returns `items`
      const res = await fetch(`${BASE_URL}/meta/q/${code}`, { cache: "no-store" });
      const json = await res.json();
      return NextResponse.json(json, { status: 200, headers: corsHeaders });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  } catch (err) {
    console.error("Builder GET error:", err);
    return NextResponse.json({ error: err?.message || "Proxy error" }, { status: 502, headers: corsHeaders });
  }
}




export async function POST(request, { params }) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const { db, query } = await request.json();
    if (!db || !query) {
      return NextResponse.json(
        { error: "Missing required fields: db, query" },
        { status: 400, headers: corsHeaders }
      );
    }

    const execRes = await executeQuery({ db, query });
    const code = execRes.code || execRes.id;
    if (!code) {
      return NextResponse.json(
        { error: "No code returned from query execution" },
        { status: 502, headers: corsHeaders }
      );
    }

    const previewData = await getPreviewData(code);

    return NextResponse.json(
      {
        success: true,
        code,
        previewData,
        source: `meta/q/${code}`,
        slug: params?.slug || [],
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Builder POST error:", err);
    return NextResponse.json(
      { error: err?.message || "Proxy error" },
      { status: 502, headers: corsHeaders }
    );
  }
}
