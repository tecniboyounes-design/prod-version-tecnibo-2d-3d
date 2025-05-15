import { NextResponse } from "next/server";
import { supabase } from "../filesController/route";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { incrementVersion } from "@/lib/versioning";
import { validate } from "uuid";

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const payload = await req.json();
    console.log("[LOG] Received payload:", payload);
    const { project_id, version_id, description } = payload;
    
    // Validation
    if (!project_id || !version_id || !description) {
      console.log("[LOG] Missing required fields");
      return NextResponse.json(
        { error: "Missing project_id, version_id, or description" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!validate(project_id) || !validate(version_id)) {
      console.log("[LOG] Invalid UUID format for project_id or version_id");
      return NextResponse.json(
        { error: "Invalid project_id or version_id format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Step 1: Verify project exists
    console.log("[LOG] Verifying project with ID:", project_id);
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .single();
    if (projectError || !project) {
      console.log("[LOG] Project not found");
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404, headers: corsHeaders }
      );
    }
    console.log("[LOG] Project exists with ID:", project_id);

    // Step 2: Verify source version exists
    console.log("[LOG] Verifying source version with ID:", version_id);
    const { data: sourceVersion, error: sourceVersionError } = await supabase
      .from("versions")
      .select("id, version, created_on, lastModified")
      .eq("project_id", project_id)
      .eq("id", version_id)
      .single();
    if (sourceVersionError || !sourceVersion) {
      console.log("[LOG] Source version not found");
      return NextResponse.json(
        { error: `Version ${version_id} not found for project ${project_id}` },
        { status: 404, headers: corsHeaders }
      );
    }
    console.log("[LOG] Source version exists with version:", sourceVersion.version);
    
    // Step 3: Fetch latest version
    console.log("[LOG] Fetching latest version for project:", project_id);
    const { data: latestVersion, error: latestVersionError } = await supabase
      .from("versions")
      .select("version")
      .eq("project_id", project_id)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    if (latestVersionError && latestVersionError.code !== "PGRST116") {
      console.error("[ERROR] Error fetching latest version:", latestVersionError);
      return NextResponse.json(
        { error: "Error fetching latest version" },
        { status: 500, headers: corsHeaders }
      );
    }
    console.log("[LOG] Latest version:", latestVersion?.version || "None");

    // Step 4: Increment version
    const newVersion = latestVersion?.version ? incrementVersion(latestVersion.version) : "1.0";
    console.log("[LOG] New version number:", newVersion);

    // Step 5: Insert new version
    console.log("[LOG] Inserting new version with version:", newVersion);
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
      console.error("[ERROR] Error inserting new version:", insertError);
      return NextResponse.json(
        { error: "Failed to create new version" },
        { status: 500, headers: corsHeaders }
      );
    }
    console.log("[LOG] Inserted new version with ID:", newVersionData.id);

    // Step 6: Clone points
    console.log("[LOG] Fetching source points for version:", version_id);
    const { data: sourcePoints, error: sourcePointsError } = await supabase
      .from("points")
      .select("id, client_id, x_coordinate, y_coordinate, z_coordinate, snapangle, rotation")
      .eq("version_id", version_id);
    if (sourcePointsError) {
      console.error("[ERROR] Error fetching source points:", sourcePointsError);
      return NextResponse.json(
        { error: "Failed to fetch source points" },
        { status: 500, headers: corsHeaders }
      );
    }
    console.log("[LOG] Found", sourcePoints.length, "source points");

    if (sourcePoints && sourcePoints.length > 0) {
      const newPointsToInsert = sourcePoints.map(point => ({
        client_id: point.client_id,
        x_coordinate: point.x_coordinate,
        y_coordinate: point.y_coordinate,
        z_coordinate: point.z_coordinate,
        snapangle: point.snapangle,
        rotation: point.rotation,
        version_id: newVersionData.id,
      }));

      console.log("[LOG] Inserting", newPointsToInsert.length, "new points");
      const { data: insertedPoints, error: insertPointsError } = await supabase
        .from("points")
        .insert(newPointsToInsert)
        .select("id, client_id");
      if (insertPointsError) {
        console.error("[ERROR] Error inserting new points:", insertPointsError);
        return NextResponse.json(
          { error: "Failed to insert new points" },
          { status: 500, headers: corsHeaders }
        );
      }
      console.log("[LOG] Cloned", insertedPoints.length, "points");

      // Create point ID mapping
      const oldToNewPointIdMap = new Map();
      sourcePoints.forEach(sourcePoint => {
        const newPoint = insertedPoints.find(p => p.client_id === sourcePoint.client_id);
        if (newPoint) oldToNewPointIdMap.set(sourcePoint.id, newPoint.id);
      });
      console.log("[LOG] Created point ID mapping with", oldToNewPointIdMap.size, "entries");

      // Step 7: Clone walls
      console.log("[LOG] Fetching source walls for version:", version_id);
      const { data: sourceWalls, error: sourceWallsError } = await supabase
        .from("walls")
        .select("*")
        .eq("version_id", version_id);
      if (sourceWallsError) {
        console.error("[ERROR] Error fetching source walls:", sourceWallsError);
        return NextResponse.json(
          { error: "Failed to fetch source walls" },
          { status: 500, headers: corsHeaders }
        );
      }
      console.log("[LOG] Found", sourceWalls.length, "source walls");

      if (sourceWalls && sourceWalls.length > 0) {
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
          client_id: wall.client_id,
        }));

        console.log("[LOG] Inserting", newWallsToInsert.length, "new walls");
        const { error: insertWallsError } = await supabase
          .from("walls")
          .insert(newWallsToInsert);
        if (insertWallsError) {
          console.error("[ERROR] Error inserting new walls:", insertWallsError);
          return NextResponse.json(
            { error: "Failed to insert new walls" },
            { status: 500, headers: corsHeaders }
          );
        }
        console.log("[LOG] Cloned", newWallsToInsert.length, "walls");
      }

      // Step 8: Clone articles
      console.log("[LOG] Fetching source articles for version:", version_id);
      const { data: sourceArticles, error: sourceArticlesError } = await supabase
        .from("articles")
        .select("*")
        .eq("version_id", version_id);
      if (sourceArticlesError) {
        console.error("[ERROR] Error fetching source articles:", sourceArticlesError);
        return NextResponse.json(
          { error: "Failed to fetch source articles" },
          { status: 500, headers: corsHeaders }
        );
      }
      console.log("[LOG] Found", sourceArticles.length, "source articles");

      if (sourceArticles && sourceArticles.length > 0) {
        const newArticlesToInsert = sourceArticles.map(article => {
          const newData = { ...article.data };
          if (newData.point_ids) {
            newData.point_ids = newData.point_ids.map(oldId => oldToNewPointIdMap.get(oldId));
          }
          return {
            client_id: article.client_id,
            version_id: newVersionData.id,
            data: newData,
          };
        });

        console.log("[LOG] Inserting", newArticlesToInsert.length, "new articles");
        const { error: insertArticlesError } = await supabase
          .from("articles")
          .insert(newArticlesToInsert);
        if (insertArticlesError) {
          console.error("[ERROR] Error inserting new articles:", insertArticlesError);
          return NextResponse.json(
            { error: "Failed to insert new articles" },
            { status: 500, headers: corsHeaders }
          );
        }
        console.log("[LOG] Cloned", newArticlesToInsert.length, "articles");
      }
    }

    // Step 9: Prepare response
    console.log("[LOG] Preparing response");
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
    console.error("[ERROR] Error processing POST request:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}