import { NextResponse } from "next/server";
import { saveSnapshot } from "@/lib/server/articlesFS";

export async function POST(req, { params }) {
  const { id } = params;
  const body = await req.json();
  if (!Array.isArray(body) && typeof body !== "object") {
    return NextResponse.json({ error: "Body must be the full catalog JSON" }, { status: 400 });
  }
  try {
    const { versionId } = await saveSnapshot(id, body);
    return NextResponse.json({ versionId }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Save failed" }, { status: 400 });
  }
}
