"use server";

import { supabase } from "@/app/api/filesController/route";

export async function calculateWallPrice(wallData, partition_type = "T100", fire_resistant = false, water_resistant = false, finish_type = "standard") {
  const { id, length, height = 3, name, material } = wallData;
  console.log(
    `[WallPrice] Start calculation for wall id: ${id}, name: ${name}, length: ${length}, height: ${height}, partition_type: ${partition_type}, fire_resistant: ${fire_resistant}, water_resistant: ${water_resistant}, finish_type: ${finish_type}`
  );
  
  // Calculate area in square meters
  const area = length * height;
  console.log(`[WallPrice] Area: ${area} M²`);

  // Determine the number of T100 units (1.5m each) for base price
  const t100Length = 1.5;
  const numberOfT100Units = Math.ceil(length / t100Length);
  console.log(`[WallPrice] Number of T100 units: ${numberOfT100Units}`);

  // Calculate total length covered and leftover
  const totalLengthCovered = numberOfT100Units * t100Length;
  const leftover = totalLengthCovered - length;
  console.log(
    `[WallPrice] For wall id: ${id}, total length covered: ${totalLengthCovered} meters, leftover: ${leftover} meters`
  );

  let totalPrice = 0;
  
  // Static base price adjustment based on partition_type
  let basePriceMultiplier = 1.0;
  if (partition_type === "T100A") {
    basePriceMultiplier += 0.1; // 10% increase for T100A
  }

  // Static adjustments for resistance options
  if (fire_resistant) {
    basePriceMultiplier += 0.15; // 15% increase for FR
  }
  if (water_resistant) {
    basePriceMultiplier += 0.1; // 10% increase for WR
  }

  // Static finish cost
  const finishCosts = {
    standard: 5.0,
    premium: 10.0,
  };

  const finishCostPerFace = finishCosts[finish_type] || 5.0;
  const totalFinishCost = finishCostPerFace * 2; // Two faces
  
  // Fetch cloison data (base price for T100)
  const baseType = name.split("-")[0];
  console.log(`[WallPrice] Base type extracted: ${baseType}`);
  const { data: cloison, error: cloisonError } = await supabase
    .from("cloison")
    .select("id, price")
    .eq("type", baseType)
    .single();

  if (cloisonError || !cloison) {
    console.warn(`[WallPrice] No cloison found for type: ${baseType}`);
  } else {
    const basePricePerUnit = cloison.price || 0;
    const adjustedBasePrice = basePricePerUnit * basePriceMultiplier;
    totalPrice += numberOfT100Units * adjustedBasePrice;
    console.log(
      `[WallPrice] Adjusted base price for cloison: ${numberOfT100Units * adjustedBasePrice}`
    );
  }

  // Calculate material cost based on area (assuming price is per M²)
  if (material && material.id) {
    console.log(
      `[WallPrice] Fetching material price for material id: ${material.id}`
    );
    const { data: materialData, error: materialError } = await supabase
      .from("material")
      .select("price")
      .eq("id", material.id)
      .single();

    if (materialError || !materialData) {
      console.warn(`[WallPrice] No material found for id: ${material.id}`);
    } else {
      const materialPricePerM2 = materialData.price || 0;
      const materialCost = area * materialPricePerM2;
      totalPrice += materialCost;
      console.log(
        `[WallPrice] Material price per M²: ${materialPricePerM2}, total material cost: ${materialCost}`
      );
    }
  }

  // Add finish cost
  totalPrice += totalFinishCost;
  console.log(`[WallPrice] Total finish cost: ${totalFinishCost}`);

  // Log the calculation details instead of updating the wall
  console.log(
    `[WallPrice] Calculation complete for wall id: ${id}, total price: ${totalPrice}`
  );

  // Return an object with all the details
  const wallDetails = {
    wallId: id,
    totalPrice,
    numberOfT100Units,
    leftover,
    area,
    partition_type,
    fire_resistant,
    water_resistant,
    finish_type
  };
  
  console.log(`[WallPrice] Wall details:`, wallDetails);
  return wallDetails;
}