// app/api/convertPdf/route.js

import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { convertPdfViaMicroservice } from "@/lib/plan2DImageHandler";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }
  
  const { base64Pdf, versionId } = await req.json();
  if (!base64Pdf || !versionId) {
    return new Response(
      JSON.stringify({ error: "Missing base64Pdf or versionId" }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {

    const timestamp = Date.now(); 
    const { accessUrl } = await convertPdfViaMicroservice(base64Pdf, versionId, timestamp);
   
   
    // Return the final PNG URL (with its timestamped filename)
    return new Response(JSON.stringify({ url: accessUrl }), {
      status: 200,
      headers: corsHeaders,
    });
   
  } catch (err) {
    console.error("[convertPdf route] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
