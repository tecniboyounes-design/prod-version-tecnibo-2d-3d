import { supabase } from "../filesController/route";
import { fetchProjectWithRelations } from "../projects/route";
import { transformProjectsData } from "../versionHistory/restructureData";



export function incrementVersion(version) {
  const [major, minor] = version.split('.').map(Number);
  return `${major}.${minor + 1}`;
}




async function insertVersionData({
    supabase,
    version_id,
    versionData,
  }) {
    const {
      lines = [],
      points = [],
      doors = [],
    } = versionData;
  
    // -- 1. Prepare unique points
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
  
    const pointRows = uniquePoints.map(({ oldId, ...rest }) => rest);
    const { data: insertedPoints, error: pointsError } = await supabase
      .from('points')
      .insert(pointRows)
      .select();
  
    if (pointsError) throw new Error('Failed to insert points');
  
    const pointIdMap = new Map();
    uniquePoints.forEach((pt, i) => {
      pointIdMap.set(pt.oldId, insertedPoints[i].id);
    });
  
    // -- 2. Insert walls
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
    if (wallsError) throw new Error('Failed to insert walls');
  
    // -- 3. Insert doors as articles
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
  
    if (articlesError) throw new Error('Failed to insert articles');
}




  
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




export async function POST(request) {
    const origin = request.headers.get('origin');
    const headers = getCorsHeaders(origin);
  
  try {
    const payload = await request.json();
    console.log('payload', payload);
    const { project_id, user_id, ...versionData } = payload; 

    // Step 1: Get latest version
    const { data: versions, error: versionError } = await supabase
      .from('versions')
      .select('version')
      .eq('project_id', project_id)
      .order('created_on', { ascending: false })
      .limit(1);
      
    if (versionError) throw versionError;

    let newVersion = '1.0';
    if (versions?.length > 0) {
      newVersion = incrementVersion(versions[0].version);
    }
     
    // Step 2: Insert new version
    const { data: newVersionData, error: insertError } = await supabase
      .from('versions')
      .insert({
        project_id,
        version: newVersion,
        lastModified: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const version_id = newVersionData.id;

    // Step 3: Insert related data (points, walls, articles)
    await insertVersionData({
      supabase,
      version_id,
      versionData,
    });

    // Step 4: Fetch full user info
    const { data: userData, error: userError } = await supabase
      .from('users') 
      .select('*')
      .eq('id', user_id)
      .single();
    
    if (userError || !userData) {
      throw new Error('User not found');
    }
     
    // Step 5: Construct author from user name
    const [firstName, ...lastNameParts] = userData.name?.trim().split(' ') || [];
    
    const author = {
      id: userData.id,
      firstName: firstName || '',
      lastName: lastNameParts.join(' ') || '',
      role: userData.role || null,
    };
    
    // Step 6: Fetch full updated project with all relations
    const updatedProject = await fetchProjectWithRelations(userData.odoo_id, project_id);

    // Step 7: Transform project + return response
    const transformed = transformProjectsData(updatedProject, author);
    
    return new Response(
      JSON.stringify({
        success: true,
        version: newVersion,
        version_id,
        project: transformed,
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('[POST version] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

  

