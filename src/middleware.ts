// src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set([
  "/0Auth",
  "/favicon.ico",
  "/robots.txt",
  "/manifest.json",
  "/api/me",
  "/api/odoo/login",
  "/api/odoo/callback",
  "/api/odoo/logout",
]);


function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/0Auth" || pathname.startsWith("/0Auth/")) return true;
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/me")) return true;
  if (pathname.startsWith("/api/odoo/login")) return true;
  if (pathname.startsWith("/api/odoo/callback")) return true;
  if (pathname.startsWith("/api/odoo/logout")) return true;
  return false;
}

function hasOdooAuth(req: NextRequest): boolean {
  // OR — mirrors gate.js: either token is enough (Odoo may not always return session_id)
  return Boolean(req.cookies.get("odoo_at")?.value) || Boolean(req.cookies.get("session_id")?.value);
}


function isOdooWebPath(pathname: string): boolean {
  if (pathname === "/web" || pathname.startsWith("/web/")) return true;
  return /^\/[a-z]{2}_[A-Z]{2}\/web(?:\/|$)/.test(pathname);
}


export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isPublicPath(pathname)) return NextResponse.next();

  if (!isApi && !hasOdooAuth(req)) {
    const returnTo = `${pathname}${search || ""}`;
    const target = new URL("/0Auth", req.url);
    target.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(target);
  }

  if (isOdooWebPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/api/odoo${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
