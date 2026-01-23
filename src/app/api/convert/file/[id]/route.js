// /src/app/api/convert/file/[id]/route.js
import { NextRequest } from 'next/server';
import { cadBaseUrl, proxyBytes } from '@/lib/server/cadPipeline';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString(); // supports ?name=... passthrough
    const url = `${cadBaseUrl()}/convert/file/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`;
    return proxyBytes(url, { method: 'GET' });
  } catch (e) {
    return Response.json(
      { ok: false, message: e?.message || 'proxy failed' },
      { status: 502 }
    );
  }
}
