// src/app/api/cloudflare/upload-intent/route.js

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { CF_ACCOUNT_ID, cfFetchJson } from '../_lib/cf';
import { checkGate } from '../_lib/gate';

const CF_DEBUG =
  String(process.env.CF_DEBUG || '').trim() === '1' ||
  String(process.env.DEBUG_CF || '').trim() === '1';

const COPY_SUFFIX = ' (copy)';
const CF_LOG_REQUESTS =
  CF_DEBUG || String(process.env.CF_LOG_UPLOAD_INTENT || '').trim() === '1';

function dbg(...args) {
  if (CF_DEBUG) console.log('[upload-intent]', ...args);
}

function joinPath(a, b) {
  const left = String(a || '').replace(/^\/+|\/+$/g, '');
  const right = String(b || '').replace(/^\/+|\/+$/g, '');
  if (!left) return right;
  if (!right) return left;
  return `${left}/${right}`.replace(/\/{2,}/g, '/');
}

function cleanFolderName(p) {
  return String(p || '').replace(/^\/+|\/+$/g, '');
}

function withCopySuffix(folder) {
  const clean = cleanFolderName(folder);
  if (!clean) return `root${COPY_SUFFIX}`;
  if (clean.endsWith(COPY_SUFFIX)) return clean;
  return `${clean}${COPY_SUFFIX}`;
}

function lastSegment(p) {
  const s = cleanFolderName(p);
  if (!s) return '';
  const parts = s.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function normalizeRel(p) {
  return String(p || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/')
    .trim();
}

function extractCfCode(err) {
  return (
    err?.code ??
    err?.raw?.errors?.[0]?.code ??
    err?.errors?.[0]?.code ??
    null
  );
}

function isCode(err, code) {
  const c = extractCfCode(err);
  if (c === code) return true;
  const msg = String(err?.message || '');
  return msg.includes(`code ${code}`) || msg.includes(`(code ${code})`);
}

function isNotFound(err) {
  const msg = String(err?.message || '').toLowerCase();
  // Cloudflare "not found" codes vary; keep permissive.
  return msg.includes('not found') || msg.includes('does not exist') || isCode(err, 5404);
}

function addSuffixToId(id) {
  const suffix = crypto?.randomUUID?.().slice(0, 8) || String(Date.now());
  return `${id}__${suffix}`;
}

async function createDirectUploadRaw({
  id,
  requireSignedURLs = false,
  expiresInMinutes = 30,
}) {
  const form = new FormData();
  form.set('id', id);
  form.set('requireSignedURLs', requireSignedURLs ? 'true' : 'false');
  form.set(
    'expiry',
    new Date(Date.now() + expiresInMinutes * 60_000).toISOString()
  );

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v2/direct_upload`;
  const json = await cfFetchJson(url, { method: 'POST', body: form });
  return json.result; // { id, uploadURL }
}

/**
 * ✅ IMPORTANT:
 * delete endpoint must URL-encode id, because your ids contain "/" like "a/b/c.jpg"
 */
async function deleteImageV1Encoded(id) {
  const encoded = encodeURIComponent(String(id || ''));
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${encoded}`;
  await cfFetchJson(url, { method: 'DELETE' });
}

async function deleteIfExists(id) {
  try {
    await deleteImageV1Encoded(id);
    dbg('deleted existing image', { id });
  } catch (e) {
    if (isNotFound(e)) return;
    throw e;
  }
}

async function createDirectUploadSafe({ id, mode }) {
  // override => delete then create
  if (mode === 'override') {
    await deleteIfExists(id);
    return await createDirectUploadRaw({ id });
  }

  // copy => create; if exists, suffix
  try {
    return await createDirectUploadRaw({ id });
  } catch (e) {
    if (isCode(e, 5409)) {
      const nextId = addSuffixToId(id);
      return await createDirectUploadRaw({ id: nextId });
    }
    throw e;
  }
}

/**
 * ✅ FIXED relPath logic:
 * - Use relativePath/fileName as base
 * - Prefix rootSlug ONLY if it isn't already implied by target folder
 * - Avoid "copy_2/copy_2/file.jpg"
 */
function computeRelPathFromRow(f, cleanTargetFolder) {
  const rootSlug = String(f?.rootSlug || '').trim();
  const relativePath = normalizeRel(f?.relativePath || '');
  const fileName = String(f?.fileName || f?.name || '').trim();

  const base = relativePath || fileName;
  if (!base) return '';

  // If target already ends with rootSlug, don't prefix rootSlug again
  const targetLast = lastSegment(cleanTargetFolder);

  if (
    rootSlug &&
    rootSlug !== targetLast &&
    base !== rootSlug &&
    !base.startsWith(rootSlug + '/')
  ) {
    return joinPath(rootSlug, base);
  }

  return base;
}

export async function POST(req) {
  try {
    const gate = checkGate(req);
    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, message: gate.message },
        { status: gate.status }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      files = [],
      transforms = {},
      defaultProfile = null,
      targetFolder = '',
      mode = 'override',
    } = body || {};

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { ok: false, message: 'No files provided.' },
        { status: 400 }
      );
    }

    const normalizedMode = mode === 'copy' ? 'copy' : 'override';
    const cleanTarget = cleanFolderName(targetFolder);

    const effectiveTarget =
      normalizedMode === 'copy' ? withCopySuffix(cleanTarget) : cleanTarget;

    if (CF_LOG_REQUESTS) {
      console.log('[upload-intent] request', {
        mode: normalizedMode,
        targetFolder,
        cleanTarget,
        effectiveTarget,
        files: files.length,
      });
    }

    const intents = [];
    const CONCURRENCY = 2;

    const processFile = async (f) => {
      const localId = String(f?.id || '').trim();
      if (!localId) return null;

      const relPath = computeRelPathFromRow(f, cleanTarget);
      if (!relPath) return null;

      const cloudflareId = joinPath(effectiveTarget, relPath);

      dbg('map row -> cfId', {
        localId,
        rootSlug: f?.rootSlug,
        relativePath: f?.relativePath,
        fileName: f?.fileName,
        cleanTarget,
        effectiveTarget,
        mode: normalizedMode,
        relPath,
        cloudflareId,
      });

      const direct = await createDirectUploadSafe({
        id: cloudflareId,
        mode: normalizedMode,
      });

      return {
        localId,
        id: direct.id,
        uploadURL: direct.uploadURL,
        transform: transforms?.[localId] ?? null,
        defaultProfile,
      };
    };

    for (let i = 0; i < files.length; i += CONCURRENCY) {
      const batch = files.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(processFile));
      for (const intent of results) {
        if (intent) intents.push(intent);
      }
    }
    
    return NextResponse.json({
      ok: true,
      intents,
      targetFolder: effectiveTarget,
      mode: normalizedMode,
    });
    
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'Failed to create upload intents.' },
      { status: 500 }
    );
  }
}
