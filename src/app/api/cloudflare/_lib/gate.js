/**
 * Auth check for Cloudflare API routes.
 * Passes if the request carries a valid Odoo session (session_id or odoo_at cookie).
 */


function getCookieFromHeader(req, name) {
  const header = req.headers?.get?.('cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}


export function checkGate(req) {
  const sessionId =
    req.cookies?.get?.('session_id')?.value ||
    getCookieFromHeader(req, 'session_id');
    
  const odooAt =
    req.cookies?.get?.('odoo_at')?.value ||
    getCookieFromHeader(req, 'odoo_at');
    
  if (!sessionId && !odooAt) {
    return { ok: false, status: 401, message: 'Unauthorized. No active Odoo session.' };
  }
  
  return { ok: true };
  
}


