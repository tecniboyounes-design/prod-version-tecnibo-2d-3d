import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from '../authenticate/route';
import { createIntervention } from './createIntervention';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const fetchProjectWithRelations = async (odooId, projectId) => {
  try {
    // Fetch the project with all its relations (versions, walls, articles, points, managers, and interventions)
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        versions(
          *,
          articles(*),
          walls(
            *,
            points_start:points!walls_startpointid_fkey(*),
            points_end:points!walls_endpointid_fkey(*)
          ),
          interventions(*)
        ),
        managers(*)
      `)
      .eq('user_id', odooId)
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error fetching project with relations:', error.message);
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    console.log(`Fetched project with all relations:`, data);
    return data; // Return the project data along with all its relations, including interventions
  } catch (err) {
    console.error('Fetch error:', err.message);
    throw err;
  }
};




export async function POST(req) {
  const origin = req.headers.get("origin");
  const headers = getCorsHeaders(origin);

  console.log("----- Starting Project Creation Process -----");
  
  const projectData = await req.json();
  console.log("Project Data Received:", projectData);

  const userId = projectData.uid;
  const doors = projectData.doors;
  const wallsFromPayload = projectData.walls; 
  const pointsFromPayload = projectData.points; 

  // Check if user exists or create one...
  const { data: existingUser, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("odoo_id", userId)
    .single();

  let createdUserId = userId;
  if (userError || !existingUser) {
    const userInsertData = {
      name: projectData?.name || "Unknown User",
      email: projectData.username || `user${Date.now()}@example.com`,
      odoo_id: userId,
    };

    const { data: newUser, error: newUserError } = await supabase
      .from("users")
      .insert([userInsertData])
      .select()
      .single();

    if (newUserError) {
      console.error("Error creating user:", newUserError.message);
      return new Response(JSON.stringify({ error: newUserError.message }), { status: 400, headers });
    }
    createdUserId = newUser.id;
  } else {
    createdUserId = existingUser.id;
  }

  // Insert project
  const projectInsertData = {
    title: projectData.title || "New Office Design",
    project_number: projectData.project_number,
    description: projectData.description || "Interior design project.",
    user_id: projectData.uid,
    db: projectData?.db,
  };

  const { data: projectDataResponse, error: projectError } = await supabase
    .from("projects")
    .insert([projectInsertData])
    .select()
    .single();

  if (projectError) {
    console.error("Error creating project:", projectError.message);
    return new Response(JSON.stringify({ error: projectError.message }), { status: 400, headers });
  }
  const createdProjectId = projectDataResponse.id;

  // Insert manager record
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
    console.error("Error creating manager:", managerError.message);
    return new Response(JSON.stringify({ error: managerError.message }), { status: 400, headers });
  }

  // Create a version row for the project
  const versionInsertData = {
    project_id: createdProjectId,
    version: projectData.version || '1.0.0',
  };

  const { data: versionData, error: versionError } = await supabase
    .from("versions")
    .insert([versionInsertData])
    .select()
    .single();

  if (versionError) {
    console.error("Error creating version:", versionError.message);
    return new Response(JSON.stringify({ error: versionError.message }), { status: 400, headers });
  }
  const createdVersionId = versionData.id;

  // --- Insert Points ---
  // Do not include an 'id' so that the DB generates one.
  const pointsToInsert = pointsFromPayload.map(pt => ({
    x_coordinate: pt.position.x,
    y_coordinate: pt.position.y,
    z_coordinate: pt.position.z,
    snapangle: pt.snapAngle,
    rotation: pt.rotation,
    version_id: createdVersionId,
  }));

  const { data: insertedPoints, error: pointsError } = await supabase
    .from("points")
    .insert(pointsToInsert)
    .select();

  if (pointsError) {
    console.error("Error creating points:", pointsError.message);
    return new Response(JSON.stringify({ error: pointsError.message }), { status: 400, headers });
  }

  // Build a mapping from the client's tempId to the DB-generated UUID.
  // We assume the client sent points in the same order as 'pointsFromPayload'.
  const pointIdMapping = {};
  insertedPoints.forEach((pt, index) => {
    const tempId = pointsFromPayload[index].tempId;
    pointIdMapping[tempId] = pt.id;
  });

  // --- Insert Walls ---
  // Update walls payload: replace client temp IDs with DB-generated UUIDs.
  const wallsToInsert = wallsFromPayload.map(wall => ({
    startpointid: pointIdMapping[wall.startPointId],
    endpointid: pointIdMapping[wall.endPointId],
    length: wall.length,
    rotation: wall.rotation,
    thickness: wall.thickness,
    color: wall.color,
    texture: wall.texture,
    height: wall.height,
    version_id: createdVersionId,
    // Optionally store angles as JSON if needed:
    // angles: wall.angles,
  }));

  const { data: wallsData, error: wallsError } = await supabase
    .from("walls")
    .insert(wallsToInsert)
    .select();

  if (wallsError) {
    console.error("Error inserting walls:", wallsError.message);
    // Optionally clean up inserted points:
    await supabase.from("points").delete().in("id", insertedPoints.map(pt => pt.id));
    return new Response(JSON.stringify({ error: wallsError.message }), { status: 400, headers });
  }

  // --- Insert Doors (Articles) ---
  const doorsToInsert = doors.map(door => ({
    version_id: createdVersionId,
    data: [door] || [],
  }));

  const { data: doorsData, error: doorsError } = await supabase
    .from("articles")
    .insert(doorsToInsert);

  if (doorsError) {
    console.error("Error inserting doors:", doorsError.message);
    return new Response(JSON.stringify({ error: doorsError.message }), { status: 400, headers });
  }

  // --- Insert Settings ---
  const settingsInsertData = {
    project_id: createdProjectId,
    config: { units: projectData.units || "m" },
  };

  const { data: settingsData, error: settingsError } = await supabase
    .from("settings")
    .insert([settingsInsertData])
    .select()
    .single();

  if (settingsError) {
    console.error("Error creating settings:", settingsError.message);
    return new Response(JSON.stringify({ error: settingsError.message }), { status: 400, headers });
  }
  
  const interventionPayload = {
    action: `Created project "${projectData.title}"`,
    project_id: createdProjectId,
    version_id: createdVersionId,
    intervenerId: createdUserId  
  };
  
  let interventionRecord;
   
  try {
    interventionRecord = await createIntervention(interventionPayload);
  } catch (error) {
    console.error("Error creating intervention:", error.message);
    // Decide whether to fail the whole request or proceed without intervention logging.
  }
  console.log("Intervention record created:", interventionRecord);


  console.log("----- Project Creation Process Completed Successfully -----");
  


  const project = await fetchProjectWithRelations(userId, createdProjectId);
  console.log("Project with relations fetched:", project);

  return new Response(
    JSON.stringify({
      message: "🎊 Awesome! Project, version, settings, and Room_Planner components created successfully! 🎉",
      project: project,
      project_id: createdProjectId,
      version_id: createdVersionId,
      user_id: createdUserId,
    }),
    { status: 201, headers }
  );
}


