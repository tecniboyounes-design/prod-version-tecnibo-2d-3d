import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ODOO_UPSTREAM = process.env.ODOO_URL;              // e.g. https://erptest.tecnibo.com
const DB_NAME = process.env.ODOO_DB;                     // pin the DB
if (!ODOO_UPSTREAM) throw new Error('ODOO_URL env is required');
if (!DB_NAME) throw new Error('ODOO_DB env is required');

const PROXY_PREFIX = '/api/odoo';
const ODOO = new URL(ODOO_UPSTREAM);

function rewriteLocationHeader(h) {
  const loc = h.get('location');
  if (!loc) return;
  if (loc.startsWith('/')) { h.set('location', `${PROXY_PREFIX}${loc}`); return; }
  try {
    const u = new URL(loc);
    if (u.origin === ODOO.origin) h.set('location', `${PROXY_PREFIX}${u.pathname}${u.search}`);
  } catch {}
}

function rewriteLinkHeader(h) {
  const link = h.get('link');
  if (!link) return;
  h.set('link', link.replace(/<\//g, `</${PROXY_PREFIX.slice(1)}/`));
}

function injectDbIntoLoginForms(html) {
  return html.replace(
    /(<form[^>]*action="[^"]*\/web\/login[^"]*"[^>]*>)/gi,
    `$1<input type="hidden" name="db" value="${DB_NAME}">`
  );
}
function forceDbOnLoginUrls(html) {
  html = html.replace(
    /(href|action)="\/web\/login(?!\?[^"]*)"/gi,
    `$1="/web/login?db=${DB_NAME}"`
  );
  html = html.replace(
    /(href|action)="\/web\/login\?([^"]*)"/gi,
    (m, attr, qs) => (/(\?|&)db=/.test(qs) ? m : `${attr}="/web/login?${qs}&db=${DB_NAME}"`)
  );
  return html;
}

function rewriteHtml(html) {
  let out = html.replace(
    /<head([^>]*)>/i,
    (m, attrs) => `<head${attrs}><base href="${PROXY_PREFIX}/">`
  );
  out = out
    .replace(/(\shref\s*=\s*")\/(?!\/)/gi, `$1${PROXY_PREFIX}/`)
    .replace(/(\ssrc\s*=\s*")\/(?!\/)/gi, `$1${PROXY_PREFIX}/`)
    .replace(/(\saction\s*=\s*")\/(?!\/)/gi, `$1${PROXY_PREFIX}/`);

  // Absolute & protocol-relative upstream → stay in proxy
  const abs = ODOO.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const host = ODOO.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  out = out.replace(new RegExp(`(["'=])https?:\\/\\/${host}`, 'gi'), `$1${PROXY_PREFIX}`);
  out = out.replace(new RegExp(`(["'=])\\/\\/${host}`, 'gi'), `$1${PROXY_PREFIX}`);

  out = injectDbIntoLoginForms(out);
  out = forceDbOnLoginUrls(out);
  return out;
}

function normalizeSetCookie(h, isHttps) {
  const raw = typeof h.getSetCookie === 'function'
    ? h.getSetCookie()
    : (h.get('set-cookie') ? [h.get('set-cookie')] : []);
  if (!raw.length) return;

  const rewritten = raw.map((c) => {
    let v = c;
    v = v.replace(/;\s*Domain=[^;]+/ig, '');
    v = v.replace(/;\s*Path=\/web\b/ig, '; Path=/');
    if (!/;\s*Path=/i.test(v)) v += '; Path=/';
    if (!/;\s*SameSite=/i.test(v)) v += '; SameSite=Lax';
    if (isHttps && !/;\s*Secure\b/i.test(v)) v += '; Secure';
    if (!isHttps) v = v.replace(/;\s*Secure\b/ig, '');
    if (!/;\s*HttpOnly\b/i.test(v)) v += '; HttpOnly';
    return v;
  });

  h.delete('set-cookie');
  for (const v of rewritten) h.append('set-cookie', v);
}

function sanitizeRequestHeaders(inHeaders, req) {
  const h = new Headers(inHeaders);
  h.delete('host');
  h.set('x-forwarded-proto', req.nextUrl.protocol.replace(':', ''));
  h.set('x-forwarded-host', req.headers.get('host') || '');
  h.set('accept-encoding', 'identity');
  return h;
}

async function withDbInjectedBodyIfNeeded(req, pathname, headers) {
  if (req.method !== 'POST') return { body: undefined, headers };
  const ct = (headers.get('content-type') || '').toLowerCase();

  const buf = await req.arrayBuffer();
  if (!buf || buf.byteLength === 0) return { body: buf, headers };

  // JSON-RPC authenticate → ensure params.db
  if (pathname === '/web/session/authenticate' && ct.includes('application/json')) {
    try {
      const txt = new TextDecoder().decode(buf);
      const js = JSON.parse(txt) || {};
      js.params = js.params || {};
      if (!js.params.db) js.params.db = DB_NAME;
      const out = new TextEncoder().encode(JSON.stringify(js));
      const h2 = new Headers(headers);
      h2.set('content-length', String(out.byteLength));
      return { body: out, headers: h2 };
    } catch {
      return { body: buf, headers };
    }
  }

  // Form login fallback → ensure db field
  if (pathname === '/web/login' && ct.includes('application/x-www-form-urlencoded')) {
    try {
      const txt = new TextDecoder().decode(buf);
      const sp = new URLSearchParams(txt);
      if (!sp.get('db')) sp.set('db', DB_NAME);
      const out = new TextEncoder().encode(sp.toString());
      const h2 = new Headers(headers);
      h2.set('content-length', String(out.byteLength));
      return { body: out, headers: h2 };
    } catch {
      return { body: buf, headers };
    }
  }

  return { body: buf, headers };
}

async function proxy(req, pathSegments) {
  const reqUrl = new URL(req.url);
  const isHttps = reqUrl.protocol === 'https:';
  const pathname = `/${pathSegments.join('/')}`;
  const target = `${ODOO_UPSTREAM}${pathname}${reqUrl.search}`;

  let headers = sanitizeRequestHeaders(req.headers, req);
  let body, method = req.method;

  if (method === 'GET' || method === 'HEAD') {
    body = undefined;
  } else {
    const augmented = await withDbInjectedBodyIfNeeded(req, pathname, headers);
    body = augmented.body;
    headers = augmented.headers;
  }

  const upstream = await fetch(target, { method, headers, body, redirect: 'manual' });

  const respHeaders = new Headers(upstream.headers);
  rewriteLocationHeader(respHeaders);
  rewriteLinkHeader(respHeaders);
  normalizeSetCookie(respHeaders, isHttps);

  const ctype = respHeaders.get('content-type') || '';
  if (ctype.includes('text/html')) {
    const text = await upstream.text();
    const patched = rewriteHtml(text);
    respHeaders.delete('content-length');
    return new Response(patched, { status: upstream.status, statusText: upstream.statusText, headers: respHeaders });
  }

  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: respHeaders });
}

export async function GET(req, { params })    { return proxy(req, params.path); }
export async function POST(req, { params })   { return proxy(req, params.path); }
export async function PUT(req, { params })    { return proxy(req, params.path); }
export async function PATCH(req, { params })  { return proxy(req, params.path); }
export async function DELETE(req, { params }) { return proxy(req, params.path); }
