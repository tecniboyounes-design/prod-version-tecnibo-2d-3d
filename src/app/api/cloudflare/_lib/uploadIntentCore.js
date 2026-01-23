// src/app/api/cloudflare/_lib/uploadIntentCore.js
import crypto from 'node:crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { CF_ACCOUNT_ID, cfFetchJson } from './cf';

const CF_DEBUG =
  String(process.env.CF_DEBUG || '').trim() === '1' ||
  String(process.env.DEBUG_CF || '').trim() === '1';

function dbg(...args) {
  if (CF_DEBUG) console.log('[upload-core]', ...args);
}

export function joinPath(a, b) {
  const left = String(a || '').replace(/^\/+|\/+$/g, '');
  const right = String(b || '').replace(/^\/+|\/+$/g, '');
  if (!left) return right;
  if (!right) return left;
  return `${left}/${right}`.replace(/\/{2,}/g, '/');
}

function isCode(err, code) {
  const msg = String(err?.message || '');
  return msg.includes(`code ${code}`) || msg.includes(`(code ${code})`);
}

function addSuffixToId(id) {
  const suffix = crypto?.randomUUID?.().slice(0, 8) || String(Date.now());
  return `${id}__${suffix}`;
}

export async function createDirectUploadRaw({
  id,
  requireSignedURLs = false,
  expiresInMinutes = 30,
} = {}) {
  const cleanId = String(id || '').trim();
  if (!cleanId) throw new Error('Missing id for direct upload');

  const form = new FormData();
  form.set('id', cleanId);
  form.set('requireSignedURLs', requireSignedURLs ? 'true' : 'false');
  form.set('expiry', new Date(Date.now() + expiresInMinutes * 60_000).toISOString());

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v2/direct_upload`;
  const json = await cfFetchJson(url, { method: 'POST', body: form });
  return json.result; // { id, uploadURL }
}

export async function createDirectUploadSafe({ id } = {}) {
  try {
    return await createDirectUploadRaw({ id });
  } catch (e) {
    // CF "image id already exists"
    if (isCode(e, 5409)) {
      const nextId = addSuffixToId(id);
      dbg('5409 => suffix id', { id, nextId });
      return await createDirectUploadRaw({ id: nextId });
    }
    throw e;
  }
}

/**
 * Minimal mime guesser (no deps).
 * Works fine for our DB column + upload metadata.
 */
export function guessMimeType(filePath) {
  const ext = (path.extname(String(filePath || '')).slice(1) || '').toLowerCase();
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    svg: 'image/svg+xml',
    heic: 'image/heic',
    heif: 'image/heif',
    jfif: 'image/jpeg',
  };
  return map[ext] || 'application/octet-stream';
}

export function isLikelyImagePath(filePath) {
  const ext = (path.extname(String(filePath || '')).slice(1) || '').toLowerCase();
  return new Set([
    'jpg', 'jpeg', 'png', 'webp', 'avif', 'gif',
    'bmp', 'tif', 'tiff', 'svg',
    'heic', 'heif', 'jfif',
  ]).has(ext);
}

/**
 * Upload a LOCAL FILE to Cloudflare direct upload URL.
 * Returns parsed JSON response.
 */
export async function uploadLocalFileToDirectUploadURL({
  uploadURL,
  absPath,
  fileName,
  mimeType,
} = {}) {
  const u = String(uploadURL || '').trim();
  const p = String(absPath || '').trim();
  if (!u) throw new Error('Missing uploadURL');
  if (!p) throw new Error('Missing absPath');

  const buf = await fs.readFile(p);
  const name = String(fileName || path.basename(p) || 'file.bin');
  const type = String(mimeType || guessMimeType(p));

  const form = new FormData();
  // Node runtime supports Blob + FormData
  form.set('file', new Blob([buf], { type }), name);

  const res = await fetch(u, { method: 'POST', body: form });
  const text = await res.text();

  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    throw new Error(`Direct upload failed (${res.status}): ${String(text || '').slice(0, 400)}`);
  }
  if (json && json.success === false) {
    const msg = json?.errors?.[0]?.message || 'Direct upload failed (Cloudflare)';
    throw new Error(msg);
  }

  return json;
}
