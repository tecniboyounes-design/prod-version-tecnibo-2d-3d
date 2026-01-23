// app/callback/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ODOO_BASE = process.env.ODOO_BASE || "https://erptest.tecnibo.com";
const CLIENT_ID = process.env.ODOO_CLIENT_ID || "y8Bsx_IrGu-eZWKtoyQeB4zSG8SgBoCi";
const CLIENT_SECRET = process.env.ODOO_CLIENT_SECRET || "tL_08RkgERn45OzKZmaQ5YO_aeSRUAs_jrxqHMoyarE";
const REDIRECT_URI = process.env.ODOO_REDIRECT_URI || "https://backend.tecnibo.com/callback";

function setCookie(headers, name, value, {
  maxAge,
  secure,
  path = '/',
  httpOnly = true,
  sameSite = 'Lax',
} = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  if (typeof maxAge === 'number') parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  headers.append('Set-Cookie', parts.join('; '));
}

export async function GET(req) {
  if (!ODOO_BASE || !CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return new Response(JSON.stringify({ error: 'Missing OAuth env' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // CSRF: compare with state cookie set by /api/odoo/login
  const cookieHeader = req.headers.get('cookie') || '';
  const m = cookieHeader.match(/(?:^|;\s*)odoo_oauth_state=([^;]+)/);
  const stateCookie = m ? decodeURIComponent(m[1]) : null;
  
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return new Response('Invalid or missing code/state', { status: 400 });
  }
  
  // ✅ FIXED: OAuth2 token endpoint
  const tokenURL = `${ODOO_BASE}/oauth2/token`;
  
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
  });

  const tokenRes = await fetch(tokenURL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body,
  });

  const text = await tokenRes.text();
  if (!tokenRes.ok) {
    return new Response(`Token exchange failed: ${tokenRes.status}\n${text}`, { status: 400 });
  }

  let tk;
  try {
    tk = JSON.parse(text);
  } catch {
    return new Response('Bad JSON from token endpoint', { status: 400 });
  }

  const accessToken = tk.access_token;
  const refreshToken = tk.refresh_token;
  const expiresIn = Number(tk.expires_in || 3600);

  if (!accessToken) {
    return new Response('No access_token in token response', { status: 400 });
  }

  const respHeaders = new Headers();
  const proto = req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':', '');
  const isHttps = proto === 'https';

  setCookie(respHeaders, 'odoo_at', accessToken, {
    maxAge: Math.max(300, expiresIn - 60),
    secure: isHttps,
  });
  if (refreshToken) {
    setCookie(respHeaders, 'odoo_rt', refreshToken, {
      maxAge: 60 * 60 * 24 * 30,
      secure: isHttps,
    });
  }

  // Clear state cookie
  setCookie(respHeaders, 'odoo_oauth_state', '', { maxAge: 0, secure: isHttps });

  respHeaders.set('Location', '/');
  return new Response(null, { status: 302, headers: respHeaders });
}
