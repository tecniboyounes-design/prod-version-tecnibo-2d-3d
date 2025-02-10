"use client"

import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from "uuid";
import { generateUniqueProjectNumber } from './data/models';


// Define the initial state
const initialState = {
  loading:false,
  is2DView: false,
  isDrawing: false,
  wallHieght: 4,
  isClose: false,
  projectInfo:null,
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
  
  previewArticle:  {
    id: uuidv4(),
    itemName: "Main Door",
    itemType: 7,
    position: [632.3531265126858, 133, 500],
    rotation: [0, -3.141592653589793, 0],
    scale: [1, 1, 1],
    size: [138, 266, 137],
    fixed: true,
    resizable: true,
    modelURL: "models/InWallFloorItems/Door.glb",
    isParametric: false,
    wall: "e3a9cbc3-c4a3-9f90-08f5-d00b6036d79a,da026c08-d76a-a944-8e7b-096b752da9ed",
    wallSide: "front",
    wallSurfacePoint: [632.3531265126858, 133, 500],
    mesh: ["Cube"],
    textures: [
      {
        name: "Cube",
        texture: "",
        color: "",
        shininess: 10,
        size: [],
      },
    ],
    innerRotation: [0, -3.141592653589793, 0],
  },


  projects:[
    {
      id: uuidv4(),
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
      title: "Real Project Younes Attaoui",
      projectNumber: generateUniqueProjectNumber(),
            createdOn: "09/01/2025, 15:12",
      changedOn: "09/01/2025, 15:43",
      managers: [
        { id: uuidv4(), name: "Younes Attaoui", avatar: "https://i.pravatar.cc/150?img=1" },
        { id: uuidv4(), name: "Omar El Idrissi", avatar: "https://i.pravatar.cc/150?img=2" },
        { id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" }, 
      ],
      status: "temp",
    },
    {
      id: uuidv4(),
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
      title: "Interior Design Younes Attaoui test test test test",
      projectNumber: generateUniqueProjectNumber(),      createdOn: "10/01/2025, 12:00",
      changedOn: "10/01/2025, 12:45",
      managers: [
        { id: uuidv4(), name: "Sabrina El Khouch", avatar: "https://i.pravatar.cc/150?img=4" },
        { id: uuidv4(), name: "Rachid Benjelloun", avatar: "https://i.pravatar.cc/150?img=5" },
        { id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" }, 
      ],
      status: "ordered",
      articles:[],
    },
    {
      id: uuidv4(),
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
      title: "Modern Floor Planning",
      projectNumber: generateUniqueProjectNumber(),      createdOn: "11/01/2025, 10:15",
      changedOn: "11/01/2025, 10:45",
      managers: [
        { id: uuidv4(), name: "Salma Mounir", avatar: "https://i.pravatar.cc/150?img=6" },
        { id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" }, 
      ],
      status: "in working",
      articles:[],

    
    },
    {
      id: uuidv4(),
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
      title: "Large-Scale Team Project",
      projectNumber: generateUniqueProjectNumber(),      createdOn: "12/01/2025, 09:30",
      changedOn: "12/01/2025, 09:45",
      managers: [
        { id: uuidv4(), name: "Ahmed El Amrani", avatar: "https://i.pravatar.cc/150?img=7" },
        { id: uuidv4(), name: "Omar El Idrissi", avatar: "https://i.pravatar.cc/150?img=8" },
        { id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" }, 
      ],
      status: "finished",
      articles:[],

    },
    {
      id: uuidv4(),
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
      title: "Unique Project 1",
      projectNumber: generateUniqueProjectNumber(),      createdOn: "12/01/2025, 15:00",
      changedOn: "12/01/2025, 15:30",
      managers: [
        { id: uuidv4(), name: "Sofia El Hamidi", avatar: "https://i.pravatar.cc/150?img=9" },
        { id: uuidv4(), name: "Tariq Benali", avatar: "https://i.pravatar.cc/150?img=10" },
      ],
      status: "finished",
      articles:[],

    },
    {
      id: uuidv4(),
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
      title: "Unique Project 2",
      projectNumber: generateUniqueProjectNumber(),      createdOn: "13/01/2025, 12:00",
      changedOn: "13/01/2025, 12:45",
      managers: [
        { id: uuidv4(), name: "Amina Aouad", avatar: "https://i.pravatar.cc/150?img=11" },
        { id: uuidv4(), name: "Yassine Boushaba", avatar: "https://i.pravatar.cc/150?img=12" },
      ],
      status: "ordered",
      articles:[],

    },
    {
      id: uuidv4(),
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
      title: "Unique Project 3",
      projectNumber: generateUniqueProjectNumber(),      createdOn: "14/01/2025, 10:15",
      changedOn: "14/01/2025, 10:45",
      managers: [
        { id: uuidv4(), name: "Imane El Messaoudi", avatar: "https://i.pravatar.cc/150?img=13" },
      ],
      status: "in planning",
      articles:[],

    },
    {
      id: uuidv4(),
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
      title: "Unique Large Team Project",
      projectNumber: generateUniqueProjectNumber(),      createdOn: "15/01/2025, 09:30",
      changedOn: "15/01/2025, 09:45",
      managers: [
        { id: uuidv4(), name: "Fatiha El Ghazali", avatar: "https://i.pravatar.cc/150?img=14" },
        { id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" },
      ],
      status: "ordered",
      articles:[],

    },
    {
      id: uuidv4(),
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
      title: "Project in Planning",
      projectNumber: generateUniqueProjectNumber(),      
      createdOn: "15/01/2025, 11:00",
      changedOn: "15/01/2025, 11:30",
      managers: [
        { id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" },
      ],
      status: "in working",
      articles:[],

    },
  ],
  project:{},
  
  user: {
    _id: '123456',
    name: 'John Doe',
    email: 'johndoe@example.com',
    role: 'admin',  
    isAuthenticated: true, 
    loading: false, 
  }
  
};


export const generateRoomKey = (pointIds) => { return pointIds.sort().join(',') };


export const gatherAllCorners = (corners) => {return Object.keys(corners)};


const getRandomPrice = () => Math.floor(Math.random() * (100 - 10 + 1)) + 10;

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
  
    deleteArticle: (state, action) => {
      const itemId = action.payload; 
      state.items = state.items.filter(item => item.id !== itemId); // Remove item with the matching ID
    },
      
     

    pushArticles: (state, action) => {
      console.log('action payload:', action.payload);
    
      if (!Array.isArray(state.items)) {
        console.warn("⚠️ state.items is not an array! Initializing as an empty array.");
        state.items = [];
      }
    
      let newItem = sanitizePayload(action.payload); 
      // Remove non-serializable values
    
      // Assign a unique ID if not present
      if (!newItem.id) {
        newItem.id = uuidv4();
      }
    
      // Assign a random price if not present
      if (!newItem.attributes?.price) {
        newItem.attributes = { ...newItem.attributes, price: getRandomPrice() };
      }
    
      // Ensure quantity is set to 1 by default if not provided
      if (!newItem.quantity) {
        newItem.quantity = 1;
      }
    
      state.items.push(newItem);
    },
    
    updateProjectStatus: (state, action) => {
    // console.log('action', action.payload);
      
      const { id, status } = action.payload;
      const project = state.projects.find(p => p.id === id);
      
      if (project) {
        project.status = status;
      }

    },
    
    // Reducer to update the quantity of an item based on its ID
     updateItemQuantity :(state, action) => {
      const { id, quantity } = action.payload;
    
      // Find the item by ID and update its quantity
      const itemIndex = state.items.findIndex((item) => item.id === id);
      
      if (itemIndex !== -1) {
        state.items[itemIndex].quantity = quantity;
      } else {
        console.warn(`⚠️ Item with ID ${id} not found.`);
      }
    },

    
    
    addProject: (state, action) => {
      const copiedProject = { ...action.payload };
      copiedProject.title = `Copied Basket: ${copiedProject.title}`;
      copiedProject.id =  uuidv4() ; 
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
      state.project = action.payload; 
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
      console.log('walls',)

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
      console.log('Updating wall config:', action.payload);

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

        console.log(`✨ Wall with ID ${wallId} has been starred and added to favorites! 🌟`, wall);
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
      console.log('updateSettings', action.payload);
      const { key, value } = action.payload;
      state.settings[key] = value;
    },


    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },

    updateItemPositionAndRotation: (state, action) => {
      // console.log('updateItemPositionAndRotation', action.payload);
      const { id, newPosition, newRotation } = action.payload;
      const item = state.items.find(item => item.id === id);
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
      console.log('Room created:', action.payload);

      const corners = state.floorplanner.corners;
      console.log('Room corners:', JSON.parse(JSON.stringify(corners)));

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
      const item = state.items.find(item => item.id === itemId);
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
export const { deleteArticle,updateItemQuantity,updateProjectStatus,addProject,deleteProject,pushProject ,pushArticles ,updatePreview ,clearPreview,setLoading, setDragging,setProjectInfo,updateWallWithStarConfig, starWall, setWallConfig, updateJSONDATA, updateItems, updateCorner, setIsDrawing, setIs2DView, createPoint, createWall, updatePoints, createRoom, removePoint, updateWallWithNewCorner, updateBothCorners, selectItemForRoom, updateItemPositionAndRotation, setCurrentStep, saveProjectSetup, setHouse, setCurrentConfig, updateSettings, resetSettings } = jsonData.actions;


export default store;









