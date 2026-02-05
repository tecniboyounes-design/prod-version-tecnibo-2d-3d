// /app/api/createPurchase/route.js
import { NextResponse } from "next/server";
import axios from "axios";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

const ODOO_BASE = process.env.ODOO_URL
  ? `${process.env.ODOO_URL}/web/dataset/call_kw`
  : null;
if (!ODOO_BASE) throw new Error("[createPurchase] ODOO_URL env is required");
const SUPPLIER_PARTNER_ID = 1;

/** Safe JSON stringify for logs. */
const safe = (obj) => { try { return JSON.stringify(obj, null, 2); } catch { return String(obj); } };

/**
 * Low-level JSON-RPC call to Odoo.
 * @param {string} session_id - Odoo session_id cookie value
 * @param {string} model - Odoo model name
 * @param {string} method - RPC method (search_read, read, write, web_save, etc.)
 * @param {Array}  args - RPC positional args
 * @param {Object} kwargs - RPC keyword args
 * @returns {Promise<any>} Odoo result
 */


async function callOdoo(session_id, model, method, args = [], kwargs = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Cookie: `session_id=${session_id}`,
  };
  const payload = { jsonrpc: "2.0", method: "call", id: Date.now(), params: { model, method, args, kwargs } };
  const { data } = await axios.post(`${ODOO_BASE}/${model}/${method}`, payload, { headers });
  if (data?.error) {
    const msg = data.error?.data?.message || data.error?.message || "Odoo error";
    const dbg = data.error?.data?.debug;
    throw new Error(`${msg}${dbg ? `\n${dbg}` : ""}`);
  }
  return data?.result;
}



/**
 * Validate a Many2one id exists on given model.
 * Returns the id if valid, otherwise false (no throw).
 */


async function ensureM2OExists(session_id, model, id, ctx) {
  if (!id || !Number.isFinite(Number(id))) return false;
  const res = await callOdoo(
    session_id,
    model,
    "search_read",
    [[["id", "=", Number(id)]], ["id", "name", "company_id"]],
    { context: ctx }
  );
  const found = Array.isArray(res) && res.length ? res[0]?.id : false;
  if (!found) console.warn(`[VALIDATE] ${model} id=${id} not found -> dropping`);
  return found || false;
}

/**
 * Ensure a partner is an active supplier.
 * Returns the id if vendor is valid, otherwise false (no throw).
 */

async function ensureVendor(session_id, id, ctx) {
  if (!id || !Number.isFinite(Number(id))) return false;
  const domain = [
    ["id", "=", Number(id)],
    ["supplier_rank", ">", 0],
    ["active", "=", true],
  ];
  const fields = ["id", "name", "supplier_rank", "company_id", "active"];
  const res = await callOdoo(session_id, "res.partner", "search_read", [domain, fields], { context: ctx });
  const found = Array.isArray(res) && res.length ? res[0]?.id : false;
  if (!found) console.warn(`[VALIDATE] res.partner id=${id} is not an active vendor -> fallback to default`);
  return found || false;
}

/**
 * Extract ticket IDs from arbitrary strings like:
 *  - "(ticket 115028)"
 *  - "ticket #115028"
 *  - "#115028"
 */


function extractTicketIdsFromText(...texts) {
  const out = new Set();
  const rx = /(?:ticket\s*#?\s*|#)\s*(\d{3,})/gi;
  for (const t of texts) {
    if (!t || typeof t !== "string") continue;
    let m;
    while ((m = rx.exec(t))) {
      const id = Number(m[1]);
      if (Number.isFinite(id)) out.add(id);
    }
  }
  return [...out];
}

/**
 * Validate Helpdesk tickets:
 *  - Existence
 *  - Open status (stage not folded)
 *  - If projectId provided, first try with ["project_id","=",projectId]; if that errors (custom schema),
 *    fallback to the same query without project filter.
 *
 * @param {string} session_id
 * @param {number[]} ids
 * @param {object} ctx - Odoo context
 * @param {number|false} projectId
 * @returns {Promise<number[]>} validated ticket ids
 */



async function ensureOpenTickets(session_id, ids, ctx, projectId = false) {
  const uniq = [...new Set((ids || []).map(Number).filter(Boolean))];
  if (!uniq.length) return [];

  const baseDomain = [
    ["id", "in", uniq],
    ["stage_id.fold", "=", false], // open tickets only
  ];

  // Try with project restriction if available
  if (projectId) {
    try {
      const dom = [...baseDomain, ["project_id", "=", Number(projectId)]];
      const rows = await callOdoo(
        session_id,
        "helpdesk.ticket",
        "search_read",
        [dom, ["id"]],
        { context: ctx }
      );
      const found = (rows || []).map((r) => r.id);
      if (found.length) return found;
      // If none matched with project filter, we still try without it to avoid false negatives.
    } catch (e) {
      console.warn("[TICKETS] Project filter not supported on helpdesk.ticket -> fallback without project filter");
    }
  }

  // Fallback: open tickets without project filter
  try {
    const rows = await callOdoo(
      session_id,
      "helpdesk.ticket",
      "search_read",
      [baseDomain, ["id"]],
      { context: ctx }
    );
    return (rows || []).map((r) => r.id);
  } catch (e) {
    console.warn("[TICKETS] helpdesk.ticket validation failed -> ignoring tickets. Reason:", e?.message || e);
    return [];
  }
}

/**
 * Read the phase (project.phase) to get name/code/project and attempt to detect related tickets.
 * Strategy:
 *  1) Direct relation on ticket side: phase_id OR x_phase_id = phase.id (if schema supports it)
 *  2) Parse the phase name/code for textual ticket references (#12345 / ticket 12345)
 * Finally, validate the combined set as "open" (and same project if possible).
 *
 * @param {string} session_id
 * @param {number|false} phaseId
 * @param {object} ctx
 * @returns {Promise<{projectId:number|false, ticketIds:number[]}>}
 */


async function findTicketsForPhase(session_id, phaseId, ctx) {
  if (!phaseId) return { projectId: false, ticketIds: [] };

  // Read minimal phase info
  const phaseRows = await callOdoo(
    session_id,
    "project.phase",
    "read",
    [[Number(phaseId)], ["id", "name", "code", "project_id", "date_start", "date_end"]],
    { context: ctx }
  );
  const phase = Array.isArray(phaseRows) && phaseRows[0] ? phaseRows[0] : null;
  if (!phase) return { projectId: false, ticketIds: [] };

  const projectM2o = Array.isArray(phase.project_id) ? phase.project_id[0] : phase.project_id || false;
  const projectId = Number(projectM2o) || false;

  const candidates = new Set();

  // 1) Direct relation: helpdesk.ticket.phase_id = phase.id
  try {
    const rows = await callOdoo(
      session_id,
      "helpdesk.ticket",
      "search_read",
      [[["phase_id", "=", Number(phaseId)], ["stage_id.fold", "=", false]], ["id"]],
      { context: ctx }
    );
    (rows || []).forEach((r) => candidates.add(r.id));
  } catch (e1) {
    // 1b) Custom field x_phase_id (some DBs)
    try {
      const rowsX = await callOdoo(
        session_id,
        "helpdesk.ticket",
        "search_read",
        [[["x_phase_id", "=", Number(phaseId)], ["stage_id.fold", "=", false]], ["id"]],
        { context: ctx }
      );
      (rowsX || []).forEach((r) => candidates.add(r.id));
    } catch (e2) {
      console.warn("[TICKETS] Neither phase_id nor x_phase_id relation available on helpdesk.ticket.");
    }
  }

  // 2) Parse phase name/code for explicit ticket numbers
  const parsed = extractTicketIdsFromText(phase.name, phase.code);
  parsed.forEach((id) => candidates.add(id));

  // Validate openness (+same project if possible)
  const valid = await ensureOpenTickets(session_id, [...candidates], ctx, projectId);
  return { projectId, ticketIds: valid };
}

const chunk = (arr, size = 100) => { const out = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out; };
const nowStr = () => { const d = new Date(); const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const ensureInt = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : false; };

function m2oId(v) { if (Array.isArray(v)) return v[0] || false; if (typeof v === "number") return v; return false; }
function normalizeTaxes(val) {
  if (Array.isArray(val) && val.length && Array.isArray(val[0])) return val;
  if (Array.isArray(val)) { const ids = val.filter((x) => typeof x === "number"); return ids.length ? [[6, 0, ids]] : []; }
  return [];
}

/**
 * Sanitize a purchase.order.line dict for create.
 * Removes server-managed/irrelevant keys and forces numeric fields.
 */
function stripLineForCreate(line, { fallbackUomId } = {}) {
  const out = { ...line };
  delete out.order_id; delete out.company_id; delete out.currency_id; delete out.invoice_lines; delete out.move_ids;
  delete out.state; delete out.price_total; delete out.price_subtotal; delete out.qty_invoiced; delete out.qty_received;
  delete out.qty_received_method; delete out.analytic_precision; delete out.forecasted_issue;
  delete out.tax_calculation_rounding_method; delete out.grps_id; delete out.grps_qty_ids; delete out.product_uom_category_id;
  const uom = m2oId(out.product_uom); out.product_uom = uom || fallbackUomId || false;
  out.product_packaging_id = m2oId(out.product_packaging_id) || false;
  out.project_id = m2oId(out.project_id) || out.project_id || false;
  out.phase_id = m2oId(out.phase_id) || false;
  out.task_id = m2oId(out.task_id) || false;
  out.taxes_id = normalizeTaxes(out.taxes_id);
  out.move_dest_ids = [];
  out.product_qty = Number(out.product_qty) || 1;
  out.price_unit = Number(out.price_unit) || 0;
  return out;
}

/**
 * Ensure all items are product.product ids; map product.template -> variant if needed.
 * Returns a mapping from incoming id -> product.product id.
 */
async function mapToVariantIds(session_id, ids, ctx) {
  const uniq = [...new Set((ids || []).map(Number).filter(Boolean))];
  if (!uniq.length) return {};
  const existing = new Set();
  for (const part of chunk(uniq)) {
    const res = await callOdoo(session_id, "product.product", "search_read", [[["id", "in", part]], ["id"]], { context: ctx });
    (res || []).forEach((r) => existing.add(r.id));
  }
  const missing = uniq.filter((id) => !existing.has(id));
  const mapping = {}; existing.forEach((id) => (mapping[id] = id));
  if (!missing.length) return mapping;
  for (const part of chunk(missing)) {
    const res = await callOdoo(session_id, "product.template", "search_read", [[["id", "in", part]], ["id", "product_variant_id"]], { context: ctx });
    (res || []).forEach((r) => {
      const pv = Array.isArray(r.product_variant_id) ? r.product_variant_id[0] : r.product_variant_id;
      if (pv) mapping[r.id] = pv;
    });
  }
  const unresolved = missing.filter((id) => !mapping[id]);
  if (unresolved.length) throw new Error(`These product ids are not product.product and have no variant: ${unresolved.join(", ")}`);
  return mapping;
}

/** Read the company's currency_id, returns numeric id or false. */
async function getCompanyCurrencyId(session_id, companyId, ctx) {
  const res = await callOdoo(session_id, "res.company", "read", [[companyId], ["currency_id"]], { context: ctx });
  const m2o = res?.[0]?.currency_id; return Array.isArray(m2o) ? m2o[0] : m2o || false;
}

/** Read product uom and name basics for a set of product.product ids. */
async function getProductBasics(session_id, productIds, ctx) {
  const uomMap = {}, nameMap = {};
  const uniq = [...new Set((productIds || []).map(Number).filter(Boolean))];
  for (const part of chunk(uniq)) {
    const rows = await callOdoo(session_id, "product.product", "read", [part, ["id", "uom_po_id", "uom_id", "display_name"]], { context: ctx });
    (rows || []).forEach((r) => {
      const uomPo = m2oId(r.uom_po_id); const uom = m2oId(r.uom_id);
      uomMap[r.id] = uomPo || uom || false; nameMap[r.id] = r.display_name || String(r.id);
    });
  }
  return { uomMap, nameMap };
}









/**
 * Create Purchase (RFQ) via web_save.
 * - Validates session, vendor, optional M2Os.
 * - Maps products to variants.
 * - Auto-detects related Helpdesk tickets FROM THE SERVER, using the selected phase.
 */
export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const body = await req.json();
    console.log("[API] Incoming body:", safe(body));
    

    // ---- session ----
    const headerSession = req.headers.get("x-session-id") || req.headers.get("X-Session-Id") || "";
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieSession = (cookieHeader.match(/(?:^|;)\s*session_id=([^;]+)/) || [])[1];
    const session_id = headerSession || cookieSession;
    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 401, headers: corsHeaders });
    }

    // ---- context: user/company ----
    const uid = body?.userData?.uid ?? body?.user_id ?? 447;
    const companyId = body?.userData?.user_companies?.current_company ?? body?.company_id ?? 11;
    const baseCtx = { lang: "en_US", tz: "Africa/Casablanca", uid, allowed_company_ids: [companyId], force_company: companyId };

    // ---- vendor: dynamic with fallback ----
    const requestedVendorId = ensureInt(body.partner_id);
    let vendorId = await ensureVendor(session_id, requestedVendorId, baseCtx);
    if (!vendorId) {
      const fallback = await ensureVendor(session_id, SUPPLIER_PARTNER_ID, baseCtx);
      vendorId = fallback || SUPPLIER_PARTNER_ID;
      console.warn(`[API] Using fallback vendor_id=${vendorId} (default). Requested=${requestedVendorId || "none/invalid"}`);
    } else {
      console.log(`[API] Using requested vendor_id=${vendorId}`);
    }

    // ---- project/phase ----
    const globalPhaseId = body.phase_id || null;
    const projectIdFromBody = body.odoo_project_id || body.project_id || false;

    // If we have a phase, read it & auto-detect tickets server-side
    let detectedTicketIds = [];
    let projectId = projectIdFromBody || false;
    if (globalPhaseId) {
      const { projectId: pFromPhase, ticketIds } = await findTicketsForPhase(session_id, globalPhaseId, baseCtx);
      detectedTicketIds = ticketIds || [];
      projectId = projectId || pFromPhase || false;
      console.log("[TICKETS] Auto-detected from phase:", detectedTicketIds);
    }

    const analyticId = body.analytic_account_id || null;

    // ---- dates & misc ----
    const headerDateOrder = body.date_order || nowStr();
    const lineDatePlanned = body.date_planned || headerDateOrder;
    const origin = body.origin || false;

    const incotermLocation = body.incoterm_location || false;
    const incotermIdRaw = ensureInt(body.incoterm_id);
    const paymentTermIdRaw = ensureInt(body.payment_term_id);
    const fiscalPositionIdRaw = ensureInt(body.fiscal_position_id);

    const pickingTypeId = body?.knobs?.picking_type_id ?? 95;
    const notes = body?.knobs?.notes || false;

    // ---- OPTIONAL M2Os validation ----
    const [validIncotermId, validPaymentTermId, validFiscalPositionId] = await Promise.all([
      ensureM2OExists(session_id, "account.incoterms", incotermIdRaw, baseCtx),
      ensureM2OExists(session_id, "account.payment.term", paymentTermIdRaw, baseCtx),
      ensureM2OExists(session_id, "account.fiscal.position", fiscalPositionIdRaw, baseCtx),
    ]);
    console.log("[VALIDATED] incoterm_id:", validIncotermId, " payment_term_id:", validPaymentTermId, " fiscal_position_id:", validFiscalPositionId);

    // ---- currency ----
    const currencyId = await getCompanyCurrencyId(session_id, companyId, baseCtx);

    // ---- product variants & basics ----
    const idMapping = await mapToVariantIds(session_id, (body.items || []).map((i) => i.id), baseCtx);
    const productIds = (body.items || []).map((it) => idMapping[it.id] || it.id).map(Number);
    const { uomMap, nameMap } = await getProductBasics(session_id, productIds, baseCtx);

    // ---- order header ----
    const orderVals = {
      partner_id: vendorId,
      company_id: companyId,
      currency_id: currencyId || false,
      picking_type_id: pickingTypeId,
      date_order: headerDateOrder,
      user_id: uid,
      priority: "0",
      notes,
    };

    // ---- order lines ----
    const order_lines = [];
    for (const [idx, it] of (body.items || []).entries()) {
      const productId = Number(idMapping[it.id] || it.id);
      const purchaseUomId = uomMap[productId] || false;
      const productName = nameMap[productId] || it.name || `[${productId}]`;

      const lineObj = stripLineForCreate(
        {
          display_type: false,
          sequence: (idx + 1) * 10,
          product_id: productId,
          name: productName,
          project_id: projectId || false,
          phase_id: globalPhaseId || false,
          task_id: false,
          date_planned: lineDatePlanned,
          planned_date: false,
          move_dest_ids: [],
          analytic_distribution: analyticId ? { [analyticId]: 100 } : {},
          product_qty: Number(it.quantity) || 1,
          product_uom: purchaseUomId || false,
          price_unit: Number(it.price) || 0,
          discount: 0,
          taxes_id: [],
        },
        { fallbackUomId: purchaseUomId || false }
      );
      order_lines.push([0, 0, lineObj]);
    }

    // ---- read-back spec ----
    const specification = {
      id: {},
      name: {},
      order_line: {
        fields: {
          id: {}, name: {},
          product_id: { fields: { display_name: {} } },
          product_qty: {}, price_unit: {},
          product_uom: { fields: { display_name: {} } },
          project_id: { fields: { display_name: {} } },
          phase_id: { fields: { display_name: {} } },
          date_planned: {},
        },
        limit: 40, order: "sequence ASC, id ASC",
      },
    };

    // ---- Other Information (header) ----
    const otherInfo = {
      origin: origin || false,
      incoterm_location: incotermLocation || false,
      project_id: projectId || false,
      phase_id: globalPhaseId || false,
    };
    if (validIncotermId) otherInfo.incoterm_id = validIncotermId;
    if (validPaymentTermId) otherInfo.payment_term_id = validPaymentTermId;
    if (validFiscalPositionId) otherInfo.fiscal_position_id = validFiscalPositionId;
    if (detectedTicketIds.length) otherInfo.ticket_ids = [[6, 0, detectedTicketIds]]; // auto-attached from phase on server

    // ---- payload ----
    const payload = {
      jsonrpc: "2.0",
      method: "call",
      id: Date.now(),
      params: {
        model: "purchase.order",
        method: "web_save",
        args: [
          [],
          {
            priority: "0",
            is_quantity_copy: false,
            partner_id: vendorId, // dynamic vendor applied
            partner_ref: false,
            requisition_id: false,
            to_review: false,
            prepaiement: false,
            promise_to_pay: false,
            currency_id: currencyId || false,
            opportunity_id: false,
            company_id: companyId,
            date_order: orderVals.date_order,
            status_date: false,
            user_ids: [[4, uid]],
            picking_type_id: pickingTypeId,
            attente_retour_fr: false,
            dest_address_id: false,
            order_line: order_lines,
            user_id: uid,

            ...otherInfo, // includes auto-detected ticket_ids if any

            notes,
            alias_id: false,
            alias_name: false,
            alias_contact: "everyone",
            lead_id: false,
            po_timesheet_ids: [],
          },
        ],
        kwargs: {
          context: {
            ...baseCtx,
            params: { cids: companyId, menu_id: 330, action: 492, model: "purchase.order", view_type: "form" },
            quotation_only: true,
            res_partner_search_mode: "supplier",
            show_vat: true,
          },
          specification,
        },
      },
    };

    // (optional) compact log
    const payloadSummary = {
      ...payload,
      params: { ...payload.params, args: [[], { ...payload.params.args[1], order_line: `(${order_lines.length} lines)` }] },
    };
    console.log("[API] Payload summary ->", safe(payloadSummary));

    // ---- RPC ----
    const headers = { "Content-Type": "application/json", Accept: "application/json", Cookie: `session_id=${session_id}` };
    const { data } = await axios.post(`${ODOO_BASE}/purchase.order/web_save`, payload, { headers });
    if (data?.error) {
      const msg = data.error?.data?.message || data.error?.message || "Odoo error";
      const dbg = data.error?.data?.debug;
      throw new Error(`${msg}${dbg ? `\n${dbg}` : ""}`);
    }
  



    return NextResponse.json(
      { success: true, message: "Purchase created successfully", data: data.result },
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error("Error during purchase creation:", error?.stack || error);
    return NextResponse.json(
      { error: "Purchase creation failed", details: String(error?.message || error) },
      { status: 500, headers: corsHeaders }
    );
  }
}

/** CORS preflight. */
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}
