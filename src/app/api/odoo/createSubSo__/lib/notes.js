import axios from "axios";
import { OdooError } from "./odooError.js";
import { ODOO_ROOT } from "./odooRpc.js";

/** HTML escaping for chatter note body. */
export function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * Post a chatter note on a sale.order via /mail/message/post.
 * Uses ODOO_ROOT (not /web/dataset/call_kw) — this is a direct web endpoint.
 * Throws OdooError so callers can use classifyOdooError().
 */
export async function postSaleOrderNote(session_id, { soId, bodyHtml, ctx }) {
    const url = `${ODOO_ROOT}/mail/message/post`;

    const payload = {
        id: Date.now(),
        jsonrpc: "2.0",
        method: "call",
        params: {
            context: {
                lang: ctx.lang || "en_US",
                tz: ctx.tz || "Africa/Casablanca",
                uid: ctx.uid,
                allowed_company_ids: ctx.allowed_company_ids || [],
                mail_post_autofollow: false,
                temporary_id: Date.now() + Math.random(),
            },
            post_data: {
                body: bodyHtml,
                attachment_ids: [],
                attachment_tokens: [],
                canned_response_ids: [],
                message_type: "comment",
                partner_ids: [],
                subtype_xmlid: "mail.mt_note",
                partner_emails: [],
                partner_additional_values: {},
            },
            thread_id: Number(soId),
            thread_model: "sale.order",
        },
    };

    const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `session_id=${session_id}`,
    };

    const { data } = await axios.post(url, payload, { headers });

    if (data?.error) {
        throw new OdooError(data.error);
    }

    return data?.result || null;
}

export function buildNoteHtml({ notes }) {
    const n =
        typeof notes === "string"
            ? notes.trim()
            : notes
                ? String(notes).trim()
                : "";

    return `<p><b>Notes:</b> ${n ? escapeHtml(n) : "(none)"}</p>`;
}