import { NextResponse } from "next/server";
import { supabase } from "../filesController/route"; // Adjust path as needed
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors"; // Adjust path as needed

/**
 * Handles CORS preflight requests for the POST endpoint.
 */
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

/**
 * Increments a semantic version string (e.g., "1.9" → "2.0").
 * @param {string} version - The current version string.
 * @returns {string} - The next version string.
 */
export function incrementVersion(version) {
  const [major, minor] = version.split(".").map(Number);
  if (minor >= 9) {
    return `${major + 1}.0`;
  }
  return `${major}.${minor + 1}`;
}

/**
 * Clones data from a specified version to a new version for a project.
 */
export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const payload = await req.json();
    const { project_id, version_id, description } = payload;
    if (!project_id || !version_id || !description) {
      return NextResponse.json(
        { error: "Missing project_id, version_id, or description" },
        { status: 400, headers: corsHeaders }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(project_id)) {
      return NextResponse.json(
        { error: "Invalid project_id format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Step 1: Verify the project exists
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .single();
    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Step 2: Find the specified source version
    const { data: sourceVersion, error: sourceVersionError } = await supabase
      .from("versions")
      .select("id, version, created_on, lastModified")
      .eq("project_id", project_id)
      .eq("version", version_id)
      .single();
    if (sourceVersionError || !sourceVersion) {
      return NextResponse.json(
        { error: `Version ${version_id} not found for the project` },
        { status: 404, headers: corsHeaders }
      );
    }

    // Step 3: Fetch the latest version
    const { data: latestVersion, error: latestVersionError } = await supabase
      .from("versions")
      .select("version")
      .eq("project_id", project_id)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    if (latestVersionError && latestVersionError.code !== "PGRST116") {
      return NextResponse.json(
        { error: "Error fetching latest version" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 4: Increment the version using incrementVersion()
    const newVersion =
      latestVersion && latestVersion.version
        ? incrementVersion(latestVersion.version)
        : "1.0";

    // Step 5: Insert the new version record
    const { data: newVersionData, error: insertError } = await supabase
      .from("versions")
      .insert({
        project_id,
        version: newVersion,
        created_on: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      })
      .select()
      .single();
    if (insertError) {
      console.error("Error inserting new version:", insertError);
      return NextResponse.json(
        { error: "Failed to create new version" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 6: Return the response
    return NextResponse.json(
      {
        success: true,
        new_version_id: newVersionData.id,
        new_version: newVersion,
        description,
        source_version: sourceVersion.version,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error processing POST request:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
