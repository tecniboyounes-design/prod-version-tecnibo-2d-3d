import { NextResponse } from "next/server";
import { supabase } from '../filesController/route';
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(req) {
  return handleCorsPreflight(req);
}


export async function POST(req) {
  const startTime = Date.now(); 

  try {

    const { id, name, width, height } = await req.json();
     
    // Validate that either id or name is provided, along with width and height
    if ((!id && !name) || !width || !height) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      return NextResponse.json(
        { error: "Either ID or name, and width and height are required", executionTimeMs: duration },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }
    
    // Validate width and height as positive numbers
    if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      return NextResponse.json(
        { error: "Width and height must be positive numbers", executionTimeMs: duration },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }
    
    let material;
    
    if (id) {
      // Validate id as a positive integer
      const materialId = parseInt(id, 10);
      if (isNaN(materialId) || materialId <= 0) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        return NextResponse.json(
          { error: "ID must be a positive integer", executionTimeMs: duration },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }

      // Query Supabase by id
      const { data, error } = await supabase
        .from('material')
        .select('id, name, price')
        .eq('id', materialId);

      if (error) {
        console.error("Supabase error:", error);
        const endTime = Date.now();
        const duration = endTime - startTime;
        return NextResponse.json(
          { error: "Database error", executionTimeMs: duration },
          { status: 500, headers: getCorsHeaders(req) }
        );
      }

      if (data.length === 0) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        return NextResponse.json(
          { error: "Material not found", executionTimeMs: duration },
          { status: 404, headers: getCorsHeaders(req) }
        );
      }

      material = data[0];
    } else {
      // Validate name as a non-empty string
      if (typeof name !== 'string' || name.trim() === '') {
        const endTime = Date.now();
        const duration = endTime - startTime;
        return NextResponse.json(
          { error: "Name must be a non-empty string", executionTimeMs: duration },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }

      // Query Supabase by name with partial match, taking the first result
      const { data, error } = await supabase
        .from('material')
        .select('id, name, price')
        .ilike('name', `%${name}%`)
        .limit(1);

      if (error) {
        console.error("Supabase error:", error);
        const endTime = Date.now();
        const duration = endTime - startTime;
        return NextResponse.json(
          { error: "Database error", executionTimeMs: duration },
          { status: 500, headers: getCorsHeaders(req) }
        );
      }

      if (data.length === 0) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        return NextResponse.json(
          { error: "Material not found", executionTimeMs: duration },
          { status: 404, headers: getCorsHeaders(req) }
        );
      }

      material = data[0];
    }
    
    // Get price, default to 0 if null
    const pricePerUnit = material.price || 0;
     
    // Calculate area and total price
    const area = width * height;
    const totalPrice = area * pricePerUnit;
    
    // Prepare response
    const responseData = {
      material: material.name,
      width,
      height,
      area,
      pricePerUnit,
      totalPrice,
      unitOfMeasure: "M2"
    };

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`Execution time: ${duration}ms`);
    responseData.executionTimeMs = duration;

    return NextResponse.json(responseData, {
      status: 200,
      headers: getCorsHeaders(req)
    });

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error("Error in POST /api/calculateMaterialPrice:", error.message);
    console.log(`Execution time (error): ${duration}ms`);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message, executionTimeMs: duration },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}