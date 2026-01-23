// src/cloudflare/api/fs.service.js
import { http } from './http';

/**
 * GET /api/cloudflare/fs?prefix=
 * Returns: { ok: boolean, items?: Array<{id,path,type}>, message?: string }
 */
export async function fetchCloudflareFs(prefix = '') {
  const res = await http.get('/api/cloudflare/fs', {
    params: prefix ? { prefix } : {},
  });
  return res.data;
}

/**
 * POST /api/cloudflare/fs
 * Triggers a Cloudflare → DB sync; returns { ok, synced, count, prefix }
 */
export async function syncCloudflareFs(prefix = '') {
  const res = await http.post('/api/cloudflare/fs', { prefix });
  return res.data;
}
