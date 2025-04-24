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
 * Fetches interventions for a given project and version (DEPRECATED).
 * @param {Request} request - The incoming request with projectId and versionId query parameters.
 * @returns {Response} JSON response containing interventions data or an error message.
 * @deprecated Use /api/projects/[project_id]/versions/[version_id]/interventions instead.
 */


export async function GET(request) {

  // console.warn(
  //   "Deprecation Warning: /api/interventions is deprecated. 
  // Use /api/projects/[project_id]/versions/[version_id]/interventions instead."
  // );
  
  // Generate CORS headers for all responses
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const url = new URL(request.url);
    const project_id = url.searchParams.get("projectId");
    const version_id = url.searchParams.get("versionId");
    
    // Validate required query parameters
    if (!project_id || !version_id) {
      return NextResponse.json(
        { error: "Missing projectId or versionId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify version exists and belongs to the project
    const { data: version, error: versionError } = await supabase
      .from("versions")
      .select("id")
      .eq("id", version_id)
      .eq("project_id", project_id)
      .single();
      
    if (versionError || !version) {
      return NextResponse.json(
        { error: "Version not found or does not belong to the project" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch interventions for the specified version
    const { data: interventions, error: interventionsError } = await supabase
      .from("interventions")
      .select("*")
      .eq("version_id", version_id);
      
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