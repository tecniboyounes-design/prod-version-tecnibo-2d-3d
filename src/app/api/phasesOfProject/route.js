import axios from "axios";
import { createPayload } from "./preparePhasesPayload";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { getCookie } from "@/lib/cookies";

const ODOO_BASE = (
  process.env.ODOO_BASE || "https://www.tecnibo.com"
).replace(/\/+$/, "");
const ODOO_URL = `${ODOO_BASE}/web/dataset/call_kw/project.phase/web_search_read`;

  
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  console.log("Incoming request:", req);

  try {
    const requestData = await req.json().catch(() => ({}));

    // Extract parameters from the request
    const { projectId } = requestData || {};
    console.log("Received request data:", requestData);

    // Generate the payload for the request
    const payload = createPayload(projectId);
    console.log("Generated payload:", payload);

    // 🔹 Extract session from header (like getAllProducts + searchProject)
    const sessionId = getCookie(req, 'session_id');
    console.log("sessionId:", sessionId);

    if (!sessionId) {
      return Response.json(
        { message: "Unauthorized: Missing sessionId" },
        { status: 401, headers: corsHeaders }
      );
    }

    // Send POST request to Odoo server
    const response = await axios.post(ODOO_URL, payload, {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `session_id=${sessionId}; frontend_lang=en_US; tz=Africa/Casablanca`,
        "X-Session-Id": sessionId,
      },
    });

    console.log("Odoo response received:", response.data);

    // Check for errors in the Odoo response
    if (response.data?.error) {
      console.error("Error details from Odoo:", response.data.error);
      return Response.json(
        { message: "Error creating sale order", error: response.data.error },
        { status: 500, headers: corsHeaders }
      );
    }

    // Send the successful response back to the client
    return Response.json(response.data.result, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Caught error:", error);
    return Response.json(
      { message: "Error creating sale order", error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
