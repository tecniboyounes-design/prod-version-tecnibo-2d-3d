/**
 * IMOS Item Handler for createSubSo flow.
 *
 * Filters IMOS-routed items, generates a ListBuilder XML matching
 * the real IMOS receiver format (see 2025001665.xml reference),
 * writes the file to disk, and logs it.
 *
 * Later: send the file to the IMOS receiver server via network.
 */

import fs from "fs";
import path from "path";

function log(...a) {
    console.log("[createSubSO/imosHandler]", ...a);
}

const safe = (obj) => {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
};

/* ─── XML helpers ─────────────────────────────────────────────────────────── */

const xmlEscape = (s = "") =>
    String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

/** IMOS uses dd.MM.yyyy date format */
function fmtDate(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/* ─── PVarString builder ──────────────────────────────────────────────────── */

/**
 * Builds the PVarString for a single IMOS item.
 *
 * Format: KEY:=VALUE|KEY:=VALUE|...|
 *
 * Pulls from item.variables, item.dimensions, item.articleDescription,
 * and adds ___MODEL_NAME / ___REFID metadata.
 */
function buildPVarString(it, uid) {
    const pairs = [];
    const added = new Set();

    // Article name
    const artName = it.cfg_name || it.imos_name || it.default_code || it.name || `ITEM_${uid}`;
    pairs.push(`ART_NAME:=${artName}`);
    added.add("ART_NAME");

    // Dimensions → ART_SIZEX / ART_SIZEY / ART_SIZEZ
    const dims = it.dimensions || {};
    const varMap = it.variables || {};

    const sizeX = dims.width ?? dims.W ?? dims.w ?? varMap.P_WIDTH ?? null;
    const sizeY = dims.depth ?? dims.D ?? dims.d ?? varMap.P_DEPTH ?? null;
    const sizeZ = dims.height ?? dims.H ?? dims.h ?? varMap.P_HEIGHT ?? null;

    if (sizeX != null) { pairs.push(`ART_SIZEX:=${sizeX}`); added.add("ART_SIZEX"); }
    if (sizeY != null) { pairs.push(`ART_SIZEY:=${sizeY}`); added.add("ART_SIZEY"); }
    if (sizeZ != null) { pairs.push(`ART_SIZEZ:=${sizeZ}`); added.add("ART_SIZEZ"); }

    // All variables from item.variables (e.g. material, surface, profile selections)
    Object.entries(varMap).forEach(([k, v]) => {
        if (added.has(k)) return;
        if (v != null && v !== "") {
            pairs.push(`${k}:=${v}`);
            added.add(k);
        }
    });

    // articleDescription fields (label:value pairs from IMOS configurator)
    const desc = it.articleDescription || {};
    Object.entries(desc).forEach(([k, entry]) => {
        if (added.has(k)) return;
        const val = typeof entry === "object" ? entry.value : entry;
        if (val != null && val !== "") {
            pairs.push(`${k}:=${val}`);
            added.add(k);
        }
    });

    // Model metadata
    const modelName = it.cfg_name || it.imos_name || it.name || `MODEL_${uid}`;
    pairs.push(`___MODEL_NAME:=${modelName}`);
    pairs.push(`___REFID:=${uid}`);

    return xmlEscape(pairs.join("|") + "|");
}

/* ─── Description builder ─────────────────────────────────────────────────── */

function buildDescription(it) {
    const parts = [];
    const dims = it.dimensions || {};
    const vars = it.variables || {};

    const w = dims.width ?? vars.P_WIDTH;
    const d = dims.depth ?? vars.P_DEPTH;
    const h = dims.height ?? vars.P_HEIGHT;

    if (w != null) parts.push(`Width: ${w} mm`);
    if (d != null) parts.push(`Depth: ${d} mm`);
    if (h != null) parts.push(`Height: ${h} mm`);

    return parts.length ? "\n, " + parts.join("\n, ") : "";
}

/* ─── XML builder ─────────────────────────────────────────────────────────── */

/**
 * Build a full IMOS ListBuilder XML matching the real-world production format.
 *
 * @param {object} opts
 * @param {string} opts.orderNo       – order number
 * @param {string} opts.basket        – basket id
 * @param {string} opts.phaseName     – phase / COMM field
 * @param {string} opts.client        – client email
 * @param {string} opts.employee      – editor full name
 * @param {string} opts.commitmentDate – delivery date (YYYY-MM-DD or empty)
 * @param {Array}  opts.items         – IMOS items
 * @returns {string} complete XML
 */
function buildImosXml({
    orderNo,
    basket,
    phaseName,
    client,
    employee,
    commitmentDate,
    items = [],
}) {
    const now = new Date();
    const dispDate = fmtDate(now);
    const crDate = fmtDate(now);

    // Delivery date → IMOS format (dd.MM.yyyy)
    let deliveryDate = "";
    if (commitmentDate) {
        const [y, m, d] = commitmentDate.split("-");
        if (y && m && d) deliveryDate = `${d}.${m}.${y}`;
    }

    // Price summary
    let totalCost = 0;
    items.forEach((it) => {
        const qty = Number(it.quantity ?? it.cartQuantity ?? 1);
        const price = Number(it.price ?? 0);
        totalCost += qty * price;
    });
    const articleCount = items.reduce((sum, it) => sum + Number(it.quantity ?? it.cartQuantity ?? 1), 0);
    const positionCount = items.length;

    // Build item lines
    const linesXml = items
        .map((it, idx) => {
            const qty = Number(it.quantity ?? it.cartQuantity ?? 1);
            const price = Number(it.price ?? 0);
            const uid = it.product_variant_id || it.id || (idx + 1);
            const artName = it.cfg_name || it.imos_name || it.default_code || it.name || `ITEM_${idx + 1}`;
            const displayName = it.name || artName;
            const desc = buildDescription(it);

            return `
\t\t\t<Set LineNo="${idx + 1}">
\t\t\t  <hierarchicalPos>${idx + 1}</hierarchicalPos>
\t\t\t  <Pname>${xmlEscape(artName)}</Pname>
\t\t\t  <Count>${qty}</Count>
\t\t\t  <UID>${uid}</UID>
\t\t\t  <Program>NetShop</Program>
\t\t\t  <PVarString>${buildPVarString(it, uid)}</PVarString>
\t\t\t  <REF_ID>${uid}</REF_ID>
\t\t\t  <ARTICLE_TEXT_INFO1>${xmlEscape(displayName)}</ARTICLE_TEXT_INFO1>
\t\t\t  <ARTICLE_TEXT_INFO2>${xmlEscape(desc)}</ARTICLE_TEXT_INFO2>
\t\t\t  <ARTICLE_TEXT_INFO3></ARTICLE_TEXT_INFO3>
\t\t\t  <ARTICLE_PRICE_INFO1>${price.toFixed(2)}</ARTICLE_PRICE_INFO1>
\t\t\t  <ARTICLE_PRICE_INFO2>${price.toFixed(2)}</ARTICLE_PRICE_INFO2>
\t\t\t  <ARTICLE_PRICE_INFO3>${price.toFixed(2)}</ARTICLE_PRICE_INFO3>
\t\t\t  <ARTICLE_PRICE_INFO4></ARTICLE_PRICE_INFO4>
\t\t\t  <ARTICLE_PRICE_INFO5></ARTICLE_PRICE_INFO5>
\t\t\t  <PInsertion></PInsertion>
\t\t\t  <POrntation>0</POrntation>
\t\t\t  <ARTICLE_IMAGE></ARTICLE_IMAGE>
\t\t\t</Set>`;
        })
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8" ?>
<XML Type="ListBuilder">
  <Order No="${xmlEscape(orderNo)}" DispDate="${dispDate}" Basket="${xmlEscape(basket)}">
    <Head>
      <COMM>${xmlEscape(phaseName || orderNo)}</COMM>
      <ARTICLENO>${xmlEscape(orderNo)}</ARTICLENO>
      <CUSTOMER></CUSTOMER>
      <RETAILER></RETAILER>
      <CLIENT>${xmlEscape(client || "")}</CLIENT>
      <PROGRAM></PROGRAM>
      <EMPLOYEE>${xmlEscape(employee || "")}</EMPLOYEE>
      <TEXT_LONG></TEXT_LONG>
      <TEXT_SHORT>${xmlEscape(phaseName || orderNo)}</TEXT_SHORT>
      <CRDATE>${crDate}</CRDATE>
      <DELIVERY_DATE>${deliveryDate}</DELIVERY_DATE>
      <SHIPPING_DATE></SHIPPING_DATE>

      <COLOUR1></COLOUR1>
      <COLOUR2></COLOUR2>
      <COLOUR3></COLOUR3>
      <COLOUR4></COLOUR4>
      <COLOUR5></COLOUR5>

      <INFO1>${xmlEscape(employee || "")}</INFO1>
      <INFO2></INFO2>
      <INFO3></INFO3>
      <INFO4></INFO4>
      <INFO5></INFO5>
      <INFO6></INFO6>
      <INFO7></INFO7>
      <INFO8>${xmlEscape(client || "")}</INFO8>
      <INFO9></INFO9>
      <INFO10></INFO10>
      <INFO11></INFO11>
      <INFO12></INFO12>

      <EDITOR1>${xmlEscape(employee || "")}</EDITOR1>
      <EDITOR2></EDITOR2>
      <EDITOR3></EDITOR3>
      <EDITOR4></EDITOR4>
      <EDITOR5></EDITOR5>
      <EDITOR6></EDITOR6>
      <EDITOR7></EDITOR7>
      <EDITOR8>${xmlEscape(client || "")}</EDITOR8>

      <ADDRESS1></ADDRESS1>
      <ADDRESS2></ADDRESS2>
      <ADDRESS3></ADDRESS3>
      <ADDRESS4></ADDRESS4>
      <ADDRESS5></ADDRESS5>

      <BILLING_ADDRESS1></BILLING_ADDRESS1>
      <BILLING_ADDRESS2></BILLING_ADDRESS2>
      <BILLING_ADDRESS3></BILLING_ADDRESS3>
      <BILLING_ADDRESS4></BILLING_ADDRESS4>
      <BILLING_ADDRESS5></BILLING_ADDRESS5>
      <BILLING_ADDRESS6></BILLING_ADDRESS6>

      <SHIPPING_ADDRESS1></SHIPPING_ADDRESS1>
      <SHIPPING_ADDRESS2></SHIPPING_ADDRESS2>
      <SHIPPING_ADDRESS3></SHIPPING_ADDRESS3>
      <SHIPPING_ADDRESS4></SHIPPING_ADDRESS4>
      <SHIPPING_ADDRESS5></SHIPPING_ADDRESS5>
      <SHIPPING_ADDRESS6></SHIPPING_ADDRESS6>

      <CONTACT_ADDRESS1></CONTACT_ADDRESS1>
      <CONTACT_ADDRESS2></CONTACT_ADDRESS2>
      <CONTACT_ADDRESS3></CONTACT_ADDRESS3>
      <CONTACT_ADDRESS4></CONTACT_ADDRESS4>
      <CONTACT_ADDRESS5></CONTACT_ADDRESS5>

      <ORDER_PRICE_INFO1>${totalCost.toFixed(2)}</ORDER_PRICE_INFO1>
      <ORDER_PRICE_INFO2>0</ORDER_PRICE_INFO2>
      <ORDER_PRICE_INFO3>${totalCost.toFixed(2)}</ORDER_PRICE_INFO3>
      <ORDER_PRICE_INFO4></ORDER_PRICE_INFO4>
      <ORDER_PRICE_INFO5></ORDER_PRICE_INFO5>

      <CUSTOM_INFO1>${articleCount}</CUSTOM_INFO1>
      <CUSTOM_INFO2>${positionCount}</CUSTOM_INFO2>
      <CUSTOM_INFO3></CUSTOM_INFO3>
      <CUSTOM_INFO4></CUSTOM_INFO4>
      <CUSTOM_INFO5></CUSTOM_INFO5>
      <CUSTOM_INFO6></CUSTOM_INFO6>
      <CUSTOM_INFO7></CUSTOM_INFO7>
      <CUSTOM_INFO8></CUSTOM_INFO8>
      <CUSTOM_INFO9></CUSTOM_INFO9>
      <CUSTOM_INFO10></CUSTOM_INFO10>
      <GLOBAL_SETTINGS>
      </GLOBAL_SETTINGS>

      <FileList>
      </FileList>
    </Head>
    <CONTACT_INFO>
      <FIELD_ANREDE></FIELD_ANREDE>
      <FIELD_VORNAME1></FIELD_VORNAME1>
      <FIELD_VORNAME2></FIELD_VORNAME2>
      <FIELD_NACHNAME></FIELD_NACHNAME>
      <FIELD_FIRMA></FIELD_FIRMA>
      <FIELD_PHONE1></FIELD_PHONE1>
      <FIELD_PHONE2></FIELD_PHONE2>
      <FIELD_FAX></FIELD_FAX>
      <FIELD_MOBILE></FIELD_MOBILE>
      <FIELD_EMAIL1></FIELD_EMAIL1>
      <FIELD_EMAIL2></FIELD_EMAIL2>
      <FIELD_KATEGORIE></FIELD_KATEGORIE>
      <FIELD_STR></FIELD_STR>
      <FIELD_PLZ></FIELD_PLZ>
      <FIELD_ORT></FIELD_ORT>
      <FIELD_LAND></FIELD_LAND>
      <FIELD_REGION></FIELD_REGION>
      <FIELD_WEBSITE></FIELD_WEBSITE>
      <FIELD_KDNR></FIELD_KDNR>
      <FIELD_MWST></FIELD_MWST>
    </CONTACT_INFO>
    <BuilderList>
${linesXml}
    </BuilderList>
  </Order>
</XML>`;
}

/* ─── Output directory for generated XML files ────────────────────────────── */

const IMOS_OUTPUT_DIR = path.resolve(process.cwd(), "imos_output");

function ensureOutputDir() {
    if (!fs.existsSync(IMOS_OUTPUT_DIR)) {
        fs.mkdirSync(IMOS_OUTPUT_DIR, { recursive: true });
        log(`Created output directory: ${IMOS_OUTPUT_DIR}`);
    }
}

/* ─── Main handler ────────────────────────────────────────────────────────── */

/**
 * Handle IMOS-routed items: generate XML, write to disk, log it.
 *
 * @param {Array}  imosItems – items filtered where routing === "imos"
 * @param {object} context   – shared context from the route
 * @param {number} context.project_id
 * @param {number|false} context.phase_id
 * @param {string} context.commitment_date
 * @param {string|null} context.origin
 * @param {number|null} context.partner_id
 * @param {string|null} context.client      – user email
 * @param {string|null} context.employee    – editor/user full name
 * @returns {Promise<{ count: number, items: object[], xml_file: string|null, order_no: string, pushed_to_receiver: boolean, receiver_response: any }>}
 */
export async function handleImosItems(imosItems, context = {}) {
    if (!imosItems || imosItems.length === 0) {
        log("No IMOS items to process.");
        return { count: 0, items: [], xml_file: null, order_no: null };
    }

    const {
        project_id,
        phase_id,
        commitment_date,
        origin,
        partner_id,
        client,
        employee,
    } = context;

    log(`══════════════════════════════════════════════════`);
    log(`Processing ${imosItems.length} IMOS item(s)`);
    log(`  project_id     : ${project_id}`);
    log(`  phase_id       : ${phase_id || "none"}`);
    log(`  commitment_date: ${commitment_date || "none"}`);
    log(`  origin         : ${origin || "none"}`);
    log(`  partner_id     : ${partner_id || "none"}`);
    log(`══════════════════════════════════════════════════`);

    // Log each item summary
    const summaries = imosItems.map((it, idx) => {
        const summary = {
            index: idx,
            id: it.id ?? it.product_variant_id ?? null,
            name: it.name || null,
            default_code: it.default_code || null,
            imos_name: it.imos_name || null,
            imos_table: it.imos_table || null,
            cfg_name: it.cfg_name || null,
            ref_imos: it.ref_imos || null,
            quantity: it.quantity ?? it.cartQuantity ?? 1,
            price: it.price ?? 0,
            routing: it.routing,
            variables: it.variables || {},
            dimensions: it.dimensions || {},
        };

        log(`  [${idx}] ${summary.name || summary.imos_name || "unknown"}`);
        log(`       id=${summary.id}  code=${summary.default_code}  qty=${summary.quantity}`);
        log(`       imos_name=${summary.imos_name}  cfg_name=${summary.cfg_name}`);

        return summary;
    });

    // Generate unique order number
    const stamp = Date.now();
    const orderNo = `IMOS-${project_id || "0"}-${stamp}`;
    const basket = `BASKET-${stamp}`;
    const phaseName = origin || (phase_id ? `Phase #${phase_id}` : `Project #${project_id}`);

    // Build XML
    const xml = buildImosXml({
        orderNo,
        basket,
        phaseName,
        client: client || "",
        employee: employee || "",
        commitmentDate: commitment_date || "",
        items: imosItems,
    });

    // Write XML to filesystem
    let xmlFilePath = null;
    try {
        ensureOutputDir();
        const fileName = `${orderNo}.xml`;
        xmlFilePath = path.join(IMOS_OUTPUT_DIR, fileName);
        fs.writeFileSync(xmlFilePath, xml, "utf-8");
        log(`✅ XML written to: ${xmlFilePath}`);
    } catch (err) {
        log(`❌ Failed to write XML: ${err.message}`);
    }

    log(`──── Generated XML ────────────────────────────────`);
    log(xml);
    log(`──── End XML ──────────────────────────────────────`);

    // ── Send to IMOS Receiver Server ─────────────────────────────
    const RECEIVER_URL = "http://192.168.30.41:3500/imos/receive";
    let receiverResponse = null;
    let pushSuccess = false;

    // Use global fetch (built-in for Node 18+)
    try {
        log(`Sending XML to receiver -> ${RECEIVER_URL}`);

        const res = await fetch(RECEIVER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/xml"
            },
            body: xml
        });

        const text = await res.text();
        let payload = { status: res.status, raw: text };
        try { payload = JSON.parse(text); } catch (e) { }

        if (res.ok) {
            log(`✅ Successfully sent to receiver: ${safe(payload)}`);
            pushSuccess = true;
            receiverResponse = payload;
        } else {
            log(`❌ Receiver returned HTTP ${res.status}: ${safe(payload)}`);
            receiverResponse = { error: `HTTP ${res.status}`, details: payload };
        }
    } catch (err) {
        log(`❌ Failed to send to receiver: ${err.message}`);
        receiverResponse = { error: "Network/Fetch error", details: err.message };
    }

    log(`IMOS handler done — ${summaries.length} item(s), order: ${orderNo}`);

    return {
        count: summaries.length,
        items: summaries,
        order_no: orderNo,
        xml_file: xmlFilePath,
        xml_content: xml,
        pushed_to_receiver: pushSuccess,
        receiver_response: receiverResponse
    };
}
