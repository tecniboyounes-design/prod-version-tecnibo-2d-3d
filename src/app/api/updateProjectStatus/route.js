import { supabase } from "../filesController/route";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function PUT(req) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const { projectId, status } = await req.json();

    if (!projectId || !status) {
      return new Response(
        JSON.stringify({ error: "Missing projectId or status" }),
        { status: 400, headers: corsHeaders }
      );
    }
   
    const { data, error } = await supabase
      .from("projects")
      .update({ status })
      .eq("id", projectId)
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ message: "Project status updated successfully", project: data }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
