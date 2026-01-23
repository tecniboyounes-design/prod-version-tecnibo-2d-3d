import crypto from 'node:crypto';

export const COOKIE_NAME = 'cf_upload_gate';
export const TOKEN_ENV_KEY = 'CF_UPLOAD_TOKEN';

// Shared HMAC helpers (same logic as /cloudflare/access).
function hmac(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function safeEqualHex(a, b) {
  try {
    const ab = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export function makeGateCookieValue(secret) {
  const msg = `ok:${Date.now()}`;
  const sig = hmac(secret, msg);
  return `${msg}.${sig}`;
}

export function verifyGateCookieValue(cookieValue, secret) {
  if (!cookieValue || typeof cookieValue !== 'string') return false;
  const idx = cookieValue.lastIndexOf('.');
  if (idx <= 0) return false;

  const msg = cookieValue.slice(0, idx);
  const sig = cookieValue.slice(idx + 1);

  const expected = hmac(secret, msg);
  return safeEqualHex(sig, expected);
}

export function checkGate(req) {
  const secret = process.env[TOKEN_ENV_KEY] || '';
  if (!secret) {
    return { ok: false, status: 500, message: `Missing env ${TOKEN_ENV_KEY}` };
  }

  const cookie = req.cookies?.get?.(COOKIE_NAME)?.value;
  const ok = verifyGateCookieValue(cookie, secret);

  if (!ok) {
    return { ok: false, status: 401, message: 'Access denied. Missing cf_upload_gate cookie.' };
  }

  return { ok: true, secret };
}
