import { supabase } from "../../filesController/route";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

// This route expects /api/comments/[versionId] (dynamic segment)
// Make sure this file is located at /api/comments/[versionId]/route.js for Next.js App Router dynamic routing

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function GET(req, { params }) {
  const corsHeaders = getCorsHeaders(req);

  // Next.js App Router passes params as the second argument
  let versionId = null;
  if (params && params.versionId) {
    versionId = params.versionId;
  } else {
    // fallback: try to get from query string
    const url = new URL(req.url);
    versionId = url.searchParams.get("versionId");
  }

  if (!versionId) {
    return new Response(JSON.stringify({ message: "versionId is required" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("version_id", versionId);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}