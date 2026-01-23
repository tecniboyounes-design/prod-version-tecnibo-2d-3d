import { NextResponse } from 'next/server';

const converterHost = process.env.CONVERTER_HOST || 'localhost';
const converterPort = process.env.CONVERTER_PORT || '3005';
const converterOrigin = `http://${converterHost}:${converterPort}`;

export function middleware(req) {
  const { pathname, search } = req.nextUrl;
  const referer = req.headers.get('referer') || '';

  // Only proxy converter asset/API calls when they originate from the converter page
  if (
    (pathname.startsWith('/assets/') || pathname.startsWith('/api/')) &&
    referer.includes('/digitalfactory/3dconverter')
  ) {
    const url = new URL(`${pathname}${search || ''}`, converterOrigin);
    return NextResponse.rewrite(url);
  }

  // Keep /tools/fiches traffic as-is
  if (pathname.startsWith('/tools/fiches')) {
    return NextResponse.next();
  }

  // Rewrite bare root (and query like ?type=Porte) to /tools/fiches to keep the prefix stable
  if (pathname === '/') {
    const url = new URL(`/tools/fiches${search || ''}`, req.url);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/tools/fiches/:path*',
    '/digitalfactory/3dconverter',
    '/digitalfactory/3dconverter/:path*',
    '/assets/:path*',
    '/api/:path*',
  ],
};
