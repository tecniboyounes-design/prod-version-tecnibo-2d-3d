import axios from "axios";
import { ODOO_HOST } from "./config";

/** HTML escaping for chatter note */
export function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function partnerLabel(v) {
  const p = v?.partner_id;
  if (Array.isArray(p)) return { id: p[0] ?? null, name: p[1] ?? null };
  if (typeof p === "object" && p) return { id: p.id ?? null, name: p.display_name || p.name || null };
  if (typeof p === "number") return { id: p, name: null };
  return { id: null, name: null };
}

/** pick vendor_primary if missing but vendors[] exists */
export function pickVendorPrimaryFromClient(item) {
  const vp = item?.vendor_primary;
  if (vp && vp.partner_id) return vp;

  const vendors = Array.isArray(item?.vendors) ? item.vendors : [];
  if (!vendors.length) return null;

  // smallest sequence then smallest min_qty
  const sorted = [...vendors].sort((a, b) => {
    const sa = Number(a?.sequence ?? 0);
    const sb = Number(b?.sequence ?? 0);
    if (sa !== sb) return sa - sb;
    const ma = Number(a?.min_qty ?? 0);
    const mb = Number(b?.min_qty ?? 0);
    return ma - mb;
  });

  return sorted[0] || null;
}

/** Post chatter note on sale.order using /mail/message/post */
export async function postSaleOrderNote(session_id, { soId, bodyHtml, ctx }) {
  const url = `${ODOO_HOST}/mail/message/post`;

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
    const msg = data.error?.data?.message || data.error?.message || "Odoo error (mail/message/post)";
    throw new Error(msg);
  }

  return data?.result || null;
}

export function buildNoteHtml({ soName, project_id, phase_id, commitment_date, livraison_task, items, notes }) {
  // const header = `
  //   <p><b>Sub-SO created:</b> ${escapeHtml(soName || "")}</p>
  //   <ul>
  //     <li><b>Project:</b> ${escapeHtml(project_id)}</li>
  //     <li><b>Phase:</b> ${escapeHtml(phase_id)}</li>
  //     <li><b>Commitment date:</b> ${escapeHtml(commitment_date || "n/a")}</li>
  //     <li><b>6.2 Livraison #L task exists:</b> ${escapeHtml(livraison_task?.exists ? "YES" : "NO")}</li>
  //   </ul>
  // `;

  // const lines = (items || []).map((it) => {
  //   const qty = itemQty(it);
  //   const pvId = itemVariantId(it);

  //   const code = it?.default_code || "";
  //   const name = it?.name || it?.display_name || "";
  //   const refImos = it?.ref_imos || "";

  //   const vendorPrimary = pickVendorPrimaryFromClient(it);
  //   const vp = vendorPrimary ? partnerLabel(vendorPrimary) : { id: null, name: null };

  //   const price = vendorPrimary?.price ?? null;
  //   const delay = vendorPrimary?.delay ?? null;
  //   const minQty = vendorPrimary?.min_qty ?? null;

  //   const stock = it?.stock || {};
  //   const freeQty = stock?.free_qty ?? null;
  //   const qtyAvail = stock?.qty_available ?? null;

  //   return `
  //     <li>
  //       <b>${escapeHtml(qty)}x</b> [${escapeHtml(code)}] ${escapeHtml(name)}
  //       ${refImos ? `<br/><b>ref_imos:</b> ${escapeHtml(refImos)}` : ""}
  //       <br/><b>product_variant_id:</b> ${escapeHtml(pvId || "missing")}
  //       <br/><b>Vendor:</b> ${vp?.name ? escapeHtml(`${vp.name} (#${vp.id})`) : "none"}
  //       ${vendorPrimary ? `<br/><b>min_qty:</b> ${escapeHtml(minQty)} | <b>price:</b> ${escapeHtml(price)} | <b>delay:</b> ${escapeHtml(delay)} day(s)` : ""}
  //       <br/><b>Stock:</b> qty_available=${escapeHtml(qtyAvail)} free_qty=${escapeHtml(freeQty)}
  //     </li>
  //   `;
  // }).join("");
  // `${header}<p><b>Items:</b></p><ul>${lines || "<li>No items</li>"}</ul>`;
  // pass notes then return it that's it
  const n =
    typeof notes === "string"
      ? notes.trim()
      : notes
        ? String(notes).trim()
        : "";

  return `<p><b>Notes:</b> ${n ? escapeHtml(n) : "(none)"}</p>`;
}
