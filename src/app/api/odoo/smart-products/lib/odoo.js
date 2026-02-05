// src/app/api/odoo/smart-products/lib/odoo.js
import axios from "axios";

const ODOO_BASE = process.env.ODOO_BASE_URL || "https://erptest.tecnibo.com";

function log(...a) {
  console.log("[/api/odoo/smart-products][odoo]", ...a);
}

export function isAccessError(odooErr) {
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

/**
 * Odoo session info (company scope, language, tz, uid).
 * IMPORTANT: used to build correct context for stock quantities.
 */
export async function getSessionInfo({ sessionId }) {
  const url = `${ODOO_BASE}/web/session/get_session_info`;

  const res = await axios.post(
    url,
    {},
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionId}`,
        "X-Session-Id": sessionId,
      },
    }
  );

  const data = res.data || {};
  // Usually { result: {...} }
  return data.result || data;
}

/**
 * Build a safe Odoo context.
 * companyId MUST be allowed for the session user.
 */
function contextOf({ model, session, companyIdOverride, locationId }) {
  const uc = session?.user_context || {};
  const companies = session?.user_companies || {};
  const allowed = companies?.allowed_companies || {};
  const current = companies?.current_company;

  // Allowed company ids list
  const allowedIds = Object.keys(allowed)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n));

  // Pick companyId:
  // 1) override only if allowed
  // 2) else current_company
  // 3) else first allowed (fallback)
  let companyId = null;

  const override = Number(companyIdOverride);
  if (Number.isFinite(override) && allowedIds.includes(override)) {
    companyId = override;
  } else if (Number.isFinite(Number(current))) {
    companyId = Number(current);
  } else if (allowedIds.length) {
    companyId = allowedIds[0];
  }

  return {
    lang: uc.lang || "en_US",
    tz: uc.tz || "Africa/Casablanca",
    uid: uc.uid || session?.uid || 0,
    allowed_company_ids: companyId ? [companyId] : [],
    current_company_id: companyId || null,
    bin_size: true,
    params: { action: 2068, model, view_type: "list", cids: companyId || null, menu_id: 1722 },
    ...(locationId != null ? { location: locationId } : {}),
  };
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

// kept for SMART mode (don’t break it)
function buildOrDomain(leaves) {
  if (!leaves.length) return [];
  if (leaves.length === 1) return [leaves[0]];
  return [...Array(leaves.length - 1).fill("|"), ...leaves];
}
function buildAnd(extra, inner) {
  if (!extra) return inner;
  if (!inner.length) return [extra];
  return ["&", extra, ...inner];
}

export async function smartSearchOne({
  sessionId,
  model,
  q,
  limit = 80,
  offset = 0,
  requireImosTable = true,
  sessionInfo,           // <- pass from route (cached)
  companyIdOverride,     // <- optional query param
}) {
  try {
    const fg = await fieldsGet({ model, sessionId });
    if (fg?.error) {
      return {
        ok: false,
        status: isAccessError(fg.error) ? 403 : 502,
        error: "Odoo fields_get error",
        details: fg.error,
      };
    }

    const fields = fg?.result || fg;
    const has = (f) => !!fields?.[f];

    const leaves = [];
    if (has("default_code")) leaves.push(["default_code", "ilike", q]);
    if (has("product_variant_ids")) leaves.push(["product_variant_ids.default_code", "ilike", q]);
    if (has("name")) leaves.push(["name", "ilike", q]);
    if (has("barcode")) leaves.push(["barcode", "ilike", q]);

    if (!leaves.length) {
      return { ok: false, status: 400, error: `No searchable fields found on model ${model}` };
    }

    const orDomain = buildOrDomain(leaves);
    let domain = orDomain;
    if (requireImosTable && has("imos_table")) {
      domain = buildAnd(["imos_table", "!=", false], orDomain);
    }

    const searchUrl = `${ODOO_BASE}/web/dataset/call_kw/${encodeURIComponent(model)}/web_search_read`;

    const specification = {
      sequence: {},
      default_code: {},
      name: {},
      barcode: {},
      active: {},
      ...(has("product_variant_ids")
        ? { product_variant_ids: { fields: { id: {}, default_code: {}, display_name: {} } } }
        : {}),
      ...(has("imos_table") ? { imos_table: {} } : {}),
      ...(has("categ_id") ? { categ_id: { fields: { display_name: {} } } } : {}),
      ...(has("uom_id") ? { uom_id: { fields: { display_name: {} } } } : {}),
    };

    const ctx = contextOf({ model, session: sessionInfo, companyIdOverride });

    const payload = {
      id: 12,
      jsonrpc: "2.0",
      method: "call",
      params: {
        model,
        method: "web_search_read",
        args: [],
        kwargs: {
          specification,
          offset,
          order: "sequence ASC, id ASC",
          limit,
          context: ctx,
          count_limit: 10001,
          domain,
        },
      },
    };

    const data = await rpcPost({ url: searchUrl, payload, sessionId });
    if (data?.error) {
      return {
        ok: false,
        status: isAccessError(data.error) ? 403 : 502,
        error: "Odoo JSON-RPC error",
        details: data.error,
      };
    }

    const result = data?.result || {};
    return {
      ok: true,
      payload: { model, q, domain, length: result.length || 0, records: result.records || [] },
    };
  } catch (err) {
    return { ok: false, status: 500, error: err?.message || "Internal error" };
  }
}

export async function fetchTemplatesByMatchFieldBatched({
  sessionId,
  model = "product.template",
  matchField = "ref_imos",
  values = [],
  chunkSize = 80,
  requireImosTable = true,
  limitPerChunk = 5000,
  sessionInfo,        // <- cached
  companyIdOverride,  // <- optional
}) {
  const t0 = Date.now();

  if (!Array.isArray(values) || values.length === 0) {
    return {
      ok: true,
      payload: {
        model,
        match_field: matchField,
        chunks: 0,
        total_values: 0,
        domain_base: [],
        by_value: {},
        stats: { matched: 0, unmatched: 0, ambiguous: 0 },
        timing_ms: { total: Date.now() - t0 },
      },
    };
  }

  const fg = await fieldsGet({ model, sessionId });
  if (fg?.error) {
    return { ok: false, status: isAccessError(fg.error) ? 403 : 502, error: "Odoo fields_get error", details: fg.error };
  }

  const fields = fg?.result || fg;
  const has = (f) => !!fields?.[f];
  if (!has(matchField)) {
    return {
      ok: false,
      status: 400,
      error: `Model ${model} has no field "${matchField}"`,
      details: {
        hint: Object.keys(fields || {}).filter((k) => k.toLowerCase().includes("imos") || k.toLowerCase().includes("ref")).slice(0, 50),
      },
    };
  }

  const domainBase = [];
  if (requireImosTable && has("imos_table")) domainBase.push(["imos_table", "!=", false]);

  const specification = {
    id: {},
    name: {},
    active: {},
    ...(has("default_code") ? { default_code: {} } : {}),
    ...(has("barcode") ? { barcode: {} } : {}),
    ...(has("imos_table") ? { imos_table: {} } : {}),
    ...(has("imos_name") ? { imos_name: {} } : {}),
    ...(has("matched_info") ? { matched_info: {} } : {}),
    ...(has("matched_date") ? { matched_date: {} } : {}),
    ...(has("matched_bom") ? { matched_bom: {} } : {}),
    [matchField]: {},
    ...(has("product_variant_id")
      ? { product_variant_id: { fields: { id: {}, display_name: {}, default_code: {} } } }
      : {}),
    ...(has("categ_id") ? { categ_id: { fields: { id: {}, display_name: {} } } } : {}),
    ...(has("uom_id") ? { uom_id: { fields: { id: {}, display_name: {} } } } : {}),
  };

  const searchUrl = `${ODOO_BASE}/web/dataset/call_kw/${encodeURIComponent(model)}/web_search_read`;

  const chunks = [];
  for (let i = 0; i < values.length; i += chunkSize) chunks.push(values.slice(i, i + chunkSize));

  const byValue = new Map();
  values.forEach((v) => byValue.set(v, []));

  let rpcCount = 0;
  const tRpc0 = Date.now();

  const ctx = contextOf({ model, session: sessionInfo, companyIdOverride });

  for (let i = 0; i < chunks.length; i++) {
    const part = chunks[i];

    let domain = [[matchField, "in", part]];
    if (domainBase.length === 1) domain = ["&", domainBase[0], ...domain];
    if (domainBase.length > 1) domain = domainBase.reduceRight((acc, d) => ["&", d, ...acc], domain);

    log(`RPC chunk ${i + 1}/${chunks.length}`, { matchField, size: part.length, limitPerChunk, company: ctx.current_company_id });

    const payload = {
      id: 99,
      jsonrpc: "2.0",
      method: "call",
      params: {
        model,
        method: "web_search_read",
        args: [],
        kwargs: {
          specification,
          offset: 0,
          order: "id ASC",
          limit: limitPerChunk,
          context: ctx,
          count_limit: 10001,
          domain,
        },
      },
    };

    const data = await rpcPost({ url: searchUrl, payload, sessionId });
    rpcCount++;

    if (data?.error) {
      return { ok: false, status: isAccessError(data.error) ? 403 : 502, error: "Odoo JSON-RPC error", details: data.error };
    }

    const records = data?.result?.records || [];
    for (const rec of records) {
      const key = rec?.[matchField];
      if (!key) continue;
      if (!byValue.has(key)) byValue.set(key, []);
      byValue.get(key).push(rec);
    }
  }

  const t1 = Date.now();

  let matched = 0, unmatched = 0, ambiguous = 0;
  const out = {};
  for (const [k, recs] of byValue.entries()) {
    const length = recs.length;
    if (length === 0) unmatched++;
    else if (length === 1) matched++;
    else ambiguous++;

    out[k] = {
      ok: true,
      model,
      match_field: matchField,
      value: k,
      length,
      records: recs,
      status: length === 0 ? "not_found" : length === 1 ? "matched" : "ambiguous",
    };
  }

  return {
    ok: true,
    payload: {
      model,
      match_field: matchField,
      chunks: chunks.length,
      total_values: values.length,
      domain_base: domainBase,
      rpc_calls: rpcCount,
      by_value: out,
      stats: { matched, unmatched, ambiguous },
      timing_ms: { rpc_total: t1 - tRpc0, total: Date.now() - t0 },
      context_company_id: ctx.current_company_id,
    },
  };
}

export async function fetchProductStockByIdsBatched({
  sessionId,
  productIds = [],
  chunkSize = 200,
  sessionInfo,        // <- cached
  companyIdOverride,  // <- optional
  locationId,         // <- optional
}) {
  const t0 = Date.now();

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return { ok: true, payload: { by_id: {}, rpc_calls: 0, fetch_fields: [], timing_ms: { total: Date.now() - t0 } } };
  }

  const fields = ["qty_available", "virtual_available", "free_qty", "incoming_qty", "outgoing_qty"];
  const spec = { id: {} };
  for (const f of fields) spec[f] = {};

  const url = `${ODOO_BASE}/web/dataset/call_kw/product.product/web_search_read`;

  const chunks = [];
  for (let i = 0; i < productIds.length; i += chunkSize) chunks.push(productIds.slice(i, i + chunkSize));

  const byId = {};
  let rpcCalls = 0;
  const tRpc0 = Date.now();

  const ctx = contextOf({ model: "product.product", session: sessionInfo, companyIdOverride, locationId });

  for (let i = 0; i < chunks.length; i++) {
    const part = chunks[i];

    const payload = {
      id: 77,
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "product.product",
        method: "web_search_read",
        args: [],
        kwargs: {
          specification: spec,
          domain: [["id", "in", part]],
          order: "id ASC",
          offset: 0,
          limit: part.length,
          count_limit: 10001,
          context: ctx,
        },
      },
    };

    const data = await rpcPost({ url, payload, sessionId });
    rpcCalls++;

    if (data?.error) {
      return { ok: false, status: isAccessError(data.error) ? 403 : 502, error: "Odoo JSON-RPC error (stock)", details: data.error };
    }

    const records = data?.result?.records || [];
    for (const r of records) {
      if (!r?.id) continue;
      byId[r.id] = {
        qty_available: r.qty_available ?? null,
        free_qty: r.free_qty ?? null,
        virtual_available: r.virtual_available ?? null,
        incoming_qty: r.incoming_qty ?? null,
        outgoing_qty: r.outgoing_qty ?? null,
      };
    }
  }


  return {
    ok: true,
    payload: {
      by_id: byId,
      rpc_calls: rpcCalls,
      fetch_fields: fields,
      timing_ms: { rpc_total: Date.now() - tRpc0, total: Date.now() - t0 },
      context_company_id: ctx.current_company_id,
      context_location_id: locationId ?? null,
    },
  };
  
}
