import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { supabase } from "../filesController/route";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    // Destructure request body with camelCase parameters
    const { projectId, odooId, accessLevel } = await req.json();

    // Validate input
    if (!projectId || !odooId || !accessLevel) {
      console.warn("⚠️ [addManager] Missing projectId, odooId, or accessLevel");
      return new Response(
        JSON.stringify({ success: false, error: "Missing projectId, odooId, or accessLevel" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate allowed values for accessLevel
    if (!["view_only", "can_edit", "admin"].includes(accessLevel)) {
      console.warn("⚠️ [addManager] Invalid accessLevel:", accessLevel);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid accessLevel" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if the manager already exists for this project
    const { data: existingManager, error: existingError } = await supabase
      .from("managers")
      .select("id")
      .eq("project_id", projectId)
      .eq("odoo_id", odooId)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      // PGRST116: no rows found
      console.error(
        "❌ [addManager] Error checking existing manager:",
        existingError.message
      );
      throw new Error(`Error checking existing manager: ${existingError.message}`);
    }

    if (existingManager) {
      console.warn("⚠️ [addManager] Manager already exists for this project");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Manager already exists for this project",
        }),
        { status: 409, headers: corsHeaders }
      );
    }

    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("odoo_id", odooId)
      .single();

    if (userError || !user) {
      console.error(
        "❌ [addManager] Error fetching user:",
        userError?.message || "User not found"
      );
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Insert new manager with snake_case column names
    const { data: newManager, error: insertError } = await supabase
      .from("managers")
      .insert({
        project_id: projectId,
        odoo_id: odooId,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        timezone: user.timezone || null,
        company_id: user.company_id || null,
        partner_id: user.partner_id || null,
        access_level: accessLevel, // Map camelCase variable to snake_case column
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ [addManager] Error adding manager:", insertError.message);
      throw new Error(`Failed to add manager: ${insertError.message}`);
    }

    console.log(
      `✅ [addManager] Manager added: ${user.name} (${user.email}) to project ${projectId}`
    );
    return new Response(
      JSON.stringify({ success: true, manager: newManager }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("❌ [addManager] Error adding manager:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: `Failed to add manager: ${err.message}` }),
      { status: 500, headers: corsHeaders }
    );
  }
}