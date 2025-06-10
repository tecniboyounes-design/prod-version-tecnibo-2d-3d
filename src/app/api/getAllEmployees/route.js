import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";



/**
 * OPTIONS handler for CORS preflight requests.
 * @param {Request} request - The incoming HTTP request.
 * @returns {Response} A CORS preflight response.
 */

export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}



/**
 * Generates a JSON-RPC payload to fetch all employees using Odoo's web_search_read method.
 * @param {number} uid - The user's ID to include in the context for permissions.
 * @param {number} companyId - The company ID to include in the context.
 * @returns {Object} The JSON-RPC payload.
 */
 

function createEmployeePayload(uid, companyId) {
  return {
    jsonrpc: "2.0",
    method: "call",
    id: Date.now(),
    params: {
      model: "hr.employee",
      method: "web_search_read",
      args: [],
      kwargs: {
        specification: {
          id: {},
          name: {},
          job_title: {},
          work_email: {},
          work_phone: {},
          company_id: { fields: { display_name: {} } },
          image_128: {},
          hr_presence_state: {},
          is_absent: {},
        },
        domain: [], // Empty domain to fetch all records
        limit: 10000, // High limit to fetch all employees
        offset: 0,
        order: "",
        context: {
          lang: "en_US",
          tz: "Africa/Casablanca",
          uid: uid, // User ID from request
          allowed_company_ids: [companyId], // Company ID from request
        },
      },
    },
  };
}

/**
 * GET handler to fetch all employees from Odoo.
 * @param {Request} request - The incoming HTTP request.
 * @returns {Response} The list of employees or an error response.
 */

export async function GET(request) {
const corsHeaders = getCorsHeaders(request);  

  // Retrieve values from headers
  const sessionId = request.headers.get("x-session-id");
  const uid = parseInt(request.headers.get("x-uid"), 10);
  const companyId = parseInt(request.headers.get("x-company-id"), 10);
  
  console.log("Received headers:", {
    sessionId,
    uid,
    companyId,
  });
  
  // Validate required headers
  if (!sessionId) {
    console.log("Validation failed: No session ID provided");
    return new Response(JSON.stringify({ error: "Missing session ID" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!uid || isNaN(uid)) {
    console.log("Validation failed: No valid uid provided");
    return new Response(JSON.stringify({ error: "Missing or invalid uid" }), {
      status: 400,
      headers: corsHeaders,
    });
  }
  if (!companyId || isNaN(companyId)) {
    console.log("Validation failed: No valid company_id provided");
    return new Response(JSON.stringify({ error: "Missing or invalid company_id" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // Create payload with uid and companyId from headers
    const payload = createEmployeePayload(uid, companyId);
   
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `session_id=${sessionId}`,
      },
      body: JSON.stringify(payload),
    };

    const response = await fetch(
      "http://192.168.30.33:8069/web/dataset/call_kw/hr.employee/web_search_read",
      options
    );

    if (!response.ok) {
      console.log(`HTTP request failed with status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      console.log("Odoo returned an error:", data.error.message);
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    
    const employees = data.result.records;

    return new Response(JSON.stringify(employees), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.log("Error occurred during request:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
