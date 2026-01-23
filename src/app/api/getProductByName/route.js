import { NextResponse } from "next/server";
import { payload } from "./payload";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

const ODOO_URL = process.env.ODOO_URL
  ? `${process.env.ODOO_URL}/web/dataset/call_kw/product.template/web_search_read`
  : null;
if (!ODOO_URL) throw new Error("[getProductByName] ODOO_URL env is required");


// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

// Handle POST requests with CORS headers
export async function POST(req) {
  try {
    // Extract 'name' from the request body
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }
    
    // Get session ID from request headers
    const sessionId = req.headers.get("x-session-id");
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }
    
    // Define the Odoo endpoint URL
    // Create a new payload with an updated domain using the provided 'name'
    const newPayload = {
      ...payload,
      params: {
        ...payload.params,
        kwargs: {
          ...payload.params.kwargs,
          domain: [
            "&",
            ["purchase_ok", "=", true],
            "|",
            "|",
            "|",
            ["default_code", "ilike", name],
            ["product_variant_ids.default_code", "ilike", name],
            ["name", "ilike", name],
            ["barcode", "ilike", name]
          ]
        }
      }
    };
  
    // Send the request to Odoo
    const response = await fetch(ODOO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionId}`
      },
      body: JSON.stringify(newPayload)
    });
    

    // Check if the response is successful
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    
      
    // Parse and return the response data
    const data = await response.json();
    return NextResponse.json(data, { status: 200, headers: getCorsHeaders(req) });
  } catch (error) {
    console.error("Error in POST /api/getProductByName:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}
