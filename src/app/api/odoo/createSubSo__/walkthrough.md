# createSubSo — Full Flow Walkthrough

> **Last updated:** 2026-03-02
> **Branch:** `main`
> **Endpoint:** `POST /api/odoo/createSubSo`

---

## 1. Bird's-eye Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND  (React)                                    │
│                                                                               │
│   User clicks "Create Sub SO"                                                 │
│   Cart items → each has  routing: "odoo" | "imos"                            │
└──────────────────────────────┬──────────────────────────────────────────────┘
                                │  POST /api/odoo/createSubSo
                                │  { project_id, phase_id, commitment_date,
                                │    confirm, items[], client, employee, ... }
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NEXT.JS API  (route.js)                                │
│                                                                               │
│  1. Parse body + validate session_id cookie                                   │
│  2. Split items                                                               │
│                                                                               │
│      items[]  ──┬──  routing ≠ "imos"  ──►  odooItems[]                     │
│                 └──  routing = "imos"  ──►  imosItems[]                      │
│                                                                               │
│  3a. odooItems.length === 0 ?                                                 │
│      └─► IMOS-ONLY fast path  (skip all Odoo logic)                          │
│                                                                               │
│  3b. odooItems.length > 0 ?                                                  │
│      └─► ODOO PATH  +  (if imosItems > 0) IMOS PATH  run together            │
└──────┬────────────────────────────────────┬──────────────────────────────────┘
       │                                    │
       ▼                                    ▼
┌──────────────────┐              ┌──────────────────────────┐
│   ODOO  PATH     │              │      IMOS  PATH           │
│                  │              │                           │
│ readProjectCore()│              │ handleImosItems()         │
│ findReferenceSO()│              │  └─ buildPVarString()     │
│ web_save() ──────┤              │  └─ buildImosXml()        │
│  (create SO)     │              │  └─ write to imos_output/ │
│ action_confirm() │              │  └─ POST XML to receiver  │
│ fulfillPickings()│              │                           │
└──────┬───────────┘              └────────────┬─────────────┘
       │                                       │
       │                                       │  HTTP POST application/xml
       │                                       ▼
       │                          ┌────────────────────────────┐
       │                          │  IMOS RECEIVER  (server.js) │
       │                          │  192.168.30.41 : 3500       │
       │                          │                             │
       │                          │  POST /imos/receive         │
       │                          │  └─ save to C:\imos_inbox\  │
       │                          │     {orderNo}_{ts}.xml      │
       │                          │  └─ IMOS NetShop watches    │
       │                          │     this folder             │
       └──────────────────────────┴────────────────────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────────┐
                        │   200 JSON Response           │
                        │                               │
                        │  {                            │
                        │    success: true,             │
                        │    sale_order_id,             │
                        │    sale_order_url,            │
                        │    imos_result: { ... },      │
                        │    delivery_pickings,         │
                        │    fulfillment,               │
                        │    warnings,                  │
                        │    meta: { timings, ... }     │
                        │  }                            │
                        └──────────────────────────────┘
```

---

## 2. Request Body Shape

```jsonc
{
  "project_id": 3317,          // required — Odoo project.project id
  "phase_id": 42,              // optional — sale.order phase
  "commitment_date": "2026-04-15",  // required — YYYY-MM-DD
  "company_id": 4,             // optional — overrides project company
  "confirm": true,             // default true — action_confirm after create
  "sub_so": true,              // default true — flags SO as sub_so
  "origin": "SO/TL/2026/2232", // optional — origin string on SO
  "client": "m.perin@tecnibo.com",
  "employee": "Marie Laure PERIN",
  "debug": true,               // adds odoo root URL in response meta
  "items": [
    // ── Odoo item ──────────────────────────────
    {
      "id": 11581,
      "product_variant_id": 11291,   // product.product (NOT template)
      "routing": "odoo",
      "quantity": 5,
      "price": 12.50,
      "name": "Promante 15473 ...",
      "default_code": "15473"
    },
    // ── IMOS item ──────────────────────────────
    {
      "id": 48,
      "product_variant_id": 48,
      "routing": "imos",
      "quantity": 3,
      "price": 230.13,
      "cfg_name": "P_SUB_T100_LIN_CR_S1_90_A",
      "imos_name": "P_SUB_T100_LIN_CR_S1_90_A",
      "imos_table": "articles",
      "dimensions": { "width": 25000, "depth": 102, "height": 3100 },
      "variables": {
        "ART_SIZEX": 25000,
        "ART_SIZEY": 102,
        "ART_SIZEZ": 3100,
        "mat_1_T100_category_combox": "Decor Panel"
      },
      "articleDescription": {
        "D_MOVABLE_SUPPLIER": { "label": "Fournisseur", "value": "Parthos" },
        "P_HEIGHT": { "label": "Height", "value": 3100 }
      }
    }
  ]
}
```

---

## 3. Step-by-Step Flow

### Step 1 — Auth check (`route.js:80-101`)

```
cookies → session_id
    │
    ├─ missing          → 401 odoo_session_missing
    └─ assertSessionActive()
           │
           ├─ uid=0 / expired  → 401 odoo_session_expired
           └─ OK → continue
```

### Step 2 — Items split (`route.js:122-124`)

```javascript
const odooItems = items.filter(it => it.routing !== "imos");
const imosItems = items.filter(it => it.routing === "imos");
```

| Scenario            | odooItems | imosItems | Path taken       |
|---------------------|-----------|-----------|------------------|
| All Odoo            | N > 0     | 0         | Odoo only        |
| All IMOS            | 0         | N > 0     | IMOS fast path   |
| Mixed               | N > 0     | N > 0     | Both paths       |

### Step 3a — IMOS-only fast path (`route.js:151-175`)

Skips project read, reference SO lookup, and all Odoo RPC calls.
Goes straight to `handleImosItems()` → returns `{ mode: "imos_only" }`.

### Step 3b — Odoo path (`route.js:199-584`)

```
readProjectCore(project_id)
    └─ derives: projectCompanyId

assertSaleOrderCreatable()
    └─ guard: user can create sale.order in this company

findReferenceSO(project_id)
    └─ finds parent SO → extracts:
       partner_id, pricelist_id, warehouse_id,
       analytic_account_id, route_id, team_id

ensureProductProductIds(productIds)
    └─ validates all product.product IDs exist

web_save("sale.order", soVals)
    └─ creates the Sub SO with all lines

action_confirm(soId)
    └─ confirms (if confirm=true)

tryUpdatePrices(soId)
    └─ recomputes line prices

fetchPickingsForSaleOrder(soId)
fulfillPickings(pickings)
    └─ assigns logistic user, validates delivery
```

### Step 4 — IMOS XML generation (`imosHandler.js`)

```
handleImosItems(imosItems, context)
    │
    ├─ buildPVarString(item)
    │      └─ ART_NAME:=...
    │         ART_SIZEX:=...  ART_SIZEY:=...  ART_SIZEZ:=...
    │         <all item.variables>
    │         <all item.articleDescription values>
    │         ___MODEL_NAME:=...  ___REFID:=...
    │
    ├─ buildImosXml({ orderNo, basket, phaseName, items })
    │      └─ produces ListBuilder XML  (see §5)
    │
    ├─ fs.writeFileSync("imos_output/IMOS-{project}-{ts}.xml")
    │
    └─ fetch POST "http://192.168.30.41:3500/imos/receive"
           └─ receiver saves to C:\imos_inbox\
```

---

## 4. IMOS Receiver (`imos-receiver/server.js`)

```
Express app  :  192.168.30.41 : 3500

  GET  /              → health check + inbox file count
  GET  /health        → { status: "ok", uptime }
  POST /imos/receive  → save XML → { success, file, order_no, size }
  GET  /imos/files    → list all .xml files in inbox
```

The receiver:
1. Parses raw XML body (up to 10 MB)
2. Extracts `Order No="..."` from XML via regex
3. Saves as `{orderNo}_{ISO-timestamp}.xml` → `C:\imos_inbox\`
4. IMOS NetShop watches `C:\imos_inbox\` and picks up new files

---

## 5. Generated XML Structure

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<XML Type="ListBuilder">
  <Order No="IMOS-1993-1743600000000" DispDate="02.03.2026" Basket="BASKET-...">

    <Head>
      <COMM>O_TL_25_0165</COMM>           <!-- origin / phase name -->
      <ARTICLENO>IMOS-1993-...</ARTICLENO>
      <CLIENT>m.perin@tecnibo.com</CLIENT>
      <EMPLOYEE>Marie Laure PERIN</EMPLOYEE>
      <CRDATE>02.03.2026</CRDATE>
      <DELIVERY_DATE>15.04.2026</DELIVERY_DATE>

      <ORDER_PRICE_INFO1>1567.33</ORDER_PRICE_INFO1>  <!-- total cost -->
      <CUSTOM_INFO1>5</CUSTOM_INFO1>   <!-- total article count -->
      <CUSTOM_INFO2>2</CUSTOM_INFO2>   <!-- number of positions -->
      ...
    </Head>

    <CONTACT_INFO>
      <!-- empty for now — future: populate from Odoo partner -->
    </CONTACT_INFO>

    <BuilderList>

      <Set LineNo="1">
        <Pname>P_SUB_T100_LIN_CR_S1_90_A</Pname>
        <Count>3</Count>
        <UID>48</UID>
        <Program>NetShop</Program>
        <PVarString>
          ART_NAME:=P_SUB_T100...|ART_SIZEX:=25000|ART_SIZEY:=102|
          ART_SIZEZ:=3100|mat_1_T100_category_combox:=Decor Panel|
          ___MODEL_NAME:=P_SUB_T100...|___REFID:=48|
        </PVarString>
        <ARTICLE_PRICE_INFO1>230.13</ARTICLE_PRICE_INFO1>
        ...
      </Set>

      <Set LineNo="2">
        <Pname>OLD_KIWC_NICHE</Pname>
        <Count>2</Count>
        ...
      </Set>

    </BuilderList>
  </Order>
</XML>
```

### PVarString key order

| Priority | Source | Keys |
|----------|--------|------|
| 1st | Always injected | `ART_NAME` |
| 2nd | `item.dimensions` | `ART_SIZEX`, `ART_SIZEY`, `ART_SIZEZ` |
| 3rd | `item.variables` | all entries not yet added |
| 4th | `item.articleDescription` | `.value` of each entry |
| Last | Metadata | `___MODEL_NAME`, `___REFID` |

---

## 6. Response Shape

### Odoo-only / Mixed

```jsonc
{
  "success": true,
  "message": "Sub SO created",
  "sale_order_id": 28300,
  "sale_order_url": "https://www.tecnibo.com/web#id=28300&model=sale.order",
  "imos_result": {           // null if no imos items
    "count": 2,
    "order_no": "IMOS-3317-1743600000000",
    "xml_file": "/abs/path/imos_output/IMOS-3317-....xml",
    "pushed_to_receiver": true,
    "receiver_response": { "success": true, "file": "IMOS-3317-....xml" },
    "items": [ ... ]
  },
  "delivery_pickings": [ { "id": 9900, "name": "WH/OUT/...", "state": "done" } ],
  "fulfillment": { "pickings": [ ... ] },
  "warnings": [],
  "meta": {
    "confirm_requested": true,
    "confirm_ok": true,
    "project_id": 3317,
    "phase_id": 42,
    "reference_so_id": 27000,
    "reference_so_name": "SO/TL/2026/2232",
    "timings": { "parsed_body": 2, "project_read": 45, "done": 820 }
  }
}
```

### IMOS-only fast path

```jsonc
{
  "success": true,
  "mode": "imos_only",
  "imos_result": { ... },
  "timings": { ... }
}
```

---

## 7. Error Guards (in order)

| Guard | Condition | HTTP | Error key |
|-------|-----------|------|-----------|
| 1 | No `session_id` cookie | 401 | `odoo_session_missing` |
| 2 | Session expired (uid=0) | 401 | `odoo_session_expired` |
| 3 | Project ACL denied | 403 | `odoo_project_access_denied` |
| 4 | Can't create sale.order | 403 | `odoo_so_create_denied` |
| 5 | Parent SO not found | 404 | `Parent SO not found for this project` |
| 6 | Bad product IDs | 400 | `Each item must include product_variant_id` |
| catch-all | Unhandled Odoo error | 500 | classified by `classifyOdooError()` |

---

## 8. Key Files

```
src/app/api/odoo/createSubSo/
├── route.js                  Main API handler — auth, split, Odoo flow
├── lib/
│   ├── index.js              Re-exports all helpers
│   ├── imosHandler.js        XML generation + HTTP push to receiver
│   ├── odooRpc.js            callOdoo(), getModelFieldSet()
│   ├── session.js            getSessionUid(), assertSessionActive()
│   ├── saleOrder.js          findReferenceSO(), readProjectCore(), web_save
│   ├── items.js              ensureProductProductIds(), buildLineDescription
│   ├── fulfillment.js        fetchPickingsForSaleOrder(), fulfillPickings()
│   ├── phase.js              getM2ORelationModel(), checkLivraisonTask()
│   ├── notes.js              postSaleOrderNote(), buildNoteHtml()
│   ├── primitives.js         ensureInt(), m2oId(), itemVariantId(), itemQty()
│   └── odooError.js          OdooError, classifyOdooError()
│
├── cancel_so.sh              Cancel a SO by ID via Odoo RPC (bash)
├── test_createSubSo.sh       E2E test — mixed 3 odoo + 2 imos (bash)
├── test_imos_handler.sh      Unit test for XML generation (bash)
│
└── payload.json              Minimal warehouse-flow test payload

imos-receiver/
├── server.js                 Express receiver on port 3500
└── package.json

imos_output/                  Generated XML files (git-ignored)
```

---

## 9. Running the Tests

```bash
# Cancel a sale order (Odoo direct)
./src/app/api/odoo/createSubSo/cancel_so.sh 28279

# E2E test against local dev server (mixed payload)
./src/app/api/odoo/createSubSo/test_createSubSo.sh
# or with explicit args:
./src/app/api/odoo/createSubSo/test_createSubSo.sh http://localhost:3009 <session_id>

# Unit test — IMOS XML generation only (no server needed)
./src/app/api/odoo/createSubSo/test_imos_handler.sh
```

> All scripts require `curl` + `jq` (first two) or just `node` (last one).

---

## 10. Next Steps

| # | Task | Status |
|---|------|--------|
| 1 | Deploy receiver — copy `imos-receiver/` to `192.168.30.41`, run `npm install && node server.js` | ⏳ Pending |
| 2 | Configure IMOS — set NetShop to watch `C:\imos_inbox\` | ⏳ Pending |
| 3 | End-to-end test — trigger from frontend, verify XML arrives in inbox | ⏳ Pending |
| 4 | Populate `<CONTACT_INFO>` block from Odoo partner record | 🔜 Future |
| 5 | Return IMOS order link in response once NetShop assigns an order ID | 🔜 Future |
