import { NextResponse } from "next/server";
import { renameArticle } from "@/lib/server/articlesFS";

/**
 * POST /api/articlesFs/:id/rename
 * body: { name }
 * -> { item }
 */
export async function POST(request, { params }) {
  const { name } = await request.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "New name is required" }, { status: 400 });
  }
  try {
    const item = await renameArticle(params.id, name);
    return NextResponse.json({ item }, { status: 200 });
  } catch (e) {
    const status = e.code === "DUPLICATE_NAME" ? 409 : 400;
    return NextResponse.json({ error: e.message || "Rename failed" }, { status });
  }
}

