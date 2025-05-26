import { NextResponse } from "next/server";
import { corsHeaders } from "../getPurchases/route";
import axios from "axios";
import { formatOrderLinesFromCart, wrapPurchaseOrderPayload } from "./createPurchaseOrderPayload";
import { cors } from "../catalog/route";

export async function POST(req) {
  const corsHeaders = cors(req); 

  try {
    const body = await req.json();
    console.log("Received request in create:", body);

    // Replace with your actual session ID
    const session_id = '4df991ca5e9041c58510381ef0f87fc74f73870e';
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: `session_id=${session_id}`,
    };
    
    // Compute order lines from the cart items.
    const order_line = formatOrderLinesFromCart({
      items: body.items,
      odoo_project_id: body.odoo_project_id,
      analytic_account_id: 10450, 
    });
    
    console.log("Formatted order lines:", order_line);
    
    // Build the payload using the dynamic data (order_line is passed first).
    const payload = wrapPurchaseOrderPayload(order_line, body.partner_id, body.userData);
    
    console.log("Payload to Odoo:", JSON.stringify(payload, null, 2));

    // Send the payload to Odoo
    const url = "http://192.168.30.33:8069/web/dataset/call_kw/purchase.order/web_save";
    const res = await axios.post(url, payload, { headers });
    
    // Log the response from Odoo
    console.log("Odoo response:", JSON.stringify(res.data, null, 2));

    // Check if the response indicates success
    if (res.data && res.data.result) {
      return NextResponse.json({ success:true, message: "Purchase created successfully", data: res.data.result }, { headers: corsHeaders });
    } else {
      throw new Error("Failed to create purchase order in Odoo");
    }
  } catch (error) {
    console.error("Error occurred during purchase creation:", error.message);
    return NextResponse.json(
      { error: "Purchase creation failed", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}


export async function OPTIONS(req) {
  const corsHeaders = cors(req);
  return new Response(null, { status: 204, headers: corsHeaders });
}