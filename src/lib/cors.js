
// Load allowed origins from environment variables or use defaults
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001", "http://192.168.33.137:5173",
    "http://192.168.33.138:3001","http://192.168.30.92:3006", "http://192.168.30.92:5173", "http://rp.tecnibo.com", "https://rp.tecnibo.com", "http://192.168.30.92:3010", 
    "http://192.168.30.92:9004","http://localhost:7005"
    ];
  
    

// Default CORS configuration
const CORS_CONFIG = {
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowHeaders: ["Content-Type", "Authorization", "x-session-id", "x-uid", "x-company-id"], 
  allowCredentials: true, 
  maxAge: 86400, 
};



/**
 * Generates CORS headers for a request.
 * @param {Request} request - The incoming HTTP request.
 * @param {Object} [config] - Optional CORS configuration overrides.
 * @returns {Object} CORS headers.
 */


export function getCorsHeaders(request, config = {}) {
  const origin = request.headers.get("origin") || "";
  console.log("CORS Origin:", origin);
  console.log(`Allowed Origins: ${ALLOWED_ORIGINS.join(", ")}`);
  const mergedConfig = { ...CORS_CONFIG, ...config };
 
  // Validate origin against allowed origins
  const cleanOrigin = origin.replace(/\/$/, "");
  const isAllowed = ALLOWED_ORIGINS.includes(cleanOrigin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null", // Restrict to allowed origins
    "Access-Control-Allow-Methods": mergedConfig.allowMethods.join(", "),
    "Access-Control-Allow-Headers": mergedConfig.allowHeaders.join(", "),
    "Access-Control-Allow-Credentials": mergedConfig.allowCredentials ? "true" : "false",
    "Access-Control-Max-Age": mergedConfig.maxAge.toString(),
    "Content-Type": "application/json", // Default content type
  };

  
}


/**
 * Handles CORS preflight (OPTIONS) requests.
 * @param {Request} request - The incoming HTTP request.
 * @param {Object} [config] - Optional CORS configuration overrides.
 * @returns {Response} CORS preflight response.
 */
  


export function handleCorsPreflight(request, config = {}) {
  const corsHeaders = getCorsHeaders(request, config);
  return new Response(null, { status: 204, headers: corsHeaders });
}