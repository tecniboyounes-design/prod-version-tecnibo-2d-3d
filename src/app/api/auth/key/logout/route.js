// src/app/api/auth/key/logout/route.js
const ODOO_URL = process.env.ODOO_URL;
if (!ODOO_URL) throw new Error("[auth/key/logout] ODOO_URL env is required");

function clearCookie(name) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function POST(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const m = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
    const sessionId = m ? m[1] : null;

    if (sessionId) {
      // ask Odoo to destroy it server-side (best effort)
      await fetch(`${ODOO_URL}/web/session/destroy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Cookie": `session_id=${sessionId}`,
        },
        body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: Date.now() }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ result: true }), {
      status: 200,
      headers: { "Set-Cookie": clearCookie("session_id") },
    });
  } catch (e) {
    return new Response(JSON.stringify({ result: false, error: String(e) }), { status: 500 });
  }
}
