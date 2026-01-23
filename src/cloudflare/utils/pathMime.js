// src/cloudflare/utils/pathMime.js

export function normPath(p) {
  return String(p || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/')
    .trim();
}

export function basename(p) {
  const s = normPath(p);
  if (!s) return '';
  const parts = s.split('/');
  return parts[parts.length - 1] || '';
}

export function dirname(p) {
  const s = normPath(p);
  if (!s) return '';
  const idx = s.lastIndexOf('/');
  return idx === -1 ? '' : s.slice(0, idx);
}

export function extFromName(name) {
  const n = String(name || '').trim();
  if (!n) return '';
  const base = n.split('__')[0];
  const idx = base.lastIndexOf('.');
  if (idx === -1) return '';
  return base.slice(idx + 1).toLowerCase();
}

export function guessMimeFromExt(ext) {
  const e = String(ext || '').toLowerCase();
  if (!e) return '';
  if (e === 'jpg' || e === 'jpeg' || e === 'jfif') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'avif') return 'image/avif';
  if (e === 'gif') return 'image/gif';
  if (e === 'svg') return 'image/svg+xml';
  if (e === 'bmp') return 'image/bmp';
  if (e === 'tif' || e === 'tiff') return 'image/tiff';
  if (e === 'pdf') return 'application/pdf';
  return '';
}

export function inferResolutionCategory(w, h) {
  const W = Number(w || 0);
  const H = Number(h || 0);
  if (!W || !H) return 'web';
  const maxSide = Math.max(W, H);
  if (maxSide >= 2200) return 'high';
  if (maxSide >= 900) return 'web';
  return 'low';
}
