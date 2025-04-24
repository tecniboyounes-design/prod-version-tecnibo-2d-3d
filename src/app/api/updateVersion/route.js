import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../filesController/route';
import { fetchProjectWithRelations } from '../projects/route';
import { transformProjectsData } from '../versionHistory/restructureData';


// -- CORS Setup --
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


// -- OPTIONS Handler --
export async function OPTIONS(req) {
  const origin = req.headers.get('origin');
  const headers = getCorsHeaders(origin);

  return new Response(null, {
    status: 204,
    headers,
  });
}


// -- POST Handler --
export async function POST(req) {
  const origin = req.headers.get('origin');
  const headers = getCorsHeaders(origin);

  try {
    // console.log('[Request Received]');
    const versionData = await req.json();
    // console.log('[Parsed Body]', versionData);
    
    const {
      version_id,
      project_id,
      version,
      created,
      lastModified,
      lines,
      points,
      doors,
      description,
      status,
      user_id,
    } = versionData;
    
    // 1. Update version metadata
    const { data: versionUpdate, error: versionError } = await supabase
      .from('versions')
      .update({
        version,
        created_on: created,
        lastModified,
      })
      .eq('id', version_id)
      .select()
      .single();

    if (versionError) {
      console.error('[Version Update Error]', versionError);
      throw new Error('Failed to update version');
    }

    // 2. Prepare unique points (dedupe + track old IDs)
    
    const uniqueKeys = new Set();
    const uniquePoints = [];
    
    const addPoint = (pt) => {
      const key = `${pt.position.x}_${pt.position.y}_${pt.position.z}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        uniquePoints.push({
          oldId: pt.id,
          x_coordinate: pt.position.x,
          y_coordinate: pt.position.y,
          z_coordinate: pt.position.z,
          snapangle: pt.snapAngle,
          rotation: pt.rotation,
          version_id,
        });
      }
    };

    points.forEach(addPoint);
    doors.forEach((d) => d.points.forEach(addPoint));

    // Strip out oldId for DB insertion
    const pointRows = uniquePoints.map(({ oldId, ...rest }) => rest);
    const { data: insertedPoints, error: pointsError } = await supabase
      .from('points')
      .insert(pointRows)
      .select();
      
    if (pointsError) {
      console.error('[Points Insert Error]', pointsError);
      throw new Error('Failed to insert points');
    }
    
    // 3. Map old -> new point IDs
    const pointIdMap = new Map();
    uniquePoints.forEach((pt, i) => {
      pointIdMap.set(pt.oldId, insertedPoints[i].id);
    });

    // 4. Insert walls
    const wallRows = lines.map((line) => ({
      startpointid: pointIdMap.get(line.startPointId),
      endpointid: pointIdMap.get(line.endPointId),
      length: line.length,
      rotation: line.rotation,
      thickness: line.thickness,
      color: JSON.stringify(line.color),
      texture: line.texture,
      height: line.height,
      version_id,
    }));

    const { error: wallsError } = await supabase.from('walls').insert(wallRows);

    if (wallsError) {
      console.error('[Walls Insert Error]', wallsError);
      throw new Error('Failed to insert walls');
    }
    
    // 5. Insert doors as articles
    const articleRows = doors.map((door) => ({
      version_id,
      data: {
        lines: {
          ...door.lines,
          startPointId: pointIdMap.get(door.lines.startPointId),
          endPointId: pointIdMap.get(door.lines.endPointId),
        },
        points: door.points.map((pt) => ({
          id: pointIdMap.get(pt.id),
          position: pt.position,
          rotation: pt.rotation,
          snapAngle: pt.snapAngle,
        })),
      },
    }));

    const { error: articlesError } = await supabase
      .from('articles')
      .insert(articleRows);

    if (articlesError) {
      console.error('[Articles Insert Error]', articlesError);
      throw new Error('Failed to insert articles');
    }

    // 6. Fetch user (to get odoo_id)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, role, odoo_id')
      .eq('id', user_id)
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
    
    // 7. Fetch full project details
    const fullProject = await fetchProjectWithRelations(
      userData.odoo_id,
      project_id
    );

    // 8. Transform + return response
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
      {
        status: 500,
        headers,
      }
    );
  }
  
}