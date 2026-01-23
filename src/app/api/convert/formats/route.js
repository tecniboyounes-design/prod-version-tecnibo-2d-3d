// /src/app/api/convert/formats/route.ts
import { NextRequest } from 'next/server';
import { cadBaseUrl, proxyJson } from '@/lib/server/cadPipeline';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const url = `${cadBaseUrl()}/convert/formats${qs ? `?${qs}` : ''}`;
    return proxyJson(url, { method: 'GET' });
  } catch (e) {
    return Response.json(
      { ok: false, message: e?.message || 'proxy failed' },
      { status: 502 }
    );
  }
}
