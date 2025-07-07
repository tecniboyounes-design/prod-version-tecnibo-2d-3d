import { getJobPositionDetails } from "./getJobInfo";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";


/**
 * Handles GET requests to fetch session info and job position details.
 *
 * @param {Request} request - The incoming HTTP request.
 * @returns {Response} A JSON response with user ID, session info, and job position details.
 */



export async function GET(request) {
  const corsHeaders = getCorsHeaders(request);
  const sessionId = request.headers.get("x-session-id");
  console.log("Session ID provided:", sessionId);

  if (!sessionId) {
    console.log("Validation failed: No session ID provided");
    return new Response(JSON.stringify({ error: "Missing session ID" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionId}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {},
      id: 1,
    }),
  };

  try {
    console.log("Fetching session info from Odoo...");
    const response = await fetch("http://192.168.30.33:8069/web/session/get_session_info", options);
    console.log("Session info response status:", response.status);

    if (!response.ok) {
      console.log(`HTTP request failed with status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Session info data:", data);

    if (data.error) {
      console.error("Session info error:", data.error.message);
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const uid = data.result.uid;
    const currentCompany = data.result.user_companies.current_company;
    console.log("User ID extracted:", uid);
    console.log("Current company ID:", currentCompany);
    console.log("Allowed companies:", data.result.user_companies.allowed_companies);

    if (!uid) {
      console.log("No user ID found in session info");
      return new Response(JSON.stringify({ error: "User not found in session" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    if (!currentCompany) {
      console.log("No current company found in session info");
      return new Response(JSON.stringify({ error: "No current company in session" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const jobPosition = await getJobPositionDetails(uid, sessionId, currentCompany);
    console.log("Job position details:", jobPosition);

    const responseData = {
      uid,
      session_info: data.result,
      job_position: jobPosition,
    };
    console.log("Final response data:", responseData);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error occurred during request:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}



export async function OPTIONS(request) {
  console.log("Handling OPTIONS request");
  return handleCorsPreflight(request);
}


