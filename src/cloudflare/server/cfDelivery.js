// src/cloudflare/server/cfDelivery.js
//
// Helpers to build delivery URLs and map profile/custom config to the segment
// expected by Cloudflare Images. Keep this small and dependency-free so it
// stays tree-shakable on both server and edge.

const DELIVERY_BASE =
  (process.env.CF_IMAGE_DELIVERY_BASE ||
    process.env.CF_IMAGES_DELIVERY_BASE ||
    process.env.NEXT_PUBLIC_CF_IMAGE_DELIVERY_BASE ||
    process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_BASE ||
    '').replace(/\/+$/, '');
const DELIVERY_ACCOUNT_HASH =
  process.env.CF_IMAGES_ACCOUNT_HASH ||
  process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH ||
  process.env.CF_IMAGE_ACCOUNT_HASH ||
  process.env.CF_IMAGES_HASH ||
  process.env.NEXT_PUBLIC_CF_IMAGES_HASH ||
  '';

const DEFAULT_VARIANT =
  process.env.CF_IMAGES_DEFAULT_VARIANT ||
  process.env.CF_IMAGE_DEFAULT_VARIANT ||
  process.env.NEXT_PUBLIC_CF_IMAGE_VARIANT ||
  process.env.NEXT_PUBLIC_CF_IMAGES_VARIANT ||
  process.env.CF_IMAGES_VARIANT ||
  'public';

const PROFILE_VARIANT_MAP = {
  web: process.env.CF_IMAGES_WEB_VARIANT || DEFAULT_VARIANT,
  high: process.env.CF_IMAGES_HIGH_VARIANT || DEFAULT_VARIANT,
  low: process.env.CF_IMAGES_LOW_VARIANT || DEFAULT_VARIANT,
  original: process.env.CF_IMAGES_ORIGINAL_VARIANT || DEFAULT_VARIANT,
};

// Formats a transform string for "flexible variants" when allowed.
export function profileToDeliverySegment(profile, custom, { useFlexible = false } = {}) {
  const prof = String(profile || '').trim();
  if (!useFlexible) {
    // Map common profiles to a known variant (default public) unless overridden by env.
    return PROFILE_VARIANT_MAP[prof] || prof || DEFAULT_VARIANT;
  }

  const c = custom && typeof custom === 'object' ? custom : {};
  const parts = [];

  if (c.width) parts.push(`width=${c.width}`);
  if (c.height) parts.push(`height=${c.height}`);
  if (c.quality) parts.push(`quality=${c.quality}`);
  if (c.format) parts.push(`format=${c.format}`);
  if (c.dpr) parts.push(`dpr=${c.dpr}`);
  if (c.fit) parts.push(`fit=${c.fit}`);

  // If nothing was provided, fall back to the profile name.
  return parts.length ? parts.join(',') : prof;
}

export function buildDeliveryUrl({ cf_image_id, variantOrTransform }) {
  const id = String(cf_image_id || '').trim();
  const seg = String(variantOrTransform || 'public').trim() || 'public';
  if (!id) throw new Error('cf_image_id is required to build delivery URL');

  // Prefer explicit base. If absent but account hash is set, build the standard delivery base.
  const base =
    DELIVERY_BASE ||
    (DELIVERY_ACCOUNT_HASH ? `https://imagedelivery.net/${DELIVERY_ACCOUNT_HASH}` : '');

  if (!base) {
    // Fallback to a recognizable pseudo URL to avoid hard failures in logs/UI.
    return `cf-image://${encodeURIComponent(id)}/${encodeURIComponent(seg)}`;
  }

  const cleanBase = base.replace(/\/+$/, '');
  const encodedId = encodeURIComponent(id);
  return `${cleanBase}/${encodedId}/${encodeURIComponent(seg)}`;
}
