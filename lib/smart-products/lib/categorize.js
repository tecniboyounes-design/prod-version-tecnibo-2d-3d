// src/app/api/odoo/smart-products/lib/categorize.js

function normTag(tag) {
  return String(tag || "").trim().toUpperCase();
}

/**
 * Build reverse index: "#WS_BAT#" -> "Battery"
 */
export function buildTagToCategoryIndex(categoryOrderIdMap) {
  const idx = new Map();
  for (const [category, tag] of Object.entries(categoryOrderIdMap || {})) {
    const t = normTag(tag);
    if (!t) continue;
    idx.set(t, category);
  }
  return idx;
}

/**
 * Detect category by finding any known tag inside ORDER_ID.
 * Example ORDER_ID: "...#WS_ELE#...." => "Electro"
 */
export function detectCategoryFromOrderId(orderId, tagIndex) {
  const s = String(orderId || "").toUpperCase();
  if (!s) return null;

  for (const [tag, category] of tagIndex.entries()) {
    if (s.includes(tag)) return category;
  }
  return null;
}

/**
 * Group rows by category. Rows without tag go to uncategorized.
 */
export function groupRowsByCategory(rows, tagIndex) {
  const categories = {};
  const uncategorized = [];

  for (const row of rows || []) {
    const cat = detectCategoryFromOrderId(row.order_id, tagIndex);
    if (!cat) {
      uncategorized.push(row);
      continue;
    }
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(row);
  }

  return { categories, uncategorized };
}
