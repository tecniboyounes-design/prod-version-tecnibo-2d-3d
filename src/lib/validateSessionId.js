// src/lib/validateSessionId.js

// Allow typical token formats (hex, base64-ish, JWT-like), but keep it bounded.
const SESSION_ID_REGEX = /^[A-Za-z0-9_\-\.=]{16,128}$/;

/**
 * Validates an x-session-id header value.
 * - Must be a non-empty string.
 * - No spaces or weird chars.
 * - Length between 16 and 128.
 *
 * Returns the trimmed value if valid, otherwise null.
 */

export function validateSessionId(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const value = raw.trim();
  if (!value) return null;

  if (!SESSION_ID_REGEX.test(value)) return null;

  return value;
}
