import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { deleteImageV1, listImagesV2All } from '../_lib/cf';
import { checkGate } from '../_lib/gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function normPath(p) {
  return String(p || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/')
    .trim();
}

function splitFileDisplayPath(displayPath) {
  // "Marketing/2023/a.jpg" -> root_slug="Marketing", relative_path="2023/a.jpg"
  // "logo.png"            -> root_slug="root",      relative_path="logo.png"
  const clean = normPath(displayPath);
  if (!clean) return { root_slug: 'root', relative_path: '' };

  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 1) return { root_slug: 'root', relative_path: parts[0] };
  return { root_slug: parts[0], relative_path: parts.slice(1).join('/') };
}

function splitFolderDisplayPath(folderPath) {
  // Folder semantics differ from file semantics:
  // "Marketing"      -> root_slug="Marketing", relative_prefix=""
  // "Marketing/2023" -> root_slug="Marketing", relative_prefix="2023"
  const clean = normPath(folderPath);
  if (!clean) return { root_slug: '', relative_prefix: '' };

  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 1) return { root_slug: parts[0], relative_prefix: '' };
  return { root_slug: parts[0], relative_prefix: parts.slice(1).join('/') };
}

function isNotFound(err) {
  const m = String(err?.message || '').toLowerCase();
  return m.includes('not found') || m.includes('does not exist') || m.includes('404');
}

async function dbFindByExactPath(client, T_IMAGES, displayPath) {
  const { root_slug, relative_path } = splitFileDisplayPath(displayPath);
  if (!relative_path) return null;

  const q = `
    SELECT cf_image_id, root_slug, relative_path
    FROM ${T_IMAGES}
    WHERE root_slug = $1 AND relative_path = $2
    LIMIT 1
  `;
  const r = await client.query(q, [root_slug, relative_path]);
  return r.rows?.[0] || null;
}

async function dbListByFolderPrefix(client, T_IMAGES, folderPath) {
  const { root_slug, relative_prefix } = splitFolderDisplayPath(folderPath);
  if (!root_slug) return [];

  const like = relative_prefix ? `${relative_prefix}/%` : `%`;

  const q = `
    SELECT cf_image_id, root_slug, relative_path
    FROM ${T_IMAGES}
    WHERE root_slug = $1 AND relative_path LIKE $2
  `;
  const r = await client.query(q, [root_slug, like]);
  return r.rows || [];
}

async function dbDeleteByCfIds(client, T_IMAGES, cfIds) {
  if (!cfIds.length) return 0;
  const q = `DELETE FROM ${T_IMAGES} WHERE cf_image_id = ANY($1::text[])`;
  const r = await client.query(q, [cfIds]);
  return r.rowCount || 0;
}


export async function DELETE(req) {
  try {
    const gate = checkGate(req);
    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, message: gate.message },
        { status: gate.status }
      );
    }

    const body = await req.json().catch(() => ({}));

    const type = String(body?.type || 'auto'); // "file" | "folder" | "auto"
    const id = String(body?.id || '').trim(); // prefer file delete by cf id
    const path = normPath(body?.path || '');
    const dryRun = Boolean(body?.dryRun);

    const T_IMAGES = safeIdent(process.env.CF_DB_IMAGES_TABLE, 'media_assets');

    if (!id && !path) {
      return NextResponse.json({ ok: false, message: 'Missing id or path.' }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      // Decide target kind
      const looksLikeFile =
        type === 'file' ||
        (type === 'auto' && (id || /\.[a-z0-9]{1,6}$/i.test(path)));

      if (looksLikeFile) {
        // ---- FILE DELETE ----
        let cfId = id;

        // If caller didn’t provide id, map via DB using display path
        if (!cfId && path) {
          const row = await dbFindByExactPath(client, T_IMAGES, path);
          cfId = row?.cf_image_id || '';
        }

        if (!cfId) {
          return NextResponse.json(
            { ok: false, message: 'Could not resolve file cf_image_id (provide id or valid file path).' },
            { status: 400 }
          );
        }

        if (dryRun) {
          return NextResponse.json({ ok: true, dryRun: true, type: 'file', cf_image_id: cfId });
        }

        // 1) Cloudflare delete (idempotent: if not found => treat as ok)
        try {
          await deleteImageV1(cfId);
        } catch (e) {
          if (!isNotFound(e)) throw e;
        }

        // 2) DB delete
        const dbDeleted = await dbDeleteByCfIds(client, T_IMAGES, [cfId]);

        return NextResponse.json({
          ok: true,
          type: 'file',
          deleted: { cloudflare: 1, db: dbDeleted },
          cf_image_id: cfId,
        });
      }

      // ---- FOLDER DELETE ----
      if (!path) {
        return NextResponse.json({ ok: false, message: 'Missing folder path.' }, { status: 400 });
      }

      // Guard: never delete “everything” accidentally
      if (path === '' || path === '/') {
        return NextResponse.json({ ok: false, message: 'Refusing to delete root.' }, { status: 400 });
      }

      // 0) Get list of targets primarily from DB
      let rows = await dbListByFolderPrefix(client, T_IMAGES, path);

      // Fallback (if DB empty): list from CF by prefix (and handle old bug root/root)
      if (!rows.length) {
        const { root_slug, relative_prefix } = splitFolderDisplayPath(path);
        const prefixA = relative_prefix ? `${root_slug}/${relative_prefix}` : root_slug;
        const prefixB = relative_prefix
          ? `${root_slug}/${root_slug}/${relative_prefix}`
          : `${root_slug}/${root_slug}`;

        const images = await listImagesV2All();
        const targets = images
          .map((img) => String(img?.id || '').trim())
          .filter(Boolean)
          .filter((cid) => cid === prefixA || cid.startsWith(prefixA + '/') || cid === prefixB || cid.startsWith(prefixB + '/'));

        rows = targets.map((cid) => ({ cf_image_id: cid, root_slug: root_slug, relative_path: '' }));
      }

      if (!rows.length) {
        return NextResponse.json({ ok: true, type: 'folder', message: 'Nothing matched.' });
      }

      const cfIds = Array.from(new Set(rows.map((r) => String(r.cf_image_id || '').trim()).filter(Boolean)));

      if (dryRun) {
        return NextResponse.json({
          ok: true,
          dryRun: true,
          type: 'folder',
          path,
          matched: cfIds.length,
          sample: cfIds.slice(0, 10),
        });
      }

      // 1) Cloudflare delete all
      const failed = [];
      const succeeded = [];

      // small concurrency window
      const CONC = 5;
      for (let i = 0; i < cfIds.length; i += CONC) {
        const batch = cfIds.slice(i, i + CONC);

        const settled = await Promise.allSettled(
          batch.map(async (cid) => {
            try {
              await deleteImageV1(cid);
              return { ok: true, cid };
            } catch (e) {
              if (isNotFound(e)) return { ok: true, cid }; // idempotent
              return { ok: false, cid, error: e?.message || String(e) };
            }
          })
        );

        for (const s of settled) {
          const v = s.status === 'fulfilled' ? s.value : { ok: false, cid: '', error: s.reason?.message };
          if (v.ok) succeeded.push(v.cid);
          else failed.push({ cf_image_id: v.cid, error: v.error || 'Delete failed' });
        }
      }

      // 2) DB delete succeeded only (if DB has those rows)
      const dbDeleted = await dbDeleteByCfIds(client, T_IMAGES, succeeded);

      return NextResponse.json({
        ok: failed.length === 0,
        type: 'folder',
        path,
        matched: cfIds.length,
        deleted: { cloudflare: succeeded.length, db: dbDeleted },
        failed,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'Delete failed.' },
      { status: 500 }
    );
  }
}
