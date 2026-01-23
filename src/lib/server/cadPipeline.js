// /src/lib/server/cadPipeline.js

/**
 * Check if a required environment variable is set
 * @param {string|undefined} v - The value to check
 * @param {string} key - The name of the environment variable
 * @returns {string} The value if it exists
 * @throws {Error} If the value is not set
 */
const required = (v, key) => {
  if (!v) throw new Error(`${key} is not set`);
  return v;
};

/**
 * Get the base URL for the CAD pipeline service
 * @returns {string} The base URL with trailing slashes removed
 */
export function cadBaseUrl() {
  return required(process.env.CAD_PIPELINE_URL, 'CAD_PIPELINE_URL').replace(/\/+$/, '');
}


/**
 * Proxy a JSON request to the CAD pipeline
 * @param {string} url - The URL to proxy to
 * @param {Object} init - Fetch options including optional timeout
 * @param {number} [init.timeoutMs=120000] - Timeout in milliseconds
 * @returns {Promise<Response>} The proxied response
 */


export async function proxyJson(url, init = {}) {
  const { timeoutMs = 120_000, ...rest } = init;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal });
    const text = await res.text();
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const body = isJson ? (text ? JSON.parse(text) : null) : text;

    if (!res.ok) {
      return Response.json(
        { ok: false, message: (body && body.message) || `Upstream ${res.status}` },
        { status: res.status }
      );
    }
    return Response.json(body, { status: res.status });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Proxy a binary request to the CAD pipeline
 * @param {string} url - The URL to proxy to
 * @param {Object} init - Fetch options including optional timeout
 * @param {number} [init.timeoutMs=180000] - Timeout in milliseconds
 * @returns {Promise<Response>} The proxied response with original headers
 */


export async function proxyBytes(url, init = {}) {
  const { timeoutMs = 180_000, ...rest } = init;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const upstream = await fetch(url, { ...rest, signal: ctrl.signal });
    const buf = await upstream.arrayBuffer();

    const headers = new Headers();
    // Pass through useful headers
    const ct = upstream.headers.get('content-type');
    const cd = upstream.headers.get('content-disposition');
    const cl = upstream.headers.get('content-length');
    if (ct) headers.set('content-type', ct);
    if (cd) headers.set('content-disposition', cd);
    if (cl) headers.set('content-length', cl);

    return new Response(buf, { status: upstream.status, headers });
  } finally {
    clearTimeout(id);
  }
}
