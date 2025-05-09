import { supabase } from "../filesController/route";
import { fetchProjectWithRelations } from "../projects/route";
import { transformProjectsData } from "../../../lib/restructureData";
import { transformToFloorplanner } from "./D_S_R_P_OLD";
import { multiplyMatrixVectorOrchestrator } from "./multiplyMatrixVector";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

// Predefined user data (as provided)
const predefinedUser = {
  id: "39a18b31-b21a-4c52-b745-abb16a141e6d",
  name: "Rabie El Mansouri",
  avatar: "",
  email: "r.elmansouri@tecnibo.com",
  odoo_id: "446",
  role: "TM-Développeur Front-end React JS",
};

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const roomJson = await req.json();
    console.log("Received room JSON:", roomJson);

    // Transform the room data
    const transformedData = multiplyMatrixVectorOrchestrator({
      user: predefinedUser,
      room: roomJson,
    });

    // Generate a unique project number
    const projectNumber = `PROJ-${new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")}`;

    // Step 1: Create project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        title: transformedData.title || "Generated Room Project",
        project_number: projectNumber,
        description:
          transformedData.description || "Auto-generated from room scan",
        user_id: parseInt(predefinedUser.odoo_id, 10),
        image_url: "https://example.com/default-image.jpg",
      })
      .select()
      .single();
    if (projectError)
      throw new Error(`Project insertion failed: ${projectError.message}`);
    const projectId = project.id;

    // Step 2: Assign manager
    const { error: managerError } = await supabase.from("managers").insert({
      project_id: projectId,
      name: predefinedUser.name,
      avatar: predefinedUser.avatar || "",
      email: predefinedUser.email,
      odoo_id: predefinedUser.odoo_id,
    });
    if (managerError)
      throw new Error(`Manager insertion failed: ${managerError.message}`);

    // Step 3: Create version
    const { data: version, error: versionError } = await supabase
      .from("versions")
      .insert({
        project_id: projectId,
        version: "1.0",
      })
      .select()
      .single();
    if (versionError)
      throw new Error(`Version insertion failed: ${versionError.message}`);
    const versionId = version.id;

    // Step 4: Insert points
    const pointsToInsert = transformedData.points.map((point) => ({
      x_coordinate: point.position.x,
      y_coordinate: point.position.y,
      z_coordinate: point.position.z,
      snapangle: point.snapAngle || 0,
      rotation: point.rotation || 0,
      version_id: versionId,
    }));
    const { data: insertedPoints, error: pointsError } = await supabase
      .from("points")
      .insert(pointsToInsert)
      .select("id");
    if (pointsError)
      throw new Error(`Points insertion failed: ${pointsError.message}`);

    // Create mapping from tempId to database ID
    const pointIdMap = new Map();
    insertedPoints.forEach((pt, index) => {
      const tempId = transformedData.points[index].tempId;
      pointIdMap.set(tempId, pt.id);
    });

    // Step 5: Insert walls
    const wallsToInsert = transformedData.walls.map((wall) => ({
      startpointid: pointIdMap.get(wall.startPointId),
      endpointid: pointIdMap.get(wall.endPointId),
      length: wall.length,
      rotation: wall.rotation,
      thickness: wall.thickness || 0.1,
      color: wall.color || "#f5f5f5",
      texture: wall.texture || "default.avif",
      height: wall.height,
      version_id: versionId,
    }));
    const { error: wallsError } = await supabase
      .from("walls")
      .insert(wallsToInsert);
    if (wallsError)
      throw new Error(`Walls insertion failed: ${wallsError.message}`);

    // Step 6: Insert articles (doors, windows, floors, objects)
    const articlesToInsert = transformedData.articles.map((article) => ({
      version_id: versionId,
      data: {
        type: article.type,
        id: article.id,
        position: article.position,
        width: article.width,
        height: article.height || null,
        depth: article.depth || null,
        rotation: article.rotation || 0,
        category: article.category || null,
      },
    }));
    const { error: articlesError } = await supabase
      .from("articles")
      .insert(articlesToInsert);
    if (articlesError)
      throw new Error(`Articles insertion failed: ${articlesError.message}`);

    // Step 7: Fetch project with relations
    const projectWithRelations = await fetchProjectWithRelations(
      predefinedUser.odoo_id,
      projectId
    );
    const transformedProject = transformProjectsData(
      projectWithRelations,
      predefinedUser
    );
    //const floorplannerDataStructure = transformToFloorplanner(projectWithRelations);

    return new Response(
      JSON.stringify({
        success: true,
        projectWithRelations: projectWithRelations,
        transformedProject: transformedProject,
        // transformedData: floorplannerDataStructure,
        projectId: projectId,
        versionId: versionId,
        message: `Project ${projectId} created successfully with all relations`,
      }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in POST route:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}