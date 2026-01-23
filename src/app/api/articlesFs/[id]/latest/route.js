import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extractSchemaArray(latest) {
  if (Array.isArray(latest?.sections)) return latest.sections; 
  if (Array.isArray(latest)) return latest;                   
  return [];
}

export async function GET(_req, { params }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Missing article id" }, { status: 400 });
    }

    const p = path.join(process.cwd(), "data", "formbuilder", "catalogs", id, "latest.json");
    const raw = await fs.readFile(p, "utf8").catch(() => null);
    if (!raw) {
      return NextResponse.json({ error: "latest.json not found" }, { status: 404 });
    }

    const latest = JSON.parse(raw);
    const schema = extractSchemaArray(latest);
    return NextResponse.json({ schema, latest }, { status: 200 });
  } catch (e) {
    console.error("GET /api/articlesFs/[id]/latest error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}