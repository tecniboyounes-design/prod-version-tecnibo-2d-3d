// src/lib/articlesFsClient.js
// ==========================================================
// Tecnibo ArticlesFs API - Minimal Axios Client
// - All calls target the dev server on port 3009
// - Each endpoint has its own simple function
// - Returns res.data directly
// - No encodeURIComponent usage (per request)
// - Full JSDoc for hover tooltips and DX
// ==========================================================

import axios from "axios";

/**
 * Absolute origin of the ArticlesFs API.
 * Change here if the API host/port moves.
 * @constant
 * @type {string}
 * @example
 * // Dev server (Next.js --port 3009)
 * // http://localhost:3009 also works if you’re local
 */
const ORIGIN = "";

/**
 * Base URL for all ArticlesFs endpoints.
 * @constant
 * @type {string}
 * @example
 * // Results in "http://192.168.30.92:3009/api/articlesFs"
 */
const BASE = (ORIGIN ? ORIGIN.replace(/\/+$/, "") : "") + "/api/articlesFs";

/**
 * @typedef {Object} Article
 * @property {string} id
 * @property {string} name
 */

/**
 * @typedef {Object} CatalogResponse
 * @property {Object} catalog
 */

/**
 * @typedef {Object} ListArticlesResponse
 * @property {Article[]} items
 */

/**
 * @typedef {Object} SingleArticleResponse
 * @property {Article} item
 */

// ----------------------------------------------------------
// 1) Get all articles
//    GET /api/articlesFs
//    -> { items: Article[] }
// ----------------------------------------------------------

/**
 * Fetch all articles.
 * @returns {Promise<ListArticlesResponse>} Resolves with `{ items }`.
 * @example
 * const { items } = await getAllArticles();
 */
export async function getAllArticles() {
  const res = await axios.get(`${BASE}`);
  return res.data;
}

// ----------------------------------------------------------
// 2) Get article data by CPID (requires server route)
//    GET /api/articlesFs/by-CPID/:cpid
//    -> server-defined payload
// ----------------------------------------------------------

/**
 * Fetch article (or related data) by CPID.
 * Requires the server route `/by-CPID/:cpid` to exist.
 * @param {string} cpid - The CPID value (unencoded).
 * @returns {Promise<any>} Server-defined response shape.
 * @throws {Error} If `cpid` is missing.
 * @example
 * const data = await getArticleByCPID("ERA");
 */
export async function getArticleByCPID(cpid) {
  if (!cpid) throw new Error("cpid is required");
  const res = await axios.get(`${BASE}/by-CPID/${cpid}`);
  return res.data;
}



/**
 * Fetch all data-sources.
 * GET /api/articlesFs/data-sources
 * @returns {Promise<{ dataSources: Record<string, any[]> }|Record<string, any[]>>}
 * If your route returns a plain object, you'll get that; if it wraps in {dataSources}, you'll get that too.
 */
export async function getDataSources() {
  const res = await axios.get(`${BASE}/data-sources`);
  // Support either shape: plain object OR { dataSources: {...} }
  const body = res.data ?? {};
  return body.dataSources ? body : { dataSources: body };
}

/**
 * Upsert data-sources.
 * PUT /api/articlesFs/data-sources?mode=replace&replaceKeys=K1,K2
 * @param {Record<string, any[]>} payload - e.g. { Colors: [{label,value,attributes?}], ... }
 * @param {{ mode?: "replace" | "", replaceKeys?: string[] }} [opts]
 *  - mode: "replace" to replace the entire file; default is merge.
 *  - replaceKeys: replace only these keys entirely (works in merge mode).
 * @returns {Promise<any>} Server-defined payload (e.g., { ok: true }).
 */


export async function putDataSources(payload, opts = { mode:"merge" }) {
  const params = new URLSearchParams();
  if (opts.mode === "replace") params.set("mode", "replace");
  if (Array.isArray(opts.replaceKeys) && opts.replaceKeys.length) {
    params.set("replaceKeys", opts.replaceKeys.join(","));
  }
  const url =
    params.toString()
      ? `${BASE}/data-sources?${params.toString()}`
      : `${BASE}/data-sources`;

  const res = await axios.put(url, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}




/**
 * Delete a single data-source key.
 * DELETE /api/articlesFs/data-sources?name=KEY
 * @param {string} name - The key to remove.
 * @returns {Promise<any>} Server-defined payload (e.g., { ok: true }).
 */
export async function deleteDataSource(name) {
  if (!name) throw new Error("name is required");
  const res = await axios.delete(`${BASE}/data-sources?name=${name}`);
  return res.data;
}




// ----------------------------------------------------------
// 4) Add new article to the catalog
//    POST /api/articlesFs
//    body: { name }
//    -> { item: Article }
// ----------------------------------------------------------

/**
 * Create a new article.
 * @param {string} name - New article name.
 * @returns {Promise<SingleArticleResponse>} Resolves with `{ item }`.
 * @throws {Error} If `name` is empty.
 * @example
 * const { item } = await addArticle("T100");
 */

export async function addArticle(name) {
  if (!name || !String(name).trim()) throw new Error("name is required");
  const res = await axios.post(
    `${BASE}`,
    { name: String(name).trim() },
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data;
}

// ----------------------------------------------------------
// 5) Create a new article (alias of #4)
//    POST /api/articlesFs
// ----------------------------------------------------------

/**
 * Alias of {@link addArticle}.
 * @param {string} name
 * @returns {Promise<SingleArticleResponse>}
 * @example
 * const { item } = await createArticle("My Article 2");
 */
export async function createArticle(name) {
  return addArticle(name);
}

// ----------------------------------------------------------
// 6) Clone an article
//    POST /api/articlesFs/:id/clone
//    body: { name } -> cloned article name
//    -> { item: Article }
// ----------------------------------------------------------

/**
 * Clone an existing article to a new one.
 * @param {string} id - Source article ID (unencoded).
 * @param {string} cloneName - New name for the cloned article.
 * @returns {Promise<SingleArticleResponse>} Resolves with `{ item }`.
 * @throws {Error} If `id` or `cloneName` is missing.
 * @example
 * const { item } = await cloneArticle("article-123", "Article 123 Copy");
 */
export async function cloneArticle(id, cloneName) {
  if (!id) throw new Error("id is required");
  if (!cloneName || !String(cloneName).trim()) {
    throw new Error("cloneName is required");
  }
  const res = await axios.post(
    `${BASE}/${id}/clone`,
    { name: String(cloneName).trim() },
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data;
}

// ----------------------------------------------------------
// 6.1) Rename an article
//    POST /api/articlesFs/:id/rename
//    body: { name } -> new article name
//    -> { item: Article }
// ----------------------------------------------------------

/**
 * Rename an existing article.
 * @param {string} id - Article ID (unencoded).
 * @param {string} newName - The new article name.
 * @returns {Promise<SingleArticleResponse>} Resolves with `{ item }`.
 */
export async function renameArticle(id, newName) {
  if (!id) throw new Error("id is required");
  if (!newName || !String(newName).trim()) throw new Error("newName is required");
  const res = await axios.post(
    `${BASE}/${id}/rename`,
    { name: String(newName).trim() },
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data;
}

// ----------------------------------------------------------
// 7) Delete an article
//    DELETE /api/articlesFs/:id
//    -> { item } | { ok: true }
// ----------------------------------------------------------

/**
 * Delete an article by ID.
 * @param {string} id - Article ID (unencoded).
 * @returns {Promise<any>} Server-defined response shape (`{ item }` or `{ ok: true }`).
 * @throws {Error} If `id` is missing.
 * @example
 * await deleteArticle("article-123");
 */
export async function deleteArticle(id) {
  if (!id) throw new Error("id is required");
  const res = await axios.delete(`${BASE}/${id}`);
  return res.data;
}

// ----------------------------------------------------------
// 8) Get latest catalog of an article
//    GET /api/articlesFs/:id/catalog
//    -> { catalog: {...} }
// ----------------------------------------------------------

/**
 * Fetch the latest catalog for an article by ID.
 * @param {string} id - Article ID (unencoded).
 * @returns {Promise<CatalogResponse>} Resolves with `{ catalog }`.
 * @throws {Error} If `id` is missing.
 * @example
 * const { catalog } = await getLatestCatalog("article-123");
 */
export async function getLatestCatalog(id) {
  if (!id) throw new Error("id is required");
  const res = await axios.get(`${BASE}/${id}/catalog`);
  return res.data;
}

// ----------------------------------------------------------
// Convenience combo (list + catalog)
// ----------------------------------------------------------


/**
 * Convenience: fetch list and pick one article by id, plus its catalog.
 * @param {string} id - Article ID (unencoded).
 * @returns {Promise<{ item: Article|null, catalog: any }>}
 * @throws {Error} If `id` is missing.
 * @example
 * const { item, catalog } = await getArticleWithCatalog("article-123");
 * 
 */
export async function getArticleWithCatalog(id) {
  if (!id) throw new Error("id is required");
  const [list, cat] = await Promise.all([getAllArticles(), getLatestCatalog(id)]);
  const item = (list.items || []).find(a => a.id === id) || null;
  return { item, catalog: cat?.catalog ?? null };
}


/**
 * Upsert an article's catalog.
 * Server route must exist: POST /api/articlesFs/:id/catalog
 * @param {string} id - Article ID (unencoded).
 * @param {any} catalog - The catalog JSON to store.
 * @returns {Promise<{ catalog: any }>} Resolves with `{ catalog }`.
 * @throws {Error} If `id` is missing.
 * @example
 * await setCatalog("article-123", [{ id: 1, render: "section", children: [] }]);
 */
export async function setCatalogSync(id, catalog) {
  if (!id) throw new Error("id is required");
  const res = await axios.post(
    `${BASE}/${id}/save`,
     catalog, 
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data;
}





/**
 * Default export (object style), if you prefer namespacing.
 */
export default {
  getAllArticles,
  getArticleByCPID,
  getDataSources,
  putDataSources,
  deleteDataSource,
  addArticle,
  createArticle,
  cloneArticle,
  renameArticle,
  deleteArticle,
  getLatestCatalog,
  setCatalogSync,
  getArticleWithCatalog,
};
