// src/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Match plain /web/* and /<locale>/web/* (e.g., /en_US/web/*)
export const config = {
  matcher: ['/web/:path*', '/:locale([a-z]{2}_[A-Z]{2})/web/:path*'],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = `/api/odoo${url.pathname}`;
  // keep search/hash
  return NextResponse.rewrite(url);
}
 



