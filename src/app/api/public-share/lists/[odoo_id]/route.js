import { NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { supabase } from '../../../filesController/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function buildShareUrl(request, shareId) {
  const baseUrl = cleanBaseUrl(process.env.APP_BASE_URL) || cleanBaseUrl(request.nextUrl?.origin);
  if (!baseUrl) return `/api/public-share/${shareId}`;
  return `${baseUrl}/api/public-share/${shareId}`;
}

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

export async function GET(request, { params }) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const odooIdRaw = String(params?.odoo_id || '').trim();

    
    const odooId = Number(odooIdRaw);
    if (!odooIdRaw || !Number.isFinite(odooId) || !Number.isInteger(odooId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid odoo_id (integer required)' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: shares, error } = await supabase
      .from('project_public_shares')
      .select('id, project_id, version_id, scope, expires_at, created_at, max_views, views_count, revoked_at')
      .eq('created_by_odoo_id', odooId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[public-share] list query failed', error);
      return NextResponse.json(
        { ok: false, error: `Failed to fetch shares: ${error.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    const now = Date.now();
    const activeShares = (shares || []).filter((share) => {
      if (!share.expires_at) return true;
      const expiresAt = new Date(share.expires_at).getTime();
      return Number.isFinite(expiresAt) && expiresAt > now;
    });

    const payload = activeShares.map((share) => ({
      id: share.id,
      project_id: share.project_id,
      version_id: share.version_id,
      scope: share.scope,
      expires_at: share.expires_at,
      created_at: share.created_at,
      max_views: share.max_views,
      views_count: share.views_count,
      url: buildShareUrl(request, share.id),
    }));

    return NextResponse.json(
      { ok: true, shares: payload },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error('[public-share] list error', e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: corsHeaders }
    );
  }
}
