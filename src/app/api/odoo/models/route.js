import { NextResponse } from "next/server";
import axios from "axios";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { getCookie } from "@/lib/cookies";

const ODOO_BASE = process.env.ODOO_BASE_URL || "http://192.168.30.33:8069";

function log(...a) {
  console.log("[/api/odoo-models]", ...a);
}

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

function contextOf() {
  return {
    lang: "en_US",
    tz: "Africa/Casablanca",
    uid: 447,
    allowed_company_ids: [11],
    current_company_id: 11,
    bin_size: true,
    params: { model: "ir.model", view_type: "list" },
  };
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

export async function GET(request) {
  const corsHeaders = getCorsHeaders(request);
  const url = new URL(request.url);

  try {
    const sessionId = getCookie(request, 'session_id');
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing x-session-id header" },
        { status: 400, headers: corsHeaders }
      );
    }

    const q = (url.searchParams.get("q") || "").trim();
    const limitQ = url.searchParams.get("limit");
    const limit = limitQ != null ? Number(limitQ) : 500; // default 500, because Odoo has a ton of models
    const offset = Number(url.searchParams.get("offset") || 0);

    // Domain: optional search by model or name
    const domain = [];
    if (q) {
      domain.push("|", ["model", "ilike", q], ["name", "ilike", q]);
    }

    const spec = {
      id: {},
      model: {},
      name: {},
    };

    const rpcUrl = `${ODOO_BASE}/web/dataset/call_kw/ir.model/web_search_read`;
    const payload = {
      id: 1,
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "ir.model",
        method: "web_search_read",
        args: [],
        kwargs: {
          specification: spec,
          domain,
          limit,
          offset,
          order: "model asc",
          context: contextOf(),
          count_limit: 10001,
        },
      },
    };

    log("Fetching models:", { q, limit, offset });

    const data = await rpcPost({ url: rpcUrl, payload, sessionId });
    if (data?.error) {
      return NextResponse.json(
        { success: false, error: "Odoo JSON-RPC error", details: data.error },
        { status: 502, headers: corsHeaders }
      );
    }

    const result = data?.result || {};
    const records = result?.records || [];
    const length = result?.length ?? records.length;

    return NextResponse.json(
      {
        success: true,
        q,
        offset,
        limit,
        length,
        records, // [{id, model, name}]
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    log("Exception:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
