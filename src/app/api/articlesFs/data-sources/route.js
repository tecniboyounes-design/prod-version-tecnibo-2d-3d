// src/app/api/data-sources/route.js
import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { getAllDataSources, saveAllDataSources } from "@/lib/server/articlesFS";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

// GET: return full dataSource.json
export async function GET(req) {
  const headers = getCorsHeaders(req);
  const data = await getAllDataSources();
  return NextResponse.json(data, { status: 200, headers });
}


/**
 * PUT: merge by default (incremental).
 * - Body shape: { KEY: Array<Item>, KEY2: Array<Item>, ... }
 * - If you want to REPLACE the entire file, pass ?mode=replace
 * - If you want to replace a single KEY entirely, pass ?replaceKeys=K1,K2
 *
 * Merge rules:
 * - Per key (array), we append new items and de-duplicate by "value"
 * - If an incoming item has the same "value", we update its label/attributes
 * - Order is preserved (existing first; new uniques appended)
 */


export async function PUT(req) {
  const headers = getCorsHeaders(req);

  // parse query controls
  const url = new URL(req.url);
  const mode = (url.searchParams.get("mode") || "").toLowerCase(); // "replace" | ""
  const replaceKeysParam = url.searchParams.get("replaceKeys") || "";
  const replaceKeys = new Set(
    replaceKeysParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  console.log("🔎 PUT /data-sources called");
  console.log("➡️ Mode:", mode || "merge (default)");
  console.log("➡️ ReplaceKeys:", [...replaceKeys]);

  // parse body
  let incoming;
  try {
    incoming = await req.json();
  } catch {
    console.error("❌ Failed to parse JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
  if (!incoming || typeof incoming !== "object") {
    console.error("❌ Incoming body is not an object:", incoming);
    return NextResponse.json({ error: "Payload must be an object" }, { status: 400, headers });
  }

  console.log("📥 Incoming keys:", Object.keys(incoming));

  // helper: normalize an item
  const normalizeItem = (x) => {
    if (!x || typeof x !== "object") return null;
    const value = x.value ?? x.label ?? null;
    if (value == null) return null;
    const item = { value: String(value) };
    if (typeof x.label === "string") item.label = x.label;
    if (x.attributes && typeof x.attributes === "object") item.attributes = { ...x.attributes };
    return item;
  };

  // merge two arrays of items by "value"
  const mergeArrays = (baseArr = [], newArr = []) => {
    const out = [...baseArr];
    const idxByValue = new Map();
    out.forEach((it, i) => idxByValue.set(String(it.value), i));

    for (const raw of newArr) {
      const item = normalizeItem(raw);
      if (!item) continue;
      const key = String(item.value);

      if (idxByValue.has(key)) {
        const i = idxByValue.get(key);
        const current = out[i] || {};
        out[i] = {
          ...current,
          ...item,
          ...(current.attributes || item.attributes
            ? { attributes: { ...(current.attributes || {}), ...(item.attributes || {}) } }
            : {}),
        };
        console.log(`🔄 Updated existing item "${key}" in merge`);
      } else {
        idxByValue.set(key, out.length);
        out.push(item);
        console.log(`➕ Added new item "${key}" in merge`);
      }
    }
    return out;
  };

  // load current file (unless full replace)
  let current = {};
  if (mode !== "replace") {
    current = await getAllDataSources();
    console.log("📂 Loaded current data-sources with keys:", Object.keys(current));
  }

  // perform per-key merge or replace
  const next = { ...(mode === "replace" ? {} : current) };

  for (const [key, val] of Object.entries(incoming)) {
    if (!Array.isArray(val)) {
      console.warn(`⚠️ Skipping non-array value for key "${key}"`);
      continue;
    }
    if (mode === "replace" || replaceKeys.has(key) || !(key in next)) {
      console.log(`📝 Replacing key "${key}" with ${val.length} items`);
      next[key] = val.map(normalizeItem).filter(Boolean);
    } else {
      console.log(`🔀 Merging key "${key}" (existing: ${next[key]?.length || 0}, incoming: ${val.length})`);
      const base = Array.isArray(next[key]) ? next[key] : [];
      next[key] = mergeArrays(base, val);
    }
  }

  console.log("💾 Saving final keys:", Object.keys(next));
  await saveAllDataSources(next);

  console.log("✅ PUT /data-sources completed successfully");
  return NextResponse.json({ ok: true }, { status: 200, headers });
}


/**
 * Optional single-key delete:
 * DELETE /api/data-sources?name=KEY
 */


export async function DELETE(req) {
  const headers = getCorsHeaders(req);
  const url = new URL(req.url);
  const name = (url.searchParams.get("name") || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Missing name query parameter" }, { status: 400, headers });
  }
  const all = await getAllDataSources();
  if (!(name in all)) {
    return NextResponse.json({ ok: true, message: "Key not found (noop)" }, { status: 200, headers });
  }
  delete all[name];
  await saveAllDataSources(all);
  return NextResponse.json({ ok: true }, { status: 200, headers });
}


