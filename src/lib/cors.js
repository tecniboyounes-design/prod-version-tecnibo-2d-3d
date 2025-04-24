
// Load allowed origins from environment variables or use defaults
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"];


// Default CORS configuration
const CORS_CONFIG = {
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-session-id"], 
  allowCredentials: true, // Support authenticated requests
  maxAge: 86400, // Cache preflight response for 24 hours
};


/**
 * Generates CORS headers for a request.
 * @param {Request} request - The incoming HTTP request.
 * @param {Object} [config] - Optional CORS configuration overrides.
 * @returns {Object} CORS headers.
 */


export function getCorsHeaders(request, config = {}) {
  const origin = request.headers.get("origin") || "";
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