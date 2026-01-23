// src/app/api/cloudflare/folders/route.js
import { NextResponse } from 'next/server';
import { createVirtualFolderPath, deleteVirtualFolderPath } from '../_lib/db';
import { checkGate } from '../_lib/gate';

export async function POST(req) {
  const gate = checkGate(req);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, message: gate.message }, { status: gate.status });
  }

  const body = await req.json().catch(() => ({}));
  const path = String(body.path || body.folderPath || '').trim();

  if (!path) {
    return NextResponse.json({ ok: false, message: 'Missing "path".' }, { status: 400 });
  }

  try {
    const res = await createVirtualFolderPath({
      path,
      createdBy: body.createdBy || 'cloudflare-ui',
    });

    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e?.message || 'Create folder failed.' },
      { status: 400 }
    );
  }
}

export async function DELETE(req) {
  const gate = checkGate(req);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, message: gate.message }, { status: gate.status });
  }

  const body = await req.json().catch(() => ({}));
  const path = String(body.path || body.folderPath || '').trim();

  if (!path) {
    return NextResponse.json({ ok: false, message: 'Missing "path".' }, { status: 400 });
  }

  try {
    const res = await deleteVirtualFolderPath({
      path,
      createdBy: body.createdBy || 'cloudflare-ui',
    });

    if (res?.ok === false && res?.status) {
      return NextResponse.json({ ok: false, message: res.message }, { status: res.status });
    }

    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e?.message || 'Delete folder failed.' },
      { status: 400 }
    );
  }
}
