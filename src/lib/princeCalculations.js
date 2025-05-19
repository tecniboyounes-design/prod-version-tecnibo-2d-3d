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
    console.log(`Processing wall: ${wall.id} (name: ${wall.name})`);
    let cloisonId = null;
    let materialId = null;
    let totalPrice = 0;
     
    // Check if wall.name is defined before splitting
    const baseType = wall.name ? wall.name.split('-')[0] : null;
    if (!baseType) {
      console.warn(`Wall ${wall.id} has no name or invalid name. Skipping cloison fetch.`);
      continue; // Skip to the next wall
    }
    console.log(`Base type extracted: ${baseType}`);
    
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
      console.log(`Cloison found: ${cloisonId}, price: ${cloison.price}, acoustic: ${cloison.acoustic_performance}, fire: ${cloison.fire_performance}`);

      // Parse acoustic performance to get max dB
      const acousticValues = cloison.acoustic_performance
        .split(" - ")
        .map(dB => parseInt(dB.replace(' dB', '')));
      const maxAcoustic = Math.max(...acousticValues);
      console.log(`Parsed acoustic values: ${acousticValues}, max: ${maxAcoustic}`);
      
      // Define multipliers
      const fireMultipliers = {
        "EI30": 1.2,
        "EI60": 1.5,
      };
      const F_fire = fireMultipliers[cloison.fire_performance] || 1.0;
      console.log(`Fire multiplier (F_fire): ${F_fire}`);
      
      const baselineAcoustic = 40;
      const F_acoustic = 1 + ((maxAcoustic - baselineAcoustic) / 10) * 0.1;
      console.log(`Acoustic multiplier (F_acoustic): ${F_acoustic}`);
      
      // Calculate total price with performance adjustments
      const cloisonWidth = cloison.dimension.width.max / 1000;
      const numberOfPieces = Math.ceil(wall.length / cloisonWidth);
      const basePrice = numberOfPieces * cloison.price;
      const performanceAdjustedPrice = basePrice * F_fire * F_acoustic;
      console.log(`cloisonWidth: ${cloisonWidth}, numberOfPieces: ${numberOfPieces}, basePrice: ${basePrice}, performanceAdjustedPrice: ${performanceAdjustedPrice}`);

      // Fetch material details (if applicable)
      let material = null;
      if (wall.material && wall.material.id) {
        console.log(`Fetching material for wall: ${wall.id}, material id: ${wall.material.id}`);
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
          console.log(`Material found: ${materialId}, price: ${material.price}`);

          const materialCost = numberOfPieces * material.price;
          totalPrice = performanceAdjustedPrice + materialCost;
          console.log(`Material cost: ${materialCost}, totalPrice (with material): ${totalPrice}`);
        }
      } else {
        console.warn(`No material provided for wall: ${wall.id}. Proceeding with material_id as null.`);
        totalPrice = performanceAdjustedPrice;
        console.log(`totalPrice (no material): ${totalPrice}`);
      }
    }
    
    // Fallback price calculation if no cloison but material exists
    if (!cloisonId && wall.material && wall.material.id) {
      console.log(`Fallback: No cloison, but material exists for wall: ${wall.id}`);
      const { data: fetchedMaterial, error: materialError } = await supabase
        .from('material')
        .select('price')
        .eq('id', wall.material.id)
        .single();

      if (!materialError && fetchedMaterial) {
        materialId = wall.material.id;
        totalPrice = wall.length * fetchedMaterial.price;
        console.log(`Fallback material price: ${fetchedMaterial.price}, totalPrice: ${totalPrice}`);
      }
    }
    
    // Update the wall
    console.log(`Updating wall ${wall.id} with cloison_id: ${cloisonId}, material_id: ${materialId}, total_price: ${totalPrice}`);
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