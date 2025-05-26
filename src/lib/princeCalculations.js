import { supabase } from "@/app/api/filesController/route";

export async function updateWallsInVersion(versionId) {
  console.log('Updating walls in version:', versionId);

  // Fetch all walls for the version
  const { data: walls, error: fetchError } = await supabase
    .from('walls')
    .select('*')
    .eq('version_id', versionId);

  if (fetchError) {
    console.error('Error fetching walls:', fetchError.message);
    throw new Error(`Error fetching walls: ${fetchError.message}`);
  }

  if (!walls || walls.length === 0) {
    console.warn(`No walls found for version_id: ${versionId}`);
    return;
  }

  // Process each wall
  for (const wall of walls) {
    let cloisonId = null;
    let materialId = null;
    let totalPrice = 0; 
    
    const baseType = wall.name.split('-')[0];
 
    // Fetch cloison details including performance data
    const { data: cloison, error: cloisonError } = await supabase
      .from('cloison')
      .select('id, dimension, price, acoustic_performance, fire_performance')
      .eq('type', baseType)
      .single();
      
    if (cloisonError || !cloison) {
      console.warn(`No cloison found for type: ${baseType}. Proceeding with cloison_id as null.`);
    } else {
      cloisonId = cloison.id;

      // Parse acoustic performance to get max dB
      const acousticValues = cloison.acoustic_performance
        .split(" - ")
        .map(dB => parseInt(dB.replace(' dB', '')));
      const maxAcoustic = Math.max(...acousticValues);

      // Define multipliers
      const fireMultipliers = {
        "EI30": 1.2,
        "EI60": 1.5,
      };
      const F_fire = fireMultipliers[cloison.fire_performance] || 1.0;

      const baselineAcoustic = 40;
      const F_acoustic = 1 + ((maxAcoustic - baselineAcoustic) / 10) * 0.1;

      // Calculate total price with performance adjustments
      const cloisonWidth = cloison.dimension.width.max / 1000;
      const numberOfPieces = Math.ceil(wall.length / cloisonWidth);
      const basePrice = numberOfPieces * cloison.price;
      const performanceAdjustedPrice = basePrice * F_fire * F_acoustic;

      // Fetch material details (if applicable)
      let material = null;
      if (wall.material && wall.material.id) {
        const { data: fetchedMaterial, error: materialError } = await supabase
          .from('material')
          .select('price')
          .eq('id', wall.material.id)
          .single();

        if (materialError || !fetchedMaterial) {
          console.warn(`No material found for id: ${wall.material.id}. Proceeding with material_id as null.`);
          materialId = null;
        } else {
          material = fetchedMaterial;
          materialId = wall.material.id;

          const materialCost = numberOfPieces * material.price;
          totalPrice = performanceAdjustedPrice + materialCost;
        }
      } else {
        console.warn(`No material provided for wall: ${wall.id}. Proceeding with material_id as null.`);
        totalPrice = performanceAdjustedPrice;
      }
    }

    // Fallback price calculation if no cloison but material exists
    if (!cloisonId && wall.material && wall.material.id) {
      const { data: fetchedMaterial, error: materialError } = await supabase
        .from('material')
        .select('price')
        .eq('id', wall.material.id)
        .single();

      if (!materialError && fetchedMaterial) {
        materialId = wall.material.id;
        totalPrice = wall.length * fetchedMaterial.price;
      }
    }

    // Update the wall
    const { data, error: updateError } = await supabase
      .from('walls')
      .update({
        cloison_id: cloisonId,
        material_id: materialId,
        total_price: totalPrice,
      })
      .eq('id', wall.id);

    if (updateError) {
      console.error('Wall update error:', updateError.message);
      throw new Error(`Error updating wall: ${updateError.message}`);
    }

    console.log('Wall updated successfully:', data);
  }

  console.log('All walls in version updated successfully');
}




