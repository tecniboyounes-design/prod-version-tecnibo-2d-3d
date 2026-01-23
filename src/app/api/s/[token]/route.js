import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { transformVersion } from '@/lib/restructureData';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { supabase } from '../../filesController/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function GET(request, { params }) {
  const corsHeaders = getCorsHeaders(request);
  console.log('[public-share] GET start');
  try {
    const token = String(params?.token || '').trim();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Missing share token' },
        { status: 400, headers: corsHeaders }
      );
    }

    const token_hash = hashToken(token);

    const { data: share, error: shareError } = await supabase
      .from('project_public_shares')
      .select('id, project_id, version_id, scope, expires_at, revoked_at, max_views, views_count')
      .eq('token_hash', token_hash)
      .single();

    if (shareError || !share) {
      console.warn('[public-share] share not found', { token_hash });
      return NextResponse.json(
        { ok: false, error: 'Share not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (share.revoked_at) {
      return NextResponse.json(
        { ok: false, error: 'Share revoked' },
        { status: 410, headers: corsHeaders }
      );
    }

    const now = new Date();

    if (share.expires_at && new Date(share.expires_at) <= now) {
      return NextResponse.json(
        { ok: false, error: 'Share expired' },
        { status: 410, headers: corsHeaders }
      );
    }

    const viewsCount = Number(share.views_count || 0);
    const maxViews = share.max_views;
    if (maxViews !== null && maxViews !== undefined && viewsCount >= Number(maxViews)) {
      return NextResponse.json(
        { ok: false, error: 'Share view limit reached' },
        { status: 410, headers: corsHeaders }
      );
    }

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
      `
      )
      .eq('id', share.version_id)
      .single();

    if (versionError || !versionRow) {
      console.warn('[public-share] version not found', { version_id: share.version_id });
      return NextResponse.json(
        { ok: false, error: 'version_id not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const { data: projectRow, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', share.project_id)
      .single();

    if (projectError || !projectRow) {
      console.warn('[public-share] project not found', { project_id: share.project_id });
      return NextResponse.json(
        { ok: false, error: 'project_id not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const transformedVersion = transformVersion(versionRow, projectRow);

    const nextViewsCount = viewsCount + 1;
    const { error: updateError } = await supabase
      .from('project_public_shares')
      .update({ views_count: nextViewsCount, last_viewed_at: now.toISOString() })
      .eq('id', share.id);

    if (updateError) {
      console.warn('[public-share] failed to update views_count', updateError);
    }

    return NextResponse.json(
      {
        ok: true,
        share: {
          id: share.id,
          scope: share.scope,
          expires_at: share.expires_at,
          max_views: share.max_views,
          views_count: updateError ? viewsCount : nextViewsCount,
        },
        project: projectRow,
        version: transformedVersion,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error('[public-share] GET error', e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: corsHeaders }
    );
  }
}
