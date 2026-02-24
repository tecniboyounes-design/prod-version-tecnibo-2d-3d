import axios from "axios";
import { NextResponse } from "next/server";
import { createPayload } from "./searchProjectPayload";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { getCookie } from "@/lib/cookies";

/* ===================== CONFIG ===================== */
const ODOO_BASE = (
  process.env.ODOO_BASE || "https://www.tecnibo.com"
).replace(/\/+$/, "");
const RELATIVE_PATH = "web/dataset/call_kw/project.project/web_search_read";

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

/**
 * /api/searchProject
 * Accepts POST with optional filters, extracts session_id cookie,
 * then calls Odoo web_search_read to get project list.
 */


export async function POST(request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    // Optional logging
    const requestBody = await request.json().catch(() => ({}));
    console.log("[/api/searchProject] Incoming request:", requestBody);

    // 🔹 Extract session ID from cookie
    const sessionId = getCookie(request, 'session_id');
    console.log("[/api/searchProject] session_id:", sessionId);
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 401, headers: corsHeaders }
      );
    }

    // Prepare payload and URL
    const url = `${ODOO_BASE}/${RELATIVE_PATH}`;
    const jsonPayload = JSON.parse(createPayload()); // fetch all projects

    // 🔹 Call Odoo JSON-RPC API
    const response = await axios.post(url, jsonPayload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `session_id=${sessionId}; frontend_lang=fr_BE; tz=Africa/Casablanca`,
      },
    });

    console.log("[/api/searchProject] Response from Odoo:", response.data);

    if (response.data?.error) {
      console.error("Odoo API Error:", response.data.error);
      return NextResponse.json(
        { error: "Error fetching projects", details: response.data.error },
        { status: 500, headers: corsHeaders }
      );
    }

    // Success — return the result
    return NextResponse.json(response.data.result, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    const upstreamStatus = Number(error?.response?.status) || 500;
    const details = error?.response?.data ?? null;
    console.error("[/api/searchProject] Request Error:", error?.message || error, details);
    return NextResponse.json(
      { error: error?.message || "Unknown error", details },
      { status: upstreamStatus, headers: corsHeaders }
    );
  }
}
