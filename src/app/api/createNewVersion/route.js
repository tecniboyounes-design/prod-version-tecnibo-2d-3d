import { incrementVersion } from "@/lib/versioning";
import { supabase } from "../filesController/route";
import { fetchProjectWithRelations } from "../projects/route";
import { transformProjectsData } from "../versionHistory/restructureData";




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

  const pointRows = uniquePoints.map(({ oldId, ...rest }) => ({
    ...rest,
    client_id: oldId,
  }));
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
    client_id: line.id,
  }));

  const { error: wallsError } = await supabase.from('walls').insert(wallRows);
  if (wallsError) throw new Error('Failed to insert walls');

  // -- 3. Insert doors as articles
  const articleRows = doors.map((door) => ({
    version_id,
    client_id: door.id,
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
  "https://f732-87-66-1-181.ngrok-free.app"
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
    console.log('Payload:', payload);
    const { project_id, user_id, ...versionData } = payload;

    // Step 1: Get latest version
    console.log(`Fetching latest version for project_id: ${project_id}`);
    const { data: versions, error: versionError } = await supabase
      .from('versions')
      .select('version')
      .eq('project_id', project_id)
      .order('created_on', { ascending: false })
      .limit(1);

    if (versionError) {
      console.error('Version fetch error:', versionError);
      throw versionError;
    }
    console.log('Fetched versions:', versions);

    let newVersion = '1.0';
    if (versions?.length > 0) {
      console.log(`Latest version found: "${versions[0].version}"`);
      newVersion = incrementVersion(versions[0].version);
    } else {
      console.log('No versions found, using default version: "1.0"');
    }

    // Step 2: Insert new version
    console.log(`Inserting new version: "${newVersion}" for project_id: ${project_id}`);
    const { data: newVersionData, error: insertError } = await supabase
      .from('versions')
      .insert({
        project_id,
        version: newVersion,
        lastModified: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Version insert error:', insertError);
      throw insertError;
    }
    console.log('Inserted new version:', newVersionData);

    const version_id = newVersionData.id;

    // Step 3: Insert related data (points, walls, articles)
    console.log(`Inserting version data for version_id: ${version_id}`);
    await insertVersionData({
      supabase,
      version_id,
      versionData,
    });

    // Step 4: Fetch full user info
    console.log(`Fetching user info for user_id: ${user_id}`);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError || !userData) {
      console.error('User fetch error:', userError || 'No user data');
      throw new Error('User not found');
    }
    console.log('Fetched user data:', userData);

    // Step 5: Construct author from user name
    const [firstName, ...lastNameParts] = userData.name?.trim().split(' ') || [];
    const author = {
      id: userData.id,
      firstName: firstName || '',
      lastName: lastNameParts.join(' ') || '',
      role: userData.role || null,
    };
    console.log('Constructed author:', author);

    // Step 6: Fetch full updated project with all relations
    console.log(`Fetching project with relations for odoo_id: ${userData.odoo_id}, project_id: ${project_id}`);
    const updatedProject = await fetchProjectWithRelations(userData.odoo_id, project_id);
    console.log('Fetched project with relations:', updatedProject);

    // Step 7: Transform project + return response
    console.log('Transforming project data');
    const transformed = transformProjectsData(updatedProject, author);
    console.log('Transformed project data:', transformed);

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
      headers }
    );
  }
}

  

