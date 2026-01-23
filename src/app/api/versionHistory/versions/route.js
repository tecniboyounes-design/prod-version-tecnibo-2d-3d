// src/app/api/versionHistory/versions/route.js
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { supabase } from '../../filesController/route';

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const sessionId = req.headers.get('x-session-id');
    if (!sessionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing x-session-id header' }),
        { status: 401, headers: corsHeaders },
      );
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing projectId parameter' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: versions, error } = await supabase
      .from('versions')
      // NOTE: use "lastModified" and "plan2DImage" as defined in the table
      .select('id, version, created_on, "lastModified", "plan2DImage"')
      .eq('project_id', projectId)
      .order('created_on', { ascending: false });

    if (error) {
      console.error('Error fetching versions by projectId:', error.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch versions: ${error.message}`,
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    const payload = (versions || []).map((v) => ({
      id: v.id,
      version: v.version || '1.0',
      created: v.created_on,
      lastModified: v.lastModified || v.created_on,
      plan2DImage: v.plan2DImage || '',
    }));

    return new Response(
      JSON.stringify({
        projectId,
        versions: payload,
      }),
      {
        status: 200,
        statusText: 'OK',
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('Error in /api/versionHistory/versions GET:', err.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to fetch versions: ${err.message}`,
      }),
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}
