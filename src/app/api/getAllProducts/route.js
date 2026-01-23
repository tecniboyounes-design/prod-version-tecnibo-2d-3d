// app/api/getAllProducts/route.js
import { NextResponse } from "next/server";
import axios from "axios";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

/* ===================== CONFIG ===================== */
const ODOO_BASE = process.env.ODOO_URL;
if (!ODOO_BASE) throw new Error("[getAllProducts] ODOO_URL env is required");
const DEFAULT_MODEL = "imos.conndesc";
const DEFAULT_FIELD = "imos_order_id";
const DEFAULT_FLAGS = ["EQUIP_CAB", "WS_CAB"];
const DEFAULT_LIMIT = 0; // 0 = ALL

const BASE_SPEC_FIELDS = {
  id: {},
  product_id: { fields: { display_name: {} } },
  generic_id: { fields: { display_name: {} } },
  active: {},
  sequence: {},
  imos_article_id: {},
  imos_name: {},
  imos_order_id: {},
  imos_price: {},
  display_name: {},
};

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

function log(...a) { console.log("[/api/getAllProducts]", ...a); }

// treat flags with SQL wildcards (% or _) as raw LIKE patterns
function normalizeFlag(f, mode = "auto") {
  if (!f) return f;
  let s = f.trim();

  // Optional forcing (if you add ?flag_mode=..)
  if (mode === "plain") return s;              // exact substring, no changes
  if (mode === "tags") {                       // wrap explicitly as #FLAG#
    s = s.replace(/^#|#$/g, "");
    return `#${s}#`;
  }
  if (mode === "like") return s;               // keep raw LIKE pattern (NOT recommended with 'ilike')

  // AUTO:
  // 1) If user typed SQL wildcards, rely on ilike’s implicit %...% and REMOVE '%' so we don't fight Odoo's escaping.
  //    Keep '_' literal (we usually want the actual underscore in ORDER_ID like 'WS_').
  if (s.includes("%")) s = s.replace(/%/g, "");

  // 2) Do NOT wrap with '#...#' by default; substring 'EQUIP_CAB' still matches '#EQUIP_CAB#'.
  //    Just return the clean substring.
  // 3) Leave underscores as-is (literal underscore is what ORDER_ID contains).
  return s;
}


function buildDomain(flags, fieldName, hasActive) {
  const domain = [];
  if (hasActive) domain.push(["active", "=", true]);

  const orConds = (flags || []).map(f => [fieldName, "ilike", normalizeFlag(f)]);
  if (orConds.length === 0) return domain;
  if (orConds.length === 1) { domain.push(orConds[0]); return domain; }

  domain.push(...Array(orConds.length - 1).fill("|"));
  orConds.forEach(leaf => domain.push(leaf));
  return domain;
}

function kwargs({ specification, domain, limit, offset, context }) {
  return { specification, order: "", limit, offset, context, count_limit: 10001, domain };
}

function contextOf(model) {
  return {
    lang: "en_US",
    tz: "Africa/Casablanca",
    uid: 447,
    allowed_company_ids: [11],
    bin_size: true,
    params: { id: undefined, cids: 11, action: 2078, model, view_type: "list", menu_id: 697 },
    current_company_id: 11,
  };
}

async function rpcPost({ url, payload, sessionId }) {
  log("RPC ->", url, "method:", payload?.method, "model:", payload?.params?.model);
  const res = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionId}`,
      "X-Session-Id": sessionId,
    },
  });
  if (res.data?.error) log("RPC ERROR:", JSON.stringify(res.data.error, null, 2));
  return res.data;
}

async function fieldsGet({ model, sessionId }) {
  const url = `${ODOO_BASE}/web/dataset/call_kw/${encodeURIComponent(model)}/fields_get`;
  const payload = { id: 1, jsonrpc: "2.0", method: "call",
    params: { model, method: "fields_get", args: [], kwargs: { attributes: ["string","type","store"] } }
  };
  return rpcPost({ url, payload, sessionId });
}

export async function GET(request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const sessionId = request.headers.get("x-session-id");
    log("X-Session-Id:", sessionId);
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400, headers: corsHeaders });

    const url = new URL(request.url);
    const model  = (url.searchParams.get("model") || DEFAULT_MODEL).trim();
    const field  = (url.searchParams.get("field") || DEFAULT_FIELD).trim();
    const limitQ = url.searchParams.get("limit");
    const limit  = (limitQ != null) ? Number(limitQ) : DEFAULT_LIMIT; // 0 => ALL
    const offset = Number(url.searchParams.get("offset") || 0);

    const flagsCSV = (url.searchParams.get("flags") || "").split(",").map(s=>s.trim()).filter(Boolean);
    const flagsRep = url.searchParams.getAll("flag").map(s=>s.trim());
    const flags    = (flagsCSV.length ? flagsCSV : flagsRep.length ? flagsRep : DEFAULT_FLAGS);

    const include  = (url.searchParams.get("include") || "").split(",").map(s=>s.trim()).filter(Boolean);
    const q        = url.searchParams.get("q"); // accepted but not used for now (kept for compat)

    log("Params:", { model, field, flags, limit, offset, include, q });

    const fg = await fieldsGet({ model, sessionId });
    if (fg?.error) return NextResponse.json({ error: "Odoo fields_get error", details: fg.error }, { status: 502, headers: corsHeaders });
    const fields = fg?.result || fg;
    const hasField = !!fields?.[field];
    const hasActive = !!fields?.active;
    if (!hasField) {
      const hint = Object.keys(fields||{}).filter(k => k.toLowerCase().includes("order"));
      return NextResponse.json({ error: `Invalid field ${model}.${field}`, hint: hint.slice(0,50) }, { status: 400, headers: corsHeaders });
    }
    
    const spec = { ...BASE_SPEC_FIELDS, [field]: BASE_SPEC_FIELDS[field] || {} };
    include.forEach(f => { if (fields[f]) spec[f] = spec[f] || {}; });

    const domain = buildDomain(flags, field, hasActive);
    log("Domain:", JSON.stringify(domain));
   
    const ctx = contextOf(model);
    const searchUrl = `${ODOO_BASE}/web/dataset/call_kw/${encodeURIComponent(model)}/web_search_read`;
    const payload = {
      id: 9, jsonrpc: "2.0", method: "call",
      params: { model, method: "web_search_read", args: [], kwargs: kwargs({ specification: spec, domain, limit, offset, context: ctx }) }
    };
   
    const data = await rpcPost({ url: searchUrl, payload, sessionId });
    if (data?.error) return NextResponse.json({ error: "Odoo JSON-RPC error", details: data.error }, { status: 502, headers: corsHeaders });

    const result  = data?.result;
    const records = result?.records || (Array.isArray(result) ? result : []);
    const length  = (typeof result?.length === "number") ? result.length : records.length;

  return NextResponse.json(
  {
    success: true,
    model,
    field,
    flags: flags.map((f) => normalizeFlag(f)), // shows effective patterns
    domain,
    length,
    records,
  },
  { status: 200, headers: corsHeaders }
);

  } catch (err) {
    log("Exception:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
