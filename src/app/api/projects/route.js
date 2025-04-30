import { getCorsHeaders } from "../authenticate/route";
import { createIntervention } from "./createIntervention";
import { transformProjectData } from "./transformProjectData";
import { transformProjectsData } from "../versionHistory/restructureData";
import { supabase } from "../filesController/route";

/**
 * Handles POST request to create a new project with nested data including
 * user, manager, version, points, walls, doors (articles), and settings.
 *
 * @async
 * @function
 * @param {Request} req - The request object from the route handler.
 * @returns {Promise<Response>} The response indicating success or failure.
 */


export async function OPTIONS(req) {
  // Handle CORS preflight request
  return new Response(null, {
    status: 204,
    headers: cors(req),
  });
}


export const cors = (req) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
  ];
  const origin = req.headers.get("origin");
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
};


/**
 * Fetches a single project and all its related data from Supabase.
 *
 * @async
 * @function
 * @param {Number} odooId - The Odoo user ID.
 * @param {string} projectId - The ID of the project to fetch.
 * @returns {Promise<Object>} The project object with all relations.
 * @throws {Error} If the project cannot be fetched.
 */



export const fetchProjectWithRelations = async (odooId, projectId) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        versions (
          *,
          articles(*),
          plan_parameters(*),
          walls (
            *,
            points_start:points!walls_startpointid_fkey(*),
            points_end:points!walls_endpointid_fkey(*)
          ),
          interventions(*)
        ),
        managers(*)
      `
      )
      .eq("user_id", odooId)
      .eq("id", projectId)
      .single();

    if (error) {
      console.error("Error fetching project with relations:", error.message);
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    // console.log('Fetched project with all relations:', data);
    return data;
  } catch (err) {
    console.error("Fetch error:", err.message);
    throw err;
  }
};




export async function POST(req) {
  const origin = req.headers.get("origin");
  const headers = getCorsHeaders(origin);

  const data = await req.json();
  const projectData = transformProjectData(data);
  // console.log("Transformed project data:", projectData);

  const {
    uid,
    doors,
    walls: wallsFromPayload,
    points: pointsFromPayload,
  } = projectData;

  const planTransform = {
    scale: 1.0,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
  };

  let createdUserId;
  const { data: existingUser, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("odoo_id", uid)
    .single();

  if (!existingUser || userError) {
    const { data: newUser, error: newUserError } = await supabase
      .from("users")
      .insert([
        {
          name: projectData.name || "Unknown User",
          email: projectData.username || `user${Date.now()}@example.com`,
          odoo_id: uid,
          role: data?.user?.job_position?.result?.records?.[0]?.job_title,
        },
      ])
      .select()
      .single();
    if (newUserError) {
      // console.error("Error creating user:", newUserError.message);
      return new Response(JSON.stringify({ error: newUserError.message }), {
        status: 400,
        headers,
      });
    }
    createdUserId = newUser.id;
  } else {
    createdUserId = existingUser.id;
  }

  const projectInsertData = {
    title: projectData.title || "New Office Design",
    project_number: projectData.project_number,
    description: projectData.description || "Interior design project.",
    user_id: uid,
    db: projectData?.db,
    image_url:
      projectData?.image_url ||
      "https://cdn.andro4all.com/andro4all/2022/07/Planner-5D.jpg",
  };

  const { data: projectDataResponse, error: projectError } = await supabase
    .from("projects")
    .insert([projectInsertData])
    .select()
    .single();

  if (projectError) {
    // console.error("Error creating project:", projectError.message);
    return new Response(JSON.stringify({ error: projectError.message }), {
      status: 400,
      headers,
    });
  }

  const createdProjectId = projectDataResponse.id;

  const managerData = {
    project_id: createdProjectId,
    name: projectData.name || "Default Manager",
    avatar: projectData.avatar || "https://i.pravatar.cc/150?img=3",
    email: projectData.username || "default@example.com",
    odoo_id: projectData.uid,
    partner_id: projectData.partner_id || 0,
    company_id: projectData.user_context?.current_company || 11,
    timezone: projectData.user_context?.tz || "Africa/Casablanca",
  };

  const { error: managerError } = await supabase
    .from("managers")
    .insert([managerData]);

  if (managerError) {
    // console.error("Error creating manager:", managerError.message);
    return new Response(JSON.stringify({ error: managerError.message }), {
      status: 400,
      headers,
    });
  }

  const versionInsertData = {
    project_id: createdProjectId,
    version: projectData.version || "1.0",
  };

  const { data: versionData, error: versionError } = await supabase
    .from("versions")
    .insert([versionInsertData])
    .select()
    .single();

  if (versionError) {
    // console.error("Error creating version:", versionError.message);
    return new Response(JSON.stringify({ error: versionError.message }), {
      status: 400,
      headers,
    });
  }

  const createdVersionId = versionData.id;

  const planParamsInsertData = {
    version_id: createdVersionId,
    scale_factor: planTransform.scale,
    rotation: planTransform.rotation,
    x_offset: planTransform.offsetX,
    y_offset: planTransform.offsetY,
  };

  const { error: planParamsError } = await supabase
    .from("plan_parameters")
    .insert([planParamsInsertData]);

  if (planParamsError) {
    // console.error("Error creating plan_parameters:", planParamsError.message);
    return new Response(JSON.stringify({ error: planParamsError.message }), {
      status: 400,
      headers,
    });
  }

  const pointsToInsert = pointsFromPayload.map((pt) => ({
    x_coordinate: pt.position.x,
    y_coordinate: pt.position.y,
    z_coordinate: pt.position.z,
    snapangle: pt.snapAngle,
    rotation: pt.rotation,
    version_id: createdVersionId,
    client_id: pt.id,
  }));
  const { data: insertedPoints, error: pointsError } = await supabase
    .from("points")
    .insert(pointsToInsert)
    .select();

  if (pointsError) {
    // console.error("Error inserting points:", pointsError.message);
    return new Response(JSON.stringify({ error: pointsError.message }), {
      status: 400,
      headers,
    });
  }

  const pointIdMapping = {};
  insertedPoints.forEach((pt) => {
    pointIdMapping[pt.client_id] = pt.id;
    // console.log(`Point inserted: client_id=${pt.client_id} → id=${pt.id}`);
  });

  const wallsToInsert = wallsFromPayload.map((wall) => ({
    startpointid: pointIdMapping[wall.startPointId],
    endpointid: pointIdMapping[wall.endPointId],
    length: wall.length,
    rotation: wall.rotation,
    thickness: wall.thickness,
    color: wall.color,
    texture: wall.texture,
    height: wall.height,
    version_id: createdVersionId,
    client_id: wall.id,
  }));

  const { data: wallsData, error: wallsError } = await supabase
    .from("walls")
    .insert(wallsToInsert)
    .select();

  if (wallsError) {
    // console.error("Error inserting walls:", wallsError.message);
    return new Response(JSON.stringify({ error: wallsError.message }), {
      status: 400,
      headers,
    });
  }

  wallsData.forEach((w) => {
    // console.log(`Wall inserted: client_id=${w.client_id} → id=${w.id}`);
  });

  const doorsToInsert = doors.map((door) => ({
    version_id: createdVersionId,
    client_id: door.id,
    data: [door],
  }));
  const { data: doorsData, error: doorsError } = await supabase
    .from("articles")
    .insert(doorsToInsert)
    .select();

  if (doorsError) {
    // console.error("Error inserting doors:", doorsError.message);
    return new Response(JSON.stringify({ error: doorsError.message }), {
      status: 400,
      headers,
    });
  }

  try {
    const interventionPayload = {
      action: "Project initialized",
      project_id: createdProjectId,
      version_id: createdVersionId,
      intervenerId: uid.toString(),
      metadata: {
        project_title: projectData.title || "New Office Design",
        project_number: projectData.project_number,
        intervener_name: projectData.name || "Unknown User",
        intervener_email:
          projectData.username || `user${Date.now()}@example.com`,
      },
    };

    const interventionResult = await createIntervention(interventionPayload);
    // console.log("Intervention created:", interventionResult);
  } catch (interventionError) {
    // console.error("Error creating intervention:", interventionError.message);
    return new Response(
      JSON.stringify({
        error: "Failed to create intervention",
        details: interventionError.message,
      }),
      { status: 500, headers }
    );
  }

  const userData = {
    id: projectData.uid,
    firstName: projectData.name.split(" ")[0],
    lastName: projectData.name.split(" ").slice(1).join(" "),
    role: projectData.role || "Unknown",
  };

  const projectWithRelations = await fetchProjectWithRelations(
    uid,
    createdProjectId
  );
  const transformedProjectData = transformProjectsData(
    [projectWithRelations],
    userData
  );

  return new Response(
    JSON.stringify({
      success: true,
      projectWithRelations: projectWithRelations,
      transformedProjectData: transformedProjectData[0],
      projectId: createdProjectId,
      versionId: createdVersionId,
      message: `Project ${createdProjectId} created successfully—version ${createdVersionId} and all related entities (points, walls, articles, plan parameters, managers, interventions) have been persisted.`,
    }),
    {
      status: 200,
      headers,
    }
  );
}
