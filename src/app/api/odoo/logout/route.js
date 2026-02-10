export const dynamic = "force-dynamic";

export async function GET(req) {
    const isHttps = (req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "")) === "https";
    const respHeaders = new Headers();

    const clearCookie = (name) => {
        respHeaders.append("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Lax; ${isHttps ? "Secure; " : ""}Max-Age=0`);
    };

    clearCookie("odoo_at");
    clearCookie("odoo_rt");
    clearCookie("session_id");

    respHeaders.set("Location", "/");
    return new Response(null, { status: 302, headers: respHeaders });
}
