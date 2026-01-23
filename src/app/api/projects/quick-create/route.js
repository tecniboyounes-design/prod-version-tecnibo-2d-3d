import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { generateProjectNumber } from "@/lib/genProNum";
import { createIntervention } from "../../../../lib/createIntervention";
import { transformProjectsData } from "../../../../lib/restructureData";
import { supabase } from "../../filesController/route";
import { fetchProjectWithRelations } from "../route";

// POST /api/projects/quick-create
// Creates a project with minimal payload: { userId, projectData }

// ─────────────────────────────────────────────────────────────────────────────
// Normalizer: maps client payload shape to DB-friendly shape used below
// ─────────────────────────────────────────────────────────────────────────────
function normalizeClientProject(projectData  = {}) {
  const title =
    projectData.projectName || projectData.title || "Quick Project";

  const celling_type =
    projectData.ceilingType || projectData.celling_type || "default";
  const floor_type =
    projectData.floorType || projectData.floor_type || "default";

  const project_estimate = Boolean(
    projectData.estimateUsage ?? projectData.project_estimate ?? false
  );

  // dimensions may be partial (e.g., only height provided)
  const d = projectData.dimensions || {};
  const dimensions = {
    width: Number(d.width ?? 0),
    length: Number(d.length ?? 0),
    height: Number(d.height ?? 0),
  };

  // plan params (defaults)
  const planParameters =
    projectData.planParameters || {
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      ref_length: null,
    };

  // passthrough points
  const points = Array.isArray(projectData.points) ? projectData.points : [];

  // lines -> walls; normalize color to JSON string so parseColorField works later
  const rawWalls = Array.isArray(projectData.walls)
    ? projectData.walls
    : Array.isArray(projectData.lines)
    ? projectData.lines
    : [];

  const walls = rawWalls.map((w ) => {
    let color = w.color ?? null; // could be {}, "#fff", or object
    if (color && typeof color === "object") {
      color = JSON.stringify(color); // {} -> "{}"
    } else if (typeof color === "string" && color.startsWith("#")) {
      color = JSON.stringify({ hex: color }); // "#fff" -> {"hex":"#fff"}
    }
    return {
      id: w.id,
      startPointId: w.startPointId ?? (w.start ?? w.start_id),
      endPointId: w.endPointId ?? (w.end ?? w.end_id),
      length: w.length ?? 1,
      rotation: w.rotation ?? 0,
      thickness: w.thickness ?? 0.01,
      height: w.height ?? 2.5,
      type: w.type || "simple",
      texture: w.texture || "default.avif",
      color,
      cp_Id: w.cp_Id ?? null, // ✅ keep cp_Id from payload
    };
  });

  // Merge/normalize articles + doors into a single, consistent array
  const toArticle = (src ) => {
    if (!src || typeof src !== "object") return null;
    const a = { ...src };

    if (!a.id) a.id = `art-${Math.random().toString(36).slice(2)}`;

    a.position = a.position || { x: 0, y: 0, z: 0 };
    a.rotation = a.rotation ?? 0;
    a.name = a.name || "Unknown";
    a.width = a.width ?? null;
    a.height = a.height ?? null;
    a.texture = a.texture || "default.avif";
    a.color = a.color ?? "white";
    a.doorType = a.doorType || "single";
    a.system = a.system || "cloison fallback";

    return a;
  };

  const mergedArticles = [];
  if (Array.isArray(projectData.articles)) {
    projectData.articles.forEach((x ) => {
      const n = toArticle(x);
      if (n) mergedArticles.push(n);
    });
  }
  if (Array.isArray(projectData.doors)) {
    projectData.doors.forEach((x ) => {
      const n = toArticle(x);
      if (n) mergedArticles.push(n);
    });
  }

  return {
    title,
    description: projectData.description || "Quick-created project.",
    status: (projectData.status || "draft").toLowerCase(),
    image_url:
      projectData.image_url ||
      "",
    db: projectData.db || null,
    celling_type,
    floor_type,
    project_estimate,
    RAL: projectData.RAL || {},
    colorProfile: projectData.colorProfile || {},
    dimensions,
    planParameters,
    points,
    walls,
    // expose only normalized articles
    articles: mergedArticles,
  };
}

export async function POST(req ) {
  const corsHeaders = getCorsHeaders(req);

  let payload ;
  try {
    payload = await req.json();
    // console.log("[quick-create] Incoming request body parsed");
  } catch (e ) {
    console.error("[quick-create] Failed to parse JSON body", e?.message);
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // console.log("payload:", payload);
  const { userId, projectData } = payload || {};
  if (!userId || !projectData || typeof projectData !== "object") {
    console.warn("[quick-create] Missing required fields", {
      hasUserId: !!userId,
      hasProjectData: !!projectData,
    });
    return new Response(
      JSON.stringify({ error: "Missing required fields: userId, projectData" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Normalize client payload once, then only use P.*
  const P = normalizeClientProject(projectData);

  // Ensure user exists (user is expected to be pre-created)
  // console.log("[quick-create] Looking up user by odoo_id", userId);
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, name, email, odoo_id, role")
    .eq("odoo_id", userId)
    .single();

  if (userError || !user) {
    console.error("[quick-create] User not found", userError?.message);
    return new Response(
      JSON.stringify({ error: "User not found for provided userId" }),
      { status: 404, headers: corsHeaders }
    );
  }
  // console.log("[quick-create] User found", {
  //   id: user.id,
  //   odoo_id: user.odoo_id,
  // });

  // Insert project
  // console.log("[quick-create] Preparing project insert data");
  const projectInsertData = {
    title: P.title,
    project_number: projectData.project_number || generateProjectNumber(),
    description: P.description,
    user_id: userId,
    db: P.db,
    image_url: P.image_url,
    celling_type: P.celling_type,
    floor_type: P.floor_type,
    project_estimate: P.project_estimate,
    RAL: P.RAL,
    colorProfile: P.colorProfile,
    status: P.status,
    dimensions: P.dimensions,
  };

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .insert([projectInsertData])
    .select()
    .single();

  if (projectError) {
    console.error("[quick-create] Project insert failed", projectError.message);
    return new Response(JSON.stringify({ error: projectError.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const projectId = projectRow.id;
  // console.log("[quick-create] Project inserted", { projectId });

  // Insert a manager entry based on user (minimal defaults)
  const managerData = {
    project_id: projectId,
    name: projectData.manager?.name || user.name || "Default Manager",
    avatar: projectData.manager?.avatar || "https://i.pravatar.cc/150?img=3",
    email: projectData.manager?.email || user.email || "default@example.com",
    odoo_id: user.odoo_id,
    partner_id: projectData.manager?.partner_id || null,
    company_id: projectData.manager?.company_id || 11,
    timezone: projectData.manager?.timezone || "Africa/Casablanca",
    access_level: "admin",
  };

  const { error: managerError } = await supabase
    .from("managers")
    .insert([managerData]);

  if (managerError) {
    console.error("[quick-create] Manager insert failed", managerError.message);
    return new Response(JSON.stringify({ error: managerError.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }
  // console.log("[quick-create] Manager inserted for project", { projectId });

  // Create version
  const versionInsertData = {
    project_id: projectId,
    version: projectData.version || "1.0",
  };

  const { data: versionRow, error: versionError } = await supabase
    .from("versions")
    .insert([versionInsertData])
    .select()
    .single();

  if (versionError) {
    console.error("[quick-create] Version insert failed", versionError.message);
    return new Response(JSON.stringify({ error: versionError.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const versionId = versionRow.id;
  // console.log("[quick-create] Version inserted", { versionId });

  // Plan parameters (defaults or provided)
  const planParams = P.planParameters;

  const planParamsInsertData = {
    version_id: versionId,
    scale_factor: planParams.scale ?? 1,
    rotation: planParams.rotation ?? 0,
    x_offset: planParams.offsetX ?? 0,
    y_offset: planParams.offsetY ?? 0,
    ref_length: planParams.ref_length ?? null,
  };

  const { error: planParamsError } = await supabase
    .from("plan_parameters")
    .insert([planParamsInsertData]);

  if (planParamsError) {
    console.error(
      "[quick-create] Plan parameters insert failed",
      planParamsError.message
    );
    return new Response(JSON.stringify({ error: planParamsError.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // console.log("[quick-create] Plan pa/rameters inserted for version", {
  //   versionId,
  // });
  
  // Points (optional)
  const points = Array.isArray(P.points) ? P.points : [];

  let insertedPoints = [];
  if (points.length > 0) {
    // console.log("[quick-create] Inserting points", { count: points.length });
    const pointsToInsert = points.map((pt ) => ({
      x_coordinate: pt.position?.x ?? 0,
      y_coordinate: pt.position?.y ?? 0,
      z_coordinate: pt.position?.z ?? 0,
      snapangle: pt.snapAngle ?? 0,
      rotation: pt.rotation ?? 0,
      version_id: versionId,
      client_id: pt.id,
    }));

    const { data: pointsRows, error: pointsError } = await supabase
      .from("points")
      .insert(pointsToInsert)
      .select();

    if (pointsError) {
      console.error("[quick-create] Points insert failed", pointsError.message);
      return new Response(JSON.stringify({ error: pointsError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    insertedPoints = pointsRows || [];
    // console.log("[quick-create] Points inserted", {
    //   count: insertedPoints.length,
    // });
  }

  // Walls (optional; requires point mapping)
  const walls = Array.isArray(P.walls) ? P.walls : [];
  if (walls.length > 0 && insertedPoints.length === 0) {
    console.warn("[quick-create] Walls provided but no points inserted");
    return new Response(
      JSON.stringify({
        error:
          "Walls provided but no points inserted. Provide points to map wall endpoints.",
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Build point client_id -> DB id map
  const pointIdMapping= {};
  insertedPoints.forEach((pt) => {
    pointIdMapping[pt.client_id] = pt.id;
  });

  let wallIdMapping = {};

  if (walls.length > 0) {
    // console.log("[quick-create] Inserting walls", { count: walls.length });

    const wallsToInsert = walls.map((wall ) => ({
      startpointid: pointIdMapping[wall.startPointId],
      endpointid: pointIdMapping[wall.endPointId],
      length: wall.length ?? 1,
      rotation: wall.rotation ?? 0,
      thickness: wall.thickness ?? 0.01,
      color: wall.color ?? "#f5f5f5",
      texture: wall.texture ?? "default.avif",
      height: wall.height ?? 2.5,
      version_id: versionId,
      client_id: wall.id,          // keep client_id
      type: wall.type || "simple",
      cp_Id: wall.cp_Id ?? null,   // ✅ persist cp_Id to DB
    }));

    const { error: wallsError } = await supabase
      .from("walls")
      .insert(wallsToInsert);

    if (wallsError) {
      console.error("[quick-create] Walls insert failed", wallsError.message);
      return new Response(JSON.stringify({ error: wallsError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    // console.log("[quick-create] Walls inserted");

    // 🔎 Fetch the inserted walls to build client_id -> uuid mapping
    const { data: fetchedWalls, error: wallsFetchError } = await supabase
      .from("walls")
      .select("id, client_id")
      .eq("version_id", versionId);

    if (wallsFetchError) {
      console.error("[quick-create] Fetch walls for mapping failed", wallsFetchError.message);
      return new Response(JSON.stringify({ error: wallsFetchError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    wallIdMapping = (fetchedWalls || []).reduce((acc , w ) => {
      acc[w.client_id] = w.id;
      return acc;
    }, {});
  }

  // Articles (doors are already merged & normalized into P.articles)
  const rawArticles = Array.isArray(P.articles) ? P.articles : [];

  if (rawArticles.length > 0) {
    // console.log("[quick-create] Inserting articles/doors", {
    //   count: rawArticles.length,
    // });

    const articlesToInsert = rawArticles.map((a ) => {
      // map wall client id -> DB uuid (keep original too)
      const rawWallId = a.wallId ?? null;
      const dbWallId =
        rawWallId && wallIdMapping[rawWallId]
          ? wallIdMapping[rawWallId]
          : rawWallId;

      // map reference point client id -> DB uuid (keep original too)
      const rawRefPt = a.referencePointId ?? null;
      const dbRefPt =
        rawRefPt && pointIdMapping[rawRefPt]
          ? pointIdMapping[rawRefPt]
          : rawRefPt;

      return {
        version_id: versionId,
        client_id: a.id, // keep client id
        // store OBJECT (not [a]) to match transformProjectsData expectations
        data: {
          ...a,
          wallClientId: rawWallId ?? null,           // keep client id for compatibility
          wallId: dbWallId ?? null,                  // ✅ DB UUID in stored payload
          referencePointClientId: rawRefPt ?? null,  // keep client id for compatibility
          referencePointId: dbRefPt ?? null,         // ✅ DB UUID in stored payload
        },
      };
    });

    const { error: articlesError } = await supabase
      .from("articles")
      .insert(articlesToInsert);

    if (articlesError) {
      console.error(
        "[quick-create] Articles insert failed",
        articlesError.message
      );
      return new Response(JSON.stringify({ error: articlesError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    // console.log("[quick-create] Articles inserted");
  }

  // Log intervention
  try {
    // console.log("[quick-create] Creating intervention log");
    const interventionPayload = {
      action: "Quick project created",
      project_id: projectId,
      version_id: versionId,
      intervenerId: String(userId),
      metadata: {
        project_title: projectInsertData.title,
        project_number: projectInsertData.project_number,
        intervener_name: user.name || "Unknown User",
        intervener_email: user.email || "",
      },
    };
    await createIntervention(interventionPayload);
    console.log("[quick-create] Intervention created");
  } catch (interventionError ) {
    console.error(
      "[quick-create] Intervention creation failed",
      interventionError.message
    );
    return new Response(
      JSON.stringify({
        error: "Failed to create intervention",
        details: interventionError.message,
      }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Fetch and transform for response
  console.log("[quick-create] Fetching project with relations", { projectId });
  const projectWithRelations = await fetchProjectWithRelations(
    userId,
    projectId
  );
  console.log("[quick-create] Project with relations fetched");

  const nameParts = (user.name || "Unknown User").split(" ");
  const userData = {
    id: userId,
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" ") || "",
    role: user.role || "Unknown",
  };

  console.log("[quick-create] Transforming project data for response");
  const transformed = transformProjectsData([projectWithRelations], userData);
  console.log("[quick-create] Transformation complete");

  return new Response(
    JSON.stringify(
      {
        success: true,
        projectWithRelations,
        transformedProjectData: transformed?.[0] || null,
        projectId,
        versionId,
        message: `Project ${projectId} created quickly with user ${userId}.`,
      },
      null,
      2
    ),
    { status: 200, headers: corsHeaders }
  );
}

export async function OPTIONS(req ) {
  return handleCorsPreflight(req);
}
