import { getJobPositionDetails } from "./getJobInfo";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
];


export function getCorsHeaders(origin) {
  const cleanOrigin = origin?.replace(/\/$/, "");
  const isAllowed = allowedOrigins.includes(cleanOrigin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-session-id",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
}

export async function OPTIONS(request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const sessionId = request.headers.get("x-session-id");
  // console.log("All Request Headers:", [...request.headers]);

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
    const response = await fetch("http://192.168.30.33:8069/web/session/get_session_info", options);
     
    if (!response.ok) {
      console.log(`HTTP request failed with status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const uid = data.result.uid;
    if (!uid) {
      console.log("No user ID found in session info");
      return new Response(JSON.stringify({ error: "User not found in session" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const jobPosition = await getJobPositionDetails(uid, sessionId);

    return new Response(JSON.stringify({
      uid,
      session_info: data.result,
      job_position: jobPosition,
    }), {
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

