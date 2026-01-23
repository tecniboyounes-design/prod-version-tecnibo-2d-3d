// app/api/plan2dimage/route.js
import fs from "fs";
import path from "path";
import { lookup } from "mime-types";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

/** Hard-coded storage root (you already use this for writes) */
function getStorageRoot() {
  return "/home/yattaoui/tecnibo-storage";
}

// debug: prints the storage root when the route module loads (check journalctl)
console.info("[plan2dimage] storageRoot =", getStorageRoot());

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
      return new Response(JSON.stringify({ error: "Missing versionId or file parameter" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const storageRoot = getStorageRoot();
    const baseDir = path.resolve(storageRoot, "plan2d", versionId);
    const target  = path.resolve(baseDir, file);

    // path traversal guard
    const rel = path.relative(baseDir, target);
    if (rel.startsWith("..") || path.isAbsolute(rel) && rel.includes("..")) {
      return new Response(JSON.stringify({ error: "Invalid file parameter" }), {
        status: 400, headers: corsHeaders,
      });
    }
    
    // async check + ensure it's a file (avoid existsSync)
    try {
      const st = await fs.promises.stat(target);
      if (!st.isFile()) {
        return new Response(JSON.stringify({ error: "Not a file" }), { status: 400, headers: corsHeaders });
      }
    } catch (err) {
      // file not found or other stat error
      return new Response(JSON.stringify({ error: "File not found" }), { status: 404, headers: corsHeaders });
    }

    const fileBuffer  = await fs.promises.readFile(target);
    const contentType = lookup(target) || "application/octet-stream";
   
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${file}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[plan2dimage route] Error serving file:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
