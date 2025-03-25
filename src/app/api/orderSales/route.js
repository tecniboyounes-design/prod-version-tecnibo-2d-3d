import axios from "axios";
import { createOrderPayload } from "./CreateOrderPayload";
import { getSessionId } from "../sessionMiddleware";
import { getAuthenticationUrl } from "../redirect";
import { createClient } from '@supabase/supabase-js';
// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req) {
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

    const session_id = getSessionId(req);
    console.log("session_id", session_id);
    
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
        { status: 500 }
      );
    }

    // Step 5: Update the Supabase Database with the Odoo order ID
    const { error: orderError } = await supabase
      .from('projects')
      .update({ odoo_order_id: orderId })
      .eq('id', projectId);

    if (orderError) {
      console.error("Error updating Supabase:", orderError.message);
      return new Response(
        JSON.stringify({
          message: "Error updating project data in Supabase",
          error: orderError.message,
        }),
        { status: 500 }
      );
    }

    // Step 6: Respond with success
    return new Response(JSON.stringify(response.data.result), { status: 200 });

  } catch (error) {
    console.error("Caught error:", error);
    return new Response(
      JSON.stringify({
        message: "Error creating sale order",
        error: error.message,
      }),
      { status: 500 }
    );
  }
}
