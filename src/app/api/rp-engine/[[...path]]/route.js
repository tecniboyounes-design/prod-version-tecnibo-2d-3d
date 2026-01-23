export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM = process.env.RP_ENGINE_URL || 'http://192.168.30.92:3019';

function buildTarget(req, pathSegments) {
  const { search } = new URL(req.url);
  const path = pathSegments?.length ? `/${pathSegments.join('/')}` : '';
  return `${UPSTREAM}${path}${search}`;
}

function forwardHeaders(req) {
  const h = new Headers(req.headers);
  h.delete('host');
  h.set('x-forwarded-host', req.headers.get('host') || '');
  h.set('x-forwarded-proto', req.nextUrl.protocol.replace(':', ''));
  h.set('accept-encoding', 'identity');
  return h;
}

async function proxy(req, { params }) {
  const target = buildTarget(req, params?.path || []);
  const method = req.method;
  const headers = forwardHeaders(req);

  const init = { method, headers, redirect: 'manual', cache: 'no-store' };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const respHeaders = new Headers(upstream.headers);
  respHeaders.delete('content-encoding');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}



export async function GET(req, ctx)    { return proxy(req, ctx); }
export async function POST(req, ctx)   { return proxy(req, ctx); }
export async function PUT(req, ctx)    { return proxy(req, ctx); }
export async function PATCH(req, ctx)  { return proxy(req, ctx); }
export async function DELETE(req, ctx) { return proxy(req, ctx); }

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
