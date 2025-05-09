import { restructureProjectData, transformProjectsData } from '../../../lib/restructureData';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { supabase } from '../filesController/route';


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
    console.log('data', error);
    if (error !== null) {
      console.error('Error fetching projects:', error.message);
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    const userResponse = await supabase
      .from('users')
      .select('*')
      .eq('odoo_id', odooId)
      .select();

    if (userResponse.error) {
      throw new Error(`Failed to fetch user data: ${userResponse.error.message}`);
    }

    const versionIds = data.flatMap(project => project.versions.map(version => version.id));
    const interventionsResponse = await supabase
      .from('interventions')
      .select('*')
      .in('version_id', versionIds);

    if (interventionsResponse.error) {
      throw new Error(`Failed to fetch interventions: ${interventionsResponse.error.message}`);
    }

    const interventions = interventionsResponse.data;

    data.forEach(project => {
      project.versions.forEach(version => {
        version.interventions = interventions.filter(intervention => intervention.version_id === version.id);
      });
    });

    return data || [];
  } catch (err) {
    console.error('Fetch error:', err.message);
    throw err;
  }
};

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req); 

  try {
    const { searchParams } = new URL(req.url);
    const odooId = searchParams.get('odooId');
    const restructureParam = searchParams.get('restructure');
    const restructure = restructureParam === 'true';
    
    console.log('Received odooId:', odooId, 'Restructure:', restructure);

    if (!odooId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing odooId parameter' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const projects = await fetchUserProjects(odooId);

    const author = {
      id: "39a18b31-b21a-4c52-b745-abb16a141e6d",
      firstName: "Rabie",
      lastName: "ELMA",
      role: "Project Manager"
    };

    const responseData = restructure ? transformProjectsData(projects, author) : projects;

    return new Response(JSON.stringify(responseData), {
      status: 200,
      statusText: 'OK',
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error during data transformation:', err.message);
    return new Response(
      JSON.stringify({ success: false, error: `Failed to transform data: ${err.message}` }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}