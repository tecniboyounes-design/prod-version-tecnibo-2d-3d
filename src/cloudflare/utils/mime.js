// src/cloudflare/utils/mime.js
export function getExtension(name = '') {
  const parts = String(name).split('.');
  if (parts.length < 2) return '';
  return (parts.pop() || '').toLowerCase();
}

export const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif|heic)$/i;
