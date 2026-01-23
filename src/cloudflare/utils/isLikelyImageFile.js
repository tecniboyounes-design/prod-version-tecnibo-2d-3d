// src/cloudflare/utils/isLikelyImageFile.js
export function isLikelyImageFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;

  const name = String(file.name || '');
  const ext = (name.split('.').pop() || '').toLowerCase();
  const allowed = new Set([
    'jpg',
    'jpeg',
    'png',
    'webp',
    'avif',
    'gif',
    'bmp',
    'tif',
    'tiff',
    'svg',
    'heic',
    'heif',
    'jfif',
  ]);
  return allowed.has(ext);
}
