// src/app/api/odoo/smart-products/route.js
import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { getCookie } from "@/lib/cookies";

import { CATEGORY_ORDER_ID_MAP } from "./categories";
import { fetchConndescWsRows } from "./lib/db";
import { buildTagToCategoryIndex, groupRowsByCategory } from "./lib/categorize";
import { uniq } from "./lib/utils";
import {
  getSessionInfo,
  smartSearchOne,
  isAccessError,
  fetchTemplatesByMatchFieldBatched,
  fetchProductStockByIdsBatched,
  fetchSupplierinfoByIdsBatched,
} from "./lib/odoo";

import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const DEFAULT_MODEL = "product.template";
const LOG_DIR = "/home/yattaoui/tecnibo-2d-3d-clone/odooimoscondesclog";

function log(...a) {
  console.log("[/api/odoo/smart-products]", ...a);
}

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

async function writeLastResponseToFile({ filePath, payload }) {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
    log("✅ Logged response to:", filePath);
  } catch (e) {
    log("⚠️ Failed to write log file:", e?.message || e);
  }
}

function makeDefaultLogFile() {
  return path.join(LOG_DIR, `${Date.now()}.json`);
}

/**
 * Odoo Many2one normalizer -> numeric id or null
 * Supports:
 * - [id, "name"]
 * - {id, display_name}
 * - number
 */
function m2oToId(v) {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] || null;
  if (typeof v === "object") return v.id || null;
  if (typeof v === "number") return v;
  return null;
}

function m2oToPair(v) {
  if (!v) return null;
  if (Array.isArray(v)) return [v[0] || null, v[1] || null];
  if (typeof v === "object") return [v.id || null, v.display_name || null];
  if (typeof v === "number") return [v, null];
  return null;
}

function uniqArr(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

/**
 * ✅ normalize seller_ids from ALL Odoo shapes:
 * - [1,2,3]
 * - { records: [{id:1},{id:2}], length: 2 }
 * - { ids: [1,2] }
 * - [{id:1},{id:2}]
 */
function normalizeSellerIds(val) {
  if (!val) return [];

  const arr = Array.isArray(val)
    ? val
    : Array.isArray(val?.records)
      ? val.records
      : Array.isArray(val?.ids)
        ? val.ids
        : [];

  return arr
    .map((x) => {
      if (typeof x === "number") return x;
      if (typeof x === "string") return Number(x) || null;
      if (Array.isArray(x)) return Number(x[0]) || null;
      if (typeof x === "object") return Number(x.id) || null;
      return null;
    })
    .filter(Boolean);
}

/**
 * Attach vendors from supplierinfo (product.supplierinfo) onto template records.
 * Requires templateRecord.seller_ids to be present (list of supplierinfo ids).
 */
function attachVendorsFromSupplierinfo(templateRecs, supplierById) {
  return (templateRecs || []).map((r0) => {
    const r = { ...r0 };

    const sellerIds = normalizeSellerIds(r.seller_ids);

    const vendors = sellerIds
      .map((id) => {
        const s = supplierById?.[id];
        if (!s) {
          return {
            id,
            partner_id: null,
            product_tmpl_id: null,
            product_id: null,
            min_qty: null,
            price: null,
            delay: null,
            sequence: null,
            company_id: null,
          };
        }
        return {
          id: s.id ?? id,
          partner_id: m2oToPair(s.partner_id),
          product_tmpl_id: m2oToPair(s.product_tmpl_id),
          product_id: m2oToPair(s.product_id),
          min_qty: s.min_qty ?? null,
          price: s.price ?? null,
          delay: s.delay ?? null,
          sequence: s.sequence ?? null,
          company_id: m2oToPair(s.company_id),
        };
      })
      .filter(Boolean);

    const vendorPartnerIds = uniqArr(vendors.map((v) => v.partner_id?.[0]));

    // primary = lowest sequence (or first) that has partner
    const vendorPrimary =
      vendors
        .filter((v) => v.partner_id?.[0])
        .sort((a, b) => (a.sequence ?? 999999) - (b.sequence ?? 999999))[0] || null;

    return {
      ...r,
      vendors,
      vendor_partner_ids: vendorPartnerIds,
      vendor_primary: vendorPrimary,
    };
  });
}

/**
 * Odoo-style OR domain builder:
 * flags=["A","B"] => ["&", ["active","=",true], "|", ["imos_order_id","ilike","A"], ["imos_order_id","ilike","B"]]
 */
function buildOrDomainFromFlags(fieldName, flags) {
  const clean = (flags || [])
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!clean.length) return [["active", "=", true]];

  const leaves = clean.map((f) => [fieldName, "ilike", f]);
  const or =
    leaves.length === 1
      ? [leaves[0]]
      : [...Array(leaves.length - 1).fill("|"), ...leaves];

  return ["&", ["active", "=", true], ...or];
}

/**
 * Flatten batched matcher output and inject cfg_name + routing (from helper DB by match value).
 * Keeps first non-null cfg_name / routing per template id.
 */
function flattenMatchedRecordsWithCfg(byValue, cfgByValue, routingByValue, matchField) {
  const out = [];
  const seen = new Map(); // templateId -> index

  for (const bucket of Object.values(byValue || {})) {
    const records = bucket?.records || [];
    for (const r0 of records) {
      const r = { ...r0 };

      const key = r?.[matchField];

      const cfgName = cfgByValue?.get?.(key) ?? null;
      r.cfg_name = cfgName;

      const routing = routingByValue?.get?.(key) ?? null;
      r.routing = routing;

      const id = r?.id;
      if (!id) continue;

      if (!seen.has(id)) {
        seen.set(id, out.length);
        out.push(r);
        continue;
      }

      const idx = seen.get(id);
      const existing = out[idx];

      if ((existing?.cfg_name == null || existing?.cfg_name === "") && cfgName) {
        out[idx] = { ...existing, cfg_name: cfgName };
      }

      if ((existing?.routing == null || existing?.routing === "") && routing) {
        out[idx] = { ...out[idx], routing };
      }
    }
  }

  return out;
}

/**
 * Normalize product_variant_id for CreateSubSO alignment
 * We want a single numeric "product_variant_id" (product.product id).
 */
function normalizeVariantIdOnTemplateRecord(rec) {
  const out = { ...rec };

  const pv1 = m2oToId(out.product_variant_id);

  let pv2 = null;
  if (Array.isArray(out.product_variant_ids) && out.product_variant_ids.length) {
    const first = out.product_variant_ids[0];
    pv2 = typeof first === "number" ? first : first?.id || null;
  }

  out.product_variant_id = pv1 || pv2 || null;
  return out;
}

/**
 * Normalize stock payload to stable shape (nulls allowed)
 */
function normalizeStockRow(s) {
  return {
    qty_available: s?.qty_available ?? null,
    free_qty: s?.free_qty ?? null,
    virtual_available: s?.virtual_available ?? null,
    incoming_qty: s?.incoming_qty ?? null,
    outgoing_qty: s?.outgoing_qty ?? null,
  };
}

/**
 * Detect if a helper row is a "special product row" (no ref_imos).
 * We key it by order_id = ODOO:PRODUCT (as you inserted).
 */
function isOdooProductRow(row) {
  const oid = String(row?.order_id || "").toUpperCase();
  return oid.includes("ODOO:PRODUCT");
}

/**
 * Modes:
 * - Smart (default): /api/odoo/smart-products?q=KU15RA65
 * - WS reverse:      /api/odoo/smart-products?mode=ws
 * - Flat:            /api/odoo/smart-products?mode=flat
 */
export async function GET(request) {
  const corsHeaders = getCorsHeaders(request);
  const url = new URL(request.url);

  const tAll0 = Date.now();

  try {
    const sessionId = getCookie(request, 'session_id');
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing X-Session-Id" },
        { status: 400, headers: corsHeaders }
      );
    }

    const mode = (url.searchParams.get("mode") || "").trim().toLowerCase();
    const flatMode = mode === "flat" || url.searchParams.get("flat") === "1";
    const q = (url.searchParams.get("q") || "").trim();

    const includeStock = url.searchParams.get("include_stock") === "1";
    const includeVendors = url.searchParams.get("include_vendors") !== "0";

    const companyIdOverrideRaw = url.searchParams.get("company_id");
    const companyIdOverride = companyIdOverrideRaw ? Number(companyIdOverrideRaw) : undefined;

    const shouldLog = url.searchParams.get("log") === "1";
    const logFile = (url.searchParams.get("log_file") || makeDefaultLogFile()).trim();

    // fetch session info once (so context is correct)
    const tSess0 = Date.now();
    const sessionInfo = await getSessionInfo({ sessionId });
    const tSess1 = Date.now();

    // -------------------------------
    // SMART mode (unchanged)
    // -------------------------------
    if (q && mode !== "ws" && mode !== "flat") {
      const model = (url.searchParams.get("model") || DEFAULT_MODEL).trim();
      const limit = Number(url.searchParams.get("limit") || 80);
      const offset = Number(url.searchParams.get("offset") || 0);
      const requireImosTable = url.searchParams.get("imos_table") !== "0";

      log("SMART Params:", {
        model,
        q,
        limit,
        offset,
        requireImosTable,
        includeVendors,
        companyIdOverride,
        shouldLog,
        logFile,
      });

      const result = await smartSearchOne({
        sessionId,
        model,
        q,
        limit,
        offset,
        requireImosTable,
        sessionInfo,
        companyIdOverride,
      });

      if (!result.ok && result.details && isAccessError(result.details)) {
        const payload = {
          success: false,
          mode: "smart",
          error: result.error || "Access denied by Odoo",
          details: result.details,
          timing_ms: { session: tSess1 - tSess0, total: Date.now() - tAll0 },
        };
        if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });
        return NextResponse.json(payload, { status: 403, headers: corsHeaders });
      }

      let records = (result.payload?.records || []).map(normalizeVariantIdOnTemplateRecord);

      // Vendor hydration (supplierinfo)
      let vendorMeta = null;
      const tVend0 = Date.now();

      if (includeVendors) {
        const sellerIds = records
          .flatMap((r) => normalizeSellerIds(r.seller_ids))
          .map(Number)
          .filter(Boolean);

        const suppRes = await fetchSupplierinfoByIdsBatched({
          sessionId,
          sellerIds,
          chunkSize: 200,
          sessionInfo,
          companyIdOverride,
        });

        if (suppRes.ok) {
          records = attachVendorsFromSupplierinfo(records, suppRes.payload.by_id || {});
          vendorMeta = {
            ok: true,
            rpc_calls: suppRes.payload.rpc_calls,
            timing_ms: suppRes.payload.timing_ms,
            context_company_id: suppRes.payload.context_company_id,
          };
        } else {
          records = records.map((r) => ({
            ...r,
            vendors: [],
            vendor_partner_ids: [],
            vendor_primary: null,
          }));
          vendorMeta = {
            ok: false,
            error: suppRes.error,
            status: suppRes.status,
          };
        }
      } else {
        records = records.map((r) => ({
          ...r,
          vendors: [],
          vendor_partner_ids: [],
          vendor_primary: null,
        }));
      }

      const payload = {
        success: result.ok,
        mode: "smart",
        model,
        q,
        ...(result.payload || {}),
        records,
        meta: {
          ...(result.payload?.meta || {}),
          vendors: includeVendors ? vendorMeta : null,
        },
        timing_ms: {
          session: tSess1 - tSess0,
          vendors: includeVendors ? Date.now() - tVend0 : 0,
          total: Date.now() - tAll0,
        },
      };

      if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });

      return NextResponse.json(payload, {
        status: result.ok ? 200 : result.status || 502,
        headers: corsHeaders,
      });
    }

    // -------------------------------
    // WS/FLAT reverse mode
    // -------------------------------
    const model = (url.searchParams.get("model") || DEFAULT_MODEL).trim();

    // DB controls
    const limitRowsRaw = url.searchParams.get("limit_rows");
    let limitRows = limitRowsRaw == null ? 500 : Number(limitRowsRaw);
    if (!Number.isFinite(limitRows)) limitRows = 500;
    if (limitRows === 0) limitRows = 1000000;

    const offsetRows = Number(url.searchParams.get("offset_rows") || 0);

    const wsLike = (url.searchParams.get("ws_like") || "WS").trim();

    const includeOdoo = url.searchParams.get("include_odoo") !== "0";
    const requireImosTable = url.searchParams.get("imos_table") !== "0";
    const onlyCategory = (url.searchParams.get("only_category") || "").trim();

    // default deterministic match field for normal rows
    const matchField = (url.searchParams.get("match_field") || "ref_imos").trim();

    const odooChunk = Math.max(1, Number(url.searchParams.get("odoo_chunk") || 80));
    const limitPerChunk = Math.max(
      1,
      Number(url.searchParams.get("odoo_limit_per_chunk") || 5000)
    );

    log("WS/FLAT Params:", {
      mode: flatMode ? "flat" : "ws",
      model,
      wsLike,
      limitRows,
      offsetRows,
      includeOdoo,
      requireImosTable,
      onlyCategory,
      matchField,
      odooChunk,
      limitPerChunk,
      includeStock,
      includeVendors,
      companyIdOverride,
      shouldLog,
      logFile,
    });

    // Step 1: DB fetch
    const tDb0 = Date.now();
    const conndescRows = await fetchConndescWsRows({
      wsLike,
      limit: limitRows,
      offset: offsetRows,
    });
    const tDb1 = Date.now();
    log("Step1 DB:", { rows: conndescRows.length, ms: tDb1 - tDb0 });

    // cfg_name + routing map by article_id (match value)
    // IMPORTANT: we key by the "value we will match with"
    // - normal: key = row.article_id (ref_imos values)
    // - special product: key = row.article_id (template id)
    const cfgByValue = new Map();
    const routingByValue = new Map();

    for (const r of conndescRows) {
      const k = r?.article_id;
      if (!k) continue;

      if (!cfgByValue.has(k)) cfgByValue.set(k, r?.cfg_name ?? null);
      else {
        const existing = cfgByValue.get(k);
        if ((existing == null || existing === "") && r?.cfg_name) {
          cfgByValue.set(k, r.cfg_name);
        }
      }

      if (!routingByValue.has(k)) routingByValue.set(k, r?.routing ?? "odoo");
      else {
        const existingR = routingByValue.get(k);
        if ((existingR == null || existingR === "") && r?.routing) {
          routingByValue.set(k, r.routing);
        }
      }
    }

    // Step 2: categorize
    const tCat0 = Date.now();
    const tagIndex = buildTagToCategoryIndex(CATEGORY_ORDER_ID_MAP);
    const grouped = groupRowsByCategory(conndescRows, tagIndex);

    if (onlyCategory) {
      const only = grouped.categories[onlyCategory] || [];
      grouped.categories = { [onlyCategory]: only };
    }

    const categoryByValue = new Map();
    for (const [cat, rows] of Object.entries(grouped.categories || {})) {
      for (const row of rows || []) {
        const key = row?.article_id;
        if (key && !categoryByValue.has(key)) categoryByValue.set(key, cat);
      }
    }
    for (const row of grouped.uncategorized || []) {
      const key = row?.article_id;
      if (key && !categoryByValue.has(key)) categoryByValue.set(key, "uncategorized");
    }

    const flags = Object.keys(grouped.categories || {}).filter(Boolean);
    const flagDomain = buildOrDomainFromFlags("imos_order_id", flags);

    const tCat1 = Date.now();
    log("Step2 Categorize:", {
      flags_count: flags.length,
      uncategorized: grouped.uncategorized.length,
      ms: tCat1 - tCat0,
    });

    // Step 3: split uniq values into:
    // - normalRefValues: match by matchField (default ref_imos)
    // - productIdValues: match by id (special order_id=ODOO:PRODUCT)
    const tUniq0 = Date.now();
    const allRows = Object.values(grouped.categories).flat().concat(grouped.uncategorized);

    const normalRefValues = uniq(
      allRows
        .filter((r) => !isOdooProductRow(r))
        .map((r) => r.article_id)
        .filter(Boolean)
        .map(String)
    );

    const productIdValues = uniq(
      allRows
        .filter((r) => isOdooProductRow(r))
        .map((r) => r.article_id)
        .filter(Boolean)
        .map(String)
    );

    const tUniq1 = Date.now();
    log("Step3 Uniq:", {
      unique_ref_values: normalRefValues.length,
      unique_product_ids: productIdValues.length,
      ms: tUniq1 - tUniq0,
    });

    // Step 4: two-pass batch match in Odoo:
    // A) normal rows -> matchField (ref_imos)
    // B) ODOO products -> id
    const tOdoo0 = Date.now();
    let byValue = {};
    let matchStats = { matched: 0, unmatched: 0, ambiguous: 0 };
    let odooMeta = null;

    if (includeOdoo) {
      const resA = await fetchTemplatesByMatchFieldBatched({
        sessionId,
        model,
        matchField,
        values: normalRefValues,
        chunkSize: odooChunk,
        requireImosTable,
        limitPerChunk,
        sessionInfo,
        companyIdOverride,
      });

      if (!resA.ok) {
        if (resA.details && isAccessError(resA.details)) {
          const payload = {
            success: false,
            mode: flatMode ? "flat" : "ws",
            error: resA.error || "Access denied by Odoo",
            details: resA.details,
            timing_ms: { session: tSess1 - tSess0, total: Date.now() - tAll0 },
          };
          if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });
          return NextResponse.json(payload, { status: 403, headers: corsHeaders });
        }

        const payload = {
          success: false,
          mode: flatMode ? "flat" : "ws",
          error: resA.error || "Odoo batch match failed",
          details: resA.details || null,
          timing_ms: { session: tSess1 - tSess0, total: Date.now() - tAll0 },
        };
        if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });
        return NextResponse.json(payload, { status: resA.status || 502, headers: corsHeaders });
      }

      const resB = await fetchTemplatesByMatchFieldBatched({
        sessionId,
        model,
        matchField: "id",
        values: productIdValues,
        chunkSize: odooChunk,
        requireImosTable: false, // ✅ IMPORTANT: products might not have imos_table
        limitPerChunk,
        sessionInfo,
        companyIdOverride,
      });

      if (!resB.ok) {
        if (resB.details && isAccessError(resB.details)) {
          const payload = {
            success: false,
            mode: flatMode ? "flat" : "ws",
            error: resB.error || "Access denied by Odoo",
            details: resB.details,
            timing_ms: { session: tSess1 - tSess0, total: Date.now() - tAll0 },
          };
          if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });
          return NextResponse.json(payload, { status: 403, headers: corsHeaders });
        }

        const payload = {
          success: false,
          mode: flatMode ? "flat" : "ws",
          error: resB.error || "Odoo batch match failed (products by id)",
          details: resB.details || null,
          timing_ms: { session: tSess1 - tSess0, total: Date.now() - tAll0 },
        };
        if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });
        return NextResponse.json(payload, { status: resB.status || 502, headers: corsHeaders });
      }

      byValue = {
        ...(resA.payload.by_value || {}),
        ...(resB.payload.by_value || {}),
      };

      const a = resA.payload.stats || { matched: 0, unmatched: 0, ambiguous: 0 };
      const b = resB.payload.stats || { matched: 0, unmatched: 0, ambiguous: 0 };
      matchStats = {
        matched: a.matched + b.matched,
        unmatched: a.unmatched + b.unmatched,
        ambiguous: a.ambiguous + b.ambiguous,
      };

      odooMeta = {
        normal: {
          match_field: resA.payload.match_field,
          chunks: resA.payload.chunks,
          rpc_calls: resA.payload.rpc_calls,
          total_values: resA.payload.total_values,
          domain_base: resA.payload.domain_base,
          timing_ms: resA.payload.timing_ms,
          context_company_id: resA.payload.context_company_id,
        },
        products: {
          match_field: resB.payload.match_field,
          chunks: resB.payload.chunks,
          rpc_calls: resB.payload.rpc_calls,
          total_values: resB.payload.total_values,
          domain_base: resB.payload.domain_base,
          timing_ms: resB.payload.timing_ms,
          context_company_id: resB.payload.context_company_id,
        },
      };
    }

    const tOdoo1 = Date.now();
    log("Step4 Odoo:", {
      includeOdoo,
      matched: matchStats.matched,
      unmatched: matchStats.unmatched,
      ambiguous: matchStats.ambiguous,
      ms: tOdoo1 - tOdoo0,
    });

    // Step 4.5: hydrate vendors ONCE (supplierinfo)
    let supplierById = {};
    let vendorsMeta = null;
    const tVend0 = Date.now();

    if (includeOdoo && includeVendors) {
      const allSellerIds = [];

      for (const bucket of Object.values(byValue || {})) {
        const recs = bucket?.records || [];
        for (const rec of recs) {
          allSellerIds.push(...normalizeSellerIds(rec?.seller_ids));
        }
      }

      const uniqSellerIds = uniqArr(allSellerIds.map(Number).filter(Boolean));

      const suppRes = await fetchSupplierinfoByIdsBatched({
        sessionId,
        sellerIds: uniqSellerIds,
        chunkSize: 200,
        sessionInfo,
        companyIdOverride,
      });

      if (suppRes.ok) {
        supplierById = suppRes.payload.by_id || {};
        vendorsMeta = {
          ok: true,
          seller_ids: uniqSellerIds.length,
          rpc_calls: suppRes.payload.rpc_calls,
          timing_ms: suppRes.payload.timing_ms,
          context_company_id: suppRes.payload.context_company_id,
        };
      } else {
        supplierById = {};
        vendorsMeta = { ok: false, error: suppRes.error, status: suppRes.status };
      }
    }

    const tVend1 = Date.now();

    // -------------------------------
    // FLAT MODE OUTPUT
    // -------------------------------
    if (flatMode) {
      // We can't use a single matchField here because keys are mixed (ref_imos values + id values).
      // So we attach cfg/routing directly from maps keyed by DB "article_id" values.
      const recordsFlatRaw = includeOdoo
        ? (() => {
            const out = [];
            const seen = new Map();

            for (const bucket of Object.values(byValue || {})) {
              const records = bucket?.records || [];
              for (const r0 of records) {
                const r = { ...r0 };

                // derive "value key" depending on which bucket matched:
                // - id match: key is String(r.id)
                // - ref_imos match: key is r[matchField]
                // But our DB uses article_id as the value, and for product rows article_id == template id == r.id.
                // For normal rows article_id == r[matchField] (ref_imos)
                const keyCandidate =
                  String(r?.id) in (byValue || {}) ? String(r?.id) : String(r?.[matchField] ?? "");

                // we will still map cfg/routing by "article_id values" only, so:
                // if we matched by id, use r.id; else use r[matchField]
                const valueKey = r?.id && productIdValues.includes(String(r.id))
                  ? String(r.id)
                  : String(r?.[matchField] ?? "");

                r.cfg_name = cfgByValue.get(valueKey) ?? null;
                r.routing = routingByValue.get(valueKey) ?? "odoo";
                r._match_value = valueKey;

                const id = r?.id;
                if (!id) continue;

                if (!seen.has(id)) {
                  seen.set(id, out.length);
                  out.push(r);
                } else {
                  const idx = seen.get(id);
                  const existing = out[idx];
                  if ((existing?.cfg_name == null || existing?.cfg_name === "") && r.cfg_name) {
                    out[idx] = { ...existing, cfg_name: r.cfg_name };
                  }
                  if ((existing?.routing == null || existing?.routing === "") && r.routing) {
                    out[idx] = { ...out[idx], routing: r.routing };
                  }
                }
              }
            }
            return out;
          })()
        : [];

      let recordsFlat = recordsFlatRaw
        .map(normalizeVariantIdOnTemplateRecord)
        .map((r) => ({
          ...r,
          cfg_name: r.cfg_name ?? null,
          routing: r.routing ?? "odoo",
          category:
            categoryByValue.get(r?._match_value) ??
            categoryByValue.get(String(r?.[matchField] ?? "")) ??
            "uncategorized",
        }));

      // vendors
      if (includeOdoo && includeVendors) {
        recordsFlat = attachVendorsFromSupplierinfo(recordsFlat, supplierById);
      } else {
        recordsFlat = recordsFlat.map((r) => ({
          ...r,
          vendors: [],
          vendor_partner_ids: [],
          vendor_primary: null,
        }));
      }

      // stock (optional)
      let stockMeta = null;
      const tStock0 = Date.now();

      if (includeStock) {
        const ids = recordsFlat
          .map((r) => r.product_variant_id)
          .map(Number)
          .filter(Boolean);

        const stockRes = await fetchProductStockByIdsBatched({
          sessionId,
          productIds: ids,
          chunkSize: 200,
          sessionInfo,
          companyIdOverride,
        });

        if (!stockRes.ok) {
          log("⚠️ Stock fetch failed:", stockRes.error, stockRes.details || "");
          recordsFlat = recordsFlat.map((r) => ({
            ...r,
            stock: normalizeStockRow(null),
          }));
          stockMeta = {
            ok: false,
            error: stockRes.error,
            status: stockRes.status,
            timing_ms: { total: Date.now() - tStock0 },
          };
        } else {
          const byId = stockRes.payload.by_id || {};
          recordsFlat = recordsFlat.map((r) => {
            const pvId = Number(r.product_variant_id) || 0;
            const s = pvId ? byId[pvId] : null;
            return { ...r, stock: normalizeStockRow(s) };
          });

          stockMeta = {
            ok: true,
            rpc_calls: stockRes.payload.rpc_calls,
            fields: stockRes.payload.fetch_fields,
            timing_ms: stockRes.payload.timing_ms,
            context_company_id: stockRes.payload.context_company_id,
            context_location_id: stockRes.payload.context_location_id,
          };
        }
      }

      const tStock1 = Date.now();

      const payload = {
        success: true,
        mode: "flat",
        model,
        field: matchField,
        flags,
        domain: flagDomain,
        length: recordsFlat.length,
        records: recordsFlat,
        stats: includeOdoo ? matchStats : { matched: 0, unmatched: 0, ambiguous: 0 },
        meta: {
          rows_from_conndesc: conndescRows.length,
          unique_ref_values: normalRefValues.length,
          unique_product_ids: productIdValues.length,
          include_odoo: includeOdoo,
          require_imos_table: requireImosTable,
          include_stock: includeStock,
          include_vendors: includeVendors,
          company_id_override: Number.isFinite(companyIdOverride) ? companyIdOverride : null,
          session: {
            uid: sessionInfo?.uid ?? sessionInfo?.user_context?.uid ?? null,
            current_company: sessionInfo?.user_companies?.current_company ?? null,
          },
          odoo: odooMeta,
          stock: includeStock ? stockMeta : null,
          vendors: includeVendors ? vendorsMeta : null,
        },
        timing_ms: {
          session: tSess1 - tSess0,
          db: tDb1 - tDb0,
          categorize: tCat1 - tCat0,
          uniq: tUniq1 - tUniq0,
          odoo: tOdoo1 - tOdoo0,
          vendors: includeVendors ? tVend1 - tVend0 : 0,
          stock: includeStock ? tStock1 - tStock0 : 0,
          total: Date.now() - tAll0,
        },
      };

      if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });
      return NextResponse.json(payload, { status: 200, headers: corsHeaders });
    }

    // -------------------------------
    // WS MODE OUTPUT (tree with row.odoo)
    // -------------------------------
    const attachOdoo = (row) => {
      if (!includeOdoo) return row;

      const key = String(row.article_id || "");
      const found = byValue[key];

      if (!found) {
        return {
          ...row,
          odoo: {
            ok: true,
            model,
            match_field: isOdooProductRow(row) ? "id" : matchField,
            value: key,
            length: 0,
            records: [],
            status: "not_found",
          },
        };
      }

      const fixed = { ...found };

      if (Array.isArray(fixed.records)) {
        let recs = fixed.records
          .map(normalizeVariantIdOnTemplateRecord)
          .map((rec) => ({
            ...rec,
            cfg_name: row?.cfg_name ?? null,
            routing: row?.routing ?? "odoo",
          }));

        if (includeVendors) {
          recs = attachVendorsFromSupplierinfo(recs, supplierById);
        } else {
          recs = recs.map((r) => ({
            ...r,
            vendors: [],
            vendor_partner_ids: [],
            vendor_primary: null,
          }));
        }

        fixed.records = recs;
      }

      return { ...row, odoo: fixed };
    };

    const categoriesOut = {};
    for (const [cat, rows] of Object.entries(grouped.categories)) {
      categoriesOut[cat] = rows.map(attachOdoo);
    }
    const uncategorizedOut = grouped.uncategorized.map(attachOdoo);

    const payload = {
      success: true,
      mode: "ws",
      meta: {
        rows_from_conndesc: conndescRows.length,
        unique_ref_values: normalRefValues.length,
        unique_product_ids: productIdValues.length,
        include_odoo: includeOdoo,
        require_imos_table: requireImosTable,
        include_vendors: includeVendors,
        company_id_override: Number.isFinite(companyIdOverride) ? companyIdOverride : null,
        model,
        match_field: matchField,
        flags,
        domain: flagDomain,
        matched: matchStats.matched,
        unmatched: matchStats.unmatched,
        ambiguous: matchStats.ambiguous,
        odoo: odooMeta,
        vendors: includeVendors ? vendorsMeta : null,
        session: {
          uid: sessionInfo?.uid ?? sessionInfo?.user_context?.uid ?? null,
          current_company: sessionInfo?.user_companies?.current_company ?? null,
        },
      },
      categories: categoriesOut,
      uncategorized: uncategorizedOut,
      timing_ms: {
        session: tSess1 - tSess0,
        db: tDb1 - tDb0,
        categorize: tCat1 - tCat0,
        uniq: tUniq1 - tUniq0,
        odoo: tOdoo1 - tOdoo0,
        vendors: includeVendors ? tVend1 - tVend0 : 0,
        total: Date.now() - tAll0,
      },
    };
    
    if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });
    return NextResponse.json(payload, { status: 200, headers: corsHeaders });
  } catch (err) {
    log("Exception:", err?.message || err);
    const payload = {
      success: false,
      error: err?.message || "Internal error",
      timing_ms: { total: Date.now() - tAll0 },
    };
    return NextResponse.json(payload, { status: 500, headers: corsHeaders });
  }
}
