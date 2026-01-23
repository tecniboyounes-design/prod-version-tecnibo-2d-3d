// src/app/api/cloudflare/external-upload/route.js
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { deleteImageV1 } from '../_lib/cf';
import {
  createDirectUploadRaw,
  createDirectUploadSafe,
  joinPath,
} from '../_lib/uploadIntentCore';
import { listDbAssetsForTable, upsertUploadedCfImages } from '../_lib/db';
import { buildDeliveryUrl } from '../../../../cloudflare/server/cfDelivery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT_SLUG = 'External_API';
const GENERATED_PREFIX = 'external_api';
const DEFAULT_CREATED_BY = 'external-api';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};



let _pool = null;

function getPool() {
  if (_pool) return _pool;
  const connectionString =
    process.env.RP_IMOS_HELPER_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PG_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error(
      'Missing RP_IMOS_HELPER_DATABASE_URL (or DATABASE_URL / POSTGRES_URL / PG_CONNECTION_STRING).'
    );
  }

  _pool = new Pool({ connectionString });
  return _pool;
}

function safeIdent(name, fallback) {
  const n = String(name || fallback || '').trim();
  if (!/^[a-zA-Z0-9_.]+$/.test(n)) throw new Error(`Invalid SQL identifier: "${n}"`);
  return n;
}

async function dbDeleteByCfIds(cfIds) {
  if (!cfIds.length) return 0;
  const T_IMAGES = safeIdent(process.env.CF_DB_IMAGES_TABLE, 'media_assets');
  const pool = getPool();
  const client = await pool.connect();
  try {
    const q = `DELETE FROM ${T_IMAGES} WHERE cf_image_id = ANY($1::text[])`;
    const r = await client.query(q, [cfIds]);
    return r.rowCount || 0;
  } finally {
    client.release();
  }
}

function json(ok, payload, status = 200) {
  return NextResponse.json(
    { ok, ...payload },
    { status, headers: CORS_HEADERS }
  );
}

function safeTrim(s) {
  return String(s || '').trim();
}

function normalizePathInput(rawPath) {
  const raw = safeTrim(rawPath);
  const endsWithSlash = raw.endsWith('/');
  if (!raw) return { path: '', endsWithSlash, hadTraversal: false };

  const normalized = raw.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  const out = [];
  let hadTraversal = false;

  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      hadTraversal = true;
      continue;
    }
    out.push(part);
  }

  return { path: out.join('/'), endsWithSlash, hadTraversal };
}

function normalizeRelPath(rawPath, { allowEmpty = false } = {}) {
  const { path, endsWithSlash, hadTraversal } = normalizePathInput(rawPath);
  if (hadTraversal) return { error: 'Invalid path (.. not allowed).' };
  const rel = stripRootPrefix(path, ROOT_SLUG);
  if (!allowEmpty && !rel) return { error: 'Missing path.' };
  return { rel, endsWithSlash };
}

function stripRootPrefix(p, rootSlug) {
  const clean = safeTrim(p).replace(/^\/+|\/+$/g, '');
  if (!clean) return '';
  if (clean === rootSlug) return '';
  if (clean.startsWith(rootSlug + '/')) return clean.slice(rootSlug.length + 1);
  return clean;
}

function sanitizeFileName(name) {
  const clean = safeTrim(name).replace(/\\/g, '/');
  const parts = clean.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function parseBase64Payload(input) {
  const raw = safeTrim(input);
  if (!raw) throw new Error('Missing imageBase64');

  const m = raw.match(/^data:([^;]+);base64,(.*)$/i);
  if (m) {
    return { mimeType: m[1], base64: m[2] };
  }

  return { mimeType: null, base64: raw };
}

function decodeBase64ToBuffer(base64) {
  const clean = String(base64 || '').replace(/\s+/g, '');
  const buf = Buffer.from(clean, 'base64');
  if (!buf.length) throw new Error('Invalid base64 payload');
  return buf;
}

function sniffMimeType(buf) {
  if (!Buffer.isBuffer(buf)) return null;

  // PNG
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  // GIF
  if (buf.length >= 6) {
    const hdr = buf.toString('ascii', 0, 6);
    if (hdr === 'GIF87a' || hdr === 'GIF89a') return 'image/gif';
  }

  // WEBP
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  // AVIF (ftypavif / ftypavis)
  if (buf.length >= 12 && buf.toString('ascii', 4, 12).startsWith('ftypavif')) {
    return 'image/avif';
  }

  // BMP
  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) {
    return 'image/bmp';
  }

  return null;
}

function extFromMime(mime) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/svg+xml': 'svg',
  };
  return map[String(mime || '').toLowerCase()] || '';
}

function parsePngSize(buf) {
  if (buf.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i++) {
    if (buf[i] !== sig[i]) return null;
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function parseGifSize(buf) {
  if (buf.length < 10) return null;
  const magic = buf.toString('ascii', 0, 6);
  if (magic !== 'GIF87a' && magic !== 'GIF89a') return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function parseJpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 7 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    const len = buf.readUInt16BE(offset + 2);
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && offset + 7 < buf.length) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + len;
  }
  return null;
}

function parseWebpSize(buf) {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buf.toString('ascii', 8, 12) !== 'WEBP') return null;

  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buf.length >= 30) {
    return {
      width: 1 + buf.readUIntLE(24, 3),
      height: 1 + buf.readUIntLE(27, 3),
    };
  }
  if (chunk === 'VP8L' && buf.length >= 25) {
    const b1 = buf[21];
    const b2 = buf[22];
    const b3 = buf[23];
    const b4 = buf[24];
    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
    };
  }
  if (chunk === 'VP8 ' && buf.length >= 30) {
    const offset = 20;
    if (
      buf[offset + 3] === 0x9d &&
      buf[offset + 4] === 0x01 &&
      buf[offset + 5] === 0x2a
    ) {
      return {
        width: buf.readUInt16LE(offset + 6),
        height: buf.readUInt16LE(offset + 8),
      };
    }
  }
  return null;
}

function probeImageSize(buf) {
  return (
    parsePngSize(buf) ||
    parseGifSize(buf) ||
    parseJpegSize(buf) ||
    parseWebpSize(buf)
  );
}

function makeGeneratedName(ext) {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand =
    crypto?.randomUUID?.().replace(/-/g, '').slice(0, 8) ||
    Math.random().toString(36).slice(2, 10);
  const suffix = ext ? `.${ext}` : '';
  return `${GENERATED_PREFIX}_${ts}_${rand}${suffix}`;
}

function isNotFound(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('not found') || msg.includes('does not exist') || msg.includes('404');
}

async function deleteIfExists(cfImageId) {
  try {
    await deleteImageV1(cfImageId);
  } catch (e) {
    if (!isNotFound(e)) throw e;
  }
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const rawPrefix =
      url.searchParams.get('prefix') ||
      url.searchParams.get('path') ||
      '';

    const limit = Number(url.searchParams.get('limit') || 5000);
    const deep = String(url.searchParams.get('deep') || '1') !== '0';
    const includeFolders =
      String(url.searchParams.get('includeFolders') || '0') !== '0';

    const norm = normalizeRelPath(rawPrefix, { allowEmpty: true });
    if (norm.error) return json(false, { message: norm.error }, 400);

    const result = await listDbAssetsForTable({
      rootSlug: ROOT_SLUG,
      prefix: norm.rel,
      limit,
      deep,
      includeFolders,
    });

    return json(true, {
      rootSlug: ROOT_SLUG,
      prefix: norm.rel,
      ...result,
    });
  } catch (e) {
    return json(false, { message: e?.message || 'Failed to list External_API.' }, 500);
  }
}

export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    const rawPath = body?.path ?? url.searchParams.get('path') ?? '';
    const rawId = body?.id ?? url.searchParams.get('id') ?? '';
    const type = String(body?.type ?? url.searchParams.get('type') ?? 'auto').toLowerCase();
    const dryRun =
      body?.dryRun === true || String(url.searchParams.get('dryRun') || '') === '1';

    if (!rawPath && !rawId) {
      return json(false, { message: 'Missing path or id.' }, 400);
    }

    if (!['auto', 'file', 'folder'].includes(type)) {
      return json(false, { message: 'Invalid type. Use auto, file, or folder.' }, 400);
    }

    const norm = rawPath ? normalizeRelPath(rawPath, { allowEmpty: false }) : null;
    if (norm?.error) return json(false, { message: norm.error }, 400);

    let relPath = norm?.rel || '';
    let endsWithSlash = norm?.endsWithSlash || false;
    let cfId = '';

    if (rawId) {
      const cleanId = safeTrim(rawId).replace(/^\/+|\/+$/g, '');
      if (cleanId === ROOT_SLUG) {
        return json(false, { message: 'Refusing to delete root.' }, 400);
      }
      if (cleanId.startsWith(ROOT_SLUG + '/')) {
        relPath = cleanId.slice(ROOT_SLUG.length + 1);
      } else {
        relPath = cleanId;
      }
      cfId = joinPath(ROOT_SLUG, relPath);
    } else if (relPath) {
      cfId = joinPath(ROOT_SLUG, relPath);
    }

    let targetType = type;
    if (targetType === 'auto') {
      targetType = endsWithSlash ? 'folder' : 'file';
    }

    if (targetType === 'folder') {
      if (!relPath) {
        return json(false, { message: 'Refusing to delete root.' }, 400);
      }

      const listRes = await listDbAssetsForTable({
        rootSlug: ROOT_SLUG,
        prefix: relPath,
        deep: true,
        includeFolders: false,
        limit: Number(body?.limit || 20000),
      });

      const items = listRes?.items || [];
      const cfIds = Array.from(
        new Set(
          items
            .map((it) =>
              String(it?.cfImageId || it?.cf_image_id || it?.path || it?.id || '').trim()
            )
            .filter((cid) => cid.startsWith(ROOT_SLUG + '/'))
        )
      );

      if (!cfIds.length) {
        return json(true, { type: 'folder', path: relPath, message: 'Nothing matched.' });
      }

      if (dryRun) {
        return json(true, {
          dryRun: true,
          type: 'folder',
          path: relPath,
          matched: cfIds.length,
          sample: cfIds.slice(0, 10),
        });
      }

      const failed = [];
      const succeeded = [];
      const CONC = 5;

      for (let i = 0; i < cfIds.length; i += CONC) {
        const batch = cfIds.slice(i, i + CONC);
        const settled = await Promise.allSettled(
          batch.map(async (cid) => {
            try {
              await deleteImageV1(cid);
              return { ok: true, cid };
            } catch (e) {
              if (isNotFound(e)) return { ok: true, cid };
              return { ok: false, cid, error: e?.message || String(e) };
            }
          })
        );

        for (const s of settled) {
          const v =
            s.status === 'fulfilled'
              ? s.value
              : { ok: false, cid: '', error: s.reason?.message };
          if (v.ok) succeeded.push(v.cid);
          else failed.push({ cf_image_id: v.cid, error: v.error || 'Delete failed' });
        }
      }

      const dbDeleted = await dbDeleteByCfIds(succeeded);

      return json(failed.length === 0, {
        type: 'folder',
        path: relPath,
        matched: cfIds.length,
        deleted: { cloudflare: succeeded.length, db: dbDeleted },
        failed,
      });
    }

    if (!cfId) {
      return json(false, { message: 'Missing file path or id.' }, 400);
    }

    if (dryRun) {
      return json(true, { dryRun: true, type: 'file', cf_image_id: cfId });
    }

    try {
      await deleteImageV1(cfId);
    } catch (e) {
      if (!isNotFound(e)) throw e;
    }

    const dbDeleted = await dbDeleteByCfIds([cfId]);
    return json(true, {
      type: 'file',
      cf_image_id: cfId,
      deleted: { cloudflare: 1, db: dbDeleted },
    });
  } catch (e) {
    return json(false, { message: e?.message || 'Delete failed.' }, 500);
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPath = body?.path ?? '';
    const rawImageName = body?.imageName ?? body?.fileName ?? '';
    const createdBy = safeTrim(body?.createdBy) || DEFAULT_CREATED_BY;
    const mode = String(body?.mode || 'override').toLowerCase();

    if (!body?.imageBase64) {
      return json(false, { message: 'Missing imageBase64.' }, 400);
    }

    let dataMime = null;
    let base64 = '';
    try {
      const parsed = parseBase64Payload(body?.imageBase64);
      dataMime = parsed.mimeType;
      base64 = parsed.base64;
    } catch (e) {
      return json(false, { message: e?.message || 'Invalid imageBase64.' }, 400);
    }

    let buf;
    try {
      buf = decodeBase64ToBuffer(base64);
    } catch (e) {
      return json(false, { message: e?.message || 'Invalid base64 payload.' }, 400);
    }
    const sniffedMime = sniffMimeType(buf);
    const mimeType =
      safeTrim(body?.mimeType) || dataMime || sniffedMime || 'image/png';

    const ext = extFromMime(mimeType) || extFromMime(sniffedMime) || 'png';
    const sizeBytes = buf.length;
    const dims = probeImageSize(buf) || {};

    const { path: normalizedPath, endsWithSlash } = normalizePathInput(rawPath);
    const cleanRel = stripRootPrefix(normalizedPath, ROOT_SLUG);
    const imageName = sanitizeFileName(rawImageName);

    let relPath = cleanRel;
    let generatedName = '';
    const warnings = [];

    if (endsWithSlash) {
      if (imageName) {
        relPath = joinPath(cleanRel, imageName);
      } else {
        generatedName = makeGeneratedName(ext);
        relPath = joinPath(cleanRel, generatedName);
        warnings.push(
          `imageName missing; generated "${generatedName}" with prefix "${GENERATED_PREFIX}"`
        );
      }
    } else if (!relPath) {
      if (imageName) {
        relPath = imageName;
      } else {
        generatedName = makeGeneratedName(ext);
        relPath = generatedName;
        warnings.push(
          `imageName missing; generated "${generatedName}" with prefix "${GENERATED_PREFIX}"`
        );
      }
    }

    if (!relPath) {
      return json(false, { message: 'Missing path or imageName.' }, 400);
    }

    const cf_image_id = joinPath(ROOT_SLUG, relPath);

    let direct = null;
    if (mode === 'copy') {
      direct = await createDirectUploadSafe({ id: cf_image_id });
    } else {
      await deleteIfExists(cf_image_id);
      direct = await createDirectUploadRaw({ id: cf_image_id });
    }

    const fileNameForUpload = sanitizeFileName(relPath) || 'file';
    const form = new FormData();
    form.set('file', new Blob([buf], { type: mimeType }), fileNameForUpload);

    const uploadRes = await fetch(direct.uploadURL, { method: 'POST', body: form });
    const uploadText = await uploadRes.text();
    if (!uploadRes.ok) {
      return json(
        false,
        { message: `Direct upload failed (${uploadRes.status})`, detail: uploadText.slice(0, 400) },
        502
      );
    }

    await upsertUploadedCfImages({
      uploads: [
        {
          cf: { id: cf_image_id },
          sizeBytes,
          mimeType,
          width: dims.width ?? null,
          height: dims.height ?? null,
        },
      ],
      createdBy,
    });

    const publicUrl = buildDeliveryUrl({
      cf_image_id,
      variantOrTransform: 'public',
    });

    return json(true, {
      cf_image_id,
      rootSlug: ROOT_SLUG,
      path: relPath,
      sizeBytes,
      mimeType,
      width: dims.width ?? null,
      height: dims.height ?? null,
      publicUrl,
      warning: warnings.length ? warnings.join(' ') : undefined,
      generatedName: generatedName || undefined,
    });
  } catch (e) {
    return json(false, { message: e?.message || 'External upload failed.' }, 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
