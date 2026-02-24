// src/app/api/versionHistory/version-detail/route.js
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getCookie } from '@/lib/cookies';
import { supabase } from '../../filesController/route';
import { transformVersion } from '@/lib/restructureData';

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const sessionId = getCookie(req, 'session_id');
    if (!sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing x-session-id header',
        }),
        { status: 401, headers: corsHeaders },
      );
    }

    const { searchParams } = new URL(req.url);
    const versionId = searchParams.get('versionId');

    if (!versionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing versionId parameter',
        }),
        { status: 400, headers: corsHeaders },
      );
    }
   
    // 1) Fetch the version with its geometry + params
    const { data: versionRow, error: versionError } = await supabase
      .from('versions')
      .select(
        `
        *,
        plan_parameters(*),
        articles(*),
        walls(
          *,
          points_start:points!walls_startpointid_fkey(*),
          points_end:points!walls_endpointid_fkey(*)
        )
      `,
      )
      .eq('id', versionId)
      .single();

    if (versionError || !versionRow) {
      console.error(
        'Error fetching version in version-detail:',
        versionError?.message || 'Not found',
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch version: ${
            versionError?.message || 'Not found'
          }`,
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    // 2) Fetch parent project (for meta like created_on / changed_on)
    const projectId = versionRow.project_id;
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error(
        'Error fetching project in version-detail:',
        projectError?.message || 'Not found',
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch project: ${
            projectError?.message || 'Not found'
          }`,
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    // 3) Transform to frontend format (same shape as inside transformProjectsData)
    const transformedVersion = transformVersion(versionRow, project);

    return new Response(JSON.stringify(transformedVersion), {
      status: 200,
      statusText: 'OK',
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(
      'Error in /api/versionHistory/version-detail GET:',
      err.message,
    );
    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to fetch version detail: ${err.message}`,
      }),
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

