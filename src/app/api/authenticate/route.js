// import { getAuthenticationUrl } from "../redirect";

const DATABASE_NAME = "tecnibo17_test"; 

// Allowed origins
const allowedOrigins = ['*'];

export function getCorsHeaders(origin) {
  // Allow requests from any origin by returning "*" for the Access-Control-Allow-Origin header
  return {
    "Access-Control-Allow-Origin": "*",  // Allow all origins
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",  // Allow specific methods (POST, GET, and OPTIONS)
    "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allow specific headers
    "Content-Type": "application/json",  // Set the response content type
  };
}

export async function POST(request) {
  console.log("----- Starting Authentication Process -----");
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // If CORS is not allowed, immediately return an error response.
  if (corsHeaders["Access-Control-Allow-Origin"] === "null") {
    return new Response(
      JSON.stringify({ message: "Forbidden: Origin not allowed" }),
      { status: 403, headers: corsHeaders }
    );
  }
  
  try {
    const { email, password } = await request.json();
    // console.log("Received email:", email);
    // console.log("Received password:", password);

    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: "Missing email or password", result: false }),
        { status: 400, headers: corsHeaders }
      );
    }

    const loginData = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        db: DATABASE_NAME,
        login: email,
        password: password,
      },
      id: 1,
    }; 
    
    // const authUrl = getAuthenticationUrl(request, "web/session/authenticate");
    const response = await fetch('http://192.168.30.33:8069/web/session/authenticate', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify(loginData),
    });
    
    const data = await response.json();
    const setCookie = response.headers.get("set-cookie");
    let sessionId = null;

    if (setCookie) {
      const match = setCookie.match(/session_id=([^;]+)/);
      if (match) {
        sessionId = match[1];
      }
    }

    if (data?.result) {
      return new Response(
        JSON.stringify({
          message: "Request succeeded",
          result: true,
          session_id: sessionId,
          response: data,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Set-Cookie": `session_id=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict`,
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ message: "Request failed", result: false, response: data }),
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Error occurred during authentication:", error);
    return new Response(
      JSON.stringify({ message: "Error occurred", result: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

    
export async function OPTIONS(request) { 
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  return new Response(null, { status: 204, headers: corsHeaders });
}


