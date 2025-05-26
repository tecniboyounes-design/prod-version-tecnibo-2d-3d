import { restructureProjectData, transformProjectsData } from '../../../lib/restructureData';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { supabase } from '../filesController/route';


export const fetchUserProjects = async (odooId) => {
  try {
    // Fetch projects with related data
    const { data: projects, error: projectsError } = await supabase
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

    if (projectsError) {
      console.error('Error fetching projects:', projectsError.message);
      throw new Error(`Failed to fetch projects: ${projectsError.message}`);
    }

    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('odoo_id', odooId)
      .single();
    
    if (userError || !user) {
      console.error('Error fetching user:', userError?.message || 'User not found');
      throw new Error(`Failed to fetch user data: ${userError?.message || 'User not found'}`);
    }

    // Fetch interventions for versions
    const versionIds = projects.flatMap(project => project.versions.map(version => version.id));
    const { data: interventions, error: interventionsError } = await supabase
      .from('interventions')
      .select('*')
      .in('version_id', versionIds);

    if (interventionsError) {
      console.error('Error fetching interventions:', interventionsError.message);
      throw new Error(`Failed to fetch interventions: ${interventionsError.message}`);
    }

    // Attach interventions to respective versions
    projects.forEach(project => {
      project.versions.forEach(version => {
        version.interventions = interventions.filter(intervention => intervention.version_id === version.id);
      });
    });

    // Return both projects and user data
    return {
      projects: projects || [],
      user
    };
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
    
    // console.log('Received odooId:', odooId, 'Restructure:', restructure);

    if (!odooId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing odooId parameter' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { projects, user } = await fetchUserProjects(odooId);

    // Parse full name into firstName and lastName
    const [firstName = '', lastName = ''] = user.name ? user.name.split(' ', 2) : ['', ''];

    // Create author object from user data
    const author = {
      id: user.id,
      firstName,
      lastName,
      role: user.role
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

