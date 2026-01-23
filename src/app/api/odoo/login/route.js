export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import crypto from 'crypto';

const ODOO_BASE     = process.env.ODOO_BASE || process.env.ODOO_URL;
const CLIENT_ID     = process.env.ODOO_CLIENT_ID || process.env.CLIENT_ID;
const REDIRECT_URI  = process.env.ODOO_REDIRECT_URI || process.env.REDIRECT_URI;

function j(data, status = 400) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function GET(req) {
  if (!ODOO_BASE || !CLIENT_ID || !REDIRECT_URI) {
    return j({ error: 'Missing OAuth env', ODOO_BASE: !!ODOO_BASE, CLIENT_ID: !!CLIENT_ID, REDIRECT_URI: !!REDIRECT_URI }, 500);
  }

  const state = crypto.randomBytes(24).toString('hex');

  const url = new URL(`${ODOO_BASE}/oauth/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', 'userinfo');
  url.searchParams.set('state', state);

  const headers = new Headers({ Location: url.toString() });
  const isHttps = req.nextUrl.protocol === 'https:';
  headers.append(
    'Set-Cookie',
    [
      `odoo_oauth_state=${state}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      isHttps ? 'Secure' : '',
      'Max-Age=300',
    ].filter(Boolean).join('; ')
  );

  return new Response(null, { status: 302, headers });
}
