// src/app/api/cloudflare/_lib/db.js
import { Pool } from 'pg';

let _pool = null;

const CF_DEBUG =
  String(process.env.CF_DEBUG || '').trim() === '1' ||
  String(process.env.DEBUG_CF || '').trim() === '1';

function dbg(...args) {
  if (CF_DEBUG) console.log('[cf-db]', ...args);
}

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

  // small safe log
  try {
    const u = new URL(connectionString);
    dbg('connecting', {
      host: u.hostname,
      port: u.port,
      db: u.pathname?.replace('/', ''),
      user: u.username,
    });
  } catch {}

  _pool = new Pool({ connectionString });
  return _pool;
}

function safeIdent(name, fallback) {
  const n = String(name || fallback || '').trim();
  if (!/^[a-zA-Z0-9_.]+$/.test(n)) throw new Error(`Invalid SQL identifier: "${n}"`);
  return n;
}

// Old-bug pattern: "name/name" => use "name" for path split (but keep cf_image_id original)
function normalizeDisplayPath(cfId) {
  const clean = String(cfId || '').replace(/^\/+|\/+$/g, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 2 && parts[0] === parts[1]) return parts[1];
  return clean;
}

// displayPath: "Marketing/2023/a.jpg" -> root_slug="Marketing", relative_path="2023/a.jpg", file_name="a.jpg"
// displayPath: "logo.png" -> root_slug="root", relative_path="logo.png", file_name="logo.png"
function splitCfPath(displayPath) {
  const clean = String(displayPath || '').replace(/^\/+|\/+$/g, '');
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

async function ensureRootTx(client, tableRoots, rootSlug, createdBy) {
  const slug = String(rootSlug || 'root').trim() || 'root';

  const q = `
    INSERT INTO ${tableRoots} (root_slug, title, description, created_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (root_slug)
    DO UPDATE SET root_slug = EXCLUDED.root_slug
    RETURNING id
  `;
  const r = await client.query(q, [slug, slug, null, createdBy || null]);
  return r.rows?.[0]?.id;
}

/**
 * Upsert uploaded images AFTER Cloudflare has stored them.
 * NOTE: FS-sync passes only {cf: image} so size/mime may be NULL (fine for now).
 *
 * Requires:
 *  - UNIQUE(root_slug) on media_roots
 *  - UNIQUE(cf_image_id) on media_assets
 */
export async function upsertUploadedCfImages({
  uploads = [],
  createdBy = 'cloudflare-ui',
  skipIfNoMetadata = false,
} = {}) {
  if (!Array.isArray(uploads) || uploads.length === 0) return { ok: true, count: 0 };

  // ✅ your table names
  const T_ROOTS = safeIdent(process.env.CF_DB_ROOTS_TABLE, 'media_roots');
  const T_IMAGES = safeIdent(process.env.CF_DB_IMAGES_TABLE, 'media_assets');

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let count = 0;
    let skipped = 0;

    for (const u of uploads) {
    const cf = u?.cf || {};
    const cf_image_id = String(cf?.id || '').trim();
    if (!cf_image_id) continue;

      // Use normalized display path to compute root/relative (but keep cf_image_id original)
      const displayPath = normalizeDisplayPath(cf_image_id);
      const { root_slug, relative_path, file_name } = splitCfPath(displayPath);

      const root_id = await ensureRootTx(client, T_ROOTS, root_slug, createdBy);

    const size_bytes_raw = u?.sizeBytes ?? u?.size_bytes;
    const size_bytes = Number.isFinite(Number(size_bytes_raw))
      ? Number(size_bytes_raw)
      : null;
    const mime_type = String(u?.mimeType || u?.mime_type || '').trim() || null;

    const width = u?.width != null ? Number(u.width) : null;
    const height = u?.height != null ? Number(u.height) : null;

    if (skipIfNoMetadata && size_bytes == null && mime_type == null && width == null && height == null) {
      skipped += 1;
      continue;
    }

      const cf_uploaded_at = cf?.uploaded ? new Date(cf.uploaded) : new Date();

      const q = `
        INSERT INTO ${T_IMAGES} (
          root_id,
          cf_image_id,
          root_slug,
          relative_path,
          file_name,
          size_bytes,
          mime_type,
          upload_status,
          width,
          height,
          cf_uploaded_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (cf_image_id)
        DO UPDATE SET
          root_id = EXCLUDED.root_id,
          root_slug = EXCLUDED.root_slug,
          relative_path = EXCLUDED.relative_path,
          file_name = EXCLUDED.file_name,
          size_bytes = COALESCE(EXCLUDED.size_bytes, ${T_IMAGES}.size_bytes),
          mime_type = COALESCE(EXCLUDED.mime_type, ${T_IMAGES}.mime_type),
          width = COALESCE(EXCLUDED.width, ${T_IMAGES}.width),
          height = COALESCE(EXCLUDED.height, ${T_IMAGES}.height),
          upload_status = 'uploaded',
          cf_uploaded_at = EXCLUDED.cf_uploaded_at
        RETURNING cf_image_id
      `;

      await client.query(q, [
        root_id,
        cf_image_id,
        root_slug,
        relative_path,
        file_name,
        size_bytes,
        mime_type,
        'uploaded',
        width,
        height,
        cf_uploaded_at,
      ]);

      count += 1;
    }

    await client.query('COMMIT');
    if (skipIfNoMetadata && skipped > 0) {
      console.warn(
        '[cf][db] upsertUploadedCfImages skipped',
        skipped,
        'rows with no metadata (size/mime/width/height).'
      );
    }
    dbg('upsertUploadedCfImages done', { count, skipped });
    return { ok: true, count };
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

// --- NEW: list assets for DataGrid (DB-only) + virtual folders -------------

function cleanPath(s) {
  return String(s || '').replace(/^\/+|\/+$/g, '').trim();
}

function basename(p) {
  const parts = String(p || '').split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function dirname(p) {
  const s = String(p || '').replace(/\/+$/g, '');
  const i = s.lastIndexOf('/');
  return i === -1 ? '' : s.slice(0, i);
}

function inferMimeFromName(name) {
  const n = String(name || '').toLowerCase();
  const ext = n.includes('.') ? n.split('.').pop() : '';
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
  return map[ext] || null;
}

function inferResolutionCategory(bytes) {
  const b = Number(bytes);
  if (!Number.isFinite(b) || b <= 0) return null;
  if (b >= 3 * 1024 * 1024) return 'high';
  if (b >= 500 * 1024) return 'web';
  return 'low';
}

/**
 * ✅ NEW FEATURE:
 * Create an empty (virtual) folder in DB only (no Cloudflare).
 *
 * Storage strategy (no schema change):
 * - Root-level folder: ensure row exists in media_roots.
 * - Nested folders: create marker rows in media_assets:
 *     cf_image_id = "__folder__/root/sub/path"
 *     upload_status = "virtual-folder"
 *
 * This prevents collisions with real cf ids and lets /fs include empty folders.
 */
export async function createVirtualFolderPath({
  path,
  createdBy = 'cloudflare-ui',
} = {}) {
  const clean = String(path || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/');

  if (!clean) throw new Error('Missing folder path');

  const parts = clean.split('/').filter(Boolean);
  if (!parts.length) throw new Error('Invalid folder path');

  const root_slug = parts[0];

  const T_ROOTS = safeIdent(process.env.CF_DB_ROOTS_TABLE, 'media_roots');
  const T_IMAGES = safeIdent(process.env.CF_DB_IMAGES_TABLE, 'media_assets');

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const root_id = await ensureRootTx(client, T_ROOTS, root_slug, createdBy);

    // Root-only folder => done (this is an "empty folder root")
    if (parts.length === 1) {
      await client.query('COMMIT');
      return { ok: true, kind: 'root', root_id, root_slug, path: clean };
    }

    // Create markers for each nested level: root/a, root/a/b, root/a/b/c ...
    const inserted = [];
    const relParts = parts.slice(1);

    for (let i = 1; i <= relParts.length; i++) {
      const rel = relParts.slice(0, i).join('/');       // "a" then "a/b" ...
      const fullFolderPath = `${root_slug}/${rel}`;     // "root/a/b"
      const marker_cf_image_id = `__folder__/${fullFolderPath}`;

      const relative_path = rel;                        // inside the root
      const file_name = basename(rel);                  // last segment

      const q = `
        INSERT INTO ${T_IMAGES} (
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
        DO UPDATE SET
          root_id = EXCLUDED.root_id,
          root_slug = EXCLUDED.root_slug,
          relative_path = EXCLUDED.relative_path,
          file_name = EXCLUDED.file_name,
          upload_status = EXCLUDED.upload_status,
          cf_uploaded_at = EXCLUDED.cf_uploaded_at
        RETURNING cf_image_id
      `;

      const r = await client.query(q, [
        root_id,
        marker_cf_image_id,
        root_slug,
        relative_path,
        file_name,
        'virtual-folder',
        new Date(),
      ]);

      inserted.push({
        cf_image_id: r.rows?.[0]?.cf_image_id || marker_cf_image_id,
        path: fullFolderPath,
        relative_path,
      });
    }

    await client.query('COMMIT');

    return {
      ok: true,
      kind: 'folder',
      root_id,
      root_slug,
      path: clean,
      created: inserted.length,
      inserted,
    };
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * DB-first listing for DataGrid.
 *
 * Params:
 * - rootSlug (required)
 * - prefix (relative inside root; ex: "EG" or "child_0/Child.0.0")
 * - deep=true  => return all descendant files (previous behavior)
 * - deep=false => return only direct children (files + folders)
 * - includeFolders=false => keep previous behavior (only files)
 */






export async function listDbAssetsForTable({
  rootSlug,
  prefix = '',
  limit = 5000,
  deep = true,
  includeFolders = false,
} = {}) {
  const root = String(rootSlug || '').trim();
  if (!root) throw new Error('Missing rootSlug');

  const pref = cleanPath(prefix);
  const base = pref ? pref + '/' : '';

  const T_ROOTS = safeIdent(process.env.CF_DB_ROOTS_TABLE, 'media_roots');
  const T_IMAGES = safeIdent(process.env.CF_DB_IMAGES_TABLE, 'media_assets');

  const pool = getPool();
  const client = await pool.connect();

  try {
    // Optional root validation
    const r0 = await client.query(
      `SELECT id FROM ${T_ROOTS} WHERE root_slug = $1 LIMIT 1`,
      [root]
    );
    const rootExists = (r0.rows?.length || 0) > 0;

    const where = [];
    const args = [root];
    let idx = 2;

    if (pref) {
      // exact file match OR subtree
      where.push(`(relative_path = $${idx} OR relative_path LIKE $${idx + 1})`);
      args.push(pref);
      args.push(`${pref}/%`);
      idx += 2;
    }

    const whereSql = where.length ? `AND ${where.join(' AND ')}` : '';

    const q = `
      SELECT
        id,
        root_id,
        cf_image_id,
        root_slug,
        relative_path,
        file_name,
        size_bytes,
        mime_type,
        upload_status,
        width,
        height,
        cf_uploaded_at,
        created_at
      FROM ${T_IMAGES}
      WHERE root_slug = $1
      ${whereSql}
      ORDER BY relative_path ASC
      LIMIT ${Math.max(1, Math.min(Number(limit) || 5000, 20000))}
    `;

    const r = await client.query(q, args);

    const warnings = [];
    if (!rootExists) warnings.push(`root_slug "${root}" not found in media_roots (returning assets anyway).`);

    // ✅ Skip virtual-folder markers (new feature should NOT pollute DataGrid)
    const rows = (r.rows || []).filter((row) => {
      const status = String(row.upload_status || '').trim();
      const cfId = String(row.cf_image_id || '').trim();
      if (status === 'virtual-folder') return false;
      if (cfId.startsWith('__folder__/')) return false;
      return true;
    });

    // ---- FILE ROWS (previous behavior preserved) --------------------------
    const missing = {
      cf_image_id: 0,
      file_name: 0,
      mime_type: 0,
      size_bytes: 0,
      width_height: 0,
      relative_path: 0,
    };

    const allFileRows = rows
      .map((row) => {
        let cfImageId = String(row.cf_image_id || '').trim();
        const rootSlugRow = String(row.root_slug || root).trim() || root;

        let relativePath = String(row.relative_path || '').trim();
        let fileName = String(row.file_name || '').trim();

        if (!cfImageId) {
          missing.cf_image_id += 1;
          if (relativePath) cfImageId = `${rootSlugRow}/${relativePath}`.replace(/\/{2,}/g, '/');
        }

        if (!relativePath) {
          missing.relative_path += 1;
          if (cfImageId && cfImageId.startsWith(rootSlugRow + '/')) {
            relativePath = cfImageId.slice(rootSlugRow.length + 1);
          }
        }

        if (!fileName) {
          missing.file_name += 1;
          fileName = basename(relativePath) || basename(cfImageId) || 'unknown';
        }

        let sizeBytes = row.size_bytes;
        sizeBytes = Number.isFinite(Number(sizeBytes)) ? Number(sizeBytes) : null;
        if (sizeBytes == null) missing.size_bytes += 1;

        let mimeType = String(row.mime_type || '').trim() || null;
        if (!mimeType) {
          missing.mime_type += 1;
          mimeType = inferMimeFromName(fileName);
        }

        const width = row.width != null && Number.isFinite(Number(row.width)) ? Number(row.width) : null;
        const height = row.height != null && Number.isFinite(Number(row.height)) ? Number(row.height) : null;
        if (width == null || height == null) missing.width_height += 1;

        const ext = (fileName.includes('.') ? fileName.split('.').pop() : '').toLowerCase();

        const fullPath = (cfImageId || `${rootSlugRow}/${relativePath}`).replace(/\/{2,}/g, '/');

        return {
          id: fullPath || String(row.id), // DataGrid requires id
          type: 'file',

          // handy for UI parity with selector
          path: fullPath,

          name: fileName,
          fileName,
          rootSlug: rootSlugRow,
          relativePath,
          parentPath: `${rootSlugRow}/${pref ? pref + '/' : ''}`.replace(/\/{2,}/g, '/'),

          dbId: row.id,
          rootId: row.root_id,
          cfImageId: cfImageId || null,

          sizeBytes,
          mimeType,
          width,
          height,
          extension: ext,
          resolutionCategory: inferResolutionCategory(sizeBytes),
          uploadStatus: String(row.upload_status || '').trim() || null,

          cfUploadedAt: row.cf_uploaded_at ? new Date(row.cf_uploaded_at).toISOString() : null,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        };
      })
      .filter((x) => Boolean(x.id));

    // deep=false => only direct children files (plus folders will represent deeper paths)
    const fileRows = deep
      ? allFileRows
      : allFileRows.filter((fr) => {
          const rel = String(fr.relativePath || '');
          if (!pref) return !rel.includes('/'); // root-level direct files
          if (rel === pref) return true; // exact file match
          if (!rel.startsWith(base)) return false;
          const rest = rel.slice(base.length);
          return rest.length > 0 && !rest.includes('/');
        });

    // ---- VIRTUAL FOLDERS (derived from file relative paths) ----------------
    let folderRows = [];
    if (includeFolders) {
      const folderMap = new Map(); // key = folderRel
      const addFolder = (folderRel) => {
        const rel = cleanPath(folderRel);
        if (!rel) return;
        if (rel === pref) return; // don't list the current folder itself
        if (folderMap.has(rel)) return;

        const name = basename(rel);
        const parentRel = dirname(rel);

        const full = `${root}/${rel}`.replace(/\/{2,}/g, '/');

        folderMap.set(rel, {
          id: `${full}/`, // trailing slash to avoid collision with files
          type: 'folder',
          path: full, // no trailing slash (nice for reuse)

          name,
          fileName: null,
          rootSlug: root,
          relativePath: rel,
          parentPath: `${root}/${parentRel ? parentRel + '/' : ''}`.replace(/\/{2,}/g, '/'),

          // folder meta (optional)
          childCount: 0,
          childBytes: 0,

          sizeBytes: null,
          mimeType: null,
          width: null,
          height: null,
          extension: '',
          resolutionCategory: null,
          uploadStatus: null,
          cfUploadedAt: null,
          createdAt: null,
        });
      };

      // For deep=false: build only direct child folders under prefix
      if (!deep) {
        for (const fr of allFileRows) {
          const rel = String(fr.relativePath || '');
          if (pref && !rel.startsWith(base) && rel !== pref) continue;

          const rest = pref ? (rel === pref ? '' : rel.slice(base.length)) : rel;
          if (!rest) continue;

          const firstSeg = rest.split('/').filter(Boolean)[0];
          if (!firstSeg) continue;

          // if rest has "/" => it’s in a subfolder => we should show that folder
          if (rest.includes('/')) {
            const folderRel = pref ? `${pref}/${firstSeg}` : firstSeg;
            addFolder(folderRel);
          }
        }

        // count children for direct folders
        for (const fr of allFileRows) {
          const rel = String(fr.relativePath || '');
          for (const [folderRel, folderRow] of folderMap) {
            const folderBase = folderRel + '/';
            if (rel.startsWith(folderBase)) {
              folderRow.childCount += 1;
              folderRow.childBytes += Number(fr.sizeBytes || 0);
            }
          }
        }
      } else {
        // deep=true: include all intermediate folders under prefix
        for (const fr of allFileRows) {
          const rel = String(fr.relativePath || '');
          if (pref && !rel.startsWith(base) && rel !== pref) continue;

          const folderRel = dirname(rel);
          if (!folderRel) continue;

          // add all ancestors under root
          const parts = folderRel.split('/').filter(Boolean);
          let acc = '';
          for (const part of parts) {
            acc = acc ? `${acc}/${part}` : part;
            // if pref exists, only list folders inside pref subtree
            if (pref && (acc === pref || !acc.startsWith(pref + '/'))) continue;
            addFolder(acc);
          }
        }

        // child stats (all descendants)
        for (const fr of allFileRows) {
          const rel = String(fr.relativePath || '');
          for (const [folderRel, folderRow] of folderMap) {
            if (rel.startsWith(folderRel + '/')) {
              folderRow.childCount += 1;
              folderRow.childBytes += Number(fr.sizeBytes || 0);
            }
          }
        }
      }

      folderRows = Array.from(folderMap.values());
    }

    // warnings summary
    const missingSummary = Object.entries(missing)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k} missing: ${n}`);

    if (missingSummary.length) {
      warnings.push(`Some fields were missing and filled with fallbacks: ${missingSummary.join(', ')}`);
    }

    // final merge: folders first, then files
    const items = [...folderRows, ...fileRows].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    return {
      ok: true,
      source: 'db',
      rootSlug: root,
      prefix: pref,
      deep: Boolean(deep),
      includeFolders: Boolean(includeFolders),
      count: items.length,
      warnings,
      items,
    };
  } finally {
    client.release();
  }
}



// ✅ NEW: list virtual folders (roots + markers) for /fs
export async function listDbVirtualFoldersForFs({
  rootSlug = '',
  prefix = '', // relative inside rootSlug (no leading slash)
  limit = 20000,
} = {}) {
  const root = String(rootSlug || '').trim();
  const pref = String(prefix || '').replace(/^\/+|\/+$/g, '').trim();

  const T_ROOTS = safeIdent(process.env.CF_DB_ROOTS_TABLE, 'media_roots');
  const T_IMAGES = safeIdent(process.env.CF_DB_IMAGES_TABLE, 'media_assets');

  const pool = getPool();
  const client = await pool.connect();

  try {
    const folders = new Set();

    // 1) roots from media_roots
    if (root) {
      folders.add(root);
    } else {
      const rRoots = await client.query(
        `SELECT root_slug FROM ${T_ROOTS} ORDER BY root_slug ASC LIMIT ${Math.max(
          1,
          Math.min(Number(limit) || 20000, 50000)
        )}`
      );
      for (const row of rRoots.rows || []) {
        const rs = String(row.root_slug || '').trim();
        if (rs) folders.add(rs);
      }
    }

    // 2) nested folder markers from media_assets
    // marker rows created by createVirtualFolderPath():
    //   upload_status='virtual-folder', cf_image_id='__folder__/root/sub/path'
    const args = [];
    let where = `WHERE (upload_status = 'virtual-folder' OR cf_image_id LIKE '__folder__/%')`;

    if (root) {
      args.push(root);
      where += ` AND root_slug = $${args.length}`;

      if (pref) {
        // include the folder itself + descendants
        args.push(pref);
        args.push(`${pref}/%`);
        where += ` AND (relative_path = $${args.length - 1} OR relative_path LIKE $${args.length})`;
      }
    }

    const q = `
      SELECT root_slug, relative_path
      FROM ${T_IMAGES}
      ${where}
      ORDER BY root_slug ASC, relative_path ASC
      LIMIT ${Math.max(1, Math.min(Number(limit) || 20000, 50000))}
    `;

    const r = await client.query(q, args);

    for (const row of r.rows || []) {
      const rs = String(row.root_slug || '').trim();
      const rel = String(row.relative_path || '').replace(/^\/+|\/+$/g, '').trim();
      if (!rs) continue;

      // marker for nested path: root + rel
      if (rel) folders.add(`${rs}/${rel}`.replace(/\/{2,}/g, '/'));
      else folders.add(rs);
    }

    return { ok: true, folders: Array.from(folders) };
  } finally {
    client.release();
  }
}



// --- NEW: delete virtual folders (DB-only) -------------------------------

export async function deleteVirtualFolderPath({
  path,
  createdBy = 'cloudflare-ui',
} = {}) {
  const clean = String(path || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/');

  if (!clean) throw new Error('Missing folder path');

  const parts = clean.split('/').filter(Boolean);
  if (!parts.length) throw new Error('Invalid folder path');

  const root_slug = parts[0];
  const rel = parts.slice(1).join('/'); // '' for root

  const T_ROOTS = safeIdent(process.env.CF_DB_ROOTS_TABLE, 'media_roots');
  const T_IMAGES = safeIdent(process.env.CF_DB_IMAGES_TABLE, 'media_assets');

  const pool = getPool();
  const client = await pool.connect();

  const isVirtualRow = `
    (upload_status = 'virtual-folder' OR cf_image_id LIKE '__folder__/%')
  `;

  const isRealRow = `
    NOT (upload_status = 'virtual-folder' OR cf_image_id LIKE '__folder__/%')
  `;

  try {
    await client.query('BEGIN');

    // ---- ROOT delete -----------------------------------------------------
    if (!rel) {
      // Block root deletion if it still contains REAL assets
      const rCount = await client.query(
        `SELECT COUNT(*)::int AS n FROM ${T_IMAGES} WHERE root_slug = $1 AND ${isRealRow}`,
        [root_slug]
      );
      const n = Number(rCount.rows?.[0]?.n || 0);
      if (n > 0) {
        await client.query('ROLLBACK');
        return {
          ok: false,
          status: 409,
          message: `Cannot delete root "${root_slug}" because it still contains ${n} real asset(s).`,
        };
      }

      // Delete all virtual markers for that root
      const rDelMarkers = await client.query(
        `DELETE FROM ${T_IMAGES} WHERE root_slug = $1 AND ${isVirtualRow}`,
        [root_slug]
      );

      // Delete root from media_roots
      const rDelRoot = await client.query(
        `DELETE FROM ${T_ROOTS} WHERE root_slug = $1`,
        [root_slug]
      );

      await client.query('COMMIT');

      return {
        ok: true,
        kind: 'root',
        root_slug,
        path: clean,
        deleted_virtual_markers: rDelMarkers.rowCount || 0,
        deleted_root: rDelRoot.rowCount || 0,
        createdBy,
      };
    }

    // ---- NESTED folder delete -------------------------------------------
    // Delete only markers that belong to this folder subtree
    // relative_path = "a/b" or "a/b/%"
    const like = rel + '/%';

    const rDel = await client.query(
      `
      DELETE FROM ${T_IMAGES}
      WHERE root_slug = $1
        AND (${isVirtualRow})
        AND (relative_path = $2 OR relative_path LIKE $3)
      `,
      [root_slug, rel, like]
    );

    await client.query('COMMIT');

    return {
      ok: true,
      kind: 'folder',
      root_slug,
      path: clean,
      deleted: rDel.rowCount || 0,
      createdBy,
    };
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}

// --- NEW: cleanup virtual-folder markers when real files arrive ----------
export async function cleanupVirtualMarkersForCfId({ cf_image_id } = {}) {
  const id = String(cf_image_id || '').replace(/^\/+|\/+$/g, '').trim();
  if (!id || !id.includes('/')) return { ok: true, deleted: 0 };

  const parts = id.split('/').filter(Boolean);
  if (parts.length < 2) return { ok: true, deleted: 0 }; // no folder part

  const root_slug = parts[0];
  const folders = [];
  for (let i = 1; i < parts.length; i++) {
    const folderPath = parts.slice(0, i).join('/'); // up to but not including filename
    folders.push(`__folder__/${folderPath}`);
  }

  if (!folders.length) return { ok: true, deleted: 0 };

  const T_IMAGES = safeIdent(process.env.CF_DB_IMAGES_TABLE, 'media_assets');
  const pool = getPool();
  const client = await pool.connect();

  try {
    const q = `
      DELETE FROM ${T_IMAGES}
      WHERE upload_status = 'virtual-folder'
        AND cf_image_id = ANY($1::text[])
    `;
    const res = await client.query(q, [folders]);
    return { ok: true, deleted: res.rowCount || 0, root_slug };
  } finally {
    client.release();
  }
}
