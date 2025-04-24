import { NextRequest, NextResponse } from "next/server";
import { createIntervention } from "../projects/createIntervention";

export async function POST(req) {
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
    
    return NextResponse.json({ intervention }, { status: 201 });

  } catch (err) { 
    console.error("❌ createIntervention failed:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
