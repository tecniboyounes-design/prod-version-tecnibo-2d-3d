// src/cloudflare/api/rename.service.js

/**
 * Rename a file or folder via /api/cloudflare/rename
 * - type: 'file' | 'folder' | 'auto'
 * - from: old path (display path)
 * - to: new path (display path)
 * Sends cf_upload_gate cookie (credentials: 'include').
 */
export async function renameCloudflarePath({ type = 'auto', from = '', to = '', createdBy = 'cloudflare-ui' } = {}) {
  const payload = {
    type,
    from: String(from || '').trim(),
    to: String(to || '').trim(),
    createdBy,
  };

  const r = await fetch('/api/cloudflare/rename', {
    method: 'POST',
    credentials: 'include', // send cf_upload_gate
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) {
    return { ok: false, message: data?.message || 'Rename failed.' };
  }

  return data;
}
