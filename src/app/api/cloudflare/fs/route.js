// src/app/api/cloudflare/fs/route.js
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { listImagesV2All } from '../_lib/cf';
import {
  upsertUploadedCfImages,
  listDbAssetsForTable,
  listDbVirtualFoldersForFs,
} from '../_lib/db';
import { checkGate } from '../_lib/gate';

const CF_DEBUG =
  String(process.env.CF_DEBUG || '').trim() === '1' ||
  String(process.env.DEBUG_CF || '').trim() === '1';

function dbg(...args) {
  if (CF_DEBUG) console.log('[cloudflare-fs]', ...args);
}

function cleanPrefix(p) {
  return String(p || '').replace(/^\/+|\/+$/g, '');
}

// Collapse the old-bug pattern "name/name" into "name" FOR DISPLAY ONLY
function normalizeDisplayPath(cfId) {
  const clean = String(cfId || '').replace(/^\/+|\/+$/g, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 2 && parts[0] === parts[1]) return parts[1];
  return clean;
}

function addFolderNodes(map, path) {
  const parts = String(path || '').split('/').filter(Boolean);
  if (parts.length <= 1) return;

  for (let i = 1; i < parts.length; i++) {
    const folderPath = parts.slice(0, i).join('/');
    const id = `folder:${folderPath}`;
    if (!map.has(id)) {
      map.set(id, { id, path: folderPath, type: 'folder' });
    }
  }
}

function safeIdent(name, fallback) {
  const n = String(name || fallback || '').trim();
  if (!/^[a-zA-Z0-9_.]+$/.test(n)) throw new Error(`Invalid SQL identifier: "${n}"`);
  return n;
}

function getRootPool() {
  const connectionString =
    process.env.RP_IMOS_HELPER_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PG_CONNECTION_STRING;
  if (!connectionString) return null;
  const g = globalThis;
  if (g.__CF_FS_ROOT_POOL__) return g.__CF_FS_ROOT_POOL__;
  const p = new Pool({ connectionString });
  g.__CF_FS_ROOT_POOL__ = p;
  return p;
}

export async function GET(req) {
  try {
    const gate = checkGate(req);
    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, message: gate.message },
        { status: gate.status }
      );
    }

    const u = new URL(req.url);
    const prefix = cleanPrefix(u.searchParams.get('prefix') || '');
    const rootSlug = prefix ? prefix.split('/').filter(Boolean)[0] || '' : '';
    const relPrefix = rootSlug
      ? prefix.replace(new RegExp(`^${rootSlug}/?`), '')
      : '';

    const images = await listImagesV2All();
    dbg('listImagesV2All', { count: images.length, prefix });

    // Optional prefix filter (virtual folders)
    const filtered = prefix
      ? images.filter((img) => {
          const id = String(img?.id || '');
          return id === prefix || id.startsWith(prefix + '/');
        })
      : images;

    const map = new Map();

    // ✅ NEW: merge virtual folders from DB (roots + markers)
    // This does NOT impact the existing Cloudflare listing; it only adds folder nodes.
    try {
      const dbFoldersRes = await listDbVirtualFoldersForFs({
        rootSlug: rootSlug || '', // '' => all roots
        prefix: relPrefix || '', // relative inside root
      });

      if (dbFoldersRes?.ok && Array.isArray(dbFoldersRes.folders)) {
        for (const folderPath of dbFoldersRes.folders) {
          const p = cleanPrefix(folderPath);
          if (!p) continue;

          // ensure parent folders exist too
          addFolderNodes(map, p);

          const id = `folder:${p}`;
          if (!map.has(id)) {
            map.set(id, { id, path: p, type: 'folder' });
          }
        }
      }
    } catch (e) {
      console.error(
        '[cloudflare-fs] DB virtual folders fetch failed:',
        e?.message || e
      );
    }

    // Optional: merge size/mime/width/height/timestamps from DB if available
    const rootMeta = new Map(); // root_slug -> { createdAt }
    const dbMeta = new Map();
    const metaWarnings = [];

    const collectDbMetaForRoot = async (root, prefixInsideRoot = '') => {
      try {
        const dbRes = await listDbAssetsForTable({
          rootSlug: root,
          prefix: prefixInsideRoot,
          deep: true,
          includeFolders: false,
        });
        if (dbRes?.ok && Array.isArray(dbRes.items)) {
          for (const it of dbRes.items) {
            const id = String(
              it.cfImageId || it.cf_image_id || it.path || it.id || ''
            ).trim();
            if (!id) continue;
            dbMeta.set(id, it);
          }
        } else if (dbRes && dbRes.message) {
          metaWarnings.push(dbRes.message);
        }
      } catch (e) {
        const msg = e?.message || 'DB meta fetch failed';
        console.error('[cloudflare-fs] DB meta fetch failed:', msg);
        metaWarnings.push(msg);
      }
    };

    if (rootSlug) {
      await collectDbMetaForRoot(rootSlug, relPrefix);
    } else {
      // No prefix specified: fetch meta per root in the filtered set (best-effort)
      const roots = new Set(
        filtered
          .map((img) => {
            const id = String(img?.id || '').trim();
            return id.split('/').filter(Boolean)[0] || '';
          })
          .filter(Boolean)
      );
      for (const r of roots) {
        await collectDbMetaForRoot(r, '');
      }

      // Fetch root created_at for all detected roots (best effort)
      const pool = getRootPool();
      if (pool && roots.size) {
        const T_ROOTS = safeIdent(process.env.CF_DB_ROOTS_TABLE, 'media_roots');
        const resRoots = await pool.query(
          `SELECT root_slug, created_at FROM ${T_ROOTS} WHERE root_slug = ANY($1::text[])`,
          [Array.from(roots)]
        );
        for (const row of resRoots.rows || []) {
          const slug = String(row.root_slug || '').trim();
          if (!slug) continue;
          rootMeta.set(slug, { createdAt: row.created_at ? new Date(row.created_at).toISOString() : null });
        }
      }
    }

    for (const img of filtered) {
      const cfId = String(img?.id || '').trim();
      if (!cfId) continue;

      const displayPath = normalizeDisplayPath(cfId);
      const db = dbMeta.get(cfId);

      addFolderNodes(map, displayPath);

      // File item: keep original CF id in "id", use displayPath for navigation
      map.set(cfId, {
        id: cfId,
        path: displayPath,
        type: 'file',
        sizeBytes: db?.sizeBytes ?? db?.size_bytes ?? null,
        mimeType: db?.mimeType ?? db?.mime_type ?? null,
        width: db?.width ?? null,
        height: db?.height ?? null,
        cfUploadedAt: db?.cfUploadedAt || db?.cf_uploaded_at || null,
        createdAt: db?.createdAt || db?.created_at || null,
        uploadStatus: db?.uploadStatus || db?.upload_status || null,
      });
    }

    const items = Array.from(map.values()).map((it) => {
      if (it.type === 'folder') {
        const root = String(it.path || '').split('/').filter(Boolean)[0] || '';
        const meta = rootMeta.get(root);
        return {
          ...it,
          createdAt: meta?.createdAt || null,
        };
      }
      return it;
    }).sort((a, b) => {
      if (a.type === b.type) return a.path.localeCompare(b.path);
      return a.type === 'folder' ? -1 : 1;
    });

    // ✅ DB sync here (so you get inserts without touching client code)
    // If DB fails, FS still works.
    try {
      if (filtered.length) {
        const uploads = filtered.map((img) => ({ cf: img })); // size/mime unknown here -> NULLs
        const r = await upsertUploadedCfImages({
          uploads,
          createdBy: 'cloudflare-fs-sync',
          skipIfNoMetadata: true, // do not insert/update when CF gives no meta
        });
        dbg('db sync result', r);
      }
    } catch (e) {
      console.error('[cloudflare-fs] DB sync failed:', e?.message || e);
    }

    return NextResponse.json({ ok: true, items, warnings: metaWarnings.length ? metaWarnings : undefined });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'Failed to list Cloudflare FS.' },
      { status: 500 }
    );
  }
}

// POST: trigger Cloudflare -> DB sync (no items payload)
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
    const prefix = cleanPrefix(body.prefix || '');

    const images = await listImagesV2All();
    const filtered = prefix
      ? images.filter((img) => {
          const id = String(img?.id || '');
          return id === prefix || id.startsWith(prefix + '/');
        })
      : images;

    let synced = 0;
    if (filtered.length) {
      const res = await upsertUploadedCfImages({
        uploads: filtered.map((img) => ({ cf: img })),
        createdBy: 'cloudflare-fs-sync-manual',
      });
      synced = res?.count ?? filtered.length;
      dbg('manual sync', { synced, filtered: filtered.length, prefix });
    }

    return NextResponse.json({ ok: true, synced, count: filtered.length, prefix });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'Failed to sync Cloudflare assets.' },
      { status: 500 }
    );
  }
}
