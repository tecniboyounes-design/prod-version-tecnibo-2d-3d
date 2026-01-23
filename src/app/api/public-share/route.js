import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { validate as validateUuid } from 'uuid';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { supabase } from '../filesController/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

function base64url(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}


function makeShareToken() {
  const token = base64url(crypto.randomBytes(32));
  const token_hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, token_hash };
}

function cleanBaseUrl(s) {
  return String(s || '').replace(/\/+$/, '');
}

export async function POST(request) {
  const corsHeaders = getCorsHeaders(request);
  console.log('[public-share] POST start');
  try {
    const body = await request.json().catch(() => ({}));

    const project_id = String(body?.project_id || '').trim();
    const version_id = String(body?.version_id || '').trim();

    const uid = body?.uid ? String(body.uid).trim() : '';
    const odoo_id_raw = body?.odoo_id ?? body?.odooId;

    const expires_at_raw = body?.expires_at ?? body?.expiresAt;
    const max_views_raw = body?.max_views ?? body?.maxViews;

    // ---- Validate IDs
    if (!validateUuid(project_id)) {
      console.warn('[public-share] invalid project_id', { project_id });
      return NextResponse.json(
        { ok: false, error: 'Invalid project_id (uuid required)' },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!validateUuid(version_id)) {
      console.warn('[public-share] invalid version_id', { version_id });
      return NextResponse.json(
        { ok: false, error: 'Invalid version_id (uuid required)' },
        { status: 400, headers: corsHeaders }
      );
    }

    const hasUid = !!uid;
    const hasOdoo = odoo_id_raw !== undefined && odoo_id_raw !== null && String(odoo_id_raw).trim() !== '';

    if (!hasUid && !hasOdoo) {
      console.warn('[public-share] missing inviter', { project_id, version_id });
      return NextResponse.json(
        { ok: false, error: 'Missing inviter: provide uid or odoo_id' },
        { status: 400, headers: corsHeaders }
      );
    }
    if (hasUid && !validateUuid(uid)) {
      console.warn('[public-share] invalid uid', { uid });
      return NextResponse.json(
        { ok: false, error: 'Invalid uid (uuid required)' },
        { status: 400, headers: corsHeaders }
      );
    }

    let expires_at = null;
    const hasExpiresAt =
      expires_at_raw !== undefined && expires_at_raw !== null && String(expires_at_raw).trim() !== '';
    if (hasExpiresAt) {
      const parsedExpiresAt = new Date(expires_at_raw);
      if (Number.isNaN(parsedExpiresAt.getTime())) {
        console.warn('[public-share] invalid expires_at', { expires_at: expires_at_raw });
        return NextResponse.json(
          { ok: false, error: 'Invalid expires_at (date required)' },
          { status: 400, headers: corsHeaders }
        );
      }
      expires_at = parsedExpiresAt.toISOString();
    } else {
      expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    let max_views = null;
    const hasMaxViews =
      max_views_raw !== undefined && max_views_raw !== null && String(max_views_raw).trim() !== '';
    if (hasMaxViews) {
      const parsedMaxViews = Number(max_views_raw);
      if (!Number.isFinite(parsedMaxViews) || !Number.isInteger(parsedMaxViews)) {
        console.warn('[public-share] invalid max_views', { max_views: max_views_raw });
        return NextResponse.json(
          { ok: false, error: 'Invalid max_views (integer required)' },
          { status: 400, headers: corsHeaders }
        );
      }
      max_views = parsedMaxViews;
    } else {
      max_views = 50;
    }

    console.log('[public-share] parsed request', {
      project_id,
      version_id,
      hasUid,
      hasOdoo,
      expires_at,
      max_views,
    });

    // ---- Resolve inviter to created_by_odoo_id
    let created_by_odoo_id = null;

    if (hasUid) {
      console.log('[public-share] resolving inviter by uid');
      const { data, error } = await supabase
        .from('users')
        .select('odoo_id')
        .eq('id', uid)
        .single();

      if (error || !data) {
        console.warn('[public-share] inviter uid not found', { uid });
        return NextResponse.json(
          { ok: false, error: 'Inviter uid not found in users' },
          { status: 404, headers: corsHeaders }
        );
      }
      created_by_odoo_id = data.odoo_id;
    } else {
      console.log('[public-share] resolving inviter by odoo_id');
      const odoo_id = Number(odoo_id_raw);
      if (!Number.isFinite(odoo_id)) {
        console.warn('[public-share] invalid odoo_id', { odoo_id_raw });
        return NextResponse.json(
          { ok: false, error: 'Invalid odoo_id (integer required)' },
          { status: 400, headers: corsHeaders }
        );
      }

      const { data, error } = await supabase
        .from('users')
        .select('odoo_id')
        .eq('odoo_id', odoo_id)
        .single();

      if (error || !data) {
        console.warn('[public-share] inviter odoo_id not found', { odoo_id });
        return NextResponse.json(
          { ok: false, error: 'Inviter odoo_id not found in users' },
          { status: 404, headers: corsHeaders }
        );
      }
      created_by_odoo_id = data.odoo_id;
    }

    console.log('[public-share] inviter resolved', { created_by_odoo_id });

    // ---- Validate version belongs to project (snapshot safety)
    {
      const { data, error } = await supabase
        .from('versions')
        .select('id, project_id')
        .eq('id', version_id)
        .single();

      if (error || !data) {
        console.warn('[public-share] version not found', { version_id });
        return NextResponse.json(
          { ok: false, error: 'version_id not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      if (String(data.project_id) !== project_id) {
        console.warn('[public-share] version/project mismatch', { version_id, project_id });
        return NextResponse.json(
          { ok: false, error: 'version_id does not belong to project_id' },
          { status: 400, headers: corsHeaders }
        );
      }
      console.log('[public-share] version verified', { version_id, project_id });
    }

    // ---- (Optional but recommended) Check inviter has rights to share this project
    // The strictest check (owner-only) based on your schema:
    // projects.user_id references users.odoo_id
    {
      const { data, error } = await supabase
        .from('projects')
        .select('id, user_id')
        .eq('id', project_id)
        .single();

      if (error || !data) {
        console.warn('[public-share] project not found', { project_id });
        return NextResponse.json(
          { ok: false, error: 'project_id not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      // Owner-only gate (remove if you also support internal collaborators via a members table)
      if (Number(data.user_id) !== Number(created_by_odoo_id)) {
        console.warn('[public-share] inviter not owner', {
          project_id,
          created_by_odoo_id,
          owner_odoo_id: data.user_id,
        });
        return NextResponse.json(
          { ok: false, error: 'Inviter is not the owner of this project (owner-only sharing enabled)' },
          { status: 403, headers: corsHeaders }
        );
      }
      console.log('[public-share] project ownership verified', { project_id, created_by_odoo_id });
    }

    // ---- Create share record
    console.log('[public-share] creating share record');
    const { token, token_hash } = makeShareToken();

    const insertPayload = {
      project_id,
      version_id,
      token_hash,
      scope: 'VIEW_ONLY',
      created_by_odoo_id,
    };

    if (expires_at) insertPayload.expires_at = expires_at;
    if (max_views !== null) insertPayload.max_views = max_views;

    const { data: row, error: insErr } = await supabase
      .from('project_public_shares')
      .insert(insertPayload)
      .select('id, scope, expires_at, created_at, created_by_odoo_id')
      .single();

    if (insErr) {
      console.error('[public-share] insert failed', insErr);
      return NextResponse.json(
        { ok: false, error: `Insert failed: ${insErr.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('[public-share] share created', { share_id: row.id, project_id, version_id });

    // ---- Build URL
    const baseUrl = cleanBaseUrl(process.env.APP_BASE_URL) || cleanBaseUrl(request.nextUrl?.origin);
    const url = `${baseUrl}/s/${token}`;

    return NextResponse.json(
      {
        ok: true,
        share: {
          id: row.id,
          project_id,
          version_id,
          scope: row.scope,
          expires_at: row.expires_at,
          created_by_odoo_id: row.created_by_odoo_id,
          created_at: row.created_at,
        },
        url,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error('[public-share] unhandled error', e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: corsHeaders }
    );
  }
}
