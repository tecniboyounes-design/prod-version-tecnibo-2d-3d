// /src/pages/api/cloudflare/upload-intent.js (or app/api/.../route.js)
import { NextResponse } from 'next/server';
import { checkGate } from './_lib/gate';

// Example app router version:
export async function POST(req) {
  try {
    const gate = checkGate(req);
    if (!gate.ok) {
      return NextResponse.json({ ok: false, message: gate.message }, { status: gate.status });
    }

    const body = await req.json(); // { files: [{ id, path, name, size, type, ext, category }]}
    // TODO: Use Cloudflare Images API (with your token) to create direct upload URLs per file
    // return shape: { ok: true, intents: [{ id, uploadURL }] }

    const intents = (body.files || []).map((f, i) => ({
      id: f.id,
      uploadURL: `https://example-upload-url/${encodeURIComponent(f.id)}?token=${i}`,
    }));

    return NextResponse.json({ ok: true, intents });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e?.message || 'Failed' }, { status: 500 });
  }
}
