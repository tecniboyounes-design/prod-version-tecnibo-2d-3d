import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import { getCorsHeaders } from "../authenticate/route";

const xmlFilePath = path.join(process.cwd(), "public", "data", "Quinquailleries.xml");

// Function to recursively search for a category by name
const findCategory = (categories, targetName) => {
  // Ensure categories is an array:
  const cats = Array.isArray(categories) ? categories : [categories];
  console.log(`🔍 Searching for category: ${targetName}`);
  for (let category of cats) {
    if (category.$.name === targetName) {
      console.log(`✅ Found category: ${targetName}`);
      return category;
    }
    if (category.category) {
      // Wrap subcategories in an array if needed:
      const subCats = Array.isArray(category.category) ? category.category : [category.category];
      const found = findCategory(subCats, targetName);
      if (found) return found;
    }
  }
  console.warn(`⚠️ Category not found: ${targetName}`);
  return null;
};


// Next.js API Route Handler
export async function GET(req) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    console.log(`📥 Received request: ${req.url}`);

    const { searchParams } = new URL(req.url);
    const categoryName = searchParams.get("category");
    const fetchAll = searchParams.get("fetchAll") === "true";

    console.log(`🔎 Query Params -> category: ${categoryName}, fetchAll: ${fetchAll}`);

    // Read XML file
    console.log(`📂 Reading XML file from: ${xmlFilePath}`);
    const xmlData = fs.readFileSync(xmlFilePath, "utf8");

    // Parse XML
    console.log("🛠️ Parsing XML data...");
    const parsedData = await xml2js.parseStringPromise(xmlData, { explicitArray: false });

    // Ensure catalog is always an array
    const catalog = Array.isArray(parsedData.Catalog.category)
      ? parsedData.Catalog.category
      : [parsedData.Catalog.category];

    console.log(`📦 Parsed catalog with ${catalog.length} top-level categories`);

    if (!categoryName) {
      console.log("📋 Returning top-level categories...");
      const topCategories = catalog.map(cat => ({
        name: cat.$.name,
        label: cat.$.label,
        image: cat.$.image || null,
      }));
      return NextResponse.json(topCategories, { status: 200, headers: corsHeaders });
    }

    // Search for the requested category
    console.log(`🔍 Searching for category: ${categoryName}`);
    const category = findCategory(catalog, categoryName);
    if (!category) {
      console.warn(`⚠️ Category '${categoryName}' not found`);
      return NextResponse.json({ error: "Category not found" }, { status: 404, headers: corsHeaders });
    }

    // Return either only direct children or full hierarchy
    const response = fetchAll ? category : category.category || category.object || [];
    console.log(`✅ Returning ${fetchAll ? "full category" : "direct children"} for '${categoryName}'`);

    return NextResponse.json(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  return new Response(null, { status: 204, headers: corsHeaders });
}
