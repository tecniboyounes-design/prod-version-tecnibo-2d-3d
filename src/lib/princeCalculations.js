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
    
    // Fetch cloison details (if applicable)
    const { data: cloison, error: cloisonError } = await supabase
      .from('cloison')
      .select('id, dimension, price')
      .eq('type', baseType)
      .single();
      
    if (cloisonError || !cloison) {
      console.warn(`No cloison found for type: ${baseType}. Proceeding with cloison_id as null.`);
    } else {
      cloisonId = cloison.id;
    } 
     
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
      }
    } else {
      console.warn(`No material provided for wall: ${wall.id}. Proceeding with material_id as null.`);
    }
    
    // Calculate total price (your original logic)
    if (cloisonId && materialId && material) {
      const cloisonWidth = cloison.dimension.width.max / 1000;
      const numberOfPieces = Math.ceil(wall.length / cloisonWidth);
      const basePrice = numberOfPieces * cloison.price;
      const materialCost = numberOfPieces * material.price;
      totalPrice = basePrice + materialCost;
    } else if (cloisonId) {
      const cloisonWidth = cloison.dimension.width.max / 1000;
      const numberOfPieces = Math.ceil(wall.length / cloisonWidth);
      totalPrice = numberOfPieces * cloison.price;
    } else if (materialId && material) {
      totalPrice = wall.length * material.price;
    } else {
      totalPrice = 0;
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