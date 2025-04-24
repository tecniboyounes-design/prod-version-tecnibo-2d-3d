import { supabase } from "../filesController/route";

/**
 * Inserts an intervention record into the database using a minimal payload.
 * 
 * @param {Object} payload - Minimal payload.
 * @param {string} payload.action - The intervention action message.
 * @param {string} payload.project_id - The project's UUID.
 * @param {string} payload.version_id - The version's UUID.
 * @param {string} payload.intervenerId - The intervener's user UUID or odoo_id.
 * @param {Object} [payload.metadata] - Optional metadata.
 * @returns {Promise<Object>} - The inserted intervention object.
 */
export async function createIntervention(payload) {
  console.log('paylaod in createIntervention',payload);
  const { action, project_id, version_id, intervenerId, metadata } = payload;
  console.log('metadata',metadata);

  // Validate required fields
  const missingFields = [];
  if (!action) missingFields.push("action");
  if (!project_id) missingFields.push("project_id");
  if (!version_id) missingFields.push("version_id");
  if (!intervenerId) missingFields.push("intervenerId");
  if (missingFields.length > 0) {
    console.error(`❌ [Validation Error] - Missing required fields: ${missingFields.join(", ")}`);
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  // Lookup project data
  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("title, odoo_project_id")
    .eq("id", project_id)
    .single();

  if (projectError || !projectData) {
    console.error("🚨 [Project Lookup Error] -", projectError?.message);
    throw new Error("Project lookup failed.");
  }

  // Lookup version data
  const { data: versionData, error: versionError } = await supabase
    .from("versions")
    .select("version")
    .eq("id", version_id)
    .single();

  if (versionError || !versionData) {
    console.error("🚨 [Version Lookup Error] -", versionError?.message);
    throw new Error("Version lookup failed.");
  }

  // Lookup intervener data
  let intervenerQuery = supabase.from("users").select("id, name, avatar, email, odoo_id");
  intervenerQuery = intervenerId.length === 36
    ? intervenerQuery.eq("id", intervenerId)
    : intervenerQuery.eq("odoo_id", intervenerId);

  const { data: intervenerData, error: intervenerError } = await intervenerQuery.single();

  if (intervenerError || !intervenerData) {
    console.error("🚨 [Intervener Lookup Error] -", intervenerError?.message);
    throw new Error("Intervener lookup failed.");
  }

  // Build the intervention record
  const interventionRecord = {
    version_id,
    user_id: intervenerData.id,
    action,
    odoo_project_id: projectData.odoo_project_id,
    projectname: projectData.title,
    version: versionData.version,
    intervener: intervenerData,
    metadata: metadata || {}, // Default to empty object if not provided
  };

  // Insert the intervention record
  const { data: insertedData, error: insertError } = await supabase
    .from("interventions")
    .insert([interventionRecord])
    .select("id, timestamp, action, projectname, version, intervener, metadata")
    .single();

  if (insertError) {
    console.error("⛔ [Database Error] - Error inserting intervention:", insertError.message);
    throw new Error(insertError.message);
  }

  return {
    id: insertedData.id,
    timestamp: insertedData.timestamp,
    action,
    projectName: projectData.title,
    version: versionData.version,
    intervener: intervenerData,
    metadata: insertedData.metadata, // ← keep what was actually stored
  };
  
}
