import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function POST(req) {
  const startTime = Date.now(); // Record start time

  try {
    // Check authorization header for security
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.UPDATE_TOKEN}`) {
      return NextResponse.json(
        { error: "Unauthorized", durationMs: Date.now() - startTime },
        { status: 403 }
      );
    }

    // Parse the request body to get product name and price
    const { name, price } = await req.json();

    // Validate input data
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        {
          error: "Invalid or missing name",
          durationMs: Date.now() - startTime,
        },
        { status: 400 }
      );
    }
    if (typeof price !== "number" || isNaN(price)) {
      return NextResponse.json(
        {
          error: "Invalid or missing price",
          durationMs: Date.now() - startTime,
        },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Failed to update price", durationMs: Date.now() - startTime },
        { status: 500 }
      );
    }

    // Check if material was found and updated
    if (data.length === 0) {
      return NextResponse.json(
        { error: "Material not found", durationMs: Date.now() - startTime },
        { status: 404 }
      );
    }

    // Log success for debugging
    // Log success for debugging
    console.log(`Updated price for material ${name} to ${price}`);
    const durationMs = Date.now() - startTime;
    return NextResponse.json(
      {
        message: `Price updated successfully for material ${name} to ${price}`,
        name,
        price,
        durationMs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in sync-material-price route:", error);
    const durationMs = Date.now() - startTime;
    return NextResponse.json(
      { error: "Internal Server Error", durationMs },
      { status: 500 }
    );
  }
}
