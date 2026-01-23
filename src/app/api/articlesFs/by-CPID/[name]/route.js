// src/app/api/articlesFs/by-CPID/[name]/route.js
import { NextResponse } from "next/server";
import { getArticleDataAndSourcesByName } from "@/lib/server/articlesFS";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function GET(req, { params }) {
  const corsHeaders = getCorsHeaders(req);
  const { name } = params;

  try {
    const result = await getArticleDataAndSourcesByName(decodeURIComponent(name), {
      fallbackAllWhenNoKeys: true,
    });
    if (!result) {
      return NextResponse.json(
        { error: `Article with name "${name}" not found` },
        { status: 404, headers: corsHeaders }
      );
    }
    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("Error in GET /by-CPID/:name", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
