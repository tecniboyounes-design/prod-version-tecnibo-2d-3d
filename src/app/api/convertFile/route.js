import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { convertPdfViaMicroservice } from "@/lib/plan2DImageHandler";
import {
  convertPdfViaCloudConvert,
  convertDwgViaCloudConvert,
  savePlan2DImage,
} from "@/lib/plan2DImageHandlerV2";


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
    return new Response(
      JSON.stringify({ error: "Missing base64Data, extension, or versionId" }),
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }
  
  const normalizedExtension = extension.toLowerCase();
  const timestamp = Date.now();
  
  try {
    console.warn(
      `[convertFile] request`,
      JSON.stringify({ extension: normalizedExtension, versionId, timestamp })
    );
    
    if (normalizedExtension === "pdf") {
      const baseFile = `${versionId}-${timestamp}`;

      try {
        const png = await convertPdfViaMicroservice(
          base64Data,
          versionId,
          timestamp
        );

        return new Response(
          JSON.stringify({
            url: png.accessUrl,
            png: png.accessUrl,
            baseFile,
          }),
          {
            status: 200,
            headers: corsHeaders,
          }
        );
      } catch (microErr) {
        console.error(
          "[convertFile] microservice pdf conversion failed, falling back to CloudConvert",
          microErr
        );
        const { pdf, png, svg } = await convertPdfViaCloudConvert(
          base64Data,
          versionId,
          timestamp
        );
        return new Response(
          JSON.stringify({
            url: png.accessUrl,
            pdf: pdf.accessUrl,
            png: png.accessUrl,
            svg: svg.accessUrl,
            baseFile,
          }),
          {
            status: 200,
            headers: corsHeaders,
          }
        );
      }
    }

    if (normalizedExtension === "dwg") {
      const { pdf, png, svg } = await convertDwgViaCloudConvert(
        base64Data,
        versionId,
        timestamp
      );
      return new Response(
        JSON.stringify({
          url: png.accessUrl,
          pdf: pdf.accessUrl,
          png: png.accessUrl,
          svg: svg.accessUrl,
          baseFile: `${versionId}-${timestamp}`,
        }),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // Fallback: store image directly (png/jpg/etc) using existing mechanism
    console.warn(`[convertFile] fallback store for extension=${normalizedExtension}`);
    const result = await savePlan2DImage(base64Data, versionId, timestamp);
    return new Response(
      JSON.stringify({
        url: result.accessUrl,
        baseFile: `${versionId}-${timestamp}`,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err) {
    console.error("[convertFile route2] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}



