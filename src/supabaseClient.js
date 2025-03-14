// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import { useDispatch } from 'react-redux';
import { getRandomPrice, pushProject, updateItems } from './store';
import { v4 as uuidv4 } from "uuid";


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


// Function to test the connection
export const testConnection = async () => {
  try {
    const { error } = await supabase.from('projects').select('*').limit(1);

    if (error) {
      console.error('❌ Error connecting to Supabase:', error.message);
    } else {
      console.log('✅ Supabase connected successfully.');
    }
  } catch (err) {
    console.error('❌ Error during Supabase connection test:', err.message);
  }
};

testConnection();







export const fetchUserProjects = async (odooId) => {
  try {
    // Using join syntax to fetch projects along with their related versions and managers.
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*, versions(*), managers(*)')
      .eq('user_id', odooId);
       
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError.message);
      return null;
    }

    if (!projects || projects.length === 0) {
      console.warn(`⚠️ No projects found for Odoo ID: ${odooId}`);
    }
    
    console.log('✅ Successfully fetched user projects:', projects);
    return projects;
  } catch (err) {
    console.error('❌ Unexpected error fetching user projects:', err.message);
    return null;
  }
};









export const useFetchProjectById = () => {
  const dispatch = useDispatch();

  const fetchProjectById = async () => {
    const pathArray = window.location.pathname.split('/');
    const projectId = pathArray[pathArray.length - 1];

    // console.log(`📥 Fetching project with ID: ${projectId}`);

    try {
      // Fetch project data
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        // console.error(`❌ Error fetching project with ID ${projectId}:`, projectError.message);
        return null; // Return null if there's an error fetching the project
      }

      console.log(`✅ Successfully fetched project:`, projectData);

      // Fetch associated floorplan data where floorplan_id matches the project ID
      const { data: floorplanData, error: floorplanError } = await supabase
        .from("floorplans") // Adjust this to the correct floorplan table name
        .select("*")
        .eq("project_id", projectId); // Ensure this column matches your schema

      if (floorplanError) {
        // console.error(`❌ Error fetching floorplan for project ID ${projectId}:`, floorplanError.message);
        return null; // Return null if there's an error fetching the floorplan
      }

      console.log(`✅ Successfully fetched floorplan:`, floorplanData);
      const items = floorplanData.length > 0 ? floorplanData[0].items : [];
      // console.log('items from db ', items);

      dispatch(updateItems(items));
      dispatch(pushProject(projectData));
      if (floorplanData.length > 0) {
        // console.log('floorplan data', floorplanData);
        // dispatch(pushFloorplan(floorplanData)); // Dispatch floorplan to Redux
      }

      return { project: projectData, floorplan: floorplanData }; // Return both project and floorplan
    } catch (err) {
      // console.error(`❌ Unexpected error fetching project with ID ${projectId}:`, err.message);
      return null; // Return null in case of an unexpected error
    }
  };

  return fetchProjectById; // Return the fetch function
};


/**
 * Manages floorplan data in the database.
 * 
 * @param {string} action - The action to perform on the floorplan. Possible values:
 *   - 'add': Add an item to the specified array type.
 *   - 'update': Update an existing item in the specified array type.
 *   - 'delete': Remove an item from the specified array type.
 * 
 * @param {string} floorplanId - The unique identifier for the floorplan to modify.
 * 
 * @param {string} arrayType - The type of array to manage within the floorplan. Possible values:
 *   - 'items': Represents the array of items in the floorplan.
 *   - 'points': Represents the array of points in the floorplan.
 *   - 'walls': Represents the array of walls in the floorplan.
 * 
 * @param {object} payload - The data to use for the action. The structure varies based on the action:
 *   - For 'add': An object representing the new item to add (must include necessary properties).
 *   - For 'update': An object representing the updated item (must include the item's unique ID and updated properties).
 *   - For 'delete': An object containing the unique ID of the item to delete.
 * 
 * Example for 'add':
 *   {
 *     id: 'unique-item-id',
 *     type: 'chair',
 *     position: { x: 10, y: 0, z: 5 },
 *     color: 'blue'
 *   }
 * 
 * Example for 'update':
 *   {
 *     id: 'unique-item-id', // ID of the item to update
 *     position: { x: 5, y: 0, z: 10 } // Updated properties
 *   }
 * 
 * Example for 'delete':
 *   {
 *     id: 'unique-item-id' // ID of the item to delete
 *   }
 */



export const manageFloorplanInDatabase = async (action, floorplanId, arrayType, payload) => {
  try {
    let response;

    const { data: floorplan, error: fetchError } = await supabase
      .from('floorplans')
      .select(arrayType)
      .eq('id', floorplanId)
      .single();

    if (fetchError) {
      throw new Error(`Error fetching floorplan: ${fetchError.message}`);
    }

    switch (action) {

      case 'add':
        const newItem = { ...payload, id: payload.id || uuidv4(), price: getRandomPrice() };
        const updatedArrayAdd = [...floorplan[arrayType], newItem];
        response = await supabase
          .from('floorplans')
          .update({ [arrayType]: updatedArrayAdd })
          .eq('id', floorplanId);
        if (response.error) {
          throw new Error(`Error adding to ${arrayType}: ${response.error.message}`);
        }
        break;

      case 'update':
        const updatedArrayUpdate = floorplan[arrayType].map(item => {
          if (item.id === payload.id) {
            // console.log(`Updating item ${item.id} with quantity: ${payload.quantity}`);
            return { ...item, quantity: payload.quantity };
          }
          return item;
        });
        const { error: updateError } = await supabase
          .from('floorplans')
          .update({ [arrayType]: updatedArrayUpdate })
          .eq('id', floorplanId);
        if (updateError) {
          console.error('Error updating floorplan:', updateError);
        } else {
          // console.log('Floorplan updated successfully!', updatedArrayUpdate);
        }
        break;

      case 'delete':
        const itemExists = floorplan[arrayType].some(item => item.id === payload.id);
        if (!itemExists) {
          console.error(`Item with ID ${payload.id} does not exist in ${arrayType}.`)
          return
        }
        // Create the updated array without the item to be deleted
        const updatedArrayDelete = floorplan[arrayType].filter(item => item.id !== payload.id);

        const { error: deleteError } = await supabase
          .from('floorplans')
          .update({ [arrayType]: updatedArrayDelete })
          .eq('id', floorplanId);

        if (deleteError) {
          throw new Error(`Error deleting from ${arrayType}: ${deleteError.message}`);
        }

        console.log(`✅ Item deleted from ${arrayType}:`, payload.id);
        break;


      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`❌ ${error.message}`);
  }
};



export const updateProjectOdooData = async ({ projectId, orderId, phaseId = null, odooProjectId }) => {
  try {
    // Ensure projectId is valid
    if (!projectId) {
      console.error('❌ Project ID not found!');
      return null;
    }

    // Step 1: Update odoo_order_id in the current project
    const { error: orderError } = await supabase
      .from('projects')
      .update({ odoo_order_id: orderId })
      .eq('id', projectId);

    if (orderError) {
      console.error('❌ Error updating odoo_order_id:', orderError.message);
      return null;
    }

    // Step 2: Update odoo_project_id and odoo_phase_id if both are provided
    if (odooProjectId && phaseId) {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          odoo_project_id: odooProjectId, // Reference Odoo project ID
          odoo_phase_id: phaseId,
        })
        .eq('id', projectId); // Update actual project

      if (updateError) {
        console.error('❌ Error updating project:', updateError.message);
        return null;
      }
    }

    console.log('✅ Successfully updated project:', projectId);
    return { success: true };
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return null;
  }
};


/**
 * Manages the `version_history` array in the `floorplans` table.
 *
 * @param {'C' | 'R' | 'U' | 'D'} action - Action type: 
 *   - 'C': Create a new entry in the specified array.
 *   - 'R': Read the current version of the specified array.
 *   - 'U': Update an item in the specified array.
 *   - 'D': Delete an item from the specified array.
 * @param {string} floorplanId - ID of the floorplan record.
 * @param {string} arrayType - The JSONB key to modify (e.g., 'items', 'walls', 'points').
 * @param {object} payload - Data for the action (depends on action type):
 *   - For 'C': The object that should be added to the array.
 *   - For 'U': The object with updated fields to replace the existing one.
 *   - For 'D': The object with the ID of the item to delete.
 *   - For 'R': No payload needed; returns the current version.
 * @param {string} [versiontoUpdate] - The version to update. If provided, the function will attempt to update the specified version in the `version_history`. If not provided, the latest version will be used. 
 * @returns {Promise<object>} - Response from Supabase:
 *   - Success: Returns an object with `success: true` and the updated `version_history`.
 *   - Failure: Returns an object with `success: false` and an error message.
 */


export const manageVersionHistory = async (action, floorplanId, arrayType, payload, versiontoUpdate) => {
  try {
    console.log(`🧐 Action: ${action} | Floorplan ID: ${floorplanId} | Array Type: ${arrayType} | Payload:`, payload);
    
    // Fetch the current version history from Supabase
    const { data, error } = await supabase
      .from('floorplans')
      .select('version_history')
      .eq('id', floorplanId)
      .single();  

    if (error) {
      console.error('Error fetching version history:', error);
      return { success: false, error: error.message };
    }
    console.log('Version history:', data);

    let versionHistory = data.version_history || [];

    // If a specific version is provided, search for that version in the history
    let targetVersion = versionHistory.find(version => version.version === versiontoUpdate);

    // If the version exists, use that version
    if (targetVersion) {
      console.log(`Found version ${versiontoUpdate}, applying changes.`);
    } else {
      console.log(`Version ${versiontoUpdate} not found, creating a new version.`);
      // If the version doesn't exist, create a new version (similar to before)
      targetVersion = versionHistory.length
        ? versionHistory[versionHistory.length - 1]
        : { version: '1.0.0', items: [], walls: [], points: [] };
    }

    if (!payload.version || targetVersion) {
      const newVersion = (parseFloat(targetVersion.version) + 0.1).toFixed(1);
      payload.version = newVersion;  
    }

    switch (action) {
      case 'C': 

        targetVersion[arrayType] = targetVersion[arrayType] || [];
        
        if (!payload.id) payload.id = uuidv4();

        targetVersion[arrayType].push(payload);
        
        break;

      case 'R': // Read current version
        console.log('🔍 Reading current version...');
        return targetVersion;

      case 'U': // Update item in array
        console.log('✏️ Updating item in array...');
        targetVersion[arrayType] = targetVersion[arrayType]?.map(item =>
          item.id === payload.id ? { ...item, ...payload } : item
        );
        break;

      case 'D': // Delete item from array
        console.log('🗑️ Deleting item from array...');
        targetVersion[arrayType] = targetVersion[arrayType]?.filter(item => item.id !== payload.id);
        break;

      default:
        console.error('❌ Invalid action type');
        throw new Error('Invalid action type');
    }

    // Create a new version entry with the specified version or generated version
    const newVersion = {
      ...targetVersion,
      version: payload.version,  
    };

    // Update the version history with the new or modified version
    versionHistory.push(newVersion);

    console.log('📜 New Version History:', versionHistory);

    // Update the version history in Supabase
    const { error: updateError } = await supabase
      .from('floorplans')
      .update({ version_history: versionHistory })
      .eq('id', floorplanId);

    if (updateError) {
      console.error(`❌ Error updating version history: ${updateError.message}`);
      throw new Error(`Error updating version history: ${updateError.message}`);
    }

    console.log('✅ Version history updated successfully!');
    return { success: true, version_history: versionHistory };

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

