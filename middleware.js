import { NextResponse } from 'next/server';

export function middleware(req) {
    const session = req.cookies.get('session_id');
    const isAuthRoute = req.nextUrl.pathname.startsWith('/signin');   
    if (!session && !isAuthRoute) return NextResponse.redirect(new URL('/signin', req.url))
    return NextResponse.next();
}

export const config = { matcher: ['/((?!signin|signup|public|api|api/authenticate).*)'],}


// import { NextResponse } from "next/server";
// import { decrypt } from "@/lib/crypto";
// 
// export function middleware(req) {
//   const encryptedSession = req.cookies.get("session_id")?.value;
//   const isAuthRoute = req.nextUrl.pathname.startsWith("/signin");
// 
//   // If no session and not on an auth route, redirect to signin
//   if (!encryptedSession && !isAuthRoute) {
//     return NextResponse.redirect(new URL("/signin", req.url));
//   }
// 
//   // Decrypt session_id if present
//   let sessionId;
//   try {
//     if (encryptedSession) {
//       sessionId = decrypt(encryptedSession);
//       console.log("Decrypted session_id in middleware:", sessionId); // For debugging
//     }
//   } catch (error) {
//     console.error("Failed to decrypt session_id:", error);
//     // Optionally, redirect to signin if decryption fails (invalid session)
//     if (!isAuthRoute) {
//       return NextResponse.redirect(new URL("/signin", req.url));
//     }
//   }
// 
//   // Proceed if session is valid or on an auth route
//   return NextResponse.next();
// }
// 
// export const config = {
//   matcher: ["/((?!signin|signup|public|api|api/authenticate).*)"],
// };