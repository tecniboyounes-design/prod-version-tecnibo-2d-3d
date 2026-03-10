# Smart Products API (`/api/odoo/smart-products`)

This folder implements a **Next.js App Router API** that bridges:

- a **Postgres “helper” table** (`public.conndesc_helper`) that contains IMOS/WS rows (article/order/config info),
- and **Odoo** (JSON-RPC) product data (`product.template`, `product.product`, `product.supplierinfo`),

to produce either:

- a **flat list** of Odoo products enriched with `cfg_name`, `routing`, vendors, and optional stock (`mode=flat`), or
- a **tree** grouped by WS category where each helper-row contains the Odoo match (and keeps the row’s `cfg_name` / `routing`) (`mode=ws`),
- plus a **smart search** mode for interactive lookup by code/name/barcode (`q=...`).

---

## What you need (inputs & prerequisites)

### 1) Required request header

All endpoints here require an Odoo session id passed as a header:

- `X-Session-Id: <odoo_session_id>`

The code uses it as an Odoo cookie (`Cookie: session_id=<...>`) for upstream calls.

### 2) Environment variables

Used by files in this directory:

- `DATABASE_HELPER_URL` (**required** for `mode=ws` and `mode=flat`)
  - Postgres connection string for the helper DB.
- `ODOO_BASE_URL` (optional)
  - Base Odoo URL, defaults to `https://erptest.tecnibo.com`.

### 3) Helper DB table shape

`src/app/api/odoo/smart-products/lib/db.js` queries:

```sql
SELECT
  article_id, text_short, order_id, name,
  cfg_name,
  routing
FROM public.conndesc_helper
WHERE order_id ILIKE $1
ORDER BY article_id ASC
```

So your `public.conndesc_helper` table must have at least:

- `article_id`
- `order_id`
- `cfg_name`
- `routing` (selected by the query)

It *also* selects `text_short` and `name`.

`routing` is a **per-article routing hint** (typically `"odoo"` or `"imos"`, case-insensitive) that the API propagates into responses so the client can decide which downstream flow to use.

> If you created the helper table using `lib/sync_conndesc_helper.sh.sh`, note that script currently does **not** create a `routing` column. Add it in DB (or update the script) to match your schema.

---

## Endpoints

### 1) Main endpoint: `/api/odoo/smart-products`

File: `src/app/api/odoo/smart-products/route.js`

Supports:

- `OPTIONS` (CORS preflight via `@/lib/cors`)
- `GET` with multiple modes:
  - **Smart mode** (default when `q` is provided)
  - **WS mode** (`mode=ws`, or default when no `q`)
  - **Flat mode** (`mode=flat` or `flat=1`)

### 2) Variant endpoint: `/api/odoo/smart-products/product-variant/:id`

File: `src/app/api/odoo/smart-products/product-variant/[id]/route.js`

Reads a single `product.product` record by id, safely filtering fields via `fields_get`.

---

## Data Flow Overview

This API is mostly a **data pipeline** that joins 3 sources:

- **Request** (query params + `X-Session-Id`)
- **Helper DB** (`public.conndesc_helper` via `DATABASE_HELPER_URL`)
- **Odoo** (via `ODOO_BASE_URL`, using the `session_id` cookie)

### Join keys (how records connect)

- **Helper row → Odoo template match**
  - `conndesc_helper.article_id` == `product.template[match_field]` (default `ref_imos`)
- **Template → vendors**
  - `product.template.seller_ids[]` (supplierinfo ids) → `product.supplierinfo.id`
- **Template → variant id**
  - `product_variant_id` (preferred) else first `product_variant_ids[]`
- **Variant → stock**
  - `product.product.id` == `product_variant_id`

### Main intermediate structures (internal)

- `cfgByValue`: `Map<article_id, cfg_name>`
- `routingByValue`: `Map<article_id, routing>` (defaults to `"odoo"`)
- `byValue`: `{ [article_id]: { status, length, records[] } }` returned by `fetchTemplatesByMatchFieldBatched`
- `supplierById`: `{ [supplierinfoId]: supplierinfoRecord }` returned by `fetchSupplierinfoByIdsBatched`
- `stockById`: `{ [productProductId]: stockFields }` returned by `fetchProductStockByIdsBatched`
- `tagIndex`: `Map<#WS_TAG#, CategoryLabel>` built from `CATEGORY_ORDER_ID_MAP`

### Field provenance (what comes from where)

| Field you see in JSON | Comes from | Notes |
|---|---|---|
| `categories.<cat>[]` rows (`article_id`, `order_id`, `text_short`, `name`, `cfg_name`, `routing`, …) | Helper DB (`public.conndesc_helper`) | Returned as the “row” in WS mode. |
| `row.odoo` bucket (`status`, `length`, `records[]`) | Odoo matcher (`product.template`) | Keyed by `article_id` matched to `match_field`. |
| `record.cfg_name` / `record.routing` (flat mode) | Helper DB maps keyed by `article_id` | Injected after flattening matched Odoo records. |
| `vendors[]`, `vendor_partner_ids[]`, `vendor_primary` | Odoo `product.supplierinfo` | Joined via template `seller_ids`. If supplierinfo fetch fails, vendor rows become placeholders. |
| `product_variant_id` | Odoo template record | Normalized from `product_variant_id` or `product_variant_ids`. |
| `stock` | Odoo `product.product` | Only when `include_stock=1` (flat mode). Joined via `product_variant_id`. |

### Execution switches (what changes the pipeline)

- `include_odoo=0`
  - WS mode: returns helper rows grouped by category, **without** `row.odoo`.
  - Flat mode: returns `records: []` (there is nothing to flatten without Odoo matches).
- `include_vendors=0`: skips supplierinfo read and attaches empty vendor fields.
- `include_stock=1`: triggers stock fetch and attaches `record.stock` (flat mode only).

### Pipelines by mode (what runs, in order)

#### Smart mode (`q=...`) — Odoo-only

1. Read `X-Session-Id` → `getSessionInfo()` (one call).
2. `fields_get(model)` → decide which fields can be searched.
3. `web_search_read(model)` using an **OR** domain (`default_code` / `name` / `barcode` / `product_variant_ids.default_code`), optionally AND `imos_table != false`.
4. Normalize each template to a stable `product_variant_id`.
5. If `include_vendors=1`: read all `seller_ids` from `product.supplierinfo`, then attach:
   - `vendors[]`, `vendor_partner_ids[]`, `vendor_primary`.
6. Return JSON (+ optional `log=1` file write).

#### WS mode (`mode=ws`) — Helper DB rows grouped by category + optional Odoo match

1. Read `X-Session-Id` → `getSessionInfo()` (one call).
2. Fetch helper rows from Postgres (`fetchConndescWsRows`).
3. Categorize rows by detecting `#WS_...#` tags inside `order_id`.
4. Extract unique `article_id` values.
5. If `include_odoo=1`: batch-match in Odoo (`fetchTemplatesByMatchFieldBatched`) producing `byValue`.
6. If `include_vendors=1`: fetch supplierinfo once for **all** matched `seller_ids` → `supplierById`.
7. Build output:
   - keep the helper row as-is (`article_id`, `order_id`, `cfg_name`, `routing`, …)
   - attach `row.odoo` bucket:
     - `status: not_found | matched | ambiguous`
     - `records[]` enriched with `cfg_name` + `routing` (from the helper row), normalized `product_variant_id`, and vendors.
8. Return JSON (+ optional `log=1` file write).

#### Flat mode (`mode=flat`) — Unique matched templates (flat list)

Same as WS mode up to vendor hydration, then:

1. Flatten all matched Odoo records into a unique list by template `id`.
2. Inject `cfg_name` + `routing` for each record using the per-`article_id` maps.
3. Normalize `product_variant_id`.
4. Attach vendors (uses `supplierById`; missing supplierinfo becomes placeholder vendor rows).
5. If `include_stock=1`: batch-fetch stock for all `product_variant_id` values → `stockById`, then attach `record.stock`.
6. Return JSON (+ optional `log=1` file write).

---

## Quick start (copy/paste)

### Flat list (DB → match Odoo → vendors → stock)

```bash
curl -sS "http://localhost:3009/api/odoo/smart-products?mode=flat&include_odoo=1&include_vendors=1&include_stock=1&limit_rows=0&log=0" \
  -H "X-Session-Id: YOUR_SESSION_ID" \
  | jq .
```

### WS tree grouped by category (DB → match Odoo → vendors)

```bash
curl -sS "http://localhost:3009/api/odoo/smart-products?mode=ws&include_odoo=1&include_vendors=1&limit_rows=500" \
  -H "X-Session-Id: YOUR_SESSION_ID" \
  | jq .
```

### Smart search (Odoo-only search by code/name/barcode)

```bash
curl -sS "http://localhost:3009/api/odoo/smart-products?q=KU15RA65&limit=80&offset=0&include_vendors=1" \
  -H "X-Session-Id: YOUR_SESSION_ID" \
  | jq .
```

### Read one product variant (`product.product`)

```bash
curl -sS "http://localhost:3009/api/odoo/smart-products/product-variant/221266" \
  -H "X-Session-Id: YOUR_SESSION_ID" \
  | jq .
```

---

## Modes in detail

## A) Smart mode (`q=...`)

Triggered when:

- `q` is non-empty
- and `mode` is not `ws`/`flat`

Purpose: **interactive lookup** in Odoo (`web_search_read`) across likely search fields.

> Smart mode does **not** inject `cfg_name` / `routing` because it does not query `public.conndesc_helper`.

### Inputs (query params)

- `q` (**required**) — search text
- `model` (default: `product.template`)
- `limit` (default: `80`)
- `offset` (default: `0`)
- `imos_table=0|1` (default: on)
  - If the model has `imos_table` and this flag is on, the domain includes `["imos_table","!=",false]`.
- `include_vendors=0|1` (default: on)
- `company_id=<number>` (optional)
  - Company override (applied only if allowed by the session).
- `log=1` / `log_file=/abs/path.json` (optional logging)

### What it does (high level)

1. `getSessionInfo()` fetches Odoo session info (`/web/session/get_session_info`) once.
2. `smartSearchOne()` (`lib/odoo.js`) does:
   - `fields_get` to check what search fields exist on `model`,
   - builds an **OR** domain across available fields:
     - `default_code ilike q`
     - `product_variant_ids.default_code ilike q`
     - `name ilike q`
     - `barcode ilike q`
   - optionally ANDs `imos_table != false`
   - calls `web_search_read` with a compact specification
3. Records are normalized to include a stable numeric `product_variant_id` (see below).
4. If `include_vendors=1`:
   - reads `product.supplierinfo` for all `seller_ids` and attaches:
     - `vendors[]`
     - `vendor_partner_ids[]`
     - `vendor_primary`

### Output shape (overview)

Top-level fields include:

- `mode: "smart"`
- `records[]`: Odoo records (plus enrichment fields)
- `meta.vendors`: supplierinfo fetch meta (ok/error, rpc calls, timing)
- `timing_ms`: session/vendor/total timings

---

## B) Reverse WS mode (`mode=ws`) (default when no `q`)

Purpose: **pull WS rows from Postgres** and **attach the Odoo match per row**, grouped by category.

### Inputs (query params)

DB controls:

- `limit_rows` (default: `500`)
  - `0` is treated as “all” (internally coerced to a very large number).
- `offset_rows` (default: `0`)
- `ws_like` (default: `WS`)
  - Used as `order_id ILIKE $1`.
  - If it contains no `%`/`_`, it is wrapped as `%<ws_like>%`.

Odoo matching controls:

- `include_odoo=0|1` (default: on)
- `match_field` (default: `ref_imos`)
  - Field on the Odoo `model` that should match `article_id` from Postgres.
- `odoo_chunk` (default: `80`)
  - How many values are sent per Odoo call.
- `odoo_limit_per_chunk` (default: `5000`)
- `imos_table=0|1` (default: on)
  - Adds `imos_table != false` if the model has that field.

Extra:

- `only_category=<string>` (optional)
  - If set, returns only that single category bucket.
- `include_vendors=0|1` (default: on)
- `company_id=<number>` (optional)
- `log=1` / `log_file=...` (optional)

### What it does (step-by-step)

Implemented in `src/app/api/odoo/smart-products/route.js`:

1. **Session context**
   - Fetches session info once (`getSessionInfo`) so all subsequent Odoo calls use the right company context.
2. **DB fetch**
   - `fetchConndescWsRows()` reads `public.conndesc_helper` rows filtered by `order_id ILIKE ws_like`.
3. **Build per-article maps**
   - Builds `cfg_name` and `routing` maps keyed by `article_id` (the match value).
   - `routing` is treated as a hint; if missing/empty it defaults to `"odoo"`.
4. **Categorize**
   - Builds a tag index from `CATEGORY_ORDER_ID_MAP` (`categories.js`).
   - Detects category by checking if `order_id` contains a known tag like `#WS_ELE#`.
5. **Unique values**
   - Extracts unique `article_id` values (these become the match keys).
6. **Batch match in Odoo**
   - `fetchTemplatesByMatchFieldBatched()`:
     - verifies the model has `match_field` via `fields_get`,
     - `web_search_read` where `[match_field, "in", chunk]`,
     - builds a `by_value` map: `{ "<article_id>": { status, records[] } }`
7. **Vendors (optional)**
   - Collects all `seller_ids` from all matched records and reads `product.supplierinfo` once.
   - Attaches vendor fields onto every record when `include_vendors=1`.
8. **Output**
   - `categories: { "<Category>": [rows...] }`
   - Each row includes an `odoo` bucket:
     - `status: not_found | matched | ambiguous`
     - `records[]` enriched with `cfg_name`, `routing`, normalized `product_variant_id`, and vendors (if enabled)

---

## C) Flat mode (`mode=flat` or `flat=1`)

Purpose: return a **single flat array** of Odoo products enriched with:

- `cfg_name` (from Postgres helper table),
- `routing` (from Postgres helper table, default `"odoo"`),
- vendor info (from `product.supplierinfo`),
- optional stock (from `product.product`).

Inputs are the same as WS mode, plus:

- `include_stock=1` to enable stock merge

### How flat records are built

1. Start from the same Odoo batched matcher output (`by_value`).
2. Flatten all matched Odoo records into a unique list by Odoo `id`.
3. Inject `cfg_name` + `routing`:
   - it uses the `match_field` value (e.g. `ref_imos`) to look up `cfg_name` and `routing` mapped from `article_id`.
   - if the same template `id` appears multiple times, it keeps the first non-empty `cfg_name` / `routing`.
4. Normalize `product_variant_id`.
5. Attach vendor fields (if `include_vendors=1`).
6. If `include_stock=1`, fetch stock for all `product_variant_id` values and attach:
   - `stock.qty_available`, `stock.free_qty`, `stock.virtual_available`, `stock.incoming_qty`, `stock.outgoing_qty`

### Output shape (overview)

- `mode: "flat"`
- `records[]` (unique templates)
- `meta` includes:
  - `rows_from_conndesc`, `unique_values`
  - `odoo` meta: chunk count, rpc calls, domain base, timing
  - `vendors` meta
  - `stock` meta (when enabled)
- `timing_ms` includes per-step timings

---

## Enrichment details

### Routing (`routing`)

`routing` is an extra field coming from the helper DB (`public.conndesc_helper.routing`), keyed by the match value (`article_id`).

- **WS mode**: the helper row already contains `routing`, and matched Odoo records also receive `routing` under `row.odoo.records[].routing`.
- **Flat mode**: each flat record receives `routing` as `record.routing`.
- **Default**: if helper routing is missing/empty, the API uses `"odoo"`.

Typical values are `"odoo"` and `"imos"` (treat it case-insensitively). The intent is to let the client split/filter items by where they should be handled.

> Server-side note: `routing` is currently **propagated** (copied into the response) but not used to filter or change behavior on the server.

### `product_variant_id` normalization (important)

The API normalizes Odoo template records so clients always have a single numeric variant id:

- Prefer `product_variant_id` (Many2one) if present
- Else fallback to the first element of `product_variant_ids`

This is used by:

- flat mode stock hydration (`product.product` quantities)
- CreateSubSO alignment (downstream code expects a `product.product` id)

### Vendor hydration (`vendors`, `vendor_partner_ids`, `vendor_primary`)

When `include_vendors=1`, the API:

1. extracts `seller_ids` from `product.template` records,
2. reads those ids from `product.supplierinfo`,
3. attaches:

- `vendors[]`: normalized supplierinfo rows
- `vendor_partner_ids[]`: unique partner ids referenced by vendors
- `vendor_primary`: the vendor with the lowest `sequence` that has a partner

Even if supplierinfo fetch fails, the API still returns vendor keys; missing supplierinfo rows become placeholders with `null` fields (so the client can see which `seller_ids` existed).

### Stock hydration (`stock`)

Only applied in **flat mode** when `include_stock=1`.

Uses `fetchProductStockByIdsBatched()` to query `product.product` with `web_search_read` and attach a stable stock object:

```json
{
  "qty_available": null,
  "free_qty": null,
  "virtual_available": null,
  "incoming_qty": null,
  "outgoing_qty": null
}
```

---

## Categories & tags

Categories are defined in `src/app/api/odoo/smart-products/categories.js` as:

- **key**: category label returned to the client
- **value**: tag to search inside `order_id` (e.g. `#WS_ELE#`)

At runtime the code reverses this mapping to: `tag -> category`.

> If multiple category labels share the same tag value, the last one wins (because tags become map keys). Prefer one canonical label per tag if you want deterministic category names.

---

## Logging

If you pass `log=1`, the API writes the full JSON response to disk:

- default file: `odooimoscondesclog/<timestamp>.json` (based on `LOG_DIR` in `route.js`)
- override: `log_file=/absolute/path.json`

This is meant for debugging and is best-effort (errors are caught and only logged to console).

---

## Helper DB sync script

File: `src/app/api/odoo/smart-products/lib/sync_conndesc_helper.sh.sh`

This script is a convenience to populate a helper DB from an IMOS DB using `dblink`:

- creates `ws_category_map` (tag → category label)
- creates `conndesc_helper`
- upserts rows from `public."CONNDESC"` where `ORDER_ID ILIKE '%WS%'`
- derives `ws_tag`, `cat_path`, and sets `cfg_name` (it does **not** populate `routing`)

It’s driven by env vars (defaults shown in the script):

- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`
- `SOURCE_DB` (default `imos`)
- `TARGET_DB` (default `imos_helper`)

Run it like:

```bash
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGPASSWORD=... \
SOURCE_DB=imos TARGET_DB=imos_helper \
bash src/app/api/odoo/smart-products/lib/sync_conndesc_helper.sh.sh
```

If your API expects the `routing` column (it does), add it once in your helper DB (example):

```sql
ALTER TABLE public.conndesc_helper
ADD COLUMN IF NOT EXISTS routing text;

UPDATE public.conndesc_helper
SET routing = COALESCE(NULLIF(routing, ''), 'odoo');
```

---

## Troubleshooting

### 400: `Missing X-Session-Id`

Add `-H "X-Session-Id: ..."` to your request.

### 500: `Missing DATABASE_HELPER_URL`

Set `DATABASE_HELPER_URL` for the Next.js server process.

### Postgres error: `column "routing" does not exist`

Your `conndesc_helper` table doesn’t match what `lib/db.js` selects.
Add the column or adjust your DB/schema to match (see the SQL snippet in the sync section above).

### 403: Odoo access error

The Odoo user behind the session id lacks permission for a model/field, or the company context is not allowed.
Try a different session or pass a valid `company_id`.

---

## File map (what each file does)

- `route.js` — Main API handler; implements smart/ws/flat modes, injects `cfg_name` + `routing`, vendor+stock merge, logging.
- `categories.js` — Category label → `#WS_*#` tag map for `order_id` categorization.
- `lib/db.js` — Reads rows from `public.conndesc_helper` in Postgres (including `cfg_name` + `routing`).
- `lib/categorize.js` — Tag index + category grouping by `order_id`.
- `lib/utils.js` — Small helpers (`uniq`, concurrency mapper; currently only `uniq` is used here).
- `lib/odoo.js` — Odoo JSON-RPC helpers:
  - `getSessionInfo`
  - `smartSearchOne`
  - `fetchTemplatesByMatchFieldBatched`
  - `fetchProductStockByIdsBatched`
  - `fetchSupplierinfoByIdsBatched`
- `curl.sh` — Handy curl snippets for manual testing.
- `product-variant/[id]/route.js` — Reads one `product.product` variant by id, with safe field selection.
