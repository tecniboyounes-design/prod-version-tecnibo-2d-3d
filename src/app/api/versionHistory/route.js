import { createClient } from '@supabase/supabase-js';
import { restructureProjectData, transformProjectsData } from './restructureData';
import { getCorsHeaders } from '../authenticate/route';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

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

    const userResponse = await supabase
      .from('users')
      .select('*')
      .eq('odoo_id', odooId)
      .single();

    if (userResponse.error) {
      throw new Error(`Failed to fetch user data: ${userResponse.error.message}`);
    }

    console.log('Fetched user data:', userResponse.data);

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
  const origin = req.headers.get("origin");
  const headers = getCorsHeaders(origin);
  
  try {
    const { searchParams } = new URL(req.url);
    const odooId = searchParams.get('odooId');
    const restructureParam = searchParams.get('restructure');
    const restructure = restructureParam === 'true'; 
    
    console.log('Received odooId:', odooId, 'Restructure:', restructure);
    
    if (!odooId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing odooId parameter' }),
        { status: 400, headers }
      );
    }
    
    const projects = await fetchUserProjects(odooId);
    const responseData = restructure ? transformProjectsData(projects) : projects;
    
    if (!responseData.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'No projects found or failed to fetch' }),
        { status: 404, headers }
      );
    }
    
    // console.log('Project data:', responseData);
     
    return new Response(JSON.stringify(responseData), {
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
    
  } catch (err) {
    console.error('Error during data transformation:', err.message);
    return new Response(
      JSON.stringify({ success: false, error: `Failed to transform data: ${err.message}` }),
      { status: 500, headers }
    );
  }
};




