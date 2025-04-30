import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../filesController/route';
import { fetchProjectWithRelations } from '../projects/route';
import { transformProjectsData } from '../versionHistory/restructureData';
import { validate } from 'uuid'; 


// CORS setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];


export function getCorsHeaders(origin) {
  const cleanOrigin = origin?.replace(/\/$/, '');
  const isAllowed = allowedOrigins.includes(cleanOrigin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
}


export async function OPTIONS(req) {
  const origin = req.headers.get('origin');
  const headers = getCorsHeaders(origin);
  return new Response(null, { status: 204, headers });
}




export async function POST(req) {
  const origin = req.headers.get('origin');
  const headers = getCorsHeaders(origin);

  try {
    const versionData = await req.json();
    // console.log('[Parsed Body]', versionData);

    const {
      projectId,
      versionId,
      lines,
      points,
      doors,
      description,
      lastModified,
      userId,
    } = versionData;

    // Step 1: Check for required fields
    if (!userId || !projectId || !versionId) {
      const missingFields = [];
      if (!userId) missingFields.push('userId');
      if (!projectId) missingFields.push('projectId');
      if (!versionId) missingFields.push('versionId');
      
      return new NextResponse(
        JSON.stringify({
          error: `Missing required fields: ${missingFields.join(', ')}`,
        }),
        { status: 400, headers }
      );
    }

    if (!validate(projectId)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid projectId format. Must be a valid UUID.' }),
        { status: 400, headers }
      );
    }
    if (!validate(versionId)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid versionId format. Must be a valid UUID.' }),
        { status: 400, headers }
      );
    }

    // 1. Update version metadata
    const { data: versionUpdate, error: versionError } = await supabase
      .from('versions')
      .update({ lastModified })
      .eq('id', versionId)
      .select()
      .single();

    if (versionError) {
      console.error('[Version Update Error]', versionError);
      throw new Error('Failed to update version');
    }

    // 2. Prepare unique points with validation
    const uniqueKeys = new Set();
    const uniquePoints = [];

    const addPoint = (pt) => {
      if (
        pt.position &&
        typeof pt.position.x === 'number' &&
        typeof pt.position.y === 'number' &&
        typeof pt.position.z === 'number'
      ) {
        const key = `${pt.position.x}_${pt.position.y}_${pt.position.z}`;
        if (!uniqueKeys.has(key)) {
          uniqueKeys.add(key);
          uniquePoints.push({
            client_id: pt.id,
            x_coordinate: pt.position.x,
            y_coordinate: pt.position.y,
            z_coordinate: pt.position.z,
            snapangle: pt.snapAngle,
            rotation: pt.rotation,
            version_id: versionId,
          });
        }
      } else {
        console.warn(`Skipping point ${pt.id} due to invalid position data`);
      }
    };

    points.forEach(addPoint);
    doors.forEach((d) => {
      if (d.points) {
        d.points.forEach(addPoint);
      }
    });

    // 3. Insert points with client_id
    const pointRows = uniquePoints;
    const { data: insertedPoints, error: pointsError } = await supabase
      .from('points')
      .insert(pointRows)
      .select();

    if (pointsError) {
      console.error('[Points Insert Error]', pointsError);
      throw new Error('Failed to insert points');
    }

    // 4. Map client_id to database-generated point IDs
    const pointIdMap = new Map();
    insertedPoints.forEach((pt, i) => {
      pointIdMap.set(uniquePoints[i].client_id, pt.id);
    });

    // 5. Insert walls with client_id
    const wallRows = lines.map((line) => ({
      client_id: line.id,
      startpointid: pointIdMap.get(line.startPointId),
      endpointid: pointIdMap.get(line.endPointId),
      length: line.length,
      rotation: line.rotation,
      thickness: line.thickness,
      color: JSON.stringify(line.color),
      texture: line.texture,
      height: line.height,
      version_id: versionId,
    }));

    const { error: wallsError } = await supabase.from('walls').insert(wallRows);

    if (wallsError) {
      console.error('[Walls Insert Error]', wallsError);
      throw new Error('Failed to insert walls');
    }

    // 6. Insert doors as articles with client_id
    const articleRows = doors.map((door) => ({
      client_id: door.id,
      version_id: versionId,
      data: {
        lines: {
          ...door.lines,
          startPointId: pointIdMap.get(door.lines?.startPointId),
          endPointId: pointIdMap.get(door.lines?.endPointId),
        },
        points: door.points?.map((pt) => ({
          id: pointIdMap.get(pt.id),
          position: pt.position,
          rotation: pt.rotation,
          snapAngle: pt.snapAngle,
        })) || [],
      },
    }));

    const { error: articlesError } = await supabase
      .from('articles')
      .insert(articleRows);

    if (articlesError) {
      console.error('[Articles Insert Error]', articlesError);
      throw new Error('Failed to insert articles');
    }

    // 7. Fetch user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, role, odoo_id')
      .eq('odoo_id', userId)
      .single();

    if (userError) {
      console.error('[User Fetch Error]', userError);
      throw new Error('Failed to fetch user');
    }

    const [firstName, ...rest] = userData.name?.trim().split(' ') || [];
    const author = {
      id: userData.id,
      firstName: firstName || '',
      lastName: rest.join(' ') || '',
      role: userData.role || null,
    };

    // 8. Fetch full project details
    const fullProject = await fetchProjectWithRelations(userData.odoo_id, projectId);

    // 9. Transform and return response
    const transformed = transformProjectsData(fullProject, author);

    return new NextResponse(
      JSON.stringify({
        message: '🎉 Ka_pow! Your shiny new version has landed and is ready to rock!',
        project: transformed,
      }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error('[Server Error]', err);
    return new NextResponse(
      JSON.stringify({ error: err.message || 'Server error' }),
      { status: 500, headers }
    );
  }
}

