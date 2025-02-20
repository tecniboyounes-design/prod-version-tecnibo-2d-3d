import { NextResponse } from 'next/server';

export function middleware(req) {
    const session = req.cookies.get('session_id');
    const isAuthRoute = req.nextUrl.pathname.startsWith('/signin');  
    if (!session && !isAuthRoute) return NextResponse.redirect(new URL('/signin', req.url))
    return NextResponse.next();
}
export const config = { matcher: ['/((?!signin|signup|public|api|api/authenticate).*)'],}

