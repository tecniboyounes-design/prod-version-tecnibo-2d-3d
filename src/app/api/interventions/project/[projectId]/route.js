import { supabase } from "../filesController/route";
import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { validate } from "uuid";

/**
 * Handles CORS preflight requests for the interventions by project endpoint.
 * @param {Request} request - The incoming HTTP request.
 * @returns {Response} CORS preflight response with appropriate headers.
 */
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

/**
 * Fetches interventions for a given projectId.
 * @param {Request} request - The incoming request with projectId query parameter.
 * @returns {Response} JSON response containing interventions data or an error message.
 */
 
export async function GET(request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    // Validate required query parameter
    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate projectId format (assuming it's a UUID)
    if (!validate(projectId)) {
      return NextResponse.json(
        { error: "Invalid projectId format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch version IDs for the project
    const { data: versions, error: versionError } = await supabase
      .from("versions")
      .select("id")
      .eq("project_id", projectId);

    if (versionError) {
      console.error("Error fetching versions:", versionError);
      return NextResponse.json(
        { error: "Failed to fetch versions" },
        { status: 500, headers: corsHeaders }
      );
    }

    // If no versions exist for the project, return an empty array
    if (versions.length === 0) {
      return NextResponse.json(
        { data: [] },
        { status: 200, headers: corsHeaders }
      );
    }

    const versionIds = versions.map((v) => v.id);

    // Fetch interventions for the retrieved version IDs
    const { data: interventions, error: interventionsError } = await supabase
      .from("interventions")
      .select("id, action, timestamp, projectname, version, intervener, metadata")
      .in("version_id", versionIds);

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
    console.error("Error in GET /api/interventions/by-project:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}