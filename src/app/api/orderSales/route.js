import axios from "axios";
import { createOrderPayload } from "./CreateOrderPayload";
import { getSessionId } from "../sessionMiddleware";
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from "../authenticate/route";
import { generateUpdateOrderPayload } from "./updateOrder";

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req) {
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
  
  try {
    // Step 1: Parse the request data
    
    const request = await req.json();
    const items = request.items;
    const orderName = request.orderName;
    const userData = request.userData;
    const projectId = request.projectId;  
    const payload = createOrderPayload(items, orderName, userData);
    console.log('projectId', projectId);
      
    const relativePath = "web/dataset/call_kw/sale.order/web_save";
    const url = getAuthenticationUrl(req, relativePath);
    
    // const session_id = getSessionId(req);
    // console.log("session_id", session_id);
    const session_id = "3bb683d26bd12b6bfeaa969e902bb12f2c74e33b"
    
    // Step 3: Send POST request to Odoo
    const response = await axios.post(url, payload, {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `session_id=${session_id}; frontend_lang=fr_BE; tz=Africa/Casablanca`,
      },
    });

    // console.log("Response from Odoo server:", response);
    // console.log("Response data:", response.data.result);

    const orderId = response.data.result[0]?.id; 

   // console.log("Response data ID:", orderId);

    // Step 4: Check for Odoo error (if any)
    if (response.data.error) {
      console.error("Error details:", response.data.error);
      return new Response(
        JSON.stringify({
          message: "Error creating sale order",
          error: response.data.error,
        }),
        { status: 500 , headers: corsHeaders}
      );
    }
    
    // Step 5: Update the Supabase Database with the Odoo order ID
    const { data:updatedProject ,error: orderError } = await supabase
    .from('projects')
    .update({ odoo_order_id: orderId })
    .eq('id', projectId)
    .select();
     
    if (orderError) {
      console.error("Error updating Supabase:", orderError.message);
      return new Response(
        JSON.stringify({
          message: "Error updating project data in Supabase",
          error: orderError.message,
        }),
        { status: 500 , headers: corsHeaders}
      );
    }

return new Response(
  JSON.stringify({
    message: "🎉 Order has been successfully created in Odoo and the database has been updated! ✅",
    updatedProject: updatedProject,
    order:response.data
  }), 
  { status: 200, headers: corsHeaders }
);

  } catch (error) {
    console.error("Caught error:", error);
    return new Response(
      JSON.stringify({
        message: "Error creating sale order",
        error: error.message,
      }),
      { status: 500 , headers: corsHeaders}
    );
  }
}



export async function PUT(req) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Log the method, headers, and the body of the request
    console.log("Request Method:", req.method);
    console.log("Request Headers:", req.headers);

    // Parse and log the request body if it's a JSON request
    const requestBody = await req.json();
    console.log("Request Body:", requestBody);

    // Check if necessary fields are present
    if (!requestBody.orderId) {
      throw new Error("orderId is missing in the request body");
    }

    const { orderId, items, userData, projectId } = requestBody;
    const orderPayload = generateUpdateOrderPayload(orderId, userData, items, userData.user_companies.current_company, projectId);
    console.log("Generated Update Order Payload:", orderPayload);

    // Odoo API call setup
    const relativePath = "web/dataset/call_kw/sale.order/web_save";
    const url = getAuthenticationUrl(req, relativePath);
    
    // You might want to get session_id dynamically from the request
    const session_id = "3bb683d26bd12b6bfeaa969e902bb12f2c74e33b"; // Replace with dynamic retrieval if possible
    
    // Send POST request to Odoo with the generated payload
    const response = await axios.post(url, orderPayload, {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `session_id=${session_id}; frontend_lang=fr_BE; tz=Africa/Casablanca`,
      },
    });

    // Log Odoo response for debugging
    console.log("Response from Odoo server:", response.data);

    // Extract orderId from Odoo response (adjust based on actual response structure)
    const updatedOrderId = response.data.result?.[0]?.id || orderId;

    // Return success response with Odoo data
    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        orderId: updatedOrderId,
        odooResponse: response.data
      }
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });

  } catch (error) {
    console.error("Error processing request:", error.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
}




export async function OPTIONS(req) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  return new Response(null, { status: 204, headers: corsHeaders });
}

