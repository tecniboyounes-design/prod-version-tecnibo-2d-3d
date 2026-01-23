// /src/app/api/convert/any/route.ts
import { NextRequest } from 'next/server';
import { cadBaseUrl, proxyJson } from '@/lib/server/cadPipeline';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    // Basic guard for DXF/DWG base64 size
    if (!body?.file) {
      return Response.json({ ok: false, message: 'file (base64) is required' }, { status: 400 });
    }
    if (!body?.outputFormat) {
      return Response.json({ ok: false, message: 'outputFormat is required' }, { status: 400 });
    }

    const url = `${cadBaseUrl()}/convert/any`;
    return proxyJson(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return Response.json(
      { ok: false, message: e?.message || 'proxy failed' },
      { status: 502 }
    );
  }
}
