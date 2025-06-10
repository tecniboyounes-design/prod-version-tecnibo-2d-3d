import { supabase } from "../filesController/route";
import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

/**
 * Handles CORS preflight requests for the interventions endpoint.
 * @param {Request} request - The incoming HTTP request.
 * @returns {Response} CORS preflight response with appropriate headers.
 */
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

/**
 * Fetches interventions for a given versionId.
 * @param {Request} request - The incoming request with versionId query parameter.
 * @returns {Response} JSON response containing interventions data or an error message.
 */
export async function GET(request) {
  // Generate CORS headers for all responses
  const corsHeaders = getCorsHeaders(request);

  try {
    const url = new URL(request.url);
    const versionId = url.searchParams.get("versionId");

    // Validate required query parameter
    if (!versionId) {
      return NextResponse.json(
        { error: "Missing versionId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch interventions for the specified version
    const { data: interventions, error: interventionsError } = await supabase
      .from("interventions")
      .select("id, action, timestamp, projectname, version, intervener, metadata") // Specify desired columns
      .eq("version_id", versionId); // Correct column name

    if (interventionsError) {
      console.error("Error fetching interventions:", interventionsError);
      return NextResponse.json(
        { error: "Failed to fetch interventions" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Return successful response with interventions data
    return NextResponse.json(
      { data: interventions },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in GET /api/interventions:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
} 