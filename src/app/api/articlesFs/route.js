export const runtime = "nodejs"; // ensure fs/promises is allowed

import { NextResponse } from "next/server";
import * as Articles from "@/lib/server/articlesFS"; // robust import


export async function GET() {
  // small guard helps surface export issues clearly
  if (typeof Articles.listArticles !== "function") {
    return NextResponse.json(
      { error: "listArticles missing", exportedKeys: Object.keys(Articles) },
      { status: 500 }
    );
  }
  const items = await Articles.listArticles();
  return NextResponse.json({ items });
}




export async function POST(request) {
  try {
    const { name } = await request.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const item = await Articles.createArticle(name);
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const status = e.code === "DUPLICATE_NAME" ? 409 : 500;
    return NextResponse.json({ error: e.message || "Internal error" }, { status });
  }
}



export async function DELETE(_req, { params }) {
  // (Optional safety) block deleting the special "default"
  if (params.id === "default") {
    return NextResponse.json({ error: "Cannot delete default" }, { status: 400 });
  }

  const removed = await Articles.deleteArticle(params.id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: removed });
}


