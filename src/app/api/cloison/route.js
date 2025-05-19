import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors"; 
import { supabase } from "../filesController/route"; 

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req); // Handle CORS if required

  try {
    console.log("Fetching cloisons from Supabase...");
    let allCloisons = [];
    const pageSize = 1000; // Supabase default limit
    let page = 0;

    // Fetch all rows with pagination
    while (true) {
      const { data: cloisons, error } = await supabase
        .from("cloison")
        .select("*")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error("Supabase Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      allCloisons = [...allCloisons, ...cloisons];

      if (cloisons.length < pageSize) {
        break; // No more data to fetch
      }
      page++;
    }

    console.log("Cloisons Fetched Successfully:", allCloisons.length);
    console.log("Cloisons Fetched Successfully:", allCloisons);

    // Transform each row into an item object
    const items = allCloisons.map((row) => ({
      article_id: `cloison-${row.id}`,
      name: row.type, // Updated from row.name to row.type
      dimension: {
        height: {
          min: row.dimension.height.min / 1000, // Convert mm to meters
          max: row.dimension.height.max / 1000,
        },
        width: {
          min: row.dimension.width.min / 1000,
          max: row.dimension.width.max / 1000,
        },
        thickness: { min: 0.1, max: 0.1 }, // Default value
      },
      dimensions: {
        height: row.dimension.height.max / 1000, // Use max as actual size
        width: row.dimension.width.max / 1000,
        thickness: 0.1, // Default value
      },
      height: row.dimension.height.max / 1000,
      color: { code: "RAL 9005", finish: "Mat" }, // Default value
      lines: {
        id: "default-line",
        startPointId: "default-start",
        endPointId: "default-end",
        length: row.dimension.width.max / 1000,
        rotation: 0,
        thickness: 0.01,
        color: "#0A0A0A",
        texture: "default.avif",
        height: row.dimension.height.max / 1000,
      },
      points: [
        { id: "default-start", position: { x: 0, y: 0, z: 0 }, rotation: 0, snapAngle: 0 },
        {
          id: "default-end",
          position: { x: row.dimension.width.max / 1000, y: 0, z: 0 },
          rotation: 0,
          snapAngle: 0,
        },
      ],
      image: row.subcategory === "wall" ? "P_T100_START_LEF.png" : "P_ART.PNG", // Updated from row.type to row.subcategory
      material: { profile: "Unilim Evola 025 CST 0.3mm" }, // Default value
      type: row.type, // Updated from row.name to row.type
      price: 800, // Default value
    }));

    // Construct the categories object
    const categories = {
      walls: {
        title: "Partitions",
        image: "Partitions.jpg",
        items: items,
      },
    };

    return new Response(JSON.stringify(categories), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Unexpected Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// Handle CORS preflight requests if needed
export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}