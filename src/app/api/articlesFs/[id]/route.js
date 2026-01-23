export const runtime = "nodejs";

import { NextResponse } from "next/server";
// If your "@" alias isn't set, swap this import to a relative path:
// import * as Articles from "../../../lib/server/articlesFS";
import * as Articles from "@/lib/server/articlesFS";

/** Optional: fetch one article by id */
export async function GET(_req, { params }) {
  const items = await Articles.listArticles();
  const item = items.find(a => a.id === params.id) || null;
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

/** DELETE /api/articlesFs/:id */
export async function DELETE(_req, { params }) {
  // (Optional safety) block deleting the special "default"
  if (params.id === "default") {
    return NextResponse.json({ error: "Cannot delete default" }, { status: 400 });
  }

  const removed = await Articles.deleteArticle(params.id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: removed });
}
