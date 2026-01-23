import { NextResponse } from 'next/server';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

import {
  createDirectUploadSafe,
  uploadLocalFileToDirectUploadURL,
  guessMimeType,
  isLikelyImagePath,
  joinPath,
} from '../_lib/uploadIntentCore';
import { upsertUploadedCfImages } from '../_lib/db';
import { checkGate } from '../_lib/gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function log(reqId, ...args) {
  console.log(`[gdrive-public][${reqId}]`, ...args);
}

function isDriveUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === 'drive.google.com';
  } catch {
    return false;
  }
}

function extractFolderId(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/folders\/([^/]+)/);
    return m?.[1] || null;
  } catch {
    return null;
  }
}

function runScrap({ url, outDir, reqId }) {
  const script = path.join(
    process.cwd(),
    'src/app/api/cloudflare/google-drive-public/scrap.sh'
  );

  return new Promise((resolve, reject) => {
    const child = spawn('bash', [script, url, outDir], {
      env: { ...process.env, OUTDIR: outDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      s.split('\n').filter(Boolean).forEach((l) => log(reqId, `[sh] ${l}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// --- Local image metadata helpers (size/mime/width/height) -----------------
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
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
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
    const width = 1 + buf.readUIntLE(24, 3);
    const height = 1 + buf.readUIntLE(27, 3);
    return { width, height };
  }
  if (chunk === 'VP8L' && buf.length >= 25) {
    const b1 = buf[21];
    const b2 = buf[22];
    const b3 = buf[23];
    const b4 = buf[24];
    const width = 1 + (((b2 & 0x3f) << 8) | b1);
    const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    return { width, height };
  }
  if (chunk === 'VP8 ' && buf.length >= 30) {
    const offset = 20;
    if (buf[offset + 3] === 0x9d && buf[offset + 4] === 0x01 && buf[offset + 5] === 0x2a) {
      const width = buf.readUInt16LE(offset + 6);
      const height = buf.readUInt16LE(offset + 8);
      return { width, height };
    }
  }
  return null;
}

async function probeLocalImageMeta(absPath) {
  const meta = {
    sizeBytes: null,
    mimeType: guessMimeType(absPath),
    width: null,
    height: null,
  };

  try {
    const st = await fs.stat(absPath);
    meta.sizeBytes = Number(st?.size || 0) || null;
  } catch (e) {
    log('meta', `stat failed for ${absPath}: ${e?.message || e}`);
  }

  try {
    const fh = await fs.open(absPath, 'r');
    try {
      const { buffer, bytesRead } = await fh.read({
        buffer: Buffer.alloc(256 * 1024),
        position: 0,
      });
      const slice = buffer.subarray(0, bytesRead);
      const parsed =
        parsePngSize(slice) ||
        parseGifSize(slice) ||
        parseJpegSize(slice) ||
        parseWebpSize(slice);
      if (parsed) {
        meta.width = parsed.width || null;
        meta.height = parsed.height || null;
      }
    } finally {
      await fh.close().catch(() => {});
    }
  } catch (e) {
    log('meta', `read failed for ${absPath}: ${e?.message || e}`);
  }

  return meta;
}

export async function POST(req) {
  const reqId = crypto.randomUUID().slice(0, 8);

  try {
    const gate = checkGate(req);
    if (!gate.ok) {
      return NextResponse.json({ ok: false, message: gate.message }, { status: gate.status });
    }

    const body = await req.json();
    const {
      url,
      action = 'import',
      targetFolder = '',
      cleanup = true,
      debug = false,
    } = body || {};

    log(reqId, 'POST body', body);

    if (!url || !isDriveUrl(url)) {
      return NextResponse.json({ ok: false, message: 'Invalid Drive URL' }, { status: 400 });
    }

    if (action === 'import' && !targetFolder) {
      throw new Error('Missing targetFolder for import action.');
    }

    const folderId = extractFolderId(url);
    const jobId = crypto.randomUUID();
    const outDir = path.join(process.cwd(), '.tmp/gdrive_public', jobId);

    await fs.mkdir(outDir, { recursive: true });

    const { stdout, stderr } = await runScrap({ url, outDir, reqId });

    const payload = JSON.parse(stdout);
    if (!payload.ok) throw new Error('Scrap failed');

    const uploaded = [];
    const errors = [];
    const uploadsForDb = [];

    for (const rel of payload.items) {
      const absPath = path.join(outDir, rel);

      if (!isLikelyImagePath(absPath)) continue;

      try {
        const mime = guessMimeType(absPath);
        const cfId = joinPath(targetFolder, rel);

        const meta = await probeLocalImageMeta(absPath);
        const direct = await createDirectUploadSafe({ id: cfId });

        await uploadLocalFileToDirectUploadURL({
          uploadURL: direct.uploadURL,
          absPath,
          fileName: path.basename(rel),
          mimeType: mime,
        });

        const finalId = String(direct.id || cfId).trim();
        uploaded.push(finalId);

        uploadsForDb.push({
          cf: { id: finalId },
          sizeBytes: meta.sizeBytes,
          mimeType: meta.mimeType,
          width: meta.width,
          height: meta.height,
        });
      } catch (e) {
        errors.push({ file: rel, error: e.message });
      }
    }

    if (uploadsForDb.length) {
      try {
        await upsertUploadedCfImages({
          uploads: uploadsForDb,
          createdBy: 'gdrive-public',
        });
      } catch (e) {
        log(reqId, 'DB upsert failed', e?.message || e);
      }
    }

    if (cleanup) {
      await fs.rm(outDir, { recursive: true, force: true });
    }

    return NextResponse.json({
      ok: errors.length === 0,
      mode: 'gdown',
      folderId,
      targetFolder,
      downloadedCount: payload.downloadedCount,
      uploadedCount: uploaded.length,
      uploaded,
      errors,
      ...(debug ? { shLogsTail: stderr.slice(-8000) } : {}),
    });
  } catch (err) {
    console.error(`[gdrive-public][${reqId}] ERROR`, err);
    return NextResponse.json(
      { ok: false, message: err.message || 'Import failed' },
      { status: 500 }
    );
  }
}
