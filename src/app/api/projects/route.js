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


/**
 * POST endpoint to create a project and its associated version, floorplan components, and settings.
 *
 * The request body should be a JSON object with the following structure:
 *
 * {
 *   title: string,          // (optional) The title of the project (default: "New Office Design").
 *   project_number: string, // (required) Unique identifier for the project.
 *   description: string,    // (optional) Description of the project.
 *   managers: [             // (required) An array of manager objects, each containing:
 *     {
 *       name: string,       // Manager's name.
 *       avatar: string,     // URL of the manager's avatar.
 *       email: string,      // Manager's email address.
 *       odoo_id: number,    // Manager's Odoo ID.
 *       partner_id: number  // Manager's partner ID.
 *     }
 *   ],
 *   uid: number|string,     // (required) The user's Odoo ID used for checking/creating a user.
 *   version: string,        // (optional) The version string for the project floorplan (default: "1.0.0").
 *   db: string,             // (optional) Database identifier.
 *   units: string,          // (optional) Measurement unit for project settings (default: "m").
 *   username: string        // (optional) Username for new user creation if needed.
 * }
 *
 * @param {Request} req - The HTTP request object containing the JSON body with project data.
 * @returns {Promise<Response>} A promise that resolves to an HTTP response with a JSON object:
 *   On success: { message: string, project_id: UUID, version_id: UUID, user_id: UUID }
 *   On error: { error: string }
 */



export async function POST(req) {

  const projectData = await req.json();
  console.log("Project Data:", projectData);

  const userId = projectData.uid;

  // Check if user already exists using odoo_id
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
      return new Response(JSON.stringify({ error: newUserError.message }), {
        status: 400,
      });
    }
    createdUserId = newUser.id;
  } else {
    createdUserId = existingUser.id;
  }
  
  // Insert a new project
  const projectInsertData = {
    title: projectData.title || "New Office Design",
    project_number: projectData.project_number,
    description: projectData.description || "Interior design project.",
    // managers: projectData.managers,
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
    return new Response(JSON.stringify({ error: projectError.message }), {
      status: 400,
    });
  }

  const createdProjectId = projectDataResponse.id;

  const managerData = {
    project_id: createdProjectId,
    name: "Manager Name",
    avatar: "path/to/avatar.jpg",
    email: "manager@example.com",
    odoo_id: 447,
    partner_id: 67890,
    company_id: 11,
    timezone: "Africa/Casablanca",
  };

  // Insert manager data without specifying the `id` column.
  const { error: managerError } = await supabase
    .from("managers")
    .insert([managerData]);

  if (managerError) {
    console.error("Error creating manager:", managerError);
    return;
  }

  console.log("Manager added successfully.");


  console.log("Manager added successfully.");


  // Create a version row for the new project
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
    return new Response(JSON.stringify({ error: versionError.message }), {
      status: 400,
    });
  }

  const createdVersionId = versionData.id;

  // Directly create a wall row linked to this version
  const { error: wallsError } = await supabase
    .from("walls")
    .insert([{
      version_id: createdVersionId,
      length: 10.0,  
      rotation: 0,   
      thickness: 1,  
      height: 2.5    
    }]);

  // Check for errors
  if (wallsError) {
    console.error('Error inserting into walls:', wallsError);
  } else {
    console.log('Wall inserted successfully!');
  }


  // Directly create an empty points row linked to this version
  const { error: pointsError } = await supabase
    .from("points")
    .insert([{ version_id: createdVersionId, data: [] }]);

  if (pointsError) {
    console.error("Error creating points:", pointsError.message);
    return new Response(JSON.stringify({ error: pointsError.message }), {
      status: 400,
    });
  }

  // Directly create an empty articles row linked to this version
  const { error: articlesError } = await supabase
    .from("articles")
    .insert([{ version_id: createdVersionId, data: [] }]);

  if (articlesError) {
    console.error("Error creating articles:", articlesError.message);
    return new Response(JSON.stringify({ error: articlesError.message }), {
      status: 400,
    });
  }

  // Create a settings row linked directly to the project
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
    return new Response(JSON.stringify({ error: settingsError.message }), {
      status: 400,
    });
  }

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



