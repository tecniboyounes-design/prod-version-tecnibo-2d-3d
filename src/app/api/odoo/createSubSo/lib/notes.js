import axios from "axios";
import { OdooError } from "./odooError.js";
import { callOdoo, ODOO_ROOT } from "./odooRpc.js";

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

// ─── Legacy buildNoteHtml (kept for backward compat) ────────────────────────
export function buildNoteHtml({ notes }) {
    const n =
        typeof notes === "string"
            ? notes.trim()
            : notes
                ? String(notes).trim()
                : "";

    return `<p><b>Notes:</b> ${n ? escapeHtml(n) : "(none)"}</p>`;
}

// ─── Rich RP note with sections ─────────────────────────────────────────────

/**
 * Build a styled HTML chatter note with RoomPlanner branding.
 *
 * @param {Object} opts
 * @param {boolean}  opts.debug        - true if payload had debug flag
 * @param {string}   opts.clientNotes  - client-provided notes text
 * @param {string}   opts.employee     - who triggered the request
 * @param {Object}   opts.imosResult   - handleImosItems() return value (or null)
 * @param {boolean}  opts.debugCancelled  - true if SO was auto-cancelled
 * @returns {string} HTML string
 */
export function buildRpNoteHtml({ debug, clientNotes, employee, imosResult, debugCancelled } = {}) {
    const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    const sections = [];

    // ── Section A: RP Header (always) ───────────────────────────────────────
    sections.push(`
<div style="border-left:4px solid #6366f1; padding:8px 12px; margin:8px 0; background:#f8f7ff;">
  <b>&#127968; RoomPlanner</b> &mdash; Sub SO created via createSubSo API
  <br/><small>${escapeHtml(now)}${employee ? ` | by ${escapeHtml(employee)}` : ""}</small>
</div>`.trim());

    // ── Section B: Debug banner (only if debug=true) ────────────────────────
    if (debug) {
        sections.push(`
<div style="border-left:4px solid #f59e0b; padding:8px 12px; margin:8px 0; background:#fffbeb;">
  &#9888;&#65039; <b>TEST MODE</b> &mdash; Created by software engineer during prod testing.${debugCancelled ? "<br/>This SO was <b>auto-cancelled</b> after response verification." : ""}
</div>`.trim());
    }

    // ── Section C: Client notes (if provided) ───────────────────────────────
    const noteText = typeof clientNotes === "string" ? clientNotes.trim() : "";
    if (noteText) {
        sections.push(`
<div style="border-left:4px solid #10b981; padding:8px 12px; margin:8px 0;">
  <b>&#128221; Client Notes:</b><br/>
  ${escapeHtml(noteText).replace(/\n/g, "<br/>")}
</div>`.trim());
    }

    // ── Section D: IMOS summary (if imos items present) ─────────────────────
    if (imosResult && imosResult.count > 0) {
        const pushed = imosResult.pushed_to_receiver;
        const statusIcon = pushed ? "&#9989;" : "&#10060;";
        const statusText = pushed
            ? "pushed to receiver"
            : `offline (saved locally)`;

        sections.push(`
<div style="border-left:4px solid #3b82f6; padding:8px 12px; margin:8px 0;">
  <b>&#128230; IMOS &rarr; NetShop:</b> ${imosResult.count} article(s) sent to IMOS<br/>
  Order: <code>${escapeHtml(imosResult.order_no || "")}</code><br/>
  Receiver: ${statusIcon} ${escapeHtml(statusText)}
</div>`.trim());
    }

    return sections.join("\n");
}

// ─── Attach file to SO via ir.attachment ─────────────────────────────────────

/**
 * Upload a file as an ir.attachment linked to a sale.order.
 *
 * @param {string} session_id
 * @param {Object} opts
 * @param {number} opts.soId       - sale.order id
 * @param {string} opts.content    - raw file content (string)
 * @param {string} opts.fileName   - e.g. "IMOS-3317-xxx.xml"
 * @param {string} opts.mimetype   - e.g. "application/xml" or "application/json"
 * @param {Object} opts.ctx        - Odoo context
 * @returns {number|null} attachment id
 */
export async function attachFileToSaleOrder(session_id, { soId, content, fileName, mimetype, ctx }) {
    try {
        const b64 = Buffer.from(content, "utf-8").toString("base64");
        const result = await callOdoo(session_id, "ir.attachment", "create", [{
            name: fileName,
            type: "binary",
            datas: b64,
            res_model: "sale.order",
            res_id: Number(soId),
            mimetype: mimetype || "application/octet-stream",
        }], { context: ctx });
        return result; // attachment id
    } catch (e) {
        console.error(`[createSubSO/notes] Failed to attach ${fileName}:`, e?.message || e);
        return null;
    }
}