"use client"

import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from "uuid";
import { generateUniqueProjectNumber } from './data/models';



// Define the initial state
const initialState = {
  loading: false,
  is2DView: false,
  isDrawing: false,
  wallHieght: 4,
  isClose: false,
  projectInfo: 'prices',
  isDragging: false,

  floorplanner: {
    version: "2.0.1a",
    corners: {
      c1: {
        x: -5.3684328157054875,
        y: 0.3,
        z: -4.243775348743661,
        elevation: 3
      },
      c2: {
        x: 5.6609128320716,
        y: 0.3,
        z: -4.243775348743661,
        elevation: 3
      },
      c3: {
        x: 5.6609128320716,
        y: 0.3,
        z: 5.764717874090293,
        elevation: 3
      },
      c4: {
        x: -5.3684328157054875,
        y: 0.3,
        z: 5.764717874090293,
        elevation: 3
      }
    },
    walls: [
      {
        id: "bb1ee7cd-9738-4954-acfc-16261277c1ad",
        corner1: "c1",
        corner2: "c2",
        thickness: 0.5,
        type: "STRAIGHT"
      },
      {
        id: "1825b075-5170-48c2-beec-7da379568f3c",
        corner1: "c2",
        corner2: "c3",
        thickness: 0.5,
        type: "STRAIGHT"
      },
      {
        id: "6b6fd058-e464-4885-ade4-7ac9fcc1eb54",
        corner1: "c3",
        corner2: "c4",
        thickness: 0.5,
        type: "STRAIGHT"
      },
      {
        id: "ee3e48cb-90f2-46e2-ac77-0831e36e194c",
        corner1: "c4",
        corner2: "c1",
        thickness: 0.5,
        type: "STRAIGHT"
      }
    ],
    rooms: {
      "c1,c2,c3,c4": {
        name: "Square Room"
      }
    },
    items:[],
    units: "m"
  },
  items: [],
  currentConfig: { type: 'room', id: '' },
  currentStep: null,
  settings: {
    gridSize: 40,
    gridColor: '#008000',
    axesHelperVisible: false,
    gridHelperVisible: false,
    pointColor: '#ff0000',
    draggingColor: '#0000ff',
    divisions: 10,
    actions: {
      addItemHint: 'Click this to add tables, chairs, or other items to the scene.',
      downloadStateHint: 'Click this to download the current Redux state as a JSON file.',
    },
  },


  previewArticle: {},

  projects: [],

  project: {},



  user: {
    uid: 447,
    is_system: false,
    is_admin: false,
    is_public: false,
    is_internal_user: true,
    user_context: { lang: 'en_US', tz: 'Africa/Casablanca', uid: 447 },
    db: 'tecnibo17_test',
    user_settings: {
      id: 137,
      user_id: {}, // Previously [Object], should be an actual object
      is_discuss_sidebar_category_channel_open: true,
      is_discuss_sidebar_category_chat_open: true,
      push_to_talk_key: false,
      use_push_to_talk: false,
      voice_active_duration: 200,
      volume_settings_ids: [], // Previously [Array], should be an actual array
      homemenu_config: false,
      voip_username: false,
      voip_secret: false,
      should_call_from_another_device: false,
      external_device_number: false,
      should_auto_reject_incoming_calls: false,
      how_to_call_on_mobile: 'ask'
    },
    server_version: '17.0+e',
    server_version_info: [17, 0, 0, 'final', 0, 'e'],
    support_url: 'https://www.odoo.com/help',
    name: 'Younes Attaoui',
    username: 'y.attaoui@tecnibo.com',
    partner_display_name: 'Younes Attaoui',
    partner_id: 17909,
    "web.base.url": 'https://www.tecnibo.com',
    active_ids_limit: 20000,
    profile_session: null,
    profile_collectors: null,
    profile_params: null,
    max_file_upload_size: 134217728,
    home_action_id: false,
    cache_hashes: {
      translations: '2d0f07866d7ab214845c343aaa5d9395740829f4',
      load_menus: 'a567ccf72d4c92ba6bf3d20c12c1780ad9e7f8708899c18405cc2e52d1773a28'
    },
    currencies: {
      '1': {}, // Previously [Object], should be an actual object
      '3': {},
      '29': {},
      '111': {},
      '147': {}
    },
    bundle_params: { lang: 'en_US' },
    user_companies: {
      current_company: 11,
      allowed_companies: {}, // Previously [Object], should be an actual object
      disallowed_ancestor_companies: {}
    },
    show_effect: true,
    display_switch_company_menu: false,
    user_id: [447],
    max_time_between_keys_in_ms: 100,
    websocket_worker_version: '17.0-1',
    notification_type: 'email',
    warning: 'user',
    expiration_date: '2026-01-18 00:00:00',
    expiration_reason: 'renewal',
    map_box_token: false,
    odoobot_initialized: true,
    ocn_token_key: false,
    fcm_project_id: '186813708685',
    inbox_action: 88,
    is_quick_edit_mode_enabled: false,
    uom_ids: { '5': {} } // Previously [Object], should be an actual object
  },

};


export const generateRoomKey = (pointIds) => { return pointIds.sort().join(',') };


export const gatherAllCorners = (corners) => { return Object.keys(corners) };


export const getRandomPrice = () => Math.floor(Math.random() * (100 - 10 + 1)) + 10;


const sanitizePayload = (payload) => {
  // Convert to a plain object without DOM properties
  return JSON.parse(JSON.stringify(payload, (key, value) => {
    if (typeof value === "function" || value instanceof Node) {
      return undefined; // Remove functions and DOM elements
    }
    return value;
  }));
};


const jsonData = createSlice({
  name: 'JSONDATA',
  initialState,

  reducers: {

    updateItems: (state, action) => {
      const items = action.payload;
      console.log('items:', items);
      state.floorplanner.items = items;
    },

    updateFloorPlan: (state, action) => {
      const floorplan = action.payload;
      console.log('floorplan', floorplan);
    },

    deleteArticle: (state, action) => {
      const itemId = action.payload;
      state.floorplanner.items = state.floorplanner.items.filter(item => item.id !== itemId);
    },

    setUser: (state, action) => {
      const user = action.payload
      state.user = user
    },

    pushArticles: (state, action) => {
      console.log('action payload:', action.payload);
    
      if (!Array.isArray(state.floorplanner.items)) {
        console.warn("⚠️ state.floorplanner.items is not an array! Initializing as an empty array.");
        state.floorplanner.items = [];
      }
    
      let newItem = sanitizePayload(action.payload);
    
      // Assign unique ID if not present
      if (!newItem.id) {
        newItem.id = uuidv4();
      }
    
      // Assign random price directly to item if not present
      if (typeof newItem.price === 'undefined') {
        newItem.price = getRandomPrice();
      }
    
      // Set default quantity
      if (!newItem.quantity) {
        newItem.quantity = 1;
      }
    
      state.floorplanner.items.push(newItem);
    },




    updateProjectStatus: (state, action) => {
      // console.log('action', action.payload); // Log the action to check the payload

      const { id, status } = action.payload;

      // First, try to find the project in state.projects (array of multiple projects)
      let project = state.projects.find(p => p.id === id);

      if (project) {
        console.log('Found project in state.projects:', project); // Log the found project in state.projects
        project.status = status; // Update the status in the found project
        // console.log('Updated project in state.projects:', project); // Log the updated project
      } else {
        // If not found in state.projects, look for the project in state.project (single project)
        console.warn('Project not found in state.projects, looking in state.project...');

        if (state.project && state.project.id === id) {
          // console.log('Found project in state.project:', state.project); // Log the found project in state.project
          state.project.status = status; // Update the status in the staged project
          // console.log('Updated project in state.project:', state.project); // Log the updated staged project
        } else {
          // If project is not found in either state.projects or state.project, log an error
          console.error(`Project with id: ${id} not found in state.projects or state.project`);
        }
      }
    },


    // Reducer to update the quantity of an item based on its ID
    updateItemQuantity: (state, action) => {
      const { id, quantity } = action.payload;

      // Find the item by ID and update its quantity
      const itemIndex = state.floorplanner.items.findIndex((item) => item.id === id);

      if (itemIndex !== -1) {
        state.floorplanner.items[itemIndex].quantity = quantity;
      } else {
        console.warn(`⚠️ Item with ID ${id} not found.`);
      }
    },



    addProject: (state, action) => {
      const copiedProject = { ...action.payload };
      copiedProject.title = `Copied Basket: ${copiedProject.title}`;
      copiedProject.id = uuidv4();
      state.projects.push(copiedProject)
    },


    deleteProject: (state, action) => {
      const { id, type } = action.payload;

      // If the type is 'active', clear the active project
      if (type === 'active') {
        state.project = {}; // Clear the active project
      }

      // Find and remove the project from the projects array
      const index = state.projects.findIndex(project => project.id === id);
      if (index !== -1) {
        state.projects.splice(index, 1);
      }
    },






    pushProject: (state, action) => {
      state.project = { ...action.payload };
    },
    
    





    updatePreview: (state, action) => {
      state.previewArticle = action.payload || {};
    },

    clearPreview: (state) => {
      state.previewArticle = {};
    },

    setProjectInfo: (state, action) => {
      state.projectInfo = action.payload;
    },

    setDragging: (state, action) => {
      // console.log('action:', action.payload)
      state.isDragging = action.payload;
    },

    setLoading: (state, action) => {
      // console.log('action:', action.payload)
      state.loading = action.payload;
    },

    updateWallWithStarConfig(state, action) {
      console.log('Updating wall with star config:', action.payload);

      const { wallId, config } = action.payload;
      // console.log('walls',)

      if (state.floorplanner && state.floorplanner.walls[wallId]) {
        const wall = state.floorplanner.walls[wallId];
        // console.log('Wall:', wall);
        // wall.thickness = config.thickness;
        // wall.type = config.type;
        // wall.wallColor = config.wallColor;
        // wall.wallTexture = config.wallTexture;
        // wall.wallType = config.wallType;
      } else {
        console.error(`Wall with ID ${wallId} not found.`);
      }

    },


    setWallConfig: (state, action) => {
      // console.log('Updating wall config:', action.payload);

      const { id, key, value } = action.payload;

      if (id) {
        // Update specific wall by ID
        const wall = state.floorplanner.walls.find(wall => wall.id === id);
        if (wall) {
          wall[key] = value;
        }
      } else {
        state.floorplanner.walls.forEach(wall => {
          wall[key] = value;
        });
      }
    },


    starWall(state, action) {
      const { wallId } = action.payload;

      // Find the wall by its ID from the state
      const wall = state.floorplanner.walls.find((w) => w.id === wallId);

      if (wall) {
        // Add the current date to the wall object before saving it to localStorage
        const starredWall = { ...wall, starredAt: new Date().toISOString() };

        // Retrieve the existing favorites from the state, or an empty array if none
        const existingFavorites = state.favorite || [];

        // Add the new starred wall to the favorites array
        const updatedFavorites = [...existingFavorites, starredWall];

        // Save the updated favorites array to localStorage
        localStorage.setItem('starredWall', JSON.stringify(updatedFavorites));

        // Update the favorite state in Redux
        state.favorite = updatedFavorites;

        // console.log(`✨ Wall with ID ${wallId} has been starred and added to favorites! 🌟`, wall);
      } else {
        console.log(`❌ Wall with ID ${wallId} not found... Sorry, no stars here.`);
      }
    },




    setCurrentConfig: (state, action) => {
      // console.log('Setting config:', action.payload);
      const newConfig = action.payload;
      state.currentConfig = newConfig;
    },


    setHouse: (state, action) => {
      const house = action.payload;
      state.floorplanner = {
        version: "1.0.0",
        corners: house.corners,
        walls: house.walls,
        rooms: house.rooms,
        units: "m",
      };
    },

    updateSettings: (state, action) => {
      // console.log('updateSettings', action.payload);
      const { key, value } = action.payload;
      state.settings[key] = value;
    },


    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },

    updateItemPositionAndRotation: (state, action) => {
      // console.log('updateItemPositionAndRotation', action.payload);
      const { id, newPosition, newRotation } = action.payload;
      const item = state.floorplanner.items.find(item => item.id === id);
      if (item) {
        item.position = newPosition;
        item.rotation = newRotation;
      } else {
        console.warn(`Item with ID ${id} not found.`);
      }
    },

    saveProjectSetup: (state, action) => {
      const { projectName, questions, description, startDate, clientName, clientEmail } = action.payload;
      state.projectSetup.projectName = projectName;
      state.projectSetup.questions = questions;
      state.projectSetup.description = description;
      state.projectSetup.startDate = startDate;
      state.projectSetup.clientName = clientName;
      state.projectSetup.clientEmail = clientEmail;
    },


    // Updates the entire state
    updateJSONDATA(state, action) {
      return action.payload;
    },


    updateCorner: (state, action) => {
      // console.log("updateCorner", action.payload);
      // console.log("state.corners", state.floorplanner.corners['71d4f128-ae80-3d58-9bd2-711c6ce6cdf2']);
      const { id, position } = action.payload;

      // Check if the corner exists in the state
      if (state.floorplanner && state.floorplanner.corners[id]) {
        // Only update x and z properties, leaving others unchanged
        state.floorplanner.corners[id] = {
          ...state.floorplanner.corners[id],
          x: position.x,  // Update x
          z: position.z   // Update z
        };
      } else {
        console.error(`Corner with ID ${id} not found.`);
      }
    },



    createPoint(state, action) {
      // console.log('createPoint', action.payload)
      const { id, position, elevation, connectedWalls } = action.payload;

      // Check if the point with the same coordinates already exists (using swapped y and z)
      const existingCorner = Object.values(state.floorplanner.corners).find(
        (corner) => corner.x === position.x && corner.y === position.z // Compare x and z (not y)
      );

      if (existingCorner) {
        console.warn(`Corner with position (${position.x}, ${position.z}) already exists.`);
        return;
      }

      // Add a new corner if no duplicates are found
      if (state.floorplanner.corners[id]) {
        console.warn(`Corner with id ${id} already exists.`);
        return;
      }

      // Adding the new corner to the store
      state.floorplanner.corners[id] = {
        x: position.x,
        y: position.y,
        z: position.z,
        // Storing z as y in the state
        elevation,
        connectedWalls,
      };


    },



    removePoint(state, action) {
      // console.log("Removing point", action.payload);
      const { id } = action.payload;
      if (!id) {
        console.warn("Payload does not contain a valid 'id'.", action.payload);
        return;
      }

      if (state.floorplanner.corners[id]) {
        const { [id]: _, ...remainingCorners } = state.floorplanner.corners;

        state.floorplanner.corners = remainingCorners;
        state.floorplanner.walls = state.floorplanner.walls.filter(
          (wall) => wall.corner1 !== id && wall.corner2 !== id
        );
      } else {
        console.warn(`Point with ID ${id} not found in corners.`);
      }

    },




    updateWallWithNewCorner: (state, action) => {
      // Destructure the points from the action payload
      const { virtualPoint, realPoint } = action.payload;

      // Access the ids from the point objects
      const virtualCornerId = virtualPoint.id;
      const realPointId = realPoint.id;

      // console.log('virtualCorner', virtualCornerId);
      // console.log('realCorner', realPointId);

      // Iterate through walls and update corners
      state.floorplanner.walls.forEach((wall) => {
        if (wall.corner1 === virtualCornerId) {
          wall.corner1 = realPointId; // Replace the virtual corner with the real point ID
        }

        if (wall.corner2 === virtualCornerId) {
          wall.corner2 = realPointId; // Replace the virtual corner with the real point ID
        }
      });
    },


    createRoom: (state, action) => {
      // console.log('Room created:', action.payload);

      const corners = state.floorplanner.corners;
      // console.log('Room corners:', JSON.parse(JSON.stringify(corners)));

      const pointIds = gatherAllCorners(corners);
      const roomName = `Room ${Object.keys(state.floorplanner.rooms).length + 1}`;

      // Generate a unique key for the new room
      const roomKey = generateRoomKey(pointIds);

      // Ensure rooms object exists
      if (!state.floorplanner.rooms) {
        state.floorplanner.rooms = {};
      }

      // Add the room to the state
      state.floorplanner.rooms[roomKey] = { name: roomName };

      // Log the newly created room
      console.log('Newly created room:', JSON.parse(JSON.stringify(state.floorplanner.rooms[roomKey])));

      // Log all current rooms
      console.log('All current rooms:', JSON.parse(JSON.stringify(state.floorplanner.rooms)));
    },






    createWall(state, action) {
      // console.log('action Payload:',action.payload);
      const { corner1, corner2, a, b } = action.payload;
      const newWall = {
        corner1,
        corner2,
        a: {},
        b: {}

      };
      state.floorplanner.walls.push(newWall);
    },

    selectItemForRoom: (state, action) => {
      // console.log('Selected item:', action.payload);
      const { itemId, roomName } = action.payload;

      // Find the room by name
      const roomKey = Object.keys(state.floorplanner.rooms).find(key => state.floorplanner.rooms[key].name === roomName);
      if (!roomKey) {
        console.warn(`Room with name "${roomName}" not found.`);
        return;
      }

      // Find the item by ID
      const item = state.floorplanner.items.find(item => item.id === itemId);
      if (!item) {
        console.warn(`Item with id ${itemId} not found.`);
        return;
      }


      // Mark the item as staged
      item.isStaged = true;

      // Add itemId to room's itemIds array if not already included
      const room = state.floorplanner.rooms[roomKey];

      // Ensure the itemIds array exists and update it immutably
      const updatedItemIds = room.itemIds ? [...room.itemIds] : [];
      if (!updatedItemIds.includes(itemId)) {
        updatedItemIds.push(itemId);
      }

      // Update the room with the new itemIds array
      state.floorplanner.rooms = {
        ...state.floorplanner.rooms,
        [roomKey]: {
          ...room,
          itemIds: updatedItemIds,
        }
      };

      console.log('Updated room:', state.floorplanner.rooms[roomKey]);
    },






    setIsDrawing(state, action) {
      state.isDrawing = action.payload;
      if (action.payload) {
        state.is2DView = true;
      }
    },



    setIs2DView(state, action) {
      state.is2DView = action.payload;
    },



    // Action to update a room's name
    updateRoomName: (state, action) => {
      const { pointIds, newName } = action.payload;
      const roomKey = generateRoomKey(pointIds);

      if (state[roomKey]) {
        state[roomKey].name = newName;
      }
    },


    // Action to delete a room by point IDs
    deleteRoom: (state, action) => {
      const { pointIds } = action.payload;
      const roomKey = generateRoomKey(pointIds);

      delete state[roomKey];
    },


    // Redux slice - updateBothCorners reducer
    updateBothCorners: (state, action) => {
      // console.log("updateBothCorners", action.payload);

      // Destructure the payload to get the corner IDs and their new positions
      const { corner1Id, corner2Id, position1, position2 } = action.payload;

      // Ensure both corners exist in the state
      if (
        state.floorplanner &&
        state.floorplanner.corners[corner1Id] &&
        state.floorplanner.corners[corner2Id]
      ) {
        // Update corner1
        state.floorplanner.corners[corner1Id] = {
          ...state.floorplanner.corners[corner1Id],
          x: position1.x,  // Update x for corner1
          z: position1.z   // Update z for corner1
        };

        // Update corner2
        state.floorplanner.corners[corner2Id] = {
          ...state.floorplanner.corners[corner2Id],
          x: position2.x,  // Update x for corner2
          z: position2.z   // Update z for corner2
        };

      } else {
        console.error(`Corners with IDs ${corner1Id} and ${corner2Id} not found.`);
      }
    },


    updatePoints: (state, action) => {
      // console.log("updatePoints", action.payload);

      const { corner1Id, corner2Id, newPositions } = action.payload;

      if (state.floorplanner.corners[corner1Id]) {
        state.floorplanner.corners[corner1Id] = {
          ...state.floorplanner.corners[corner1Id],
          ...newPositions.pointA,
        }
      }

      if (state.floorplanner.corners[corner2Id]) {
        state.floorplanner.corners[corner2Id] = {
          ...state.floorplanner.corners[corner2Id],
          ...newPositions.pointB,
        };
      }
    },
  },


});


// Configure the store
const store = configureStore({
  reducer: {
    jsonData: jsonData.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(thunk),
});


// Export actions for use in components
export const { updateFloorPlan, setUser, deleteArticle, updateItemQuantity, updateProjectStatus, addProject, deleteProject, pushProject, pushArticles, updatePreview, clearPreview, setLoading, setDragging, setProjectInfo, updateWallWithStarConfig, starWall, setWallConfig, updateJSONDATA, updateItems, updateCorner, setIsDrawing, setIs2DView, createPoint, createWall, updatePoints, createRoom, removePoint, updateWallWithNewCorner, updateBothCorners, selectItemForRoom, updateItemPositionAndRotation, setCurrentStep, saveProjectSetup, setHouse, setCurrentConfig, updateSettings, resetSettings } = jsonData.actions;


export default store;









