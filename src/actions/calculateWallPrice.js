"use server";

import { supabase } from "@/app/api/filesController/route";

// Static data
const FINISH_COSTS_PER_M2 = {
  standard: 5.0,
  premium: 10.0,
};

const T100_UNIT_LENGTH = 1.5;
const POTEAU_PRICE = 10.0; // Price per poteau (stud)
const VISE_PRICE = 0.5; // Price per vise (fastener)
const SIPORA_PRICE_PER_M = 2.0; // Price per linear meter for siporas (top and bottom)

// Helper functions
function calculateUnitsAndLeftover(length, unitLength) {
  const numberOfUnits = Math.ceil(length / unitLength);
  const totalLengthCovered = numberOfUnits * unitLength;
  const leftover = totalLengthCovered - length;
  return { numberOfUnits, leftover };
}


function extractBaseType(name) {
  return name.split("-")[0];
}
 

async function fetchFromSupabase(table, select, condition) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq(condition.field, condition.value)
    .single();
  if (error || !data) {
    console.warn(`[WallPrice] No ${table} found for ${condition.field}: ${condition.value}`);
    return null;
  }
  return data;
}

export async function calculateWallPrice(
  wallData,
  fire_resistant = true,
  water_resistant = false,
  finish_type = "standard"
) {
  const { id, length, height = 3, name, material } = wallData;
  const partition_type = name; // Use name as partition_type
  console.log(
    `[WallPrice] Start calculation for wall id: ${id}, name: ${name}, length: ${length}, height: ${height}, partition_type: ${partition_type}, fire_resistant: ${fire_resistant}, water_resistant: ${water_resistant}, finish_type: ${finish_type}`
  );

  // Calculate area in square meters
  const area = length * height;
  console.log(`[WallPrice] Area: ${area} M²`);

  // Determine the number of T100 units and leftover
  const { numberOfUnits: numberOfT100Units, leftover } = calculateUnitsAndLeftover(length, T100_UNIT_LENGTH);
  console.log(`[WallPrice] Number of T100 units: ${numberOfT100Units}`);
  console.log(
    `[WallPrice] For wall id: ${id}, total length covered: ${numberOfT100Units * T100_UNIT_LENGTH} meters, leftover: ${leftover} meters`
  );
  
  // Initialize cost components
  let totalPrice = 0;
  let baseCost = 0;
  let poteauxCost = 0;
  let visesCost = 0;
  let siporasCost = 0;
  let finishCost = 0;
  let materialCost = 0;

  // Base price multiplier (multiplicative for correct percentage increases)
  let basePriceMultiplier = 1.0;
  if (partition_type === "T100A") {
    basePriceMultiplier *= 1.1; // 10% increase for T100A
  }
  if (fire_resistant) {
    basePriceMultiplier *= 1.15; // 15% increase for fire resistance
  }
  if (water_resistant) {
    basePriceMultiplier *= 1.1; // 10% increase for water resistance
  }

  // Fetch cloison data and calculate base cost
  const baseType = extractBaseType(name);
  console.log(`[WallPrice] Base type extracted: ${baseType}`);
  const cloison = await fetchFromSupabase("cloison", "id, price", { field: "type", value: baseType });
  if (cloison) {
    const basePricePerUnit = cloison.price || 0;
    const adjustedBasePrice = basePricePerUnit * basePriceMultiplier;
    baseCost = numberOfT100Units * adjustedBasePrice;
    totalPrice += baseCost;
    console.log(`[WallPrice] Base cost: ${baseCost}`);
  }

  // Calculate poteaux cost (one poteau per T100 unit)
  const numberOfPoteaux = numberOfT100Units;
  poteauxCost = numberOfPoteaux * POTEAU_PRICE;
  totalPrice += poteauxCost;
  console.log(`[WallPrice] Poteaux cost: ${poteauxCost}`);

  // Calculate vises cost (two vises per poteau: top and bottom)
  const totalVises = 2 * numberOfPoteaux;
  visesCost = totalVises * VISE_PRICE;
  totalPrice += visesCost;
  console.log(`[WallPrice] Vises cost: ${visesCost}`);

  // Calculate siporas cost (top and bottom, per linear meter)
  siporasCost = 2 * length * SIPORA_PRICE_PER_M;
  totalPrice += siporasCost;
  console.log(`[WallPrice] Siporas cost: ${siporasCost}`);

  // Calculate finish cost (per square meter, for both faces)
  const finishCostPerM2 = FINISH_COSTS_PER_M2[finish_type] || 5.0;
  finishCost = finishCostPerM2 * area * 2;
  totalPrice += finishCost;
  console.log(`[WallPrice] Finish cost: ${finishCost}`);

  // Calculate material cost based on area (if material is provided)
  if (material && material.id) {
    console.log(`[WallPrice] Fetching material price for material id: ${material.id}`);
    const materialData = await fetchFromSupabase("material", "price", { field: "id", value: material.id });
    if (materialData) {
      const materialPricePerM2 = materialData.price || 0;
      materialCost = area * materialPricePerM2;
      totalPrice += materialCost;
      console.log(`[WallPrice] Material cost: ${materialCost}`);
    }
  }

  // Log the calculation details
  console.log(`[WallPrice] Calculation complete for wall id: ${id}, total price: ${totalPrice}`);

  // Return an object with all the details, including cost breakdown
  const wallDetails = {
    wallId: id,
    totalPrice,
    numberOfT100Units,
    leftover,
    area,
    partition_type,
    fire_resistant,
    water_resistant,
    finish_type,
    costs: {
      baseCost,
      poteauxCost,
      visesCost,
      siporasCost,
      finishCost,
      materialCost,
    },
  };

  console.log(`[WallPrice] Wall details:`, wallDetails);
  return wallDetails;
}