import { NextResponse } from "next/server";
import { listVersions } from "@/lib/server/articlesFS";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function GET(req, { params }) {
  const headers = getCorsHeaders(req);
  const { id } = params;

  try {
    const versions = await listVersions(id);
    return NextResponse.json({ versions }, { status: 200, headers });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400, headers });
  }
}
