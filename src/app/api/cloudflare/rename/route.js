import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkGate } from '../_lib/gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let _pool = null;

function getPool() {
  if (_pool) return _pool;

  const connectionString = process.env.RP_IMOS_HELPER_DATABASE_URL;

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

async function ensureRootTx(client, tableRoots, rootSlug, createdBy = 'cloudflare-ui') {
  const slug = String(rootSlug || 'root').trim() || 'root';

  const q = `
    INSERT INTO ${tableRoots} (root_slug, title, description, created_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (root_slug)
    DO UPDATE SET root_slug = EXCLUDED.root_slug
    RETURNING id
  `;

  const r = await client.query(q, [slug, slug, null, createdBy || null]);
  return r.rows?.[0]?.id || null;
}

function cleanPath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
}

function basename(p) {
  const parts = String(p || '').split('/').filter(Boolean);
  if (!parts.length) return '';
  return parts[parts.length - 1];
}

function splitFilePath(displayPath) {
  const clean = cleanPath(displayPath);
  if (!clean) return { root_slug: 'root', relative_path: '', file_name: '' };
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 1) {
    return { root_slug: 'root', relative_path: parts[0], file_name: parts[0] };
  }
  return {
    root_slug: parts[0],
    relative_path: parts.slice(1).join('/'),
    file_name: parts[parts.length - 1],
  };
}


function splitFolderPath(folderPath) {
  const clean = cleanPath(folderPath);
  if (!clean) return { root_slug: '', relative_prefix: '' };
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 1) return { root_slug: parts[0], relative_prefix: '' };
  return { root_slug: parts[0], relative_prefix: parts.slice(1).join('/') };
}




function makeCfId(rootSlug, relativePath) {
  const rel = String(relativePath || '').trim();
  if (!rel) return rootSlug;
  return `${rootSlug}/${rel}`.replace(/\/{2,}/g, '/');
}

async function cleanupEmptyRoot({ client, tables, rootSlug }) {
  const slug = String(rootSlug || '').trim();
  if (!slug) return;

  const r = await client.query(`SELECT 1 FROM ${tables.images} WHERE root_slug = $1 LIMIT 1`, [slug]);
  if (r.rowCount > 0) return; // still has rows

  await client.query(`DELETE FROM ${tables.roots} WHERE root_slug = $1`, [slug]);
}




async function renameFile({ client, tables, fromPath, toPath, createdBy = 'cloudflare-ui' }) {
  const from = splitFilePath(fromPath);
  const to = splitFilePath(toPath);

  if (!from.relative_path) {
    return { ok: false, status: 400, message: 'Missing source file path.' };
  }
  if (!to.relative_path) {
    return { ok: false, status: 400, message: 'Missing target file path.' };
  }

  const oldCfId = makeCfId(from.root_slug, from.relative_path);
  const newCfId = makeCfId(to.root_slug, to.relative_path);

  const newRootId = await ensureRootTx(client, tables.roots, to.root_slug, createdBy);

  // conflict check
  const conflict = await client.query(
    `SELECT 1 FROM ${tables.images} WHERE cf_image_id = $1 AND cf_image_id <> $2 LIMIT 1`,
    [newCfId, oldCfId]
  );
  if (conflict.rows?.length) {
    return { ok: false, status: 409, message: `Target "${newCfId}" already exists.` };
  }

  const r = await client.query(
    `
    UPDATE ${tables.images}
    SET
      root_id = $1,
      root_slug = $2,
      cf_image_id = $3,
      relative_path = $4,
      file_name = $5
    WHERE root_slug = $6 AND relative_path = $7
    RETURNING cf_image_id
    `,
    [newRootId, to.root_slug, newCfId, to.relative_path, to.file_name, from.root_slug, from.relative_path]
  );

  if (!r.rowCount) {
    return { ok: false, status: 404, message: `File "${fromPath}" not found.` };
  }

  return {
    ok: true,
    kind: 'file',
    from: { path: fromPath, cf_image_id: oldCfId },
    to: { path: toPath, cf_image_id: newCfId },
    cleanupRoot: from.root_slug !== to.root_slug ? from.root_slug : undefined,
  };
}





async function renameFolder({ client, tables, fromPath, toPath, createdBy = 'cloudflare-ui' }) {
  const from = splitFolderPath(fromPath);
  const to = splitFolderPath(toPath);

  if (!from.root_slug) return { ok: false, status: 400, message: 'Missing source folder path.' };
  if (!to.root_slug) return { ok: false, status: 400, message: 'Missing target folder path.' };

  const oldPrefix = from.relative_prefix;
  const newPrefix = to.relative_prefix;
  if (oldPrefix === newPrefix && from.root_slug === to.root_slug) {
    return { ok: true, kind: 'folder', message: 'No-op.' };
  }

  const params = [from.root_slug];
  let whereClause = 'root_slug = $1';

  if (oldPrefix) {
    params.push(oldPrefix, `${oldPrefix}/%`);
    whereClause += ' AND (relative_path = $2 OR relative_path LIKE $3)';
  }

  const rows = await client.query(
    `
    SELECT cf_image_id, relative_path, file_name, upload_status, root_id
    FROM ${tables.images}
    WHERE ${whereClause}
    `,
    params
  );

  if (!rows.rowCount) {
    // Root-level empty folder: rename the root entry directly.
    if (!oldPrefix) {
      const conflict = await client.query(
        `SELECT 1 FROM ${tables.roots} WHERE root_slug = $1 LIMIT 1`,
        [to.root_slug]
      );
      if (conflict.rowCount) {
        return {
          ok: false,
          status: 409,
          message: `Target root "${to.root_slug}" already exists.`,
        };
      }

      const updated = await client.query(
        `
        UPDATE ${tables.roots}
        SET root_slug = $1, title = $1
        WHERE root_slug = $2
        RETURNING id
        `,
        [to.root_slug, from.root_slug]
      );

      if (!updated.rowCount) {
        return { ok: false, status: 404, message: `Folder "${fromPath}" not found.` };
      }

      return {
        ok: true,
        kind: 'folder',
        from: { path: fromPath },
        to: { path: toPath },
        renamed: 0,
        rootRenamed: true,
      };
    }

    // Nested empty folder: create a virtual-folder marker on the fly, then proceed.
    const rootId = await ensureRootTx(client, tables.roots, from.root_slug, createdBy);
    const markerCfId = `__folder__/${makeCfId(from.root_slug, oldPrefix)}`;
    const markerName = basename(oldPrefix);

    await client.query(
      `
      INSERT INTO ${tables.images} (
        root_id,
        cf_image_id,
        root_slug,
        relative_path,
        file_name,
        upload_status,
        cf_uploaded_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (cf_image_id)
      DO NOTHING
      `,
      [rootId, markerCfId, from.root_slug, oldPrefix, markerName, 'virtual-folder', new Date()]
    );

    rows.rows.push({
      cf_image_id: markerCfId,
      relative_path: oldPrefix,
      file_name: markerName,
      upload_status: 'virtual-folder',
      root_id: rootId,
    });
    rows.rowCount = rows.rows.length;
  }

  const newRootId = await ensureRootTx(client, tables.roots, to.root_slug, createdBy);

  // Prepare rename map
  const updates = [];
  for (const row of rows.rows) {
    const rel = String(row.relative_path || '');
    const suffix = oldPrefix ? (rel === oldPrefix ? '' : rel.slice(oldPrefix.length + 1)) : rel;
    const newRel = newPrefix
      ? (suffix ? `${newPrefix}/${suffix}` : newPrefix).replace(/\/{2,}/g, '/')
      : suffix;
    const newName = basename(newRel);
    const isVirtual = row.upload_status === 'virtual-folder' || String(row.cf_image_id || '').startsWith('__folder__/');
    const newCfId = isVirtual ? `__folder__/${makeCfId(to.root_slug, newRel)}` : makeCfId(to.root_slug, newRel);

    updates.push({
      oldCfId: row.cf_image_id,
      newCfId,
      newRel,
      newName,
      newRootId,
    });
  }

  // conflict check for new cf ids
  const newIds = updates.map((u) => u.newCfId);
  const oldIds = updates.map((u) => u.oldCfId);
  const conflicts = await client.query(
    `SELECT cf_image_id FROM ${tables.images} WHERE cf_image_id = ANY($1::text[]) AND cf_image_id <> ALL($2::text[])`,
    [newIds, oldIds]
  );
  if (conflicts.rowCount) {
    return { ok: false, status: 409, message: `Target path already exists: ${conflicts.rows[0].cf_image_id}` };
  }

  // apply updates
  for (const u of updates) {
    await client.query(
      `
      UPDATE ${tables.images}
      SET root_id = $1, root_slug = $2, cf_image_id = $3, relative_path = $4, file_name = $5
      WHERE cf_image_id = $6
      `,
      [u.newRootId, to.root_slug, u.newCfId, u.newRel, u.newName, u.oldCfId]
    );
  }

  return {
    ok: true,
    kind: 'folder',
    from: { path: fromPath },
    to: { path: toPath },
    renamed: updates.length,
    cleanupRoot: from.root_slug !== to.root_slug ? from.root_slug : undefined,
  };
}




export async function POST(req) {
  try {
    const gate = checkGate(req);
    if (!gate.ok) {
      return NextResponse.json({ ok: false, message: gate.message }, { status: gate.status });
    }

  const body = await req.json().catch(() => ({}));
  const typeRaw = String(body.type || 'auto').toLowerCase();
  const from = cleanPath(body.from || body.path || body.source || '');
  const to = cleanPath(body.to || body.target || body.dest || '');
  const createdBy = body.createdBy || 'cloudflare-ui';

    if (!from || !to) {
      return NextResponse.json({ ok: false, message: 'Missing "from" and "to" paths.' }, { status: 400 });
    }

    const isFolder =
      typeRaw === 'folder' ||
      (typeRaw === 'auto' &&
        !/\.[a-z0-9]{1,6}$/i.test(basename(from)) &&
        !/\.[a-z0-9]{1,6}$/i.test(basename(to)));

    const T_IMAGES = safeIdent(process.env.CF_DB_IMAGES_TABLE, 'media_assets');
    const T_ROOTS = safeIdent(process.env.CF_DB_ROOTS_TABLE, 'media_roots');

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = isFolder
        ? await renameFolder({
            client,
            tables: { images: T_IMAGES, roots: T_ROOTS },
            fromPath: from,
            toPath: to,
            createdBy,
          })
        : await renameFile({
            client,
            tables: { images: T_IMAGES, roots: T_ROOTS },
            fromPath: from,
            toPath: to,
            createdBy,
          });

      if (!result.ok) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { ok: false, message: result.message || 'Rename failed.' },
          { status: result.status || 400 }
        );
      }

      if (result.cleanupRoot) {
        try {
          await cleanupEmptyRoot({ client, tables: { images: T_IMAGES, roots: T_ROOTS }, rootSlug: result.cleanupRoot });
        } catch {}
      }

      await client.query('COMMIT');
      return NextResponse.json(result);
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {}
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'Rename failed.' },
      { status: 500 }
    );
  }
}
