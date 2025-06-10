import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../filesController/route';
import { transformProjectsData } from '../../../lib/restructureData';
import { validate } from 'uuid';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { convertPdfViaMicroservice, savePlan2DImage } from '@/lib/plan2DImageHandler';

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}


const fetchProjectWithRelations = async (odooId, projectId) => {
  //console.log('[LOG] Fetching project with relations for odooId:', odooId, 'and projectId:', projectId);
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
      .eq("id", projectId)
      .single();

    if (error) {
      console.error('[LOG] Error fetching project with relations:', error.message);
      throw new Error(`Failed to fetch project: ${error.message}`);
    }
    //console.log('[LOG] Project fetched successfully with relations');
    return data;
  } catch (err) {
    console.error('[LOG] Fetch error in fetchProjectWithRelations:', err.message);
    throw err;
  }
};

// Upserts plan parameters into the plan_parameters table
const upsertPlanParameters = async (planParameters, versionId) => {
  //console.log('[LOG] Processing planParameters:', planParameters);
  try {
    if (!planParameters) {
      //console.log('[LOG] No planParameters provided, skipping upsert');
      return;
    }

    const { scale, rotation, offsetX, offsetY, refLength } = planParameters;

    // Prepare data, ensuring fields are numbers or null
    const planParamsData = {
      scale_factor: typeof scale === 'number' ? scale : null,
      rotation: typeof rotation === 'number' ? rotation : null,
      x_offset: typeof offsetX === 'number' ? offsetX : null,
      y_offset: typeof offsetY === 'number' ? offsetY : null,
      ref_length: typeof refLength === 'number' ? refLength : null,
      version_id: versionId,
    };

    // Check if plan_parameters record exists
    //console.log('[LOG] Checking for existing plan_parameters for versionId:', versionId);
    const { data: existingPlanParams, error: fetchPlanParamsError } = await supabase
      .from('plan_parameters')
      .select('id')
      .eq('version_id', versionId)
      .single();

    if (fetchPlanParamsError && fetchPlanParamsError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('[LOG] Failed to fetch plan_parameters:', fetchPlanParamsError.message);
      throw new Error('Failed to fetch plan_parameters');
    }

    if (existingPlanParams) {
      // Update existing record
      //console.log('[LOG] Updating existing plan_parameters for versionId:', versionId);
      const { error: updatePlanParamsError } = await supabase
        .from('plan_parameters')
        .update({
          scale_factor: planParamsData.scale_factor,
          rotation: planParamsData.rotation,
          x_offset: planParamsData.x_offset,
          y_offset: planParamsData.y_offset,
          ref_length: planParamsData.ref_length,
        })
        .eq('id', existingPlanParams.id);

      if (updatePlanParamsError) {
        console.error('[LOG] Failed to update plan_parameters:', updatePlanParamsError.message);
        throw new Error('Failed to update plan_parameters');
      }
      //console.log('[LOG] plan_parameters updated successfully');
    } else {
      // Insert new record
      //console.log('[LOG] Inserting new plan_parameters for versionId:', versionId);
      const { error: insertPlanParamsError } = await supabase
        .from('plan_parameters')
        .insert(planParamsData);

      if (insertPlanParamsError) {
        console.error('[LOG] Failed to insert plan_parameters:', insertPlanParamsError.message);
        throw new Error('Failed to insert plan_parameters');
      }
      //console.log('[LOG] plan_parameters inserted successfully');
    }
  } catch (err) {
    console.error('[LOG] Error in upsertPlanParameters:', err.message);
    throw err;
  }
};

export async function POST(req) {
  //console.log('[LOG] Handling POST request for updateVersion');
  const headers = getCorsHeaders(req);

  try {
    const versionData = await req.json();
    //console.log('[LOG] Received version data:', versionData);

    const { projectId, versionId, lines, points, doors, userId, planParameters, plan2DImage } = versionData;

    // console.log('material', lines.map(line => line.material));
    // Step 1: Check for required fields
    //console.log('[LOG] Checking required fields...');
    if (!userId || !projectId || !versionId) {
      const missingFields = [];
      if (!userId) missingFields.push('userId');
      if (!projectId) missingFields.push('projectId');
      if (!versionId) missingFields.push('versionId');
      //console.log('[LOG] Missing fields detected:', missingFields);
      return new NextResponse(
        JSON.stringify({
          error: `Missing required fields: ${missingFields.join(', ')}`,
        }),
        { status: 400, headers }
      );
    }

    // Validate UUIDs
    //console.log('[LOG] Validating UUIDs...');
    if (!validate(projectId)) {
      //console.log('[LOG] Invalid projectId:', projectId);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid projectId format. Must be a valid UUID.' }),
        { status: 400, headers }
      );
    }

    if (!validate(versionId)) {
      //console.log('[LOG] Invalid versionId:', versionId);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid versionId format. Must be a valid UUID.' }),
        { status: 400, headers }
      );
    }
    //console.log('[LOG] UUIDs validated successfully');

    // Step 2: Verify version exists
    //console.log('[LOG] Checking if version exists:', versionId);
    const { data: versionCheck, error: versionCheckError } = await supabase
      .from('versions')
      .select('id')
      .eq('id', versionId)
      .single();

    if (versionCheckError || !versionCheck) {
      console.error('[LOG] Version not found or error:', versionCheckError?.message || 'No version data');
      return new NextResponse(
        JSON.stringify({ error: 'Version not found' }),
        { status: 404, headers }
      );
    }
    //console.log('[LOG] Version exists with ID:', versionCheck.id);

    // Step 3: Update version metadata
    const serverLastModified = new Date().toISOString();
    //console.log('[LOG] Updating version metadata with server lastModified:', serverLastModified);
    const { data: versionUpdate, error: versionError } = await supabase
      .from('versions')
      .update({ lastModified: serverLastModified })
      .eq('id', versionId)
      .select()
      .single();

    if (versionError) {
      console.error('[LOG] Version update failed:', versionError.message);
      throw new Error('Failed to update version');
    }
    //console.log('[LOG] Version metadata updated successfully:', versionUpdate);

    await upsertPlanParameters(planParameters, versionId);

    // Helper function to determine client_id
    const getClientId = (entity) => {
      if (entity.client_id) return entity.client_id;
      if (!entity.id) {
        console.warn('[LOG] Entity missing id, cannot set client_id:', entity);
        return null;
      }
      if (/^(line|cloison|point|door|window)-\d+$/.test(entity.id)) {
        return entity.id;
      }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entity.id)) {
        console.warn('[LOG] UUID detected in id, client_id not provided, falling back to id:', entity.id);
        return entity.id;
      }
      return entity.id;
    };

    // Step 4: Delete orphaned entities
    //console.log('[LOG] Deleting orphaned entities...');
    //console.log('[LOG] Payload sizes - Points:', points.length, 'Lines:', lines.length, 'Doors:', doors.length);

    // Collect client_ids from payload
    const payloadPointClientIds = new Set(points.map(getClientId).filter(Boolean));
    const payloadWallClientIds = new Set(lines.map(getClientId).filter(Boolean));
    const payloadDoorClientIds = new Set(doors.map(getClientId).filter(Boolean));
    //console.log('[LOG] Payload client_ids collected - Points:', payloadPointClientIds.size, 'Walls:', payloadWallClientIds.size, 'Doors:', payloadDoorClientIds.size);

    // Fetch existing entities from database
    //console.log('[LOG] Fetching existing points from database...');
    const { data: dbPoints, error: dbPointsError } = await supabase
      .from('points')
      .select('id, client_id')
      .eq('version_id', versionId);
    if (dbPointsError) {
      console.error('[LOG] Failed to fetch points:', dbPointsError.message);
      throw new Error('Failed to fetch points');
    }
    //console.log('[LOG] Points fetched from db:', dbPoints.length);

    //console.log('[LOG] Fetching existing walls from database...');
    const { data: dbWalls, error: dbWallsError } = await supabase
      .from('walls')
      .select('id, client_id')
      .eq('version_id', versionId);
    if (dbWallsError) {
      console.error('[LOG] Failed to fetch walls:', dbWallsError.message);
      throw new Error('Failed to fetch walls');
    }
    //console.log('[LOG] Walls fetched from db:', dbWalls.length);

    //console.log('[LOG] Fetching existing articles from database...');
    const { data: dbArticles, error: dbArticlesError } = await supabase
      .from('articles')
      .select('id, client_id')
      .eq('version_id', versionId);
    if (dbArticlesError) {
      console.error('[LOG] Failed to fetch articles:', dbArticlesError.message);
      throw new Error('Failed to fetch articles');
    }
    //console.log('[LOG] Articles fetched from db:', dbArticles.length);

    // Identify orphaned entities
    const orphanedPoints = dbPoints.filter((p) => !payloadPointClientIds.has(p.client_id));
    const orphanedWalls = dbWalls.filter((w) => !payloadWallClientIds.has(w.client_id));
    const orphanedArticles = dbArticles.filter((a) => !payloadDoorClientIds.has(a.client_id));
    //console.log('[LOG] Orphaned entities - Points:', orphanedPoints.length, 'Walls:', orphanedWalls.length, 'Articles:', orphanedArticles.length);

    // Delete orphaned points
    if (orphanedPoints.length > 0) {
      const pointIdsToDelete = orphanedPoints.map((p) => p.id);
      //console.log('[LOG] Deleting orphaned points:', pointIdsToDelete);
      const { error: deletePointsError } = await supabase
        .from('points')
        .delete()
        .in('id', pointIdsToDelete);
      if (deletePointsError) {
        console.error('[LOG] Failed to delete orphaned points:', deletePointsError.message);
        throw new Error('Failed to delete orphaned points');
      }
      //console.log('[LOG] Orphaned points deleted successfully');
    }

    // Delete orphaned walls
    if (orphanedWalls.length > 0) {
      const wallIdsToDelete = orphanedWalls.map((w) => w.id);
      //console.log('[LOG] Deleting orphaned walls:', wallIdsToDelete);
      const { error: deleteWallsError } = await supabase
        .from('walls')
        .delete()
        .in('id', wallIdsToDelete);
      if (deleteWallsError) {
        console.error('[LOG] Failed to delete orphaned walls:', deleteWallsError.message);
        throw new Error('Failed to delete orphaned walls');
      }
      //console.log('[LOG] Orphaned walls deleted successfully');
    }

    // Delete orphaned articles
    if (orphanedArticles.length > 0) {
      const articleIdsToDelete = orphanedArticles.map((a) => a.id);
      //console.log('[LOG] Deleting orphaned articles:', articleIdsToDelete);
      const { error: deleteArticlesError } = await supabase
        .from('articles')
        .delete()
        .in('id', articleIdsToDelete);
      if (deleteArticlesError) {
        console.error('[LOG] Failed to delete orphaned articles:', deleteArticlesError.message);
        throw new Error('Failed to delete orphaned articles');
      }
      //console.log('[LOG] Orphaned articles deleted successfully');
    }

    // Step 5: Upsert points
    //console.log('[LOG] Preparing to upsert points...');
    const pointRowsToInsert = [];
    const pointRowsToUpdate = [];

    for (const pt of points) {
      const clientId = getClientId(pt);
      if (!clientId) {
        console.warn('[LOG] Skipping point due to missing client_id:', pt);
        continue;
      }
      if (
        pt.position &&
        typeof pt.position.x === 'number' &&
        typeof pt.position.y === 'number' &&
        typeof pt.position.z === 'number'
      ) {
        const pointData = {
          client_id: clientId,
          x_coordinate: pt.position.x,
          y_coordinate: pt.position.y,
          z_coordinate: pt.position.z,
          snapangle: pt.snapAngle || 0,
          rotation: pt.rotation || 0,
          version_id: versionId,
        };

        //console.log('[LOG] Checking if point exists for client_id:', clientId);
        const { data: existingPoint } = await supabase
          .from('points')
          .select('id')
          .eq('client_id', clientId)
          .eq('version_id', versionId)
          .single();

        if (existingPoint) {
          pointRowsToUpdate.push({ ...pointData, id: existingPoint.id });
        } else {
          pointRowsToInsert.push(pointData);
        }
      } else {
        console.warn('[LOG] Skipping point due to invalid position:', pt);
      }
    }
    //console.log('[LOG] Points to insert:', pointRowsToInsert.length, 'Points to update:', pointRowsToUpdate.length);

    // Insert new points
    if (pointRowsToInsert.length > 0) {
      //console.log('[LOG] Inserting new points:', pointRowsToInsert.length);
      const { error: insertError } = await supabase.from('points').insert(pointRowsToInsert);
      if (insertError) {
        console.error('[LOG] Points insertion failed:', insertError.message);
        throw new Error('Failed to insert points');
      }
      //console.log('[LOG] New points inserted successfully');
    }

    // Update existing points
    if (pointRowsToUpdate.length > 0) {
      //console.log('[LOG] Updating existing points:', pointRowsToUpdate.length);
      await Promise.all(
        pointRowsToUpdate.map((row) =>
          supabase
            .from('points')
            .update({
              x_coordinate: row.x_coordinate,
              y_coordinate: row.y_coordinate,
              z_coordinate: row.z_coordinate,
              snapangle: row.snapangle,
              rotation: row.rotation,
              version_id: row.version_id,
            })
            .eq('id', row.id)
        )
      );
      //console.log('[LOG] Existing points updated successfully');
    }

    // Fetch all points for mapping after upsert
    //console.log('[LOG] Fetching all points for mapping...');
    const { data: allPoints, error: fetchPointsError } = await supabase
      .from('points')
      .select('id, client_id')
      .eq('version_id', versionId);

    if (fetchPointsError) {
      console.error('[LOG] Failed to fetch points for mapping:', fetchPointsError.message);
      throw new Error('Failed to fetch points');
    }
    //console.log('[LOG] Points fetched for mapping:', allPoints.length);

    // Create dual mapping for points
    const pointIdMap = new Map();
    allPoints.forEach((p) => {
      pointIdMap.set(p.client_id, p.id);
      points.forEach((payloadPoint) => {
        if (payloadPoint.client_id === p.client_id && payloadPoint.id) {
          pointIdMap.set(payloadPoint.id, p.id);
        }
      });
    });
    //console.log('[LOG] Point ID mapping completed, size:', pointIdMap.size);

    // Step 6: Upsert walls
    //console.log('[LOG] Preparing to upsert walls...');
    const wallRowsToInsert = [];
    const wallRowsToUpdate = [];

    for (const line of lines) {
      const clientId = getClientId(line);
      if (!clientId) {
        console.warn('[LOG] Skipping wall due to missing client_id:', line);
        continue;
      }
      const startPointDbId = pointIdMap.get(line.startPointId);
      const endPointDbId = pointIdMap.get(line.endPointId);
      if (!startPointDbId || !endPointDbId) {
        console.warn(
          `[LOG] Skipping wall due to missing point IDs: startPointId=${line.startPointId}, endPointId=${line.endPointId}`
        );
        continue;
      }
      const colorValue = typeof line.color === 'string' ? line.color : JSON.stringify(line.color);
      //console.log(`[LOG] Processing wall with client_id ${clientId}, color:`, colorValue);
      const wallData = {
        client_id: clientId,
        startpointid: startPointDbId,
        endpointid: endPointDbId,
        length: line.length,
        rotation: line.rotation,
        thickness: line.thickness,
        color: colorValue,
        texture: line.texture,
        height: line.height,
        version_id: versionId,
        type: line.type,
        material: line.material || null,
        connections: line.connections || null,
        angles: line.angles || [],
        quantity: line.quantity || null,
        estimate: line.estimate || null,
        acoustic_performance: line.acoustic_performance || null,
        ceiling_type: line.ceiling_type || null,
        floor_type: line.floor_type || null,
        links: line.links || null,
      };

      //console.log('[LOG] Checking if wall exists for client_id:', clientId);
      const { data: existingWall } = await supabase
        .from('walls')
        .select('id')
        .eq('client_id', clientId)
        .eq('version_id', versionId)
        .single();

      if (existingWall) {
        wallRowsToUpdate.push({ ...wallData, id: existingWall.id });
      } else {
        wallRowsToInsert.push(wallData);
      }
    }
    //console.log('[LOG] Walls to insert:', wallRowsToInsert.length, 'Walls to update:', wallRowsToUpdate.length);

    // Insert new walls
    if (wallRowsToInsert.length > 0) {
      //console.log('[LOG] Inserting new walls:', wallRowsToInsert.length);
      const { error: insertError } = await supabase.from('walls').insert(wallRowsToInsert);
      if (insertError) {
        console.error('[LOG] Walls insertion failed:', insertError.message);
        throw new Error('Failed to insert walls');
      }
      //console.log('[LOG] New walls inserted successfully');
    }

    // Update existing walls
    if (wallRowsToUpdate.length > 0) {
      //console.log('[LOG] Updating existing walls:', wallRowsToUpdate.length);
      await Promise.all(
        wallRowsToUpdate.map((row) =>
          supabase
            .from('walls')
            .update({
              startpointid: row.startpointid,
              endpointid: row.endpointid,
              length: row.length,
              rotation: row.rotation,
              thickness: row.thickness,
              color: row.color,
              texture: row.texture,
              height: row.height,
              version_id: row.version_id,
              type: row.type,
              material: row.material,
              connections: row.connections,
              angles: row.angles,
              quantity: row.quantity,
              estimate: row.estimate,
              acoustic_performance: row.acoustic_performance,
              ceiling_type: row.ceiling_type,
              floor_type: row.floor_type,
              links: row.links,
            })
            .eq('id', row.id)
        )
      );
      //console.log('[LOG] Existing walls updated successfully');
    }

    // Fetch all walls for mapping after upsert
    //console.log('[LOG] Fetching all walls for mapping...');
    const { data: allWalls, error: fetchWallsError } = await supabase
      .from('walls')
      .select('id, client_id')
      .eq('version_id', versionId);

    if (fetchWallsError) {
      console.error('[LOG] Failed to fetch walls for mapping:', fetchWallsError.message);
      throw new Error('Failed to fetch walls');
    }
    //console.log('[LOG] Walls fetched for mapping:', allWalls.length);

    // Create enhanced wall ID mapping
    const wallIdMap = new Map();
    const payloadWallIdToDbId = new Map(); // Map payload id to database id
    allWalls.forEach((w) => {
      wallIdMap.set(w.client_id, w.id); // Map client_id to database id
      wallIdMap.set(w.id, w.id);        // Map database id to itself
      // Link payload id to database id
      const payloadLine = lines.find(line => line.client_id === w.client_id);
      if (payloadLine) {
        payloadWallIdToDbId.set(payloadLine.id, w.id); // e.g., "b520646f-6a9e-4afb-ab73-170ed1a2111d" -> db_id
      }
    });
    //console.log('[LOG] Wall ID mapping completed, size:', wallIdMap.size);

    // Step 7: Upsert articles (doors)
    //console.log('[LOG] Preparing to upsert articles (doors)...');
    const articleRowsToInsert = [];
    const articleRowsToUpdate = [];

    for (const door of doors) {
      const clientId = getClientId(door);
      if (!clientId) {
        console.warn('[LOG] Skipping article due to missing client_id:', door);
        continue;
      }
      let dbWallId = wallIdMap.get(door.wallId);
      if (!dbWallId) {
        // Fallback to payloadWallIdToDbId
        dbWallId = payloadWallIdToDbId.get(door.wallId);
      }
      if (!dbWallId) {
        console.warn(`[LOG] No wall found in database for wallId: ${door.wallId}, skipping article`);
        continue;
      }

      const articleData = {
        client_id: clientId,
        version_id: versionId,
        data: {
          lines: door.lines
            ? {
              ...door.lines,
              startPointId: pointIdMap.get(door.lines.startPointId),
              endPointId: pointIdMap.get(door.lines.endPointId),
            }
            : undefined,
          points: door.points
            ? door.points.map((pt) => ({
              id: pointIdMap.get(pt.id),
              position: pt.position,
              rotation: pt.rotation,
              snapAngle: pt.snapAngle,
            }))
            : [],
          position: door.position,
          rotation: door.rotation,
          article_id: door.article_id,
          name: door.name,
          image: door.image,
          width: door.width,
          height: door.height,
          wallId: dbWallId,
          referencePointId: door.referencePointId
            ? pointIdMap.get(door.referencePointId) || door.referencePointId
            : null,
          referenceDistance: door.referenceDistance,
          system: door.system || null,
          type: door.type || null,
          framed: door.framed || false,
          glass: door.glass || false,
        },
      };

      //console.log('[LOG] Checking if article exists for client_id:', clientId);
      const { data: existingArticle } = await supabase
        .from('articles')
        .select('id')
        .eq('client_id', clientId)
        .eq('version_id', versionId)
        .single();

      if (existingArticle) {
        articleRowsToUpdate.push({ ...articleData, id: existingArticle.id });
      } else {
        articleRowsToInsert.push(articleData);
      }
    }
    //console.log('[LOG] Articles to insert:', articleRowsToInsert.length, 'Articles to update:', articleRowsToUpdate.length);

    // Insert new articles
    if (articleRowsToInsert.length > 0) {
      //console.log('[LOG] Inserting new articles:', articleRowsToInsert.length);
      const { error: insertError } = await supabase.from('articles').insert(articleRowsToInsert);
      if (insertError) {
        console.error('[LOG] Articles insertion failed:', insertError.message);
        throw new Error('Failed to insert articles');
      }
      //console.log('[LOG] New articles inserted successfully');
    }

    // Update existing articles
    if (articleRowsToUpdate.length > 0) {
      //console.log('[LOG] Updating existing articles:', articleRowsToUpdate.length);
      await Promise.all(
        articleRowsToUpdate.map((row) =>
          supabase
            .from('articles')
            .update({
              data: row.data,
              version_id: row.version_id,
            })
            .eq('id', row.id)
        )
      );
      //console.log('[LOG] Existing articles updated successfully');
    }

  if (plan2DImage) {
    try {
      // 1) Generate a single timestamp up front:
      const timestamp = Date.now();

      // console.log("[updateVersion] plan2DImage raw payload:", plan2DImage);

      // 2) Normalize “plan2DImage” into a string we can either save or store directly.
      let imageData = plan2DImage;
      if (
        typeof plan2DImage === "object" &&
        plan2DImage.file &&
        plan2DImage.file.mime &&
        plan2DImage.file.data
      ) {
        // If the client sent { file: { mime, data } }, build a data‐URL:
        imageData = `data:${plan2DImage.file.mime};base64,${plan2DImage.file.data}`;
      }

      // 3) Check if imageData is a data‐URL (Base64) or a plain string (URL).
      const dataUrlMatch =
        typeof imageData === "string" &&
        imageData.match(/^data:(\w+\/\w+);base64,(.+)$/);

      let finalUrlToStore;
      
      if (dataUrlMatch) {
        // 4) It’s Base64 data.  Decide if it’s a PDF or an image.
        const mimeType = dataUrlMatch[1]; // e.g. "application/pdf" or "image/png"
        const base64Data = dataUrlMatch[2];

        if (mimeType === "application/pdf") {
          // 5) Convert PDF → PNG, using the **same** timestamp:
          //    convertPdfViaMicroservice now saves:
          //      - storage/plan2d/<versionId>/<versionId>-<timestamp>.pdf
          //      - storage/plan2d/<versionId>/<versionId>-<timestamp>.png
          //    and returns { filePath, accessUrl } for the PNG.
          const { accessUrl } = await convertPdfViaMicroservice(
            base64Data,
            versionId,
            timestamp
          );
          finalUrlToStore = accessUrl;

        } else if (mimeType.startsWith("image/")) {
          // 6) It’s already an image (e.g. image/png or image/webp).
          //    Just save it at <versionId>-<timestamp>.<ext>, then update Supabase.
          const { accessUrl } = await savePlan2DImage(
            imageData,
            versionId,
            timestamp
          );
          finalUrlToStore = accessUrl;

        } else {
          throw new Error("Unsupported MIME type for plan2DImage");
        }
      } else if (typeof imageData === "string") {
        // 7) It’s a plain string → assume it’s already a URL (with a valid <timestamp> baked in).
        //    We do NOT call savePlan2DImage here, because the file already exists.
        finalUrlToStore = imageData.split("|")[0].trim();
      } else {
        throw new Error("Invalid plan2DImage format");
      }

      // 8) Update Supabase’s versions table with our chosen URL:
      const { error: supaError } = await supabase
        .from("versions")
        .update({ plan2DImage: finalUrlToStore })
        .eq("id", versionId);

      if (supaError) throw supaError;

      console.log("[updateVersion] plan2DImage URL stored:", finalUrlToStore);
    } catch (err) {
      console.error("[updateVersion] Error handling plan2DImage:", err.message);
      return new NextResponse(
        JSON.stringify({
          error: "Failed to handle plan2DImage",
          details: err.message,
        }),
        { status: 500, headers }
      );
    }
  }

    //console.log('[LOG] Fetching user with odoo_id:', userId);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, role, odoo_id')
      .eq('odoo_id', userId)
      .single();

    if (userError) {
      console.error('[LOG] User fetch failed:', userError.message);
      throw new Error('Failed to fetch user');
    }

    //console.log('[LOG] User fetched successfully:', userData);

    const [firstName, ...rest] = userData.name?.trim().split(' ') || [];
    const author = {
      id: userData.id,
      firstName: firstName || '',
      lastName: rest.join(' ') || '',
      role: userData.role || null,
    };
   
    // Step 9: Fetch project details
    const fullProject = await fetchProjectWithRelations(userData.odoo_id, projectId);
    
    // Step 10: Transform and respond
    const transformed = transformProjectsData(fullProject, author);
   
    //console.log('[LOG] Preparing response...');
    return new NextResponse(
      JSON.stringify({
        message: '🎉 Ka_pow! Your shiny new version has landed and is ready to rock!',
        project: transformed[0],
        projectWithRelations: fullProject,
      }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error('[LOG] Server error occurred:', err.message);
    return new NextResponse(
      JSON.stringify({ error: err.message || 'Server error' }),
      { status: 500, headers }
    );
  }
}