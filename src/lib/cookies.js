// src/lib/cookies.js

/**
 * Read a single cookie value from an incoming Next.js/Edge request.
 * Works server-side only — clients send cookies via withCredentials: true.
 *
 * @param {Request} req
 * @param {string} name  Cookie name, e.g. "session_id"
 * @returns {string|null}
 */
export function getCookie(req, name) {
  const cookie = req.headers.get('cookie') || '';
  // console.log(`[getCookie] Looking for cookie: "${name}"`);
  // console.log(`[getCookie] Raw cookie header: ${cookie}`);
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  // console.log(`[getCookie] Result for "${name}":`, value);
  return value;
}

