import { NextResponse } from 'next/server';
import { upsertUploadedCfImages, cleanupVirtualMarkersForCfId } from '../_lib/db';
import { checkGate } from '../_lib/gate';

export async function POST(req) {
  const gate = checkGate(req);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, message: gate.message }, { status: gate.status });
  }

  const body = await req.json().catch(() => ({}));

  const cf_image_id = String(body.cf_image_id || '').trim();
  if (!cf_image_id) {
    return NextResponse.json({ ok: false, message: 'Missing cf_image_id' }, { status: 400 });
  }

  await upsertUploadedCfImages({
    uploads: [{
      cf: { id: cf_image_id },
      sizeBytes: body.sizeBytes ?? null,
      mimeType: body.mimeType ?? null,
      width: body.width ?? null,
      height: body.height ?? null,
    }],
    createdBy: 'cloudflare-commit-upload',
  });

  // Remove virtual-folder markers for this path (if any) now that real files exist
  try {
    await cleanupVirtualMarkersForCfId({ cf_image_id });
  } catch (e) {
    console.error('[cf][commit-upload] cleanup virtual markers failed', e?.message || e);
  }

  return NextResponse.json({ ok: true });
}
