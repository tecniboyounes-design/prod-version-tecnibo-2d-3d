// src/app/api/cloudflare/access/route.js
import { NextResponse } from 'next/server';
import { makeGateCookieValue, verifyGateCookieValue, COOKIE_NAME, TOKEN_ENV_KEY } from '../_lib/gate';

export const runtime = 'nodejs';

// Cookie lifetime (7 days)
const MAX_AGE = 60 * 60 * 24 * 7;

export async function GET(req) {
  const secret = process.env[TOKEN_ENV_KEY] || '';
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: `Missing env ${TOKEN_ENV_KEY}` },
      { status: 500 }
    );
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const ok = verifyGateCookieValue(cookie, secret);

  return NextResponse.json({ ok });
}

export async function POST(req) {
  const secret = process.env[TOKEN_ENV_KEY] || '';
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: `Missing env ${TOKEN_ENV_KEY}` },
      { status: 500 }
    );
  }

  let body = {};
  try {
    body = await req.json();
  } catch {}

  const token = String(body?.token || '');
  if (!token || token !== secret) {
    return NextResponse.json(
      { ok: false, message: 'Invalid access token.' },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: COOKIE_NAME,
    value: makeGateCookieValue(secret),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
