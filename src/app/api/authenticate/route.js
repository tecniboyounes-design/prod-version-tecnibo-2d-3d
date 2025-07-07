import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import fs from 'fs'; // Import the built-in fs module

const DATABASE_NAME = "tecnibo17_test";

// Function to append a log entry to the JSON file
function appendToLogFile(logEntry) {
  const logFilePath = 'auth-logs.json';
  let logs = [];

  // Read the existing log file, if it exists
  try {
    const fileContent = fs.readFileSync(logFilePath, 'utf8');
    if (fileContent) {
      logs = JSON.parse(fileContent);
    }
  } catch (error) {
    // If the file doesn't exist or is invalid, start with an empty array
    logs = [];
  }

  // Append the new log entry
  logs.push(logEntry);

  // Write the updated logs back to the file
  try {
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

export async function OPTIONS(request) {
  console.log("Handling CORS preflight request");
  return handleCorsPreflight(request);
}

export async function POST(request) {
  const corsHeaders = getCorsHeaders(request); 

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      // Log missing credentials
      appendToLogFile({
        timestamp: new Date().toISOString(),
        email: email || 'unknown',
        result: 'failure',
        message: 'Missing email or password'
      });
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

    const response = await fetch('http://192.168.30.33:8069/web/session/authenticate', {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify(loginData),
    });

    const data = await response.json();
 
 
    // Log the login result
    appendToLogFile({
      timestamp: new Date().toISOString(),
      email: email || 'unknown',
      result: data?.result ? 'success' : 'failure',
      message: data?.result ? 'Authentication succeeded' : 'Authentication failed',
      response: data
    });
    
    const setCookie = response.headers.get("set-cookie");
    let sessionId = null;

    if (setCookie) {
      const match = setCookie.match(/session_id=([^;]+)/);
      sessionId = match ? match[1] : null;
    }

    const isSecure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const cookieHeader = sessionId
      ? `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax${isSecure}`
      : null;

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
            ...(cookieHeader && { "Set-Cookie": cookieHeader }),
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
    // Log any errors during the authentication process
    appendToLogFile({
      timestamp: new Date().toISOString(),
      email: email || 'unknown',
      result: 'error',
      message: 'Internal server error',
      error: error.message
    });
    return new Response(
      JSON.stringify({ message: "Internal server error", result: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}




















// import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
// 
// const DATABASE_NAME = "tecnibo17_test";
// 
// export async function OPTIONS(request) {
//   return handleCorsPreflight(request);
// }
//    
// export async function POST(request) {
//   const corsHeaders = getCorsHeaders(request); 
//  
//   try {
//     const { email, password } = await request.json();
//     if (!email || !password) {
//       return new Response(
//         JSON.stringify({ message: "Missing email or password", result: false }),
//         { status: 400, headers: corsHeaders }
//       );
//     } 
//     
//     const loginData = {
//       jsonrpc: "2.0",
//       method: "call",
//       params: {
//         db: DATABASE_NAME,
//         login: email,
//         password: password,
//       },
//       id: 1,
//     };
//  
//     const response = await fetch('http://192.168.30.33:8069/web/session/authenticate', {
//       method: "POST",
//       headers: { "Content-Type": "application/json", Accept: "application/json" },
//       credentials: "include",
//       body: JSON.stringify(loginData),
//     });
//     
//     const data = await response.json();
//     const setCookie = response.headers.get("set-cookie");
//     let sessionId = null;
//    
//     if (setCookie) {
//       const match = setCookie.match(/session_id=([^;]+)/);
//       if (match) {
//         sessionId = match[1];
//       }
//     }
// 
//     const isSecure = process.env.NODE_ENV === "production" ? "; Secure" : "";
//     const cookieHeader = sessionId
//       ? `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax${isSecure}`
//       : null;
// 
//     if (data?.result) {
//       return new Response(
//         JSON.stringify({
//           message: "Request succeeded",
//           result: true,
//           session_id: sessionId,
//           response: data,
//         }),
//         {
//           status: 200,
//           headers: {
//             ...corsHeaders,
//             ...(cookieHeader && { "Set-Cookie": cookieHeader }),
//           },
//         }
//       );
//     } else {
//       return new Response(
//         JSON.stringify({ message: "Request failed", result: false, response: data }),
//         { status: 400, headers: corsHeaders }
//       );
//     }
//   } catch (error) {
//     console.error("Error during authentication:", error);
//     return new Response(
//       JSON.stringify({ message: "Internal server error", result: false, error: error.message }),
//       { status: 500, headers: corsHeaders }
//     );
//   }
// }