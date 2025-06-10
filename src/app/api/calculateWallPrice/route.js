import { supabase } from "../filesController/route";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const wallData = await req.json();
    const { id, length, name, material } = wallData;
    console.log(`[WallPrice API] Start calculation for wall id: ${id}, name: ${name}, length: ${length}`);

    const t100Length = 1.5;
    const numberOfT100Units = Math.ceil(length / t100Length);
    let totalPrice = 0;

    const baseType = name.split("-")[0];
    console.log(`[WallPrice API] Base type extracted: ${baseType}`);
    const { data: cloison, error: cloisonError } = await supabase
      .from("cloison")
      .select("id, price")
      .eq("type", baseType)
      .single();

    if (cloisonError || !cloison) {
      console.warn(`[WallPrice API] No cloison found for type: ${baseType}`);
    } else {
      const basePricePerUnit = cloison.price || 0;
      totalPrice += numberOfT100Units * basePricePerUnit;
      console.log(`[WallPrice API] Base price for cloison: ${numberOfT100Units * basePricePerUnit}`);
    }

    if (material && material.id) {
      console.log(`[WallPrice API] Fetching material price for material id: ${material.id}`);
      const { data: materialData, error: materialError } = await supabase
        .from("material")
        .select("price")
        .eq("id", material.id)
        .single();

      if (materialError || !materialData) {
        console.warn(`[WallPrice API] No material found for id: ${material.id}`);
      } else {
        const materialPricePerFace = materialData.price || 0;
        const materialCost = numberOfT100Units * materialPricePerFace * 2;
        totalPrice += materialCost;
        console.log(`[WallPrice API] Material price per face: ${materialPricePerFace}, total material cost: ${materialCost}`);
      }
    } else {
      console.log(`[WallPrice API] No material provided for wall id: ${id}`);
    }

    console.log(`[WallPrice API] Updating wall id: ${id} with total price: ${totalPrice}`);
    const { error: updateError } = await supabase
      .from("walls")
      .update({ total_price: totalPrice })
      .eq("id", id);

    if (updateError) {
      console.error(`[WallPrice API] Error updating wall: ${updateError.message}`);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log(`[WallPrice API] Calculation complete for wall id: ${id}, total price: ${totalPrice}`);
    return new Response(JSON.stringify({ totalPrice }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("[WallPrice API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
