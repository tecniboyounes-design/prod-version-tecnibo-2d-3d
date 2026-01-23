import { NextResponse } from "next/server";
import { cloneArticle } from "@/lib/server/articlesFS";

export async function POST(request, { params }) {
  const { name } = await request.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Clone name is required" }, { status: 400 });
  }
  try {
    const item = await cloneArticle(params.id, name);
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const status = e.code === "DUPLICATE_NAME" ? 409 : 400;
    return NextResponse.json({ error: e.message || "Clone failed" }, { status });
  }
}
