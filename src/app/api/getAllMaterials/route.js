import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { supabase } from "../filesController/route";

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req); 

  try {
    console.log("Fetching materials from Supabase...");
    const { data: materials, error } = await supabase
      .from("material")
      .select("*");

    if (error) {
      console.error("Supabase Error:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log("Materials Fetched Successfully:", materials.length);
    return new Response(JSON.stringify({ materials }), {
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