import { NextResponse } from 'next/server';

const COMPAT_PORT = process.env.COMPATIBILITY_PORT ?? '9004';
const COMPAT_BASE = process.env.COMPATIBILITY_BASE_URL ?? `http://192.168.30.92:${COMPAT_PORT}/compatibility`;

export async function POST(req) {
  const body = await req.json();
  const r = await fetch(`${COMPAT_BASE}/conditions/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return new NextResponse(JSON.stringify(data), {
    status: r.status,
    headers: { 'content-type': 'application/json' },
  });
}
