// src/cloudflare/api/assets.service.js
import { http } from './http';

export async function applyServerAssetProfiles({ items, defaultProfile }) {
  const res = await http.post('/api/cloudflare/assets/apply', {
    items,
    defaultProfile,
  });
  return res.data;
}
