import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


export async function GET(req) {
  const { data, error } = await supabase.from("projects").select("*");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}

export async function POST(req) {
  // console.log("----- Starting Project Creation Process -----");
  
  const projectData = await req.json();
  // console.log("Project Data Received:", projectData);

  const userId = projectData.uid;

  // Check if user already exists using odoo_id
  // console.log("Checking if user exists for odoo_id:", userId);
  const { data: existingUser, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("odoo_id", userId)
    .single();

  let createdUserId = userId;
  if (userError || !existingUser) {
    // console.log("User does not exist. Creating new user...");
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
      return new Response(JSON.stringify({ error: newUserError.message }), { status: 400 });
    }
    createdUserId = newUser.id;
    // console.log("New user created successfully:", newUser);
  } else {
    createdUserId = existingUser.id;
    // console.log("Existing user found:", existingUser);
  }
  
  // Insert a new project
  // console.log("Creating new project...");
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
    return new Response(JSON.stringify({ error: projectError.message }), { status: 400 });
  }
  const createdProjectId = projectDataResponse.id;
  // console.log("Project created successfully. Project ID:", createdProjectId);

  // Create a manager record based solely on the authenticated user
  // console.log("Creating manager record...");
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
    return new Response(JSON.stringify({ error: managerError.message }), { status: 400 });
  }
  // console.log("Manager added successfully.");

  // Create a version row for the new project
  // console.log("Creating version record for project...");
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
    return new Response(JSON.stringify({ error: versionError.message }), { status: 400 });
  }
  const createdVersionId = versionData.id;
  // console.log("Version created successfully. Version ID:", createdVersionId);

  // Calculate and insert points for the wall.
  // console.log("Calculating start and end points for the wall...");
  const startPoint = {
    x_coordinate: 0,
    y_coordinate: 0,
    z_coordinate: 0,
    snapangle: 0,
    rotation: 0,
    version_id: createdVersionId,
  };

  const endPoint = {
    x_coordinate: 10.0,
    y_coordinate: 0,
    z_coordinate: 0,
    snapangle: 0,
    rotation: 0,
    version_id: createdVersionId,
  };

  // console.log("Inserting points into the database...");
  const { data: pointsData, error: pointsError } = await supabase
    .from("points")
    .insert([startPoint, endPoint])
    .select();

  if (pointsError) {
    console.error("Error creating points:", pointsError.message);
    return new Response(JSON.stringify({ error: pointsError.message }), { status: 400 });
  }

  const startPointId = pointsData[0].id;
  const endPointId = pointsData[1].id;
  // console.log("Points inserted successfully. StartPoint ID:", startPointId, "EndPoint ID:", endPointId);

  // Insert a wall row that references the two points.
  // console.log("Inserting wall that connects the two points...");
  const { data: wallData, error: wallsError } = await supabase
    .from("walls")
    .insert([{
      version_id: createdVersionId,
      startpointid: startPointId,
      endpointid: endPointId,
      length: 10.0,
      rotation: 0,
      thickness: 1,
      height: 2.5    
    }])
    .select()
    .single();

  if (wallsError) {
    console.error("Error inserting into walls:", wallsError.message);
    await supabase.from("points")
      .delete()
      .in("id", [startPointId, endPointId]);
    return new Response(JSON.stringify({ error: wallsError.message }), { status: 400 });
  }
  // console.log("Wall inserted successfully:", wallData);

  // Insert an empty articles row linked to this version
  // console.log("Inserting empty articles row for the version...");
  const { error: articlesError } = await supabase
    .from("articles")
    .insert([{ version_id: createdVersionId, data: [] }]);

  if (articlesError) {
    console.error("Error creating articles:", articlesError.message);
    return new Response(JSON.stringify({ error: articlesError.message }), { status: 400 });
  }
  // console.log("Articles row created successfully.");

  // Create a settings row linked directly to the project
  // console.log("Inserting settings row for the project...");
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
    return new Response(JSON.stringify({ error: settingsError.message }), { status: 400 });
  }
  // console.log("Settings created successfully:", settingsData);

  // Final log for process completion
  console.log("----- Project Creation Process Completed Successfully -----");
  return new Response(
    JSON.stringify({
      message: "Project, version, settings, and floorplan components created successfully",
      project_id: createdProjectId,
      version_id: createdVersionId,
      user_id: createdUserId,
    }),
    { status: 201 }
  );
}
