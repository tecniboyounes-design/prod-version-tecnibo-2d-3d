import axios from "axios";
import { OdooError } from "./odooError.js";

/**
 * Odoo endpoint normalisation.
 * ODOO_BASE can be:
 *   - host only:              https://erptest.tecnibo.com
 *   - with call_kw path:      https://erptest.tecnibo.com/web/dataset/call_kw
 * We always strip it down to the root host, then append the correct path per call.
 */
const RAW_ODOO = (process.env.ODOO_BASE || "").replace(/\/$/, "");
if (!RAW_ODOO)
    throw new Error(
        "Missing ODOO_BASE (set to https://erptest.tecnibo.com or https://www.tecnibo.com)"
    );

export const ODOO_ROOT = RAW_ODOO
    .replace(/\/web\/dataset\/call_kw\/?$/, "")
    .replace(/\/odoo\/?$/, "");

export const ODOO_CALL_KW = `${ODOO_ROOT}/web/dataset/call_kw`;

/** Simple in-memory cache for fields_get (per Node.js process). */
export const FIELD_CACHE = (globalThis.__ODOO_FIELD_CACHE__ ??= new Map());
export const FIELD_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Low-level JSON-RPC call to Odoo.
 * Auth comes ONLY from the session_id cookie.
 * Throws OdooError (not plain Error) so callers can use classifyOdooError().
 */
export async function callOdoo(session_id, model, method, args = [], kwargs = {}) {
    const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `session_id=${session_id}`,
    };

    const payload = {
        jsonrpc: "2.0",
        method: "call",
        id: Date.now(),
        params: { model, method, args, kwargs },
    };

    const url = `${ODOO_CALL_KW}/${model}/${method}`;
    const { data } = await axios.post(url, payload, { headers });

    if (data?.error) {
        throw new OdooError(data.error);
    }

    return data?.result;
}

/** Fetch model fields (cached 5 min) so we can skip invalid fields on write. */
export async function getModelFieldSet(session_id, model, ctx) {
    const companyKey = String(ctx?.force_company || ctx?.current_company_id || "na");
    const key = `${companyKey}:${model}`;
    const now = Date.now();

    const hit = FIELD_CACHE.get(key);
    if (hit && now - hit.t < FIELD_TTL_MS) return hit.v;

    const res = await callOdoo(session_id, model, "fields_get", [[], ["type", "relation"]], {
        context: ctx,
    });

    const v = new Set(Object.keys(res || {}));
    FIELD_CACHE.set(key, { t: now, v });
    return v;
}