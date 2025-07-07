import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/cors";
import { createIntervention } from "@/lib/createIntervention";


export async function OPTIONS(req) {
  const corsHeaders = getCorsHeaders(req);
  return new Response(null, { status: 204, headers: corsHeaders });
}


export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const body = await req.json();
    // console.log('the body',body);
 
    const intervention = await createIntervention({
      action:       body.action,
      project_id:   body.project_id,
      version_id:   body.version_id,
      intervenerId: body.intervenerId,
      metadata:     body?.metadata,
    });

    return NextResponse.json({ intervention }, { status: 201, headers: corsHeaders });

  } catch (err) { 
    console.error("❌ createIntervention failed:", err);
    return NextResponse.json({ error: err.message }, { status: 400, headers: corsHeaders });
  }
}
