import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const fetchUserProjects = async (odooId) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*, versions(*), managers(*)') 
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
}

// Named export for GET method (App Router)
export async function GET(req) {
  console.log('Received request:', req);



  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { searchParams } = new URL(req.url);
    const odooId = searchParams.get('odooId');

    console.log('Received odooId:', odooId);

    if (!odooId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing odooId parameter' }),
        { status: 400, headers }
      );
    }

    const projects = await fetchUserProjects(odooId);

    if (!projects) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch projects' }),
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: projects }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('API route error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      { status: 500, headers }
    );
  }
}

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