import { NextResponse } from "next/server";
import axios from "axios";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors"; 
import { generatePayload } from "./generateProductsPayload";

const ODOO_URL = "http://192.168.30.33:8069/web/dataset/call_kw/product.template/web_search_read";

/**
 * Handles CORS preflight requests for the GET endpoint.
 * @param {Request} request - The incoming HTTP request.
 * @returns {Response} CORS preflight response.
 */


export async function OPTIONS(request) {
  console.log("OPTIONS request received for GET /api/products", {
    origin: request.headers.get("origin"),
  });
  return handleCorsPreflight(request);
}


/**
 * Fetches product prices from Odoo using the session ID from the X-Session-Id header.
 * @param {Request} request - The incoming HTTP request.
 * @returns {Response} JSON response with product prices or an error.
 */


export async function GET(request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    // Extract sessionId from X-Session-Id header
    const sessionId = request.headers.get("x-session-id");
    
    if (!sessionId) {
      console.warn("Missing X-Session-Id header");
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate sessionId format (basic validation, adjust as needed)
    if (!/^[a-zA-Z0-9-_]+$/.test(sessionId)) {
      console.warn("Invalid X-Session-Id format:", sessionId);
      return NextResponse.json(
        { error: "Invalid sessionId format" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Generate the static payload
    const payload = generatePayload();
    
    console.log("Sending request to Odoo with sessionId:", sessionId);
    
    const response = await axios.post(ODOO_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "Cookie": `session_id=${sessionId}`,
        "X-Session-Id": sessionId, 
      },
    });
    
    if (response.status === 200) {
      console.log("Response from Odoo:", response.data);
      return NextResponse.json(
        { success: true, data: response.data },
        { status: 200, headers: corsHeaders }
      );
    } else {
      throw new Error(`Failed to fetch product prices. Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching product prices:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}