import { getCorsHeaders } from "../../../lib/cors";
import { supabase } from "../filesController/route";

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req);
  console.log("Request Origin:", req.headers.get("origin"));

  // const sessionId = req.headers.get("x-session-id");
  // if (!sessionId) {
  //   console.log("Validation failed: No session ID provided");
  //   return new Response(JSON.stringify({ error: "Missing session ID" }), {
  //     status: 400,
  //     headers: corsHeaders,
  //   });
  // }

  try {
    console.log("Fetching materials...");

    const { data: materials, error } = await supabase
      .from("material")
      .select("*");

    if (error) {
      console.log("Error fetching materials:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ materials }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.log("Error occurred during request:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}