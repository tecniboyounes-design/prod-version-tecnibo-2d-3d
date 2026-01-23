import { NextResponse } from 'next/server';
import { validate as validateUuid } from 'uuid';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { supabase } from '../../../filesController/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

export async function POST(request, { params }) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const shareId = String(params?.shareId || '').trim();
    if (!validateUuid(shareId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid share id (uuid required)' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: share, error: fetchError } = await supabase
      .from('project_public_shares')
      .select('id, revoked_at')
      .eq('id', shareId)
      .single();

    if (fetchError || !share) {
      return NextResponse.json(
        { ok: false, error: 'Share not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (share.revoked_at) {
      return NextResponse.json(
        { ok: true, revoked_at: share.revoked_at, message: 'Share already revoked' },
        { status: 200, headers: corsHeaders }
      );
    }

    const revoked_at = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('project_public_shares')
      .update({ revoked_at })
      .eq('id', shareId)
      .select('id, revoked_at')
      .single();

    if (updateError || !updated) {
      console.error('[public-share] revoke failed', updateError);
      return NextResponse.json(
        { ok: false, error: 'Failed to revoke share' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { ok: true, revoked_at: updated.revoked_at },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error('[public-share] revoke error', e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: corsHeaders }
    );
  }
}
