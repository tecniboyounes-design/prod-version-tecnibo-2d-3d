import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { convertPdfViaMicroservice, convertDwgViaMicroservice, savePlan2DImage } from "@/lib/plan2DImageHandler";

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
  
  const { base64Data, extension, versionId } = await req.json();
  if (!base64Data || !extension || !versionId) {
    return new Response(JSON.stringify({ error: "Missing base64Data, extension, or versionId" }), {
      status: 400,
      headers: corsHeaders,
    });
  }
   
  const normalizedExtension = extension.toLowerCase();
  const handlers = {
    pdf: convertPdfViaMicroservice,
    dwg: convertDwgViaMicroservice,
  };
   
  let handler;
  if (handlers[normalizedExtension]) {
    handler = handlers[normalizedExtension];
  } else {
    handler = savePlan2DImage;
  }

  try {
    const timestamp = Date.now();
    const result = await handler(base64Data, versionId, timestamp);
    const accessUrl = result.accessUrl;
    return new Response(JSON.stringify({ url: accessUrl }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("[convertFile route] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}