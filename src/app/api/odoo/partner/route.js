export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ODOO_BASE = process.env.ODOO_BASE;

function getCookie(req, name) {
    const c = req.headers.get("cookie") || "";
    const m = c.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[1]) : null;
}

function j(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
}

export async function GET(req) {
    if (!ODOO_BASE) return j({ error: "Missing ODOO_BASE" }, 500);

    // 1. Get tokens from cookies
    const accessToken = getCookie(req, "odoo_at");
    const sessionId = getCookie(req, "session_id");

    if (!accessToken) {
        return j({ error: "no_access_token", message: "Access token missing" }, 401);
    }
    if (!sessionId) {
        return j({ error: "no_session", message: "Session ID missing" }, 401);
    }

    // 2. Call Odoo UserInfo directly to get uid and db
    // This avoids internal fetch issues to /api/me
    let uid, db;
    try {
        const userinfoRes = await fetch(`${ODOO_BASE}/oauth/userinfo`, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        if (!userinfoRes.ok) {
            console.error("UserInfo call failed:", userinfoRes.status);
            return j({ error: "auth_failed", message: "Invalid access token" }, 401);
        }

        const userinfo = await userinfoRes.json();
        if (!userinfo.sub || !userinfo.db) {
            return j({ error: "missing_data", message: "Incomplete user data from Odoo" }, 400);
        }

        uid = parseInt(userinfo.sub);
        db = userinfo.db;

    } catch (e) {
        console.error("UserInfo fetch error:", e);
        return j({ error: "network_error", message: "Failed to verify identity" }, 500);
    }

    // 3. Call Odoo via /web/dataset/call_kw (Session-based, no password needed)
    try {
        const rpcRes = await fetch(`${ODOO_BASE}/web/dataset/call_kw/res.partner/search_read`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Crucial: Pass session_id to authenticate RPC call
                "Cookie": `session_id=${sessionId}`,
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: {
                    model: "res.partner",
                    method: "search_read",
                    args: [[["user_ids", "in", [uid]]]],
                    kwargs: {
                        fields: [
                            "name",
                            "email",
                            "phone",
                            "mobile",
                            "street",
                            "street2",
                            "city",
                            "zip",
                            "state_id",
                            "country_id",
                            "function",
                            "company_name",
                        ],
                        limit: 1,
                        context: { lang: "en_US" }
                    },
                },
                id: Date.now(),
            }),

        });

        const rpcData = await rpcRes.json();

        if (rpcData.error) {
            console.error("RPC Error:", JSON.stringify(rpcData.error));
            return j(
                {
                    error: "rpc_error",
                    message: rpcData.error.data?.message || "RPC call failed",
                    details: rpcData.error,
                },
                400
            );
        }

        if (!rpcData.result || rpcData.result.length === 0) {
            return j({ error: "no_partner", message: "No partner record found" }, 404);
        }

        return j({ partner: rpcData.result[0] }, 200);

    } catch (e) {
        console.error("RPC fetch error:", e);
        return j({ error: "network_error", message: e.message }, 500);
    }
}
