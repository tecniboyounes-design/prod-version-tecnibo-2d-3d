import { supabase } from "../projects/route";

export async function GET(request) {
  try {
    // Log the incoming request
    // console.log("Received GET request to /api/interventions");
    // console.log("Request URL:", request.url);

    // Extract query parameters from the URL
    const url = new URL(request.url);
    const project_id = url.searchParams.get("project_id");
    const version_id = url.searchParams.get("version_id");
    // console.log("Extracted query parameters:", { project_id, version_id });
    // Validate presence of required parameters
    if (!project_id || !version_id) {
      console.log("Missing required parameters: project_id or version_id");
      return new Response(
        JSON.stringify({ error: "Missing project_id or version_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify that the version belongs to the specified project
    // console.log("Querying versions table with:", { version_id, project_id });
    const { data: version, error: versionError } = await supabase
      .from("versions")
      .select("id")
      .eq("id", version_id)
      .eq("project_id", project_id)
      .single();

    console.log("Versions query result:", { version, versionError });

    if (versionError || !version) {
      console.log("Version not found or does not belong to the project");
      return new Response(
        JSON.stringify({
          error: "Version not found or does not belong to the project",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch interventions for the given version_id
    // console.log("Querying interventions table with:", { version_id });
    const { data: interventions, error: interventionsError } = await supabase
      .from("interventions")
      .select("*")
      .eq("version_id", version_id);

    console.log("Interventions query result:", {
      interventions,
      interventionsError,
    });

    if (interventionsError) {
      console.error("Error fetching interventions:", interventionsError);
      throw interventionsError;
    }

    // Log successful response
    console.log("Returning interventions:", interventions);
    return new Response(JSON.stringify(interventions), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log any unexpected errors
    console.error("Error in GET /api/interventions:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}