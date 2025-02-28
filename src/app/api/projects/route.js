import { supabase } from "@/supabaseClient";

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
  // console.log("Incoming request:", req);
  const projectData = await req.json();
  console.log("Project Data:", projectData);

  const userId = projectData.uid;

  // Check if user already exists
  const { data: existingUser, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("odoo_id", userId)
    .single();

  let createdUserId = userId; 

  if (userError || !existingUser) {
    // console.log("User not found, creating a new one...");

    const userInsertData = {
      name: projectData?.name || "Unknown User",
      email: projectData.username || `user${Date.now()}@example.com`,
      odoo_id: userId, 
      preferred_unit: 'm'
    };

    const { data: newUser, error: newUserError } = await supabase
      .from("users")
      .insert([userInsertData])
      .select()
      .single(); // Ensure we get a single user record

    if (newUserError) {
      console.error("Error creating user:", newUserError.message);
      return new Response(JSON.stringify({ error: newUserError.message }), {
        status: 400,
      });
    }

    createdUserId = newUser.id; 
  } else {
    console.log("Existing User ID:", existingUser.id);
    createdUserId = existingUser.id; // Use existing user ID
  }

  // console.log("User ID:", userId); // userId remains constant from Odoo

  // Step 2: Insert a new floorplan
  const floorplanInsertData = {
    points: JSON.stringify({ coordinates: [] }),
    walls: JSON.stringify({ count: 0 }),
    rooms: JSON.stringify({ count: 0 }),
    items: JSON.stringify({ count: 0 }),
    units: "m",
  };

  const { data: floorplanData, error: floorplanError } = await supabase
    .from("floorplans")
    .insert([floorplanInsertData])
    .select()
    .single(); // Ensure we get a single floorplan record

  if (floorplanError) {
    console.error("Error creating floorplan:", floorplanError.message);
    return new Response(JSON.stringify({ error: floorplanError.message }), {
      status: 400,
    });
  }

  const createdFloorplanId = floorplanData.id;
  // console.log("Created Floorplan ID:", createdFloorplanId);

  const projectInsertData = {
    title: projectData.title || "New Office Design",
    project_number: projectData.project_number,
    description:
      projectData.description ||
      "Interior design project for a new office space.",
    managers: projectData.managers, 
    user_id: userId, 
    floorplan_id: createdFloorplanId,
    db: projectData?.db,
    image_url: 'https://tecnibo-2d-3d.vercel.app/Room.jpeg'
  };
  

  // console.log("Inserting Project Data:", projectInsertData);

  const { data: projectDataResponse, error: projectError } = await supabase
    .from("projects")
    .insert([projectInsertData])
    .select()
    .single(); // Ensure we get a single project record

  if (projectError) {
    console.error("Error creating project:", projectError.message);
    return new Response(JSON.stringify({ error: projectError.message }), {
      status: 400,
    });
  }

  const createdProjectId = projectDataResponse.id;
  // console.log("Created Project ID:", createdProjectId);

  // Step 4: Update the floorplan with the new project ID
  const { error: updateFloorplanError } = await supabase
    .from("floorplans")
    .update({ project_id: createdProjectId })
    .eq("id", createdFloorplanId);

  if (updateFloorplanError) {
    console.error("Error updating floorplan:", updateFloorplanError.message);
    return new Response(
      JSON.stringify({ error: updateFloorplanError.message }),
      { status: 400 }
    );
  }

  // console.log("Floorplan successfully linked to Project ID:", createdProjectId);

  // Step 5: Update the user with the new project ID
  const updatedProjectIds = [createdProjectId]; // Update with your logic to maintain project IDs
  const { error: updateUserError } = await supabase
    .from("users")
    .update({ project_ids: updatedProjectIds })
    .eq("id", createdUserId);
  
  if (updateUserError) {
    console.error("Error updating user:", updateUserError.message);
    return new Response(JSON.stringify({ error: updateUserError.message }), {
      status: 400,
    });
  }

  // console.log("User successfully updated with Project ID:", createdProjectId);

  return new Response(
    JSON.stringify({
      message: "Project, floorplan, and user updated successfully",
      project_id: createdProjectId,
      floorplan_id: createdFloorplanId,
      user_id: userId, // Return the constant userId from Odoo
    }),
    { status: 201 }
  );
}


