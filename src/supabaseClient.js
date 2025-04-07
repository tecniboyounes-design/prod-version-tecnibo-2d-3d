// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import { useDispatch } from 'react-redux';
import { getRandomPrice, pushProject, updateItems } from './store';
import { v4 as uuidv4 } from "uuid";
import { testCrypto } from '../lib/crypto';

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
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        versions(
          *,
          articles(*),
          walls(
            *,
            points_start:points!walls_startpointid_fkey(*),
            points_end:points!walls_endpointid_fkey(*)
          )
        ),
        managers(*)
      `)
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
  
  return fetchProjectById;

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
 * Manages data in a specified table and performs Create, Read, Update, or Delete actions.
 *
 * @param {string} tableName - The name of the table to perform the action on.
 * @param {string} rowId - The ID of the row to target for the action.
 * @param {'C' | 'R' | 'U' | 'D'} action - Action type:
 *   - 'C': Create a new row in the table.
 *   - 'R': Read the current row in the table.
 *   - 'U': Update an existing row in the table.
 *   - 'D': Delete the row from the table.
 * @param {object} [payload] - The data for Create or Update actions.
 *   - For 'C': Data to insert as a new row.
 *   - For 'U': Data to update in the existing row.
 * @returns {Promise<object>} - Response from the database:
 *   - Success: Returns an object with `success: true` and the resulting row.
 *   - Failure: Returns an object with `success: false` and an error message.
 */


export const manageTableRow = async (tableName, rowId, action, payload) => {
  try {
    console.log(`🧐 Action: ${action} | Table: ${tableName} | Row ID: ${rowId} | Payload:`, payload);
    
    // Handle Create (C) action
    if (action === 'C') {
      // Create a new row in the specified table
      const { data, error } = await supabase
        .from(tableName)
        .insert([payload]);
     
      if (error) {
        console.error('Error creating row:', error);
        return { success: false, error: error.message };
      }

      console.log('Row created successfully:', data);
      return { success: true, data };
    }

    // Handle Read (R) action
    if (action === 'R') {
      // Fetch the row based on the rowId
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', rowId)
        .single();

      if (error) {
        console.error('Error reading row:', error);
        return { success: false, error: error.message };
      }

      console.log('Row data:', data);
      return { success: true, data };
    }

    // Handle Update (U) action
    if (action === 'U') {
      // Update the specified row with the provided payload
      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', rowId);

      if (error) {
        console.error('Error updating row:', error);
        return { success: false, error: error.message };
      }

      console.log('Row updated successfully:', data);
      return { success: true, data };
    }

    // Handle Delete (D) action
    if (action === 'D') {
      // Delete the specified row
      const { data, error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', rowId);

      if (error) {
        console.error('Error deleting row:', error);
        return { success: false, error: error.message };
      }

      console.log('Row deleted successfully:', data);
      return { success: true, data };
    }

    // If the action is invalid, throw an error
    throw new Error('Invalid action type');
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

