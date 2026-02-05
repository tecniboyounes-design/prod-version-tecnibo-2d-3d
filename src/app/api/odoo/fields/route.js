import { NextResponse } from "next/server";
import axios from "axios";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

const ODOO_BASE = process.env.ODOO_BASE_URL || "http://192.168.30.33:8069";

function log(...a) {
  console.log("[/api/odoo-fields]", ...a);
}

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
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
    const sessionId = request.headers.get("x-session-id");
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing x-session-id header" },
        { status: 400, headers: corsHeaders }
      );
    }

    const model = (url.searchParams.get("model") || "").trim();
    if (!model) {
      return NextResponse.json(
        { success: false, error: "Missing ?model=" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Optional filters for UX
    const onlyStored = url.searchParams.get("onlyStored") === "1";
    const types = (url.searchParams.get("types") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean); // e.g. char,text,many2one,float,integer,boolean,date,datetime,selection

    const rpcUrl = `${ODOO_BASE}/web/dataset/call_kw/${encodeURIComponent(model)}/fields_get`;
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

    log("fields_get:", { model, onlyStored, types });

    const data = await rpcPost({ url: rpcUrl, payload, sessionId });
    if (data?.error) {
      return NextResponse.json(
        { success: false, error: "Odoo fields_get error", details: data.error },
        { status: 502, headers: corsHeaders }
      );
    }

    const fields = data?.result || {};
    let list = Object.entries(fields).map(([name, meta]) => ({
      name,
      label: meta?.string || name,
      type: meta?.type || null,
      store: !!meta?.store,
    }));

    if (onlyStored) list = list.filter((f) => f.store);
    if (types.length) list = list.filter((f) => types.includes(f.type));

    // sort: keep it stable and readable
    list.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(
      { success: true, model, count: list.length, fields: list },
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
