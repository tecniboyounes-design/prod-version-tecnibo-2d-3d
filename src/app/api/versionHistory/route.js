import { createClient } from '@supabase/supabase-js';
import { restructureProjectData } from './restructureData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Fetch all related data for a user's projects
export const fetchUserProjects = async (odooId) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        versions(
          *,
          articles(*),
          walls(
            *,
            points_start:points!walls_startpointid_fkey(*),
            points_end:points!walls_endpointid_fkey(*)
          )
        ),
        managers(*)
      `)
      .eq('user_id', odooId);

    if (error) {
      console.error('Error fetching projects:', error.message);
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    console.log(`Fetched ${data.length} projects for user_id ${odooId}:`, data);
    return data || [];
  } catch (err) {
    console.error('Fetch error:', err.message);
    throw err;
  }
};

export async function GET(req) {
  console.log('Received request:', req);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { searchParams } = new URL(req.url);
    const odooId = searchParams.get('odooId');
    const restructureParam = searchParams.get('restructure'); // Get raw param value
    const restructure = restructureParam === 'true'; // Explicitly true, otherwise false

    console.log('Received odooId:', odooId, 'Restructure:', restructure);

    if (!odooId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing odooId parameter' }),
        { status: 400, headers }
      );
    }

    const projects = await fetchUserProjects(odooId);
    const responseData = restructure ? restructureProjectData(projects) : projects;

    if (!responseData.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'No projects found or failed to fetch' }),
        { status: 404, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('API route error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      { status: 500, headers }
    );
  }
};


// Named export for OPTIONS method (for CORS preflight)
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}



