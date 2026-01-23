// src/app/api/cloudflare/_lib/cf.js

const CF_DEBUG =
  String(process.env.CF_DEBUG || '').trim() === '1' ||
  String(process.env.DEBUG_CF || '').trim() === '1';

function maskToken(t) {
  const s = String(t || '');
  if (!s) return '';
  if (s.length <= 10) return `${s.slice(0, 2)}…${s.slice(-2)}`;
  return `${s.slice(0, 6)}…${s.slice(-4)} (len=${s.length})`;
}

function dbg(...args) {
  if (CF_DEBUG) console.log('[cf]', ...args);
}

function errlog(...args) {
  console.error('[cf]', ...args);
}

export const CF_ACCOUNT_ID = String(
  process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || ''
).trim();

export const CF_IMAGES_TOKEN = String(
  process.env.CLOUDFLARE_IMAGES_TOKEN ||
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CF_IMAGES_TOKEN ||
    ''
).trim();

// log env once (masked)
dbg('env loaded', {
  CF_ACCOUNT_ID: CF_ACCOUNT_ID
    ? `${CF_ACCOUNT_ID.slice(0, 6)}…${CF_ACCOUNT_ID.slice(-4)}`
    : '',
  CF_IMAGES_TOKEN: maskToken(CF_IMAGES_TOKEN),
});

export function assertCfEnv() {
  if (!CF_ACCOUNT_ID)
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID (or CF_ACCOUNT_ID)');

  if (!CF_IMAGES_TOKEN)
    throw new Error('Missing CLOUDFLARE_IMAGES_TOKEN (or CF_IMAGES_TOKEN)');

  // Guard against placeholders
  if (CF_IMAGES_TOKEN.toLowerCase().includes('paste')) {
    throw new Error(
      'CF_IMAGES_TOKEN is still a placeholder. Paste the real token value.'
    );
  }
  if (CF_IMAGES_TOKEN.length < 30) {
    throw new Error(
      `CF_IMAGES_TOKEN looks too short (len=${CF_IMAGES_TOKEN.length}). Paste the real token.`
    );
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableStatus(status) {
  // Cloudflare edge / upstream transient errors
  return (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 520 ||
    status === 522 ||
    status === 524 ||
    status === 429 // rate limit (optional retry using Retry-After)
  );
}

function parseRetryAfterSeconds(h) {
  const s = String(h || '').trim();
  if (!s) return null;

  // can be seconds or HTTP date
  const asInt = Number(s);
  if (Number.isFinite(asInt) && asInt > 0) return Math.min(600, asInt);

  const asDate = Date.parse(s);
  if (Number.isFinite(asDate)) {
    const deltaSec = Math.ceil((asDate - Date.now()) / 1000);
    if (deltaSec > 0) return Math.min(600, deltaSec);
  }

  return null;
}

function backoffMs(attempt, baseMs) {
  // attempt: 1..N
  const jitter = Math.floor(Math.random() * 150);
  const exp = Math.min(6, attempt - 1); // cap
  return baseMs * 2 ** exp + jitter;
}

export class CfHttpError extends Error {
  constructor(message, { status, code, cfRay, retryAfterSec } = {}) {
    super(message);
    this.name = 'CfHttpError';
    this.status = status;
    this.code = code;
    this.cfRay = cfRay;
    this.retryAfterSec = retryAfterSec;
  }
}

function buildCfError({ url, status, cfRay, json, text, retryAfterSec }) {
  const msg =
    json?.errors?.[0]?.message ||
    json?.messages?.[0]?.message ||
    `Cloudflare request failed (${status})`;

  const code = json?.errors?.[0]?.code || json?.messages?.[0]?.code;

  // Log full debug (server only)
  errlog('Cloudflare API error', {
    url,
    status,
    cfRay,
    code,
    message: msg,
    token: maskToken(CF_IMAGES_TOKEN),
    account: `${CF_ACCOUNT_ID.slice(0, 6)}…${CF_ACCOUNT_ID.slice(-4)}`,
    retryAfterSec,
    bodyPreview: String(text || '').slice(0, 400),
  });

  return new CfHttpError(code ? `${msg} (code ${code})` : msg, {
    status,
    code,
    cfRay,
    retryAfterSec,
  });
}

export async function cfFetchJson(url, init = {}) {
  assertCfEnv();

  const maxAttempts = Math.max(
    1,
    Number(process.env.CF_FETCH_MAX_ATTEMPTS || 4)
  );
  const baseRetryMs = Math.max(
    50,
    Number(process.env.CF_FETCH_RETRY_BASE_MS || 300)
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    dbg('request', {
      url,
      method: init?.method || 'GET',
      attempt,
      maxAttempts,
      account: `${CF_ACCOUNT_ID.slice(0, 6)}…${CF_ACCOUNT_ID.slice(-4)}`,
      token: maskToken(CF_IMAGES_TOKEN),
    });

    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${CF_IMAGES_TOKEN}`,
        ...(init.headers || {}),
      },
      cache: 'no-store',
    });

    const status = res.status;
    const cfRay = res.headers.get('cf-ray');
    const retryAfterSec = parseRetryAfterSeconds(res.headers.get('retry-after'));

    const text = await res.text();

    dbg('response', {
      status,
      ok: res.ok,
      cfRay,
      attempt,
      bodyPreview: CF_DEBUG ? String(text || '').slice(0, 300) : undefined,
    });

    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // keep json null (HTML / plaintext happens on 5xx)
    }

    // success
    if (res.ok && json?.success) return json;

    const err = buildCfError({
      url,
      status,
      cfRay,
      json,
      text,
      retryAfterSec,
    });

    // retry?
    const retryable = isRetryableStatus(status);
    if (attempt < maxAttempts && retryable) {
      const waitMs =
        status === 429 && retryAfterSec
          ? retryAfterSec * 1000
          : backoffMs(attempt, baseRetryMs);

      errlog('Cloudflare API retrying', {
        url,
        status,
        cfRay,
        attempt,
        maxAttempts,
        waitMs,
        retryAfterSec,
      });

      await sleep(waitMs);
      continue;
    }

    throw err;
  }

  // should never reach
  throw new Error('Cloudflare request failed (unexpected)');
}

export async function listImagesV2All({ perPage = 1000, max = 10000 } = {}) {
  const out = [];
  let token = null;

  while (true) {
    const u = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v2`
    );
    u.searchParams.set('per_page', String(perPage));
    if (token) u.searchParams.set('continuation_token', token);

    const json = await cfFetchJson(u.toString());
    const batch = json?.result?.images || [];
    out.push(...batch);

    token = json?.result?.continuation_token || null;
    if (!token) break;
    if (out.length >= max) break;
  }

  dbg('listImagesV2All done', { count: out.length });
  return out;
}

// Delete single image by ID (v1 endpoint)
export async function deleteImageV1(imageId) {
  const id = String(imageId || '').trim();
  if (!id) throw new Error('Missing imageId');

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${encodeURIComponent(
    id
  )}`;

  return cfFetchJson(url, { method: 'DELETE' });
}
