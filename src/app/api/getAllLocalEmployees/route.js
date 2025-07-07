import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { supabase } from "../filesController/route";

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}

export async function GET(req) {
  const headers = getCorsHeaders(req);

  try {
    const { data, error } = await supabase.from("users").select("*");
    if (error) {
      console.error("❌ [getAllLocalEmployees] Error fetching users:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers,
      });
    }
    if (!data || data.length === 0) {
      console.log("ℹ️ [getAllLocalEmployees] No users found.");
    } else {
      console.log(`✅ [getAllLocalEmployees] Fetched ${data.length} users.`);
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("❌ [getAllLocalEmployees] Server error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers,
    });
  }
}