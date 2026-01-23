// src/cloudflare/utils/profiles.js
export const IMAGE_PROFILES = [
  { id: 'original', label: 'Original', hint: 'Keep as-is' },
  { id: 'high',     label: 'High',     hint: 'Visually lossless, larger' },
  { id: 'web',      label: 'Web',      hint: 'Balanced (recommended)' },
  { id: 'low',      label: 'Low',      hint: 'Max savings, small screens' },
  { id: 'custom',   label: 'Custom',   hint: 'Set width/quality/format' },
];

export const DEFAULT_CUSTOM = { width: 1920, height: null, quality: 70, format: 'webp' };
// format: 'avif' | 'webp' | 'jpeg' | 'auto'


/**
 * Turn a profile choice into a Cloudflare-friendly transform directive.
 * These are suggestions; you can change numbers anytime.
 */

export function profileToTransform(profileId, custom = DEFAULT_CUSTOM) {
  switch (profileId) {
    case 'original':
      return { mode: 'original' };
    case 'high':
      return { width: 2560, height: null, quality: 85, format: 'auto', fit: 'scale-down' };
    case 'web':
      return { width: 1920, height: null, quality: 75, format: 'auto', fit: 'scale-down' };
    case 'low':
      return { width: 1280, height: null, quality: 60, format: 'auto', fit: 'scale-down' };
    case 'custom':
      return { ...DEFAULT_CUSTOM, fit: 'scale-down', ...custom };
    default:
      return { mode: 'original' };
  }
}


