import { NextResponse } from "next/server";
import { restoreVersion } from "@/lib/server/articlesFS";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function POST(req, { params }) {
  const headers = getCorsHeaders(req);
  const { id, versionId } = params;
  
  try {
    const result = await restoreVersion(id, decodeURIComponent(versionId));
    return NextResponse.json(result, { status: 200, headers });
  } catch (err) {
    const code = err.code === "VERSION_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status: code, headers });
  }
}
