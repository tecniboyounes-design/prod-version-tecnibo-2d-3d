import { supabase } from "../filesController/route";

/**
 * Update the image URL for a project.
 * 
 * @param {string} projectId - The ID of the project.
 * @param {string} imageUrl - The new image URL to update.
 * @returns {Promise<Object>} - The result of the update operation.
 */
export const updateProjectImage = async (projectId, imageUrl) => {
  try {
    // Update the project record with the new image URL
    const { data, error } = await supabase
      .from('projects') 
      .update({ image_url: imageUrl }) 
      .eq('id', projectId); 

    if (error) {
      throw error;
    }
   
    return data; 
  } catch (error) {
    console.error('Error updating project image:', error);
    throw error;
  }
};

export default updateProjectImage;
