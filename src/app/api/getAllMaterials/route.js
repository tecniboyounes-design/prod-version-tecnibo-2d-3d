import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { supabase } from "../filesController/route";

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    console.log("Fetching materials from Supabase...");
    let allMaterials = [];
    const pageSize = 1000; // Supabase default limit
    let page = 0;

    while (true) {
      const { data: materials, error } = await supabase
        .from("material")
        .select("*")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error("Supabase Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      allMaterials = [...allMaterials, ...materials];

      if (materials.length < pageSize) {
        // No more data to fetch
        break;
      }

      page++;
    }
    
    console.log("Materials Fetched Successfully:", allMaterials.length);
    return new Response(JSON.stringify({ materials: allMaterials }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Unexpected Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}