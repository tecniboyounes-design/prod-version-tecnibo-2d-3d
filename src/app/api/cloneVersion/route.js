import { NextResponse } from "next/server";
import { supabase } from "../filesController/route"; // Adjust path as needed
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors"; // Adjust path as needed
import { incrementVersion } from "@/lib/versioning";
import { validate } from 'uuid'; 


/**
 * Handles CORS preflight requests for the POST endpoint.
 */
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}



/**
 * Clones data from a specified version to a new version for a project.
 */


export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const payload = await req.json();
    // console.log("payload ", payload);
    const { project_id, version_id, description } = payload;

    if (!project_id || !version_id || !description) {
      return NextResponse.json(
        { error: "Missing project_id, version_id, or description" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate project_id and version_id using uuid validate function
    if (!validate(project_id)) {
      return NextResponse.json(
        { error: "Invalid project_id format" },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!validate(version_id)) {
      return NextResponse.json(
        { error: "Invalid version_id format" },
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
      .eq("id", version_id)
      .single();
    if (sourceVersionError || !sourceVersion) {
      return NextResponse.json(
        { error: `Version ${version_id} not found for the project ${project_id}` },
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
    const newVersion = latestVersion && latestVersion.version
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

    // Step 6: Clone points from source version to new version
    // Fetch source points
    const { data: sourcePoints, error: sourcePointsError } = await supabase
      .from("points")
      .select("id, client_id, x_coordinate, y_coordinate, z_coordinate, snapangle, rotation")
      .eq("version_id", version_id);
    if (sourcePointsError) {
      console.error("Error fetching source points:", sourcePointsError);
      return NextResponse.json(
        { error: "Failed to fetch source points" },
        { status: 500, headers: corsHeaders }
      );
    }
    console.log('source points', sourcePoints);

    if (sourcePoints && sourcePoints.length > 0) {
      // Prepare new points to insert
      const newPointsToInsert = sourcePoints.map(point => ({
        client_id: point.client_id,
        x_coordinate: point.x_coordinate,
        y_coordinate: point.y_coordinate,
        z_coordinate: point.z_coordinate,
        snapangle: point.snapangle,
        rotation: point.rotation,
        version_id: newVersionData.id,
      }));

      // Insert new points
      const { data: insertedPoints, error: insertPointsError } = await supabase
        .from("points")
        .insert(newPointsToInsert)
        .select("id, client_id");
      if (insertPointsError) {
        console.error("Error inserting new points:", insertPointsError);
        return NextResponse.json(
          { error: "Failed to insert new points" },
          { status: 500, headers: corsHeaders }
        );
      }

      // Create mapping from old point ID to new point ID using client_id
      const oldToNewPointIdMap = new Map();
      sourcePoints.forEach(sourcePoint => {
        const newPoint = insertedPoints.find(p => p.client_id === sourcePoint.client_id);
        if (newPoint) {
          oldToNewPointIdMap.set(sourcePoint.id, newPoint.id);
        }
      });

      // Step 7: Clone walls
      const { data: sourceWalls, error: sourceWallsError } = await supabase
        .from("walls")
        .select("*")
        .eq("version_id", version_id);
      if (sourceWallsError) {
        console.error("Error fetching source walls:", sourceWallsError);
        return NextResponse.json(
          { error: "Failed to fetch source walls" },
          { status: 500, headers: corsHeaders }
        );
      }

      if (sourceWalls && sourceWalls.length > 0) {
        // Prepare new walls to insert
        const newWallsToInsert = sourceWalls.map(wall => ({
          startpointid: oldToNewPointIdMap.get(wall.startpointid),
          endpointid: oldToNewPointIdMap.get(wall.endpointid),
          length: wall.length,
          rotation: wall.rotation,
          thickness: wall.thickness,
          color: wall.color,
          texture: wall.texture,
          height: wall.height,
          version_id: newVersionData.id,
          client_id: wall.client_id, // Include if exists
          // Add other fields as needed
        }));

        // Insert new walls
        const { error: insertWallsError } = await supabase
          .from("walls")
          .insert(newWallsToInsert);
        if (insertWallsError) {
          console.error("Error inserting new walls:", insertWallsError);
          return NextResponse.json(
            { error: "Failed to insert new walls" },
            { status: 500, headers: corsHeaders }
          );
        }
      }

      // Step 8: Clone articles (optional, if applicable)
      const { data: sourceArticles, error: sourceArticlesError } = await supabase
        .from("articles")
        .select("*")
        .eq("version_id", version_id);
      if (sourceArticlesError) {
        console.error("Error fetching source articles:", sourceArticlesError);
        return NextResponse.json(
          { error: "Failed to fetch source articles" },
          { status: 500, headers: corsHeaders }
        );
      }

      if (sourceArticles && sourceArticles.length > 0) {
        // Prepare new articles, updating point references in data jsonb
        const newArticlesToInsert = sourceArticles.map(article => {
          const newData = { ...article.data };
          // Example: if data has point_ids array
          if (newData.point_ids) {
            newData.point_ids = newData.point_ids.map(oldId => oldToNewPointIdMap.get(oldId));
          }
          return {
            client_id: article.client_id,
            version_id: newVersionData.id,
            data: newData,
            // Add other fields as needed
          };
        });

        // Insert new articles
        const { error: insertArticlesError } = await supabase
          .from("articles")
          .insert(newArticlesToInsert);
        if (insertArticlesError) {
          console.error("Error inserting new articles:", insertArticlesError);
          return NextResponse.json(
            { error: "Failed to insert new articles" },
            { status: 500, headers: corsHeaders }
          );
        }
      }
    }

    // Step 9: Return the response
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