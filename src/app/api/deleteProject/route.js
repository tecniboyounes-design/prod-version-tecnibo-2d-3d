import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors"; // Adjust path as needed
import { URL } from "url";
import { supabase } from "../filesController/route";

/**
 * Handles CORS preflight requests for the DELETE endpoint.
 * @param {Request} request - The incoming HTTP request.
 * @returns {Response} CORS preflight response.
 */
export async function OPTIONS(request) {
  console.log("OPTIONS request received for DELETE /api/deleteProject/[projectId]");
  return handleCorsPreflight(request);
}


/**
 * Deletes a project and associated versions by project ID extracted from URL.
 * @param {Request} req - The incoming HTTP DELETE request.
 * @returns {Response} JSON response indicating success or an error.
 */


export async function DELETE(req) {
  console.log("DELETE request received for projectId:", req);
  const corsHeaders = getCorsHeaders(req);
   
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      console.warn("Missing projectId in request URL params");
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400, headers: corsHeaders }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      console.warn("Invalid UUID format for projectId:", projectId);
      return NextResponse.json(
        { error: "Invalid projectId format" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("Checking existence of project with ID:", projectId);
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.warn("Project not found or error in lookup:", projectError);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    console.log("Deleting associated versions for project ID:", projectId);
    const { error: versionDeleteError } = await supabase
      .from("versions")
      .delete()
      .eq("project_id", projectId);

    if (versionDeleteError) {
      console.error("Error deleting project versions:", versionDeleteError);
      return NextResponse.json(
        { error: versionDeleteError.message || "Failed to delete associated versions" },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("Deleting project with ID:", projectId);
    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) {
      console.error("Error deleting project:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete project" },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Successfully deleted project and versions for: ${projectId}`);
    return NextResponse.json(
      {
        success: true,
        projectId,
        message: `Project ${projectId} and its versions deleted successfully`,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error processing DELETE request:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
