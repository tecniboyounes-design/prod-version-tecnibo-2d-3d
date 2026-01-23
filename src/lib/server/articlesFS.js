// ESM, Node runtime helpers
import fs from "fs/promises";
import path from "path";
import { randomUUID, createHash } from "crypto";

const DATA_ROOT = path.join(process.cwd(), "data", "formbuilder");
const INDEX_PATH = path.join(DATA_ROOT, "articles.json");
const CATALOGS_DIR = path.join(DATA_ROOT, "catalogs");
const DATA_SOURCE_PATH = path.join(DATA_ROOT, "dataSource.json");

async function ensureDirs() {
  await fs.mkdir(DATA_ROOT, { recursive: true });
  await fs.mkdir(CATALOGS_DIR, { recursive: true });
  try { await fs.access(INDEX_PATH); }
  catch { await fs.writeFile(INDEX_PATH, "[]", "utf8"); }
}


async function readIndex() { await ensureDirs(); return JSON.parse(await fs.readFile(INDEX_PATH, "utf8") || "[]"); }
async function writeIndex(items) {
  await ensureDirs();
  const tmp = INDEX_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf8");
  await fs.rename(tmp, INDEX_PATH);
}


const articleDir = (id) => path.join(CATALOGS_DIR, id);
const latestPath = (id) => path.join(articleDir(id), "latest.json");
const latestMarker = (id) => path.join(articleDir(id), "LATEST");



// --- Versioning helpers ---

function versionFilePath(articleId, versionId) {
  return path.join(articleDir(articleId), `${versionId}.json`);
}

export async function listVersions(articleId) {
  await ensureDirs();

  const dir = articleDir(articleId);
  // read LATEST marker if present
  let latestId = null;
  try {
    latestId = (await fs.readFile(latestMarker(articleId), "utf8")).trim();
  } catch { }

  let entries = [];
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const f of files) {
      if (!f.isFile()) continue;
      // We only want version snapshots: YYYY...-hash.json
      if (!/\.json$/i.test(f.name)) continue;
      if (f.name === "latest.json") continue;

      const versionId = f.name.replace(/\.json$/i, "");
      const stat = await fs.stat(path.join(dir, f.name));
      entries.push({
        versionId,
        isLatest: versionId === latestId,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        ctime: stat.ctime.toISOString(),
      });
    }
  } catch {
    // If folder doesn't exist yet, return empty
  }

  // newest first (by version string timestamp prefix works too, but use mtime)
  entries.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  return entries;
}

export async function restoreVersion(articleId, versionId) {
  await ensureDirs();

  // validate article exists in index
  const items = await readIndex();
  const art = items.find((a) => a.id === articleId);
  if (!art) throw new Error("Article not found");

  const srcPath = versionFilePath(articleId, versionId);
  const destLatest = latestPath(articleId);

  // read snapshot
  let payloadStr;
  try {
    payloadStr = await fs.readFile(srcPath, "utf8");
  } catch {
    const err = new Error("Version not found");
    err.code = "VERSION_NOT_FOUND";
    throw err;
  }

  // overwrite latest.json and update LATEST marker
  await fs.writeFile(destLatest + ".tmp", payloadStr, "utf8");
  await fs.rename(destLatest + ".tmp", destLatest);
  await fs.writeFile(latestMarker(articleId), versionId, "utf8");

  // bump updatedAt in articles.json
  const now = new Date().toISOString();
  await writeIndex(
    items.map((a) => (a.id === articleId ? { ...a, updatedAt: now } : a))
  );

  // Return parsed payload (optional)
  let parsed;
  try { parsed = JSON.parse(payloadStr); } catch { parsed = null; }

  return {
    ok: true,
    article: { id: art.id, name: art.name, updatedAt: now },
    versionId,
    restored: parsed,
  };
}

// ---- NAMED ESM EXPORTS (IMPORTANT) ----
export async function listArticles() {
  return readIndex();
}

export async function createArticle(name) {
  const now = new Date().toISOString();
  const id = `article-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const items = await readIndex();
  if (items.some(a => a.name.toLowerCase() === String(name).toLowerCase())) {
    const err = new Error("Article name already exists");
    err.code = "DUPLICATE_NAME";
    throw err;
  }
  const art = { id, name: String(name).trim(), createdAt: now, updatedAt: now };
  items.push(art);
  await writeIndex(items);
  await fs.mkdir(articleDir(id), { recursive: true });
  await fs.writeFile(latestPath(id), JSON.stringify({ sections: [], meta: { id, name: art.name } }, null, 2), "utf8");
  await fs.writeFile(latestMarker(id), "init-0", "utf8");
  return art;
}

export async function deleteArticle(articleId) {
  const items = await readIndex();
  const idx = items.findIndex(a => a.id === articleId);
  if (idx === -1) return false;
  const [removed] = items.splice(idx, 1);
  await writeIndex(items);
  try { await fs.rm(articleDir(articleId), { recursive: true, force: true }); } catch { }
  return removed;
}


export async function cloneArticle(originalId, newName) {
  const items = await readIndex();
  const orig = items.find(a => a.id === originalId);
  if (!orig) throw new Error("Original article not found");
  if (items.some(a => a.name.toLowerCase() === String(newName).toLowerCase())) {
    const err = new Error("Article name already exists");
    err.code = "DUPLICATE_NAME";
    throw err;
  }
  const now = new Date().toISOString();
  const newId = `article-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const cloned = { id: newId, name: String(newName).trim(), createdAt: now, updatedAt: now };
  items.push(cloned);
  await writeIndex(items);
  await fs.mkdir(articleDir(newId), { recursive: true });

  // copy latest if exists
  try {
    const src = await fs.readFile(latestPath(originalId), "utf8");
    await fs.writeFile(latestPath(newId), src, "utf8");
    await fs.writeFile(latestMarker(newId), `clone-${Date.now()}`, "utf8");
  } catch {
    await fs.writeFile(latestPath(newId), JSON.stringify({ sections: [], meta: { id: newId, name: cloned.name } }, null, 2), "utf8");
    await fs.writeFile(latestMarker(newId), "init-0", "utf8");
  }
  return cloned;
}

export async function renameArticle(articleId, newName) {
  const items = await readIndex();
  const idx = items.findIndex((a) => a.id === articleId);
  if (idx === -1) throw new Error("Article not found");

  const trimmed = String(newName || "").trim();
  if (!trimmed) throw new Error("New name is required");

  // prevent duplicate names (case-insensitive)
  if (items.some((a) => a.id !== articleId && a.name.toLowerCase() === trimmed.toLowerCase())) {
    const err = new Error("Article name already exists");
    err.code = "DUPLICATE_NAME";
    throw err;
  }

  const now = new Date().toISOString();
  const updated = { ...items[idx], name: trimmed, updatedAt: now };
  items[idx] = updated;
  await writeIndex(items);

  // Update latest.json meta.name if exists
  try {
    const latest = await fs.readFile(latestPath(articleId), "utf8");
    const obj = JSON.parse(latest || "{}");
    if (obj && typeof obj === "object") {
      obj.meta = { ...(obj.meta || {}), id: articleId, name: trimmed };
      await fs.writeFile(latestPath(articleId), JSON.stringify(obj, null, 2), "utf8");
    }
  } catch {
    // ignore if latest.json missing/corrupt
  }

  return updated;
}

export async function saveSnapshot(articleId, incoming) {
  const items = await readIndex();
  const art = items.find(a => a.id === articleId);
  if (!art) throw new Error("Article not found");

  await fs.mkdir(articleDir(articleId), { recursive: true });

  // ---- normalize incoming into { sections, meta } ----
  let payload;
  if (Array.isArray(incoming)) {
    // Client sent just the array (your builder tree)
    payload = { sections: incoming, meta: { id: articleId, name: art.name } };
  } else if (incoming && typeof incoming === "object") {
    // Client sent an object
    const p = { ...incoming };
    // tolerate { data: [...] } or missing sections
    if (!Array.isArray(p.sections) && Array.isArray(p.data)) {
      p.sections = p.data; delete p.data;
    }
    if (!Array.isArray(p.sections)) p.sections = [];
    p.meta = { id: articleId, name: art.name, ...(incoming.meta || {}) };
    payload = p;
  } else {
    throw new Error("Invalid catalog JSON");
  }

  const jsonStr = JSON.stringify(payload, null, 2);

  const hash = createHash("sha1").update(jsonStr).digest("hex").slice(0, 8);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const versionId = `${ts}-${hash}`;
  const filePath = path.join(articleDir(articleId), `${versionId}.json`);

  await fs.writeFile(filePath + ".tmp", jsonStr, "utf8");
  await fs.rename(filePath + ".tmp", filePath);
  await fs.writeFile(latestMarker(articleId), versionId, "utf8");
  await fs.writeFile(latestPath(articleId), jsonStr, "utf8");

  const now = new Date().toISOString();
  await writeIndex(items.map(a => (a.id === articleId ? { ...a, updatedAt: now } : a)));

  return { versionId };
}


export async function getLatestCatalog(articleId) {
  try {
    const buf = await fs.readFile(latestPath(articleId), "utf8");
    return JSON.parse(buf);
  } catch { return null; }
}


function extractSchemaArray(latest) {
  // Accept a few shapes defensively
  if (Array.isArray(latest?.sections)) return latest.sections; // { sections: [...] }
  if (Array.isArray(latest)) return latest;                    // legacy: [...]
  return [];                                                   // fallback
}

function collectSourceKeysFromCatalog(catalog) {
  const keys = new Set();

  const visit = (node) => {
    if (!node || typeof node !== "object") return;

    // Field -> combo.source
    if (node.render === "field" && node.combo && typeof node.combo.source === "string") {
      const src = node.combo.source.trim();
      if (src && src.toLowerCase() !== "local") keys.add(src); // ignore sentinel
    }

    if (Array.isArray(node.children)) node.children.forEach(visit);
    if (Array.isArray(node.sections)) node.sections.forEach(visit);
  };

  if (Array.isArray(catalog?.sections)) catalog.sections.forEach(visit);
  else if (Array.isArray(catalog)) catalog.forEach(visit);
  else if (catalog && typeof catalog === "object") visit(catalog);

  return keys;
}

async function loadDataSourceFile() {
  try {
    const raw = await fs.readFile(DATA_SOURCE_PATH, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    console.warn("⚠️ dataSource.json not found or invalid:", e.message);
    return {};
  }
}


// read whole dataSource.json
export async function getAllDataSources() {
  await ensureDirs();
  try {
    const raw = await fs.readFile(DATA_SOURCE_PATH, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// overwrite dataSource.json (optional, for save)
export async function saveAllDataSources(obj) {
  await ensureDirs();
  const tmp = DATA_SOURCE_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(obj ?? {}, null, 2), "utf8");
  await fs.rename(tmp, DATA_SOURCE_PATH);
}


export async function getArticleDataAndSourcesByName(articleName, opts = {}) {
  const { fallbackAllWhenNoKeys = false } = opts;

  const items = await readIndex();
  const found = items.find(
    (a) => a.name.toLowerCase() === String(articleName).toLowerCase()
  );
  if (!found) return null;

  // Read full latest.json
  const latest = (await getLatestCatalog(found.id)) || { sections: [] };

  // Build schema array (unwrapped from sections)
  const schema = extractSchemaArray(latest);

  // Determine which data sources are referenced by this schema
  const usedKeys = collectSourceKeysFromCatalog(latest);
  const allSources = await loadDataSourceFile();

  let picked = {};
  if (usedKeys.size === 0) {
    if (fallbackAllWhenNoKeys) picked = allSources;
  } else {
    for (const k of usedKeys) {
      if (Array.isArray(allSources[k])) picked[k] = allSources[k];
    }
  }

  return {
    article: { id: found.id, name: found.name }, // lean article
    schema,                                       // ← array
    dataSources: picked,                          // only what’s used (or all if fallback)
  };
}



// Optional default export for CJS interop (safe) 
export default {
  listArticles, 
  createArticle, 
  deleteArticle, 
  cloneArticle, 
  saveSnapshot, 
  getLatestCatalog, 
  getArticleDataAndSourcesByName, 
  getAllDataSources,
  listVersions,
  restoreVersion
};




//// 
