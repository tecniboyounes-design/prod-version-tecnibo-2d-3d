import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

import { CATEGORY_ORDER_ID_MAP } from "./categories";
import { fetchConndescWsRows } from "./lib/db";
import { buildTagToCategoryIndex, groupRowsByCategory } from "./lib/categorize";
import { uniq } from "./lib/utils";
import {
  smartSearchOne,
  isAccessError,
  fetchTemplatesByMatchFieldBatched,
  fetchProductStockByIdsBatched,
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
 * Flatten batched matcher output and inject cfg_name (from helper DB by match value).
 * Keeps first non-null cfg_name per template id.
 */


function flattenMatchedRecordsWithCfg(byValue, cfgByValue, matchField) {
  const out = [];
  const seen = new Map(); // templateId -> index

  for (const bucket of Object.values(byValue || {})) {
    const records = bucket?.records || [];
    for (const r0 of records) {
      const r = { ...r0 };

      const key = r?.[matchField];
      const cfgName = cfgByValue?.get?.(key) ?? null;
      r.cfg_name = cfgName;

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

  // 1) prefer explicit product_variant_id m2o
  const pv1 = m2oToId(out.product_variant_id);

  // 2) fallback from product_variant_ids
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
    const sessionId =
      request.headers.get("x-session-id") || request.headers.get("X-Session-Id");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing X-Session-Id" },
        { status: 400, headers: corsHeaders }
      );
    }

    const mode = (url.searchParams.get("mode") || "").trim().toLowerCase();
    const flatMode = mode === "flat" || url.searchParams.get("flat") === "1";
    const q = (url.searchParams.get("q") || "").trim();

    // NEW: stock option for flat mode
    const includeStock = url.searchParams.get("include_stock") === "1";

    // optional logging
    const shouldLog = url.searchParams.get("log") === "1";
    const logFile = (url.searchParams.get("log_file") || makeDefaultLogFile()).trim();

    // -------------------------------
    // SMART mode (keep as-is)
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
      });

      if (!result.ok && result.details && isAccessError(result.details)) {
        const payload = {
          success: false,
          mode: "smart",
          error: result.error || "Access denied by Odoo",
          details: result.details,
          timing_ms: { total: Date.now() - tAll0 },
        };
        if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });
        return NextResponse.json(payload, { status: 403, headers: corsHeaders });
      }

      // SMART mode does not use helper DB => no cfg_name injection here
      const payload = {
        success: result.ok,
        mode: "smart",
        model,
        q,
        ...(result.payload || {}),
        timing_ms: { total: Date.now() - tAll0 },
      };

      if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });

      return NextResponse.json(payload, {
        status: result.ok ? 200 : result.status || 502,
        headers: corsHeaders,
      });
    }

    // -------------------------------
    // WS/FLAT reverse mode:
    // helper DB -> categorize -> values(article_id) -> batch Odoo match by match_field
    // -------------------------------
    const model = (url.searchParams.get("model") || DEFAULT_MODEL).trim();

    // DB controls
    const limitRows = Number(url.searchParams.get("limit_rows") ?? 500);
    const offsetRows = Number(url.searchParams.get("offset_rows") || 0);

    // DB filter: ORDER_ID ILIKE %WS% by default
    const wsLike = (url.searchParams.get("ws_like") || "WS").trim();

    // Odoo controls
    const includeOdoo = url.searchParams.get("include_odoo") !== "0";
    const requireImosTable = url.searchParams.get("imos_table") !== "0";
    const onlyCategory = (url.searchParams.get("only_category") || "").trim();

    // deterministic matching field (default: ref_imos)
    const matchField = (url.searchParams.get("match_field") || "ref_imos").trim();

    // batching controls
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
      shouldLog,
      logFile,
    });

    // Step 1: DB fetch from helper DB table (via lib/db.js)
    const tDb0 = Date.now();
    const conndescRows = await fetchConndescWsRows({
      wsLike,
      limit: limitRows,
      offset: offsetRows,
    });
    const tDb1 = Date.now();
    log("Step1 DB:", { rows: conndescRows.length, ms: tDb1 - tDb0 });

    // cfg_name map by article_id (match value)
    const cfgByValue = new Map();
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
    }

    // Step 2: categorize (same as before)
    const tCat0 = Date.now();
    const tagIndex = buildTagToCategoryIndex(CATEGORY_ORDER_ID_MAP);
    const grouped = groupRowsByCategory(conndescRows, tagIndex);

    if (onlyCategory) {
      const only = grouped.categories[onlyCategory] || [];
      grouped.categories = { [onlyCategory]: only };
    }

    const flags = Object.keys(grouped.categories || {}).filter(Boolean);
    const flagDomain = buildOrDomainFromFlags("imos_order_id", flags);

    const tCat1 = Date.now();
    log("Step2 Categorize:", {
      flags_count: flags.length,
      uncategorized: grouped.uncategorized.length,
      ms: tCat1 - tCat0,
    });

    // Step 3: unique match values
    const tUniq0 = Date.now();
    const allRows = Object.values(grouped.categories).flat().concat(grouped.uncategorized);
    const values = uniq(allRows.map((r) => r.article_id).filter(Boolean));
    const tUniq1 = Date.now();
    log("Step3 Uniq:", { unique_values: values.length, ms: tUniq1 - tUniq0 });

    // Step 4: batch match in Odoo by matchField
    const tOdoo0 = Date.now();
    let byValue = {};
    let matchStats = { matched: 0, unmatched: 0, ambiguous: 0 };
    let odooMeta = null;

    if (includeOdoo) {
      const res = await fetchTemplatesByMatchFieldBatched({
        sessionId,
        model,
        matchField,
        values,
        chunkSize: odooChunk,
        requireImosTable,
        limitPerChunk,
      });

      if (!res.ok) {
        if (res.details && isAccessError(res.details)) {
          const payload = {
            success: false,
            mode: flatMode ? "flat" : "ws",
            error: res.error || "Access denied by Odoo",
            details: res.details,
            timing_ms: { total: Date.now() - tAll0 },
          };
          if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });
          return NextResponse.json(payload, { status: 403, headers: corsHeaders });
        }

        const payload = {
          success: false,
          mode: flatMode ? "flat" : "ws",
          error: res.error || "Odoo batch match failed",
          details: res.details || null,
          timing_ms: { total: Date.now() - tAll0 },
        };
        if (shouldLog) await writeLastResponseToFile({ filePath: logFile, payload });
        return NextResponse.json(payload, { status: res.status || 502, headers: corsHeaders });
      }

      byValue = res.payload.by_value || {};
      matchStats = res.payload.stats || matchStats;
      odooMeta = {
        match_field: res.payload.match_field,
        chunks: res.payload.chunks,
        rpc_calls: res.payload.rpc_calls,
        total_values: res.payload.total_values,
        domain_base: res.payload.domain_base,
        timing_ms: res.payload.timing_ms,
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

    // -------------------------------
    // FLAT MODE OUTPUT
    // -------------------------------
    if (flatMode) {
      const recordsFlatRaw = includeOdoo
        ? flattenMatchedRecordsWithCfg(byValue, cfgByValue, matchField)
        : [];

      let recordsFlat = recordsFlatRaw
        .map(normalizeVariantIdOnTemplateRecord)
        .map((r) => ({
          ...r,
          cfg_name: r.cfg_name ?? null,
        }));

      // NEW: Stock merge (optional)
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
        });

        if (!stockRes.ok) {
          // don't kill endpoint; just return stock=nulls
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
          unique_values: values.length,
          include_odoo: includeOdoo,
          require_imos_table: requireImosTable,
          odoo: odooMeta,
          stock: includeStock ? stockMeta : null,
        },
        timing_ms: {
          db: tDb1 - tDb0,
          categorize: tCat1 - tCat0,
          uniq: tUniq1 - tUniq0,
          odoo: tOdoo1 - tOdoo0,
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

      const key = row.article_id;
      const found = byValue[key];

      if (!found) {
        return {
          ...row,
          odoo: {
            ok: true,
            model,
            match_field: matchField,
            value: key,
            length: 0,
            records: [],
            status: "not_found",
          },
        };
      }

      const fixed = { ...found };

      if (Array.isArray(fixed.records)) {
        fixed.records = fixed.records
          .map(normalizeVariantIdOnTemplateRecord)
          .map((rec) => ({
            ...rec,
            cfg_name: row?.cfg_name ?? null,
          }));
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
        unique_values: values.length,
        include_odoo: includeOdoo,
        model,
        match_field: matchField,
        flags,
        domain: flagDomain,
        matched: matchStats.matched,
        unmatched: matchStats.unmatched,
        ambiguous: matchStats.ambiguous,
        odoo: odooMeta,
      },
      categories: categoriesOut,
      uncategorized: uncategorizedOut,
      timing_ms: {
        db: tDb1 - tDb0,
        categorize: tCat1 - tCat0,
        uniq: tUniq1 - tUniq0,
        odoo: tOdoo1 - tOdoo0,
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
