// src/app/api/odoo/smart-products/product-variant/[id]/route.js
import { NextResponse } from "next/server";
import axios from "axios";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export const runtime = "nodejs";

const ODOO_BASE = process.env.ODOO_BASE_URL || "https://erptest.tecnibo.com";
const MODEL = "product.product";



function log(...a) {
  console.log("[/api/odoo/smart-products/product-variant]", ...a);
}


// Same context vibe you used before
function contextOf(model) {
  return {
    lang: "en_US",
    tz: "Africa/Casablanca",
    uid: 447,
    allowed_company_ids: [11],
    bin_size: true,
    params: { model, view_type: "form", cids: 11 },
    current_company_id: 11,
  };
}

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

function isAccessError(odooErr) {
  const name = odooErr?.data?.name || "";
  const msg = odooErr?.data?.message || odooErr?.message || "";
  return (
    String(name).includes("odoo.exceptions.AccessError") ||
    String(msg).toLowerCase().includes("not allowed to access")
  );
}

async function rpcPost({ url, payload, sessionId }) {
  const res = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionId}`,
      "X-Session-Id": sessionId,
    },
  });
  return res.data;
}

async function fieldsGet({ model, sessionId }) {
  const url = `${ODOO_BASE}/web/dataset/call_kw/${encodeURIComponent(model)}/fields_get`;
  const payload = {
    id: 1,
    jsonrpc: "2.0",
    method: "call",
    params: {
      model,
      method: "fields_get",
      args: [],
      kwargs: { attributes: ["string", "type", "store"] },
    },
  };
  return rpcPost({ url, payload, sessionId });
}

function pickExistingFields(allFields, wanted) {
  const set = new Set(Object.keys(allFields || {}));
  return wanted.filter((f) => set.has(f));
}



export async function GET(request, { params }) {
  const corsHeaders = getCorsHeaders(request);
  const url = new URL(request.url);

  try {
    const sessionId =
      request.headers.get("x-session-id") || request.headers.get("X-Session-Id");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing X-Session-Id" },
        { status: 400, headers: corsHeaders }
      );
    }

    const rawId = params?.id;
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid variant id (must be a positive number)" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Allow caller to specify fields (?fields=a,b,c), otherwise use a solid default set
    const requestedFields = (url.searchParams.get("fields") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const defaultWanted = [
      "id",
      "display_name",
      "default_code",
      "barcode",
      "active",
      "product_tmpl_id",
      "categ_id",
      "uom_id",
      "uom_po_id",
      "list_price",
      "standard_price",
      "qty_available",
      "virtual_available",
      "free_qty",
      "sale_ok",
      "purchase_ok",
      "type",
      "weight",
      "volume",
      "description",
      "description_sale",
      "description_purchase",
      "image_128",
      "image_256",
      "image_512",
      "image_1024",
      "image_1920",
      // variant bits (not always present depending on modules)
      "product_template_attribute_value_ids",
      "product_template_variant_value_ids",
      "attribute_value_ids",
    ];

    // 1) Discover real fields to avoid “unknown field” explosions
    const fg = await fieldsGet({ model: MODEL, sessionId });
    if (fg?.error) {
      return NextResponse.json(
        { success: false, error: "Odoo fields_get error", details: fg.error },
        { status: isAccessError(fg.error) ? 403 : 502, headers: corsHeaders }
      );
    }

    const fields = fg?.result || fg;
    const wanted = requestedFields.length ? requestedFields : defaultWanted;
    const safeFields = pickExistingFields(fields, wanted);

    if (!safeFields.length) {
      return NextResponse.json(
        { success: false, error: "No valid fields to read on product.product" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2) Read by ID
    const readUrl = `${ODOO_BASE}/web/dataset/call_kw/${encodeURIComponent(MODEL)}/read`;

    const payload = {
      id: 2,
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: MODEL,
        method: "read",
        args: [[id]],
        kwargs: {
          fields: safeFields,
          context: contextOf(MODEL),
        },
      },
    };

    log("read", { id, fields: safeFields.length });

    const data = await rpcPost({ url: readUrl, payload, sessionId });

    if (data?.error) {
      return NextResponse.json(
        { success: false, error: "Odoo JSON-RPC error", details: data.error },
        { status: isAccessError(data.error) ? 403 : 502, headers: corsHeaders }
      );
    }

    const records = Array.isArray(data?.result) ? data.result : [];
    const record = records[0] || null;

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Not found", id },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        model: MODEL,
        id,
        fields: safeFields,
        record,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    log("Exception:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
