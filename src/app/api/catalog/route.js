import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import xml2js from "xml2js";


export const cors = (req) => {
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173/'];
  const origin = req.headers.get("origin");

  const allowedOrigin = allowedOrigins.includes(origin) ? origin : '*';
  
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin, // Allow valid origins or wildcard
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Allowed HTTP methods
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
    "Access-Control-Allow-Credentials": "true", // Enable credentials if needed
  };

  return headers;
};

const xmlFilePath = path.join(process.cwd(), "public", "data", "Quinquailleries.xml");

// Function to recursively search for a category by name
const findCategory = (categories, targetName) => {
  const cats = Array.isArray(categories) ? categories : [categories];
  console.log(`🔍 Searching for category: ${targetName}`);
  for (let category of cats) {
    if (category.$.name === targetName) {
      console.log(`✅ Found category: ${targetName}`);
      return category;
    }
    if (category.category) {
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
  const corsHeaders = cors(req); // Apply CORS headers here
  
  try {
    console.log(`📥 Received request: ${req.url}`);
    
    const { searchParams } = new URL(req.url);
    const categoryName = searchParams.get("category");
    const fetchAll = searchParams.get("fetchAll") === "true";
    
    console.log(`🔎 Query Params -> category: ${categoryName}, fetchAll: ${fetchAll}`);

    // Read XML file
    const xmlData = fs.readFileSync(xmlFilePath, "utf8");

    // Parse XML
    const parsedData = await xml2js.parseStringPromise(xmlData, { explicitArray: false });

    // Ensure catalog is always an array
    const catalog = Array.isArray(parsedData.Catalog.category)
      ? parsedData.Catalog.category
      : [parsedData.Catalog.category];

    if (!categoryName) {
      const topCategories = catalog.map(cat => ({
        name: cat.$.name,
        label: cat.$.label,
        image: cat.$.image || null,
      }));
      return NextResponse.json(topCategories, { status: 200, headers: corsHeaders });
    }

    // Search for the requested category
    const category = findCategory(catalog, categoryName);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404, headers: corsHeaders });
    }

    const response = fetchAll ? category : category.category || category.object || [];
    return NextResponse.json(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS(req) {
  const corsHeaders = cors(req); // Apply CORS headers here
  return new Response(null, { status: 204, headers: corsHeaders });
}
