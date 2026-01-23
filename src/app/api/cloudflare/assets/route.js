import { NextResponse } from 'next/server';
import { listDbAssetsForTable } from '../_lib/db';
import { checkGate } from '../_lib/gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanPath(s) {
  return String(s || '').replace(/^\/+|\/+$/g, '').trim();
}

export async function GET(req) {
  try {
    const gate = checkGate(req);
    if (!gate.ok) {
      return NextResponse.json({ ok: false, message: gate.message }, { status: gate.status });
    }

    const url = new URL(req.url);

    let root =
      url.searchParams.get('root') ||
      url.searchParams.get('rootSlug') ||
      url.searchParams.get('root_slug') ||
      '';

    let prefix =
      url.searchParams.get('prefix') ||
      url.searchParams.get('path') ||
      '';

    const limit = Number(url.searchParams.get('limit') || 5000);

    // deep=1 => old behavior (all descendant files)
    // deep=0 => direct children only (files + folders)
    const deep = String(url.searchParams.get('deep') || '1') !== '0';

    // includeFolders=1 => add virtual folder rows
    const includeFolders = String(url.searchParams.get('includeFolders') || '0') !== '0';

    root = String(root || '').trim();
    prefix = cleanPath(prefix);

    // allow prefix=cloudflare8/child_0 to infer root
    if (!root && prefix.includes('/')) {
      const parts = prefix.split('/').filter(Boolean);
      root = parts[0] || '';
      prefix = parts.slice(1).join('/');
    }

    if (root && prefix === root) prefix = '';
    if (root && prefix.startsWith(root + '/')) prefix = prefix.slice(root.length + 1);

    if (!root) {
      return NextResponse.json(
        { ok: false, message: 'Missing "root" (ex: ?root=cloudflare8&prefix=child_0).' },
        { status: 400 }
      );
    }

    const result = await listDbAssetsForTable({
      rootSlug: root,
      prefix,
      limit,
      deep,
      includeFolders,
    });

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'Failed to list DB assets.' },
      { status: 500 }
    );
  }
}
