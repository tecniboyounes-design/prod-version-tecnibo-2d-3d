import { NextResponse } from 'next/server';

const COMPAT_PORT = process.env.COMPATIBILITY_PORT ?? '9004';
const COMPAT_BASE = process.env.COMPATIBILITY_BASE_URL ?? `http://192.168.30.92:${COMPAT_PORT}/compatibility`;

export async function POST(req) {
  const payload = await req.json();
  const res = await fetch(`${COMPAT_BASE}/descriptors/create-empty`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
