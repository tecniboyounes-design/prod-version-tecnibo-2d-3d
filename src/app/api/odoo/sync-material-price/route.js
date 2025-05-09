import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors"; 
import { supabase } from "../../filesController/route";



export async function POST(req) {
  const startTime = Date.now();
  const corsHeaders = getCorsHeaders(req); 

  try {
    // Check authorization header for security
    const authHeader = req.headers.get("authorization");
   
    if (!authHeader || authHeader !== `Bearer ${process.env.UPDATE_TOKEN}`) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized", durationMs: Date.now() - startTime }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
   
    // Parse the request body to get product name and price
    const { name, price } = await req.json();
     
    // Validate input data
    if (!name || typeof name !== "string") {
      return new NextResponse(JSON.stringify({ error: "Invalid or missing name", durationMs: Date.now() - startTime }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
    if (typeof price !== "number" || isNaN(price)) {
      return new NextResponse(JSON.stringify({ error: "Invalid or missing price", durationMs: Date.now() - startTime }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
    
    // Update the material price in Supabase
    const { data, error } = await supabase
      .from("material")
      .update({ price })
      .eq("name", name)
      .select();

    // Handle database errors
    if (error) {
      console.error("Supabase update error:", error);
      return new NextResponse(JSON.stringify({ error: "Failed to update price", durationMs: Date.now() - startTime }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // Check if material was found and updated
    if (data.length === 0) {
      return new NextResponse(JSON.stringify({ error: "Material not found", durationMs: Date.now() - startTime }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // Log success for debugging
    console.log(`Updated price for material ${name} to ${price}`);
    const durationMs = Date.now() - startTime;
    return new NextResponse(JSON.stringify({
      message: `Price updated successfully for material ${name} to ${price}`,
      name,
      price,
      durationMs,
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in sync-material-price route:", error);
    const durationMs = Date.now() - startTime;
    return new NextResponse(JSON.stringify({ error: "Internal Server Error", durationMs }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
}

export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}