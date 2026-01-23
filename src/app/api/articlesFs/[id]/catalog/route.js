import { NextResponse } from "next/server";
import { getLatestCatalog } from "@/lib/server/articlesFS";

export async function GET(_req, { params }) {
  const data = await getLatestCatalog(params.id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ catalog: data });
}
