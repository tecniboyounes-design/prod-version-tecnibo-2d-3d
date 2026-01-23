// src/cloudflare/api/delete.service.js
import { http } from './http';

/**
 * Delete entry from Cloudflare + DB via /api/cloudflare/delete
 * @param {{type?:'auto'|'file'|'folder', id?:string, path?:string, dryRun?:boolean}} args
 */
export async function deleteCloudflareEntry({
  type = 'auto',
  id = '',
  path = '',
  dryRun = false,
} = {}) {
  const res = await http.delete('/api/cloudflare/delete', {
    data: { type, id, path, dryRun },
  });
  return res.data;
}

/**
 * Delete VIRTUAL folder markers from DB only via /api/cloudflare/folders (DELETE)
 * - Works for root ("Empty") and nested ("copy_2/Empty/FolderA")
 * - Does NOT touch Cloudflare Images
 *
 * @param {string} path
 * @param {string=} createdBy
 */
export async function deleteDbFolder(path, createdBy = 'cloudflare-ui') {
  const p = String(path || '').trim();
  if (!p) return { ok: false, message: 'Missing path' };

  // Use axios http to preserve same cookie / headers behavior
  const res = await http.delete('/api/cloudflare/folders', {
    data: { path: p, createdBy },
  });

  return res.data;
}
