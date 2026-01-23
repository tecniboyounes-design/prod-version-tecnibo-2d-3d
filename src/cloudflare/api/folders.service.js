// src/cloudflare/api/folders.service.js

/**
 * DB-only folder operations via /api/cloudflare/folders
 * Uses credentials: 'include' to send cf_upload_gate cookie
 */

export async function createDbFolder(path, createdBy = 'cloudflare-ui') {
  const p = String(path || '').trim();
  if (!p) return { ok: false, message: 'Missing path' };

  const r = await fetch('/api/cloudflare/folders', {
    method: 'POST',
    credentials: 'include', // ✅ sends cf_upload_gate cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: p, createdBy }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, message: data?.message || 'Create failed' };
  return data;
}

export async function deleteDbFolder(path, createdBy = 'cloudflare-ui') {
  const p = String(path || '').trim();
  if (!p) return { ok: false, message: 'Missing path' };

  const r = await fetch('/api/cloudflare/folders', {
    method: 'DELETE',
    credentials: 'include', // ✅ sends cf_upload_gate cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: p, createdBy }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, message: data?.message || 'Delete failed' };
  return data;
}
