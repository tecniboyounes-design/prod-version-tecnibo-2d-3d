// src/cloudflare/utils/fetchFsItemsDeepSmart.js
import { normPath } from './pathMime';

/**
 * Fetch FS items deeply if API is prefix-scoped (1-level).
 * If API returns global list even with prefix, we detect that and skip recursion.
 */
export async function fetchFsItemsDeepSmart(prefix, fetchCloudflareFsFn) {
  const pref = normPath(prefix);

  const first = await fetchCloudflareFsFn(pref);
  if (!first?.ok || !Array.isArray(first.items)) {
    throw new Error(first?.message || 'Failed to load server items.');
  }

  const firstItems = first.items;

  // If calling with a prefix still returns other roots => it's a global list; just use it.
  const looksGlobal =
    pref &&
    firstItems.some((it) => {
      const p = normPath(it?.path);
      if (!p) return false;
      return !(p === pref || p.startsWith(pref + '/'));
    });

  if (looksGlobal) return firstItems;

  // Otherwise assume API is prefix-scoped, so do BFS recursion.
  const out = [...firstItems];
  const visited = new Set();
  const queue = [];

  for (const it of firstItems) {
    if (String(it?.type) === 'folder') {
      const p = normPath(it?.path);
      if (p && (p === pref || p.startsWith(pref + '/'))) queue.push(p);
    }
  }

  visited.add(pref);

  while (queue.length) {
    const folder = queue.shift();
    if (!folder || visited.has(folder)) continue;
    visited.add(folder);

    const res = await fetchCloudflareFsFn(folder);
    if (!res?.ok || !Array.isArray(res.items)) continue;

    for (const it of res.items) out.push(it);

    for (const it of res.items) {
      if (String(it?.type) !== 'folder') continue;
      const p = normPath(it?.path);
      if (!p) continue;
      if (!(p === pref || p.startsWith(pref + '/'))) continue;
      if (!visited.has(p)) queue.push(p);
    }
  }

  // Dedupe by type+path
  const map = new Map();
  for (const it of out) {
    const k = `${String(it?.type)}:${normPath(it?.path)}`;
    if (!map.has(k)) map.set(k, it);
  }
  
  return Array.from(map.values());
}
