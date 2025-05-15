import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../filesController/route';
import { fetchProjectWithRelations } from '../projects/route';
import { transformProjectsData } from '../../../lib/restructureData';
import { validate } from 'uuid';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}


export async function POST(req) {
  console.log('[LOG] Handling POST request for updateVersion');
  const headers = getCorsHeaders(req); 
  
  try {
    const versionData = await req.json();
    console.log('[LOG] Received version data:', versionData);
    
    const { projectId, versionId, lines, points, doors, userId } = versionData;

    // Step 1: Check for required fields
    console.log('[LOG] Checking required fields...');
    if (!userId || !projectId || !versionId) {
      const missingFields = [];
      if (!userId) missingFields.push('userId');
      if (!projectId) missingFields.push('projectId');
      if (!versionId) missingFields.push('versionId');
      console.log('[LOG] Missing fields detected:', missingFields);
      return new NextResponse(
        JSON.stringify({
          error: `Missing required fields: ${missingFields.join(', ')}`,
        }),
        { status: 400, headers }
      );
    }
    
    // Validate UUIDs
    console.log('[LOG] Validating UUIDs...');
    if (!validate(projectId)) {
      console.log('[LOG] Invalid projectId:', projectId);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid projectId format. Must be a valid UUID.' }),
        { status: 400, headers }
      );
    }

    if (!validate(versionId)) {
      console.log('[LOG] Invalid versionId:', versionId);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid versionId format. Must be a valid UUID.' }),
        { status: 400, headers }
      );
    }

    console.log('[LOG] UUIDs validated successfully');

    // Step 2: Verify version exists
    console.log('[LOG] Checking if version exists:', versionId);
    const { data: versionCheck, error: versionCheckError } = await supabase
      .from('versions')
      .select('id')
      .eq('id', versionId)
      .single();

    if (versionCheckError || !versionCheck) {
      console.error('[LOG] Version not found or error:', versionCheckError);
      return new NextResponse(
        JSON.stringify({ error: 'Version not found' }),
        { status: 404, headers }
      );
    }
    console.log('[LOG] Version exists with ID:', versionCheck.id);

    // Step 3: Update version metadata
    const serverLastModified = new Date().toISOString();
    console.log('[LOG] Updating version metadata with server lastModified:', serverLastModified);
    const { data: versionUpdate, error: versionError } = await supabase
      .from('versions')
      .update({ lastModified: serverLastModified })
      .eq('id', versionId)
      .select()
      .single();
  
    if (versionError) {
      console.error('[LOG] Version update failed:', versionError);
      throw new Error('Failed to update version');
    }
    console.log('[LOG] Version metadata updated successfully:', versionUpdate);

    // Helper function to determine client_id
    const getClientId = (entity) => {
      if (entity.client_id) return entity.client_id;
      if (!entity.id) {
        console.warn(`[LOG] Entity missing id, cannot set client_id`);
        return null;
      }
      if (/^(line|cloison|point|door|window)-\d+$/.test(entity.id)) {
        return entity.id;
      }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entity.id)) {
        console.warn(`[LOG] UUID detected in id (${entity.id}), client_id not provided, falling back to id`);
        return entity.id;
      }
      return entity.id;
    };

    // Step 4: Delete orphaned entities
    console.log('[LOG] Deleting orphaned entities...');
  
    // Collect client_ids from payload
    const payloadPointClientIds = new Set(points.map(getClientId).filter(Boolean));
    const payloadWallClientIds = new Set(lines.map(getClientId).filter(Boolean));
    const payloadDoorClientIds = new Set(doors.map(getClientId).filter(Boolean));
   
    // Fetch existing entities from database
    const { data: dbPoints, error: dbPointsError } = await supabase
      .from('points')
      .select('id, client_id')
      .eq('version_id', versionId);
    if (dbPointsError) throw new Error('Failed to fetch points');

    const { data: dbWalls, error: dbWallsError } = await supabase
      .from('walls')
      .select('id, client_id')
      .eq('version_id', versionId);
    if (dbWallsError) throw new Error('Failed to fetch walls');

    const { data: dbArticles, error: dbArticlesError } = await supabase
      .from('articles')
      .select('id, client_id')
      .eq('version_id', versionId);
    if (dbArticlesError) throw new Error('Failed to fetch articles');
   
    // Identify orphaned entities
    const orphanedPoints = dbPoints.filter((p) => !payloadPointClientIds.has(p.client_id));
    const orphanedWalls = dbWalls.filter((w) => !payloadWallClientIds.has(w.client_id));
    const orphanedArticles = dbArticles.filter((a) => !payloadDoorClientIds.has(a.client_id));

    // Delete orphaned points
    if (orphanedPoints.length > 0) {
      const pointIdsToDelete = orphanedPoints.map((p) => p.id);
      console.log('[LOG] Deleting orphaned points:', pointIdsToDelete);
      const { error: deletePointsError } = await supabase
        .from('points')
        .delete()
        .in('id', pointIdsToDelete);
      if (deletePointsError) throw new Error('Failed to delete orphaned points');
    }

    // Delete orphaned walls
    if (orphanedWalls.length > 0) {
      const wallIdsToDelete = orphanedWalls.map((w) => w.id);
      console.log('[LOG] Deleting orphaned walls:', wallIdsToDelete);
      const { error: deleteWallsError } = await supabase
        .from('walls')
        .delete()
        .in('id', wallIdsToDelete);
      if (deleteWallsError) throw new Error('Failed to delete orphaned walls');
    }

    // Delete orphaned articles
    if (orphanedArticles.length > 0) {
      const articleIdsToDelete = orphanedArticles.map((a) => a.id);
      console.log('[LOG] Deleting orphaned articles:', articleIdsToDelete);
      const { error: deleteArticlesError } = await supabase
        .from('articles')
        .delete()
        .in('id', articleIdsToDelete);
      if (deleteArticlesError) throw new Error('Failed to delete orphaned articles');
    }

    // Step 5: Upsert points
    console.log('[LOG] Preparing to upsert points...');
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

        // Check if point exists
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

    // Insert new points
    if (pointRowsToInsert.length > 0) {
      console.log('[LOG] Inserting new points:', pointRowsToInsert.length);
      const { error: insertError } = await supabase.from('points').insert(pointRowsToInsert);
      if (insertError) {
        console.error('[LOG] Points insertion failed:', insertError);
        throw new Error('Failed to insert points');
      }
    }

    // Update existing points
    if (pointRowsToUpdate.length > 0) {
      console.log('[LOG] Updating existing points:', pointRowsToUpdate.length);
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
    }

    // Fetch all points for mapping after upsert
    console.log('[LOG] Fetching all points for mapping...');
    const { data: allPoints, error: fetchPointsError } = await supabase
      .from('points')
      .select('id, client_id')
      .eq('version_id', versionId);

    if (fetchPointsError) {
      console.error('[LOG] Failed to fetch points:', fetchPointsError);
      throw new Error('Failed to fetch points');
    }

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
    console.log('[LOG] Point ID mapping completed, size:', pointIdMap.size);

    // Step 6: Upsert walls
    console.log('[LOG] Preparing to upsert walls...');
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
      console.log(`[LOG] Processing wall ${line.id} color:`, colorValue);
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
      };

      // Check if wall exists
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

    // Insert new walls
    if (wallRowsToInsert.length > 0) {
      console.log('[LOG] Inserting new walls:', wallRowsToInsert.length);
      const { error: insertError } = await supabase.from('walls').insert(wallRowsToInsert);
      if (insertError) {
        console.error('[LOG] Walls insertion failed:', insertError);
        throw new Error('Failed to insert walls');
      }
    }

    // Update existing walls
    if (wallRowsToUpdate.length > 0) {
      console.log('[LOG] Updating existing walls:', wallRowsToUpdate.length);
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
            })
            .eq('id', row.id)
        )
      );
    }

    // Fetch all walls for mapping after upsert
    console.log('[LOG] Fetching all walls for mapping...');
    const { data: allWalls, error: fetchWallsError } = await supabase
      .from('walls')
      .select('id, client_id')
      .eq('version_id', versionId);

    if (fetchWallsError) {
      console.error('[LOG] Failed to fetch walls:', fetchWallsError);
      throw new Error('Failed to fetch walls');
    }

    // Create wall ID mapping
    const wallIdMap = new Map();
    allWalls.forEach((w) => {
      wallIdMap.set(w.client_id, w.id);
    });
    console.log('[LOG] Wall ID mapping completed, size:', wallIdMap.size);

    // Step 7: Upsert articles (doors)
    console.log('[LOG] Preparing to upsert articles (doors)...');
    const articleRowsToInsert = [];
    const articleRowsToUpdate = [];

    for (const door of doors) {
      const clientId = getClientId(door);
      if (!clientId) {
        console.warn('[LOG] Skipping article due to missing client_id:', door);
        continue;
      }
      // Get the database wall ID from the map
      const dbWallId = wallIdMap.get(door.wallId);
      if (!dbWallId) {
        console.warn(`[LOG] No wall found in database for wallId (client_id): ${door.wallId}, skipping article`);
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
          wallId: dbWallId, // Use the database-generated ID
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

      // Check if article exists
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
   
    // Insert new articles
    if (articleRowsToInsert.length > 0) {
      console.log('[LOG] Inserting new articles:', articleRowsToInsert.length);
      const { error: insertError } = await supabase.from('articles').insert(articleRowsToInsert);
      if (insertError) {
        console.error('[LOG] Articles insertion failed:', insertError);
        throw new Error('Failed to insert articles');
      }
    }
    
    // Update existing articles
    if (articleRowsToUpdate.length > 0) {
      console.log('[LOG] Updating existing articles:', articleRowsToUpdate.length);
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
    }

    // Step 8: Fetch user
    console.log('[LOG] Fetching user with odoo_id:', userId);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, role, odoo_id')
      .eq('odoo_id', userId)
      .single();

    if (userError) {
      console.error('[LOG] User fetch failed:', userError);
      throw new Error('Failed to fetch user');
    }
    console.log('[LOG] User fetched:', userData);

    const [firstName, ...rest] = userData.name?.trim().split(' ') || [];
    const author = {
      id: userData.id,
      firstName: firstName || '',
      lastName: rest.join(' ') || '',
      role: userData.role || null,
    };
    console.log('[LOG] Author object created:', author);

    // Step 9: Fetch project details
    console.log('[LOG] Fetching project details for projectId:', projectId);
    const fullProject = await fetchProjectWithRelations(userData.odoo_id, projectId);
    console.log('[LOG] Project details fetched successfully');

    // Step 10: Transform and respond
    console.log('[LOG] Transforming project data...');
    console.log('[LOG] Full project data:', fullProject);
    const transformed = transformProjectsData(fullProject, author);
    console.log('[LOG] Transformed project data:', transformed);
    console.log('[LOG] Project data transformed successfully');

    console.log('[LOG] Preparing response...');
    return new NextResponse(
      JSON.stringify({
        message: '🎉 Ka_pow! Your shiny new version has landed and is ready to rock!',
        project: transformed[0],
      }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error('[LOG] Server error occurred:', err);
    return new NextResponse(
      JSON.stringify({ error: err.message || 'Server error' }),
      { status: 500, headers }
    );
  }
}