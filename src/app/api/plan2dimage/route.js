import fs from "fs";
import path from "path";
import { lookup } from "mime-types";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const { searchParams } = new URL(req.url);
    const versionId = searchParams.get("versionId");
    const file      = searchParams.get("file");

    if (!versionId || !file) {
      return new Response(
        JSON.stringify({ error: "Missing versionId or file parameter" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const baseDir = path.resolve(process.cwd(), "storage", "plan2d", versionId);
    const target  = path.resolve(baseDir, file);
    if (!target.startsWith(baseDir + path.sep)) {
      return new Response(
        JSON.stringify({ error: "Invalid file parameter" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!fs.existsSync(target)) {
      return new Response(
        JSON.stringify({ error: "File not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const fileBuffer  = fs.readFileSync(target);
    const contentType = lookup(target) || "application/octet-stream";

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${file}"`,
        // Each URL is unique (timestamp/filename), so cache long-term:
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[plan2dimage route] Error serving file:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
