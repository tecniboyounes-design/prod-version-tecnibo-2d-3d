import { NextResponse } from "next/server";
import { payload } from "./payload";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function POST(req) {
  const startTime = Date.now(); 
   
  try {
   
    const { name, width, height } = await req.json(); 
    if (!name || !width || !height) {
      return NextResponse.json(
        { error: "Name, width, and height are required" },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }
    
     
    
    // Extract session ID from headers
    const sessionId = req.headers.get("x-session-id");
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }
    
    // Odoo endpoint URL
    const url = "http://192.168.30.33:8069/web/dataset/call_kw/product.template/web_search_read";
    
    // Update payload with dynamic domain based on 'name'
    const updatedPayload = {
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
   
    // Fetch data from Odoo
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionId}`
      },
      body: JSON.stringify(updatedPayload)
    });
    
    // Validate response
    if (!response.ok) {
      throw new Error(`Odoo server responded with status: ${response.status}`);
    }

    // Parse the response data
    const data = await response.json();
    console.log("Odoo response data:", data.result);
    
    const material = data.result?.records?.[0];

    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404, headers: getCorsHeaders(req) }
      );
    }

    const pricePerUnit = material.list_price || 0;


    const area = width * height;
    const totalPrice = area * pricePerUnit;

    // Prepare the response
    const responseData = {
      material: material.name,
      width,
      height,
      area,
      pricePerUnit,
      totalPrice,
      unitOfMeasure: "M2"
    };
 
    const endTime = Date.now(); // End timer
    const duration = endTime - startTime; // Calculate duration
    console.log(`Execution time: ${duration}ms`); // Log duration

    return NextResponse.json(responseData, {
      status: 200,
      headers: getCorsHeaders(req)
    });
    
  } catch (error) {
    console.error("Error in POST /api/calculateMaterialPrice:", error.message);
    const endTime = Date.now(); // End timer in case of error
    const duration = endTime - startTime; // Calculate duration
    console.log(`Execution time (error): ${duration}ms`); // Log duration
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}


