// src/app/api/cloudflare/duplicate/route.js
import { NextResponse } from 'next/server';
import { listDbAssetsForTable, upsertUploadedCfImages } from '../_lib/db';
import { createDirectUploadSafe } from '../_lib/uploadIntentCore';
import { buildDeliveryUrl } from '../../../../cloudflare/server/cfDelivery';
import { checkGate } from '../_lib/gate';

const CF_DEBUG =
  String(process.env.CF_DEBUG || '').trim() === '1' ||
  String(process.env.DEBUG_CF || '').trim() === '1';

function dbg(...args) {
  if (CF_DEBUG) console.log('[cf-duplicate]', ...args);
}

function cleanPath(p) {
  return String(p || '').replace(/^\/+|\/+$/g, '').trim();
}

function splitRootAndPrefix(path) {
  const clean = cleanPath(path.startsWith('folder:') ? path.slice('folder:'.length) : path);
  if (!clean) return { rootSlug: '', prefix: '' };
  const parts = clean.split('/').filter(Boolean);
  const rootSlug = parts.shift() || '';
  const prefix = parts.join('/');
  return { rootSlug, prefix };
}

function makeCopyTarget({ rootSlug, prefix }) {
  if (prefix) {
    return { targetRoot: rootSlug, targetPrefix: `${prefix} (copy)` };
  }
  return { targetRoot: `${rootSlug} (copy)`, targetPrefix: '' };
}

function computeNewId({ targetRoot, targetPrefix, prefix, relativePath }) {
  if (prefix) {
    const base = cleanPath(prefix);
    const rel = cleanPath(relativePath);
    const suffix = rel.startsWith(base + '/') ? rel.slice(base.length + 1) : rel;
    const newRel = targetPrefix ? `${targetPrefix}/${suffix}` : suffix;
    return cleanPath(`${targetRoot}/${newRel}`);
  }
  const newRel = targetPrefix ? `${targetPrefix}/${cleanPath(relativePath)}` : cleanPath(relativePath);
  return cleanPath(`${targetRoot}/${newRel}`);
}

function pickSourceCandidates(cfImageId, item) {
  const explicit = [
    item?.openUrl || item?.open_url || null,
    item?.thumbUrl || item?.thumb_url || null,
  ].filter(Boolean);

  const preferredVariant =
    process.env.CF_DUPLICATE_SOURCE_VARIANT ||
    process.env.CF_IMAGES_DUPLICATE_VARIANT ||
    'public';

  const candidates = [
    ...explicit,
    buildDeliveryUrl({ cf_image_id: cfImageId, variantOrTransform: preferredVariant }),
  ];

  // add a couple more fallbacks if not already covered
  if (preferredVariant !== 'public') {
    candidates.push(buildDeliveryUrl({ cf_image_id: cfImageId, variantOrTransform: 'public' }));
  }
  if (preferredVariant !== 'original') {
    candidates.push(buildDeliveryUrl({ cf_image_id: cfImageId, variantOrTransform: 'original' }));
  }

  // dedupe
  return Array.from(new Set(candidates.filter(Boolean)));
}

async function fetchSourceBuffer(cfImageId, item) {
  const candidates = pickSourceCandidates(cfImageId, item);
  if (!candidates.length || candidates.every((u) => u.startsWith('cf-image://'))) {
    throw new Error(
      'Missing Cloudflare delivery base/account hash. Set CF_IMAGE_DELIVERY_BASE or CF_IMAGES_ACCOUNT_HASH.'
    );
  }

  let lastStatus = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      lastStatus = res.status;
      if (!res.ok) {
        dbg('source fetch failed', url, res.status);
        continue;
      }
      const buf = await res.arrayBuffer();
      const mime = res.headers.get('content-type') || 'application/octet-stream';
      return { buf: Buffer.from(buf), mime };
    } catch (e) {
      dbg('source fetch error', url, e?.message || e);
      lastStatus = e?.message || 'error';
      continue;
    }
  }

  const variantHint =
    'Check that a public/original delivery variant exists (or set CF_DUPLICATE_SOURCE_VARIANT) and that the image is accessible without signed URLs.';
  throw new Error(`Fetch source failed for ${cfImageId}. Last status: ${lastStatus}. ${variantHint}`);
}

export async function POST(req) {
  try {
    const gate = checkGate(req);
    if (!gate.ok) {
      return NextResponse.json({ ok: false, message: gate.message }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));
    const rawPath = body?.path || '';
    const { rootSlug, prefix } = splitRootAndPrefix(rawPath);

    if (!rootSlug) {
      return NextResponse.json({ ok: false, message: 'Missing folder path' }, { status: 400 });
    }

    const { targetRoot, targetPrefix } = makeCopyTarget({ rootSlug, prefix });

    const itemsRes = await listDbAssetsForTable({
      rootSlug,
      prefix,
      deep: true,
      includeFolders: false,
      limit: 5000,
    });

    const items = itemsRes?.items || [];
    if (!items.length) {
      return NextResponse.json({ ok: false, message: 'No assets found to duplicate.' }, { status: 404 });
    }

    const uploads = [];
    for (const item of items) {
      const srcId = cleanPath(item?.cfImageId || item?.cf_image_id || item?.id || item?.path);
      if (!srcId) continue;

      const newId = computeNewId({
        targetRoot,
        targetPrefix,
        prefix,
        relativePath: item?.relativePath || '',
      });

      try {
        const { buf, mime } = await fetchSourceBuffer(srcId, item);
        const direct = await createDirectUploadSafe({ id: newId });

        const fd = new FormData();
        fd.set('file', new Blob([buf], { type: mime }), item?.fileName || item?.name || 'file');

        const uploadRes = await fetch(direct.uploadURL, { method: 'POST', body: fd });
        const text = await uploadRes.text();
        if (!uploadRes.ok) throw new Error(`CF upload failed (${uploadRes.status}): ${text.slice(0, 200)}`);

        uploads.push({
          cf: { id: newId },
          sizeBytes: buf.length || item?.sizeBytes || item?.size_bytes || null,
          mimeType: mime || item?.mimeType || item?.mime_type || null,
          width: item?.width ?? null,
          height: item?.height ?? null,
        });
      } catch (e) {
        dbg('dup failed for', srcId, '->', e?.message || e);
        // propagate the first hard failure when nothing duplicated yet
        if (!uploads.length) {
          throw e;
        }
      }
    }

    if (!uploads.length) {
      return NextResponse.json({ ok: false, message: 'No assets duplicated (all failed).' }, { status: 500 });
    }

    await upsertUploadedCfImages({
      uploads,
      createdBy: 'cloudflare-duplicate',
    });

    return NextResponse.json({
      ok: true,
      duplicated: uploads.length,
      targetRoot,
      targetPrefix,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'Failed to duplicate folder.' },
      { status: 500 }
    );
  }
}
