import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";

// Default to <repo>/DoorsTextures. Override with ASSETS_ROOT if you want.
const DEFAULT_ASSETS = path.join(process.cwd(), "DoorsTextures");
const ASSETS_ROOT = process.env.ASSETS_ROOT || DEFAULT_ASSETS;

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".svg": "image/svg+xml",
  ".ktx2": "image/ktx2",
  ".hdr": "image/vnd.radiance",
  ".exr": "image/x-exr",
};
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range, If-None-Match",
};

function guessType(p) {
  return MIME[path.extname(p).toLowerCase()] || "application/octet-stream";
}
function safeJoin(base, rel) {
  const clean = path.normalize(rel).replace(/^([/\\])+|(\.\.(\/|\\|$))/g, "");
  const full = path.join(base, clean);
  if (!full.startsWith(base)) throw new Error("Invalid path");
  return full;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");    // remote: ?url=https://...
  const localPath = searchParams.get("path"); // local:  ?path=IVIS/E_TEX00.JPG

  try {
    // Remote proxy
    if (fileUrl) {
      const headers = {};
      const range = req.headers.get("range");
      if (range) headers.range = range;

      const res = await fetch(fileUrl, { cache: "no-store", headers });
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        status: res.status || 200,
        headers: {
          "Content-Type": res.headers.get("content-type") || guessType(fileUrl),
          "Cache-Control": "no-store",
          ...cors,
        },
      });
    }

    // Local file from DoorsTextures (or ASSETS_ROOT)
    if (localPath) {
      const absolute = safeJoin(ASSETS_ROOT, localPath);
      const stat = await fs.stat(absolute);
      const buf = await fs.readFile(absolute);

      const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
      if (req.headers.get("if-none-match") === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: { ETag: etag, "Cache-Control": "public, max-age=31536000, immutable", ...cors },
        });
      }

      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": guessType(absolute),
          "Content-Length": String(stat.size),
          ETag: etag,
          "Cache-Control": "public, max-age=31536000, immutable",
          ...cors,
        },
      });
    }

    return NextResponse.json(
      { error: "Provide either ?url= or ?path=" },
      { status: 400, headers: cors }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch file", details: String(err?.message || err) },
      { status: 500, headers: cors }
    );
  }
}
