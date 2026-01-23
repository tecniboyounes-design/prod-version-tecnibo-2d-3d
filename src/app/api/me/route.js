// app/api/me/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ODOO_BASE = process.env.ODOO_BASE; // https://erptest.tecnibo.com

function j(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
function getCookie(req, name) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function GET(req) {
  if (!ODOO_BASE) return j({ error: 'Missing ODOO_BASE' }, 500);

  const at = getCookie(req, 'odoo_at');
  const rt = getCookie(req, 'odoo_rt');
  const debug = new URL(req.url).searchParams.get('debug') === '1';

  if (!at) return j({ error: 'no_access_token' }, 401);

  // call userinfo
  const callUserInfo = async (token) => {
    const res = await fetch(`${ODOO_BASE}/oauth/userinfo`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      cache: 'no-store',
    });
    return res;
  };

  let res = await callUserInfo(at);

  // If unauthorized and we have a refresh token, try to refresh
  if (res.status === 401 && rt) {
    const tokenRes = await fetch(`${ODOO_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: rt,
        client_id: process.env.ODOO_CLIENT_ID || '',
        client_secret: process.env.ODOO_CLIENT_SECRET || '',
      }),
    });

    if (tokenRes.ok) {
      const tk = await tokenRes.json().catch(() => null);
      if (tk?.access_token) {
        // set new access token cookie
        const headers = new Headers();
        const isHttps = (req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':', '')) === 'https';
        headers.append('Set-Cookie',
          `odoo_at=${encodeURIComponent(tk.access_token)}; Path=/; HttpOnly; SameSite=Lax; ${isHttps ? 'Secure; ' : ''}Max-Age=${Math.max(300, (tk.expires_in || 3600) - 60)}`
        );
        if (tk.refresh_token) {
          headers.append('Set-Cookie',
            `odoo_rt=${encodeURIComponent(tk.refresh_token)}; Path=/; HttpOnly; SameSite=Lax; ${isHttps ? 'Secure; ' : ''}Max-Age=${60*60*24*30}`
          );
        }
        // retry userinfo with new token
        res = await callUserInfo(tk.access_token);
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          return new Response(JSON.stringify({ userinfo: body }), { status: 200, headers });
        }
        return new Response(JSON.stringify({ error: 'userinfo_failed_after_refresh' }), { status: 401, headers });
      }
    }
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (debug) console.log('[api/me] userinfo fail', res.status, txt.slice(0, 300));
    return j({ error: 'userinfo_failed', status: res.status }, 401);
  }

  const data = await res.json().catch(() => ({}));
  return j({ userinfo: data }, 200);
}
