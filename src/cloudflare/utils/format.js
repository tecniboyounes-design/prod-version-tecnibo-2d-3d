// src/cloudflare/utils/format.js
export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value > 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function inferResolutionCategory(bytes) {
  if (bytes >= 3 * 1024 * 1024) return 'high'; // > 3MB
  if (bytes >= 500 * 1024) return 'web';       // 500KB – 3MB
  return 'low';                                 // < 500KB
}
