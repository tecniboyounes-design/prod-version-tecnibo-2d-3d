// /app/api/searchVendors/route.js
import axios from "axios";
import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { getCookie } from "@/lib/cookies";

const ODOO_BASE = (
  process.env.ODOO_BASE || "https://www.tecnibo.com"
).replace(/\/+$/, "");
const ODOO_URL = `${ODOO_BASE}/web/dataset/call_kw/res.partner/web_search_read`;

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

function createVendorPayload({ companyId, q = "", limit = 20 }) {
  const companyIdNum = Number(companyId);
  const hasCompanyId = Number.isFinite(companyIdNum) && companyIdNum > 0;

  // Domain: vendor + active. Company scope is optional.
  const baseDomain = hasCompanyId
    ? [
        "&",
        "&",
        ["supplier_rank", ">", 0],
        ["active", "=", true],
        "|",
        ["company_id", "=", false],
        ["company_id", "parent_of", [companyIdNum]],
      ]
    : ["&", ["supplier_rank", ">", 0], ["active", "=", true]];

  const domain = q
    ? ["&", ["name", "ilike", q], ...baseDomain]
    : baseDomain;

  return {
    id: Date.now(),
    jsonrpc: "2.0",
    method: "call",
    params: {
      model: "res.partner",
      method: "web_search_read",
      args: [],
      kwargs: {
        specification: {
          id: {},
          display_name: {},
          vat: {},
          is_company: {},
          supplier_rank: {},
          commercial_partner_id: { fields: { display_name: {} } },
        },
        offset: 0,
        order: "display_name asc",
        limit,
        context: {
          lang: "en_US",
          tz: "Africa/Casablanca",
          // uid is inferred from session; allowed companies come from session too
          res_partner_search_mode: "supplier",
          show_vat: true,
          params: { model: "res.partner", view_type: "search" },
        },
        count_limit: 10001,
        domain,
      },
    },
  };
}

export async function POST(request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    // 🔹 Session from cookie helper (shared across APIs)
    const sessionId = getCookie(request, 'session_id');
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { q = "", limit = 20, companyId } = body || {};
    const limitNum = Number(limit);
    const safeLimit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 500) : 20;

    // If companyId not provided by client, Odoo ACLs still scope results via session.
    const payload = createVendorPayload({ companyId, q, limit: safeLimit });

    const { data } = await axios.post(ODOO_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // 🔹 Forward session as cookie (Odoo expects this)
        Cookie: `session_id=${sessionId}; frontend_lang=en_US; tz=Africa/Casablanca`,
        // Optional but nice for debugging/consistency
        "X-Session-Id": sessionId,
      },
    });

    if (data?.error) {
      return NextResponse.json(
        { error: "Odoo error", details: data.error },
        { status: 500, headers: corsHeaders }
      );
    }

    const result = data?.result || {};
    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (e) {
    const upstreamStatus = Number(e?.response?.status) || 500;
    const details = e?.response?.data ?? String(e?.message || e);
    return NextResponse.json(
      { error: "Vendor search failed", details },
      { status: upstreamStatus, headers: corsHeaders }
    );
  }
}
