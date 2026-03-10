import axios from "axios";
import { ensureInt } from "./primitives.js";
import { ODOO_ROOT, callOdoo } from "./odooRpc.js";

/**
 * Get the active uid from Odoo's session info endpoint.
 * Uses ODOO_ROOT (not /web/dataset/call_kw) — this is a direct web endpoint.
 * Returns a positive integer uid, or false if the session is missing/expired.
 */
export async function getSessionUid(session_id) {
    try {
        const headers = {
            "Content-Type": "application/json",
            Accept: "application/json",
            Cookie: `session_id=${session_id}`,
        };
        const url = `${ODOO_ROOT}/web/session/get_session_info`;
        const { data } = await axios.post(url, {}, { headers });
        const uid = data?.result?.uid ?? data?.uid;
        return ensureInt(uid) || false;
    } catch {
        return false;
    }
}

/**
 * Quick liveness check: is the Odoo session still active?
 * Returns { active: boolean, uid: number|false }.
 * Never throws.
 */
export async function assertSessionActive(session_id) {
    const uid = await getSessionUid(session_id);
    return { active: !!uid, uid };
}

/**
 * Fetch the session user's full name, email, and login from res.users.
 * Returns { name, email, login } or null on failure.
 * Never throws.
 */
export async function getSessionUserName(session_id, uid) {
    try {
        const rows = await callOdoo(session_id, "res.users", "read",
            [[uid], ["name", "email", "login"]], {});
        return rows?.[0] || null;
    } catch {
        return null;
    }
}