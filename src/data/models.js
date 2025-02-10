import axios from "axios";
import { v4 as uuidv4 } from "uuid";


export const articles3D = [
  {
    id: uuidv4(),
    itemName: "Window with Curtain",
    itemType: 3,
    position: [868.4468283385688, 158.73167032399962, -250],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    size: [136, 195, 20],
    fixed: true,
    resizable: true,
    modelURL: "/models/InWallItems/WindowWithCurtain.glb",
    isParametric: false,
    wall: "fed350d6-a751-1f3d-f6ec-eaa27de6bd12,3bec1535-21a7-668e-5d47-229db4d136d2",
    wallSide: "front",
    wallSurfacePoint: [868.4468283385688, 158.73167032399962, -250],
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
    innerRotation: [0, 0, 0],
  },
  {
    id: uuidv4(),
    itemName: "Main Door",
    itemType: 7,
    position: [632.3531265126858, 133, 500],
    rotation: [0, -3.141592653589793, 0],
    scale: [1, 1, 1],
    size: [138, 266, 137],
    fixed: true,
    resizable: true,
    modelURL: "/models/InWallFloorItems/Door.glb",
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
  {
    id: uuidv4(),
    itemName: "Tennis Table",
    itemType: 1,
    position: [1019.1735537817156, 49.05, 341.7895865393001],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    size: [281.598, 98.1, 172.4],
    fixed: false,
    resizable: false,
    modelURL: "/models/TableTennisTable.glb",
    isParametric: false,
    mesh: ["Table_Tennis_Table"],
    textures: [
      {
        name: "Table_Tennis_Table",
        texture: "",
        color: "",
        shininess: 10,
        size: [],
      },
    ],
  },
  {
    id: uuidv4(),
    itemName: "Andrea Wox Table",
    itemType: 1,
    position: [196.6076038775616, 25.9, 270.75221923647905],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    size: [161, 51.8, 161],
    fixed: false,
    resizable: false,
    modelURL: "/models/AndreaWox_Table_Resized.glb",
    isParametric: false,
    mesh: ["Mesh02"],
    textures: [
      {
        name: "Mesh02",
        texture: "",
        color: "",
        shininess: 10,
        size: [],
      },
    ],
  },
];


export const cloisonData = [
  {
    name: "T100",
    acoustic_performance: "45 dB - 49 dB - 50 dB",
    fire_performance: "EI30",
    dimension: {
      height: { min: 200, max: 3100 },
      width: { min: 100, max: 1200 },
    },
    color_finish: null,
    store: false,
    osb: true,
    acoustic_grilles: true,
    options: ["Rainures", "vitre plus claire"],
  },
  {
    name: "ART",
    acoustic_performance: "42 dB - 44 dB - 46 dB",
    fire_performance: null,
    dimension: {
      height: { min: 200, max: 3100 },
      width: { min: 125, max: 1200 },
    },
    color_finish: null,
    store: true,
    osb: false,
    acoustic_grilles: false,
    options: ["Lacobel"],
  },
  {
    name: "BTG",
    acoustic_performance: "48 dB",
    fire_performance: null,
    dimension: {
      height: { min: 200, max: 3100 },
      width: { min: 132, max: 1200 },
    },
    color_finish: null,
    store: false,
    osb: false,
    acoustic_grilles: false,
    options: [],
  },
  {
    name: "V100",
    acoustic_performance:
      "35 dB - 37 dB - 38 dB - 39 dB - 40 dB - 42 dB - 44 dB - 46 dB",
    fire_performance: null,
    dimension: {
      height: { min: 200, max: 3100 },
      width: { min: 132, max: 1200 },
    },
    color_finish: null,
    store: false,
    osb: false,
    acoustic_grilles: false,
    options: [],
  },
  {
    name: "HAAS",
    acoustic_performance: "36 dB - 39 dB - 38 dB - 41 dB",
    fire_performance: null,
    dimension: {
      height: { min: 200, max: 3100 },
      width: { min: 125, max: 1200 },
    },
    color_finish: null,
    store: false,
    osb: false,
    acoustic_grilles: false,
    options: [],
  },
  {
    name: "MIRO",
    acoustic_performance: "42 dB - 44 dB - 48 dB - 50 dB",
    fire_performance: null,
    dimension: {
      height: { min: 200, max: 3100 },
      width: { min: 125, max: 1200 },
    },
    color_finish: null,
    store: false,
    osb: false,
    acoustic_grilles: false,
    options: [],
  },
  {
    name: "ERA",
    acoustic_performance: "36 dB - 39 dB - 38 dB - 41 dB",
    fire_performance: null,
    dimension: {
      height: { min: 200, max: 3100 },
      width: { min: 125, max: 1200 },
    },
    color_finish: null,
    store: false,
    osb: false,
    acoustic_grilles: false,
    options: [],
  },
  {
    name: "SILO",
    acoustic_performance: "42 dB - 44 dB - 48 dB - 50 dB",
    fire_performance: null,
    dimension: {
      height: { min: 200, max: 3100 },
      width: { min: 125, max: 1200 },
    },
    color_finish: null,
    store: false,
    osb: false,
    acoustic_grilles: false,
    options: [],
  },
  {
    name: "FLEXA",
    acoustic_performance: "45 dB - 49 dB - 50 dB",
    fire_performance: null,
    dimension: {
      height: { min: 200, max: 3100 },
      width: { min: 125, max: 1200 },
    },
    color_finish: null,
    store: false,
    osb: false,
    acoustic_grilles: false,
    options: [],
  },
];

export const cloisonStyles = [
  {
    id: uuidv4(),
    name: "default",
    thickness: 0.2,
  },
  {
    id: uuidv4(),
    name: "SILO",
    // color: "#FF5733",
    thickness: 0.5,
    // dimensions: { width: 2000, height: 3000 },
    material: {
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.7,
    },
    // position: { x: 0, y: 0, z: 0 },
    // rotation: { x: 0, y: 0, z: 0 },
  },
  {
    id: uuidv4(),
    name: "ERA",
    color: "#33FF57",
    thickness: 0.8,
    dimensions: { width: 2500, height: 3500 },
    material: {
      transparent: true,
      opacity: 0.6,
      roughness: 0.2,
      metalness: 0.5,
    },
    position: { x: 5, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  {
    id: uuidv4(),
    name: "MIRO",
    color: "#3357FF",
    thickness: 0.3,
    dimensions: { width: 1800, height: 2800 },
    material: {
      transparent: true,
      opacity: 0.4,
      roughness: 0.3,
      metalness: 0.6,
    },
    position: { x: 10, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  {
    id: uuidv4(),
    name: "HAAS",
    color: "#FF33A1",
    thickness: 0.7,
    dimensions: { width: 2200, height: 3200 },
    material: {
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.8,
    },
    position: { x: 15, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  {
    id: uuidv4(),
    name: "V100",
    color: "#F3FF33",
    thickness: 0.9,
    dimensions: { width: 2400, height: 3400 },
    material: {
      transparent: true,
      opacity: 0.3,
      roughness: 0.4,
      metalness: 0.4,
    },
    position: { x: 20, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  {
    id: uuidv4(),
    name: "BTG",
    color: "#33FFF9",
    thickness: 0.6,
    dimensions: { width: 2100, height: 3100 },
    material: {
      transparent: true,
      opacity: 0.5,
      roughness: 0.2,
      metalness: 0.9,
    },
    position: { x: 25, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  {
    id: uuidv4(),
    name: "ART",
    color: "#000000",
    thickness: 0.8,
    dimensions: { width: 2500, height: 3500 },
    material: {
      transparent: false,
      opacity: 1,
      roughness: 0.5,
      metalness: 0.3,
    },
    position: { x: 30, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  {
    id: uuidv4(),
    name: "T100",
    color: "#FFFFFF",
    thickness: 0.8,
    dimensions: { width: 2500, height: 3500 },
    material: {
      transparent: false,
      opacity: 1,
      roughness: 0.5,
      metalness: 0.3,
    },
    position: { x: 35, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
];



export const projectsData = [
  {
    id: uuidv4(),
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
    title: "Real Project Younes Attaoui",
    projectNumber: "2025001471",
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
    projectNumber: "2025001472",
    createdOn: "10/01/2025, 12:00",
    changedOn: "10/01/2025, 12:45",
    managers: [
      { id: uuidv4(), name: "Sabrina El Khouch", avatar: "https://i.pravatar.cc/150?img=4" },
      { id: uuidv4(), name: "Rachid Benjelloun", avatar: "https://i.pravatar.cc/150?img=5" },
      { id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" }, 
    ],
    status: "ordered",
  },
  {
    id: uuidv4(),
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
    title: "Modern Floor Planning",
    projectNumber: "2025001473",
    createdOn: "11/01/2025, 10:15",
    changedOn: "11/01/2025, 10:45",
    managers: [
      { id: uuidv4(), name: "Salma Mounir", avatar: "https://i.pravatar.cc/150?img=6" },
      { id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" }, 
    ],
    status: "in working",
  },
  {
    id: uuidv4(),
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
    title: "Large-Scale Team Project",
    projectNumber: "2025001474",
    createdOn: "12/01/2025, 09:30",
    changedOn: "12/01/2025, 09:45",
    managers: [
      { id: uuidv4(), name: "Ahmed El Amrani", avatar: "https://i.pravatar.cc/150?img=7" },
      { id: uuidv4(), name: "Omar El Idrissi", avatar: "https://i.pravatar.cc/150?img=8" },
      { id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" }, 
    ],
    status: "finished",
  },
  {
    id: uuidv4(),
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
    title: "Unique Project 1",
    projectNumber: "2025001501",
    createdOn: "12/01/2025, 15:00",
    changedOn: "12/01/2025, 15:30",
    managers: [
      { id: uuidv4(), name: "Sofia El Hamidi", avatar: "https://i.pravatar.cc/150?img=9" },
      { id: uuidv4(), name: "Tariq Benali", avatar: "https://i.pravatar.cc/150?img=10" },
    ],
    status: "finished",
  },
  {
    id: uuidv4(),
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
    title: "Unique Project 2",
    projectNumber: "2025001502",
    createdOn: "13/01/2025, 12:00",
    changedOn: "13/01/2025, 12:45",
    managers: [
      { id: uuidv4(), name: "Amina Aouad", avatar: "https://i.pravatar.cc/150?img=11" },
      { id: uuidv4(), name: "Yassine Boushaba", avatar: "https://i.pravatar.cc/150?img=12" },
    ],
    status: "ordered",
  },
  {
    id: uuidv4(),
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
    title: "Unique Project 3",
    projectNumber: "2025001503",
    createdOn: "14/01/2025, 10:15",
    changedOn: "14/01/2025, 10:45",
    managers: [
      { id: uuidv4(), name: "Imane El Messaoudi", avatar: "https://i.pravatar.cc/150?img=13" },
    ],
    status: "in planning",
  },
  {
    id: uuidv4(),
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
    title: "Unique Large Team Project",
    projectNumber: "2025001504",
    createdOn: "15/01/2025, 09:30",
    changedOn: "15/01/2025, 09:45",
    managers: [
      { id: uuidv4(), name: "Fatiha El Ghazali", avatar: "https://i.pravatar.cc/150?img=14" },
      { id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" },
    ],
    status: "ordered",
  },
  {
    id: uuidv4(),
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&ixid=MnwzNjkzNzl8MHx8c2Vhcnx8fHx8fHx8fHwxNjcwNjU3NzQ0&ixlib=rb-1.2.1&q=80&w=1080",
    title: "Project in Planning",
    projectNumber: "2025001505",
    createdOn: "15/01/2025, 11:00",
    changedOn: "15/01/2025, 11:30",
    managers: [
      { id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" },
    ],
    status: "in working",
  },
];


export const dialogsData = [
  {
    title: "Unit of Measurement",
    description: {
      intro: "To change the unit of measurement for room planning:",
      units: [
        { label: "m", meaning: "Meter" },
        { label: "cm", meaning: "Centimeter" },
        { label: "mm", meaning: "Millimeter" },
        { label: "ft", meaning: "Foot" },
        { label: "inch", meaning: "Inch" },
      ],
      note: "Please note that the configurators have their own unit of measurement based on the product logic.",
    },
    image:
      "https://cdn.netshop.imos3d.com/navigram/ix-net-2019/tooltips/option-measurement.jpg",
  },
  {
    title: "Snapping Distance",
    description: {
      intro: "Defines the grid in step 2 for editing the walls.",
      units: null,
      note: "Moving the walls snaps the position to the specified grid.",
    },
    image:
      "https://cdn.netshop.imos3d.com/navigram/ix-net-2019/tooltips/option-grid.png",
  },
  {
    title: "Measuring Unit",
    description: {
      intro: "To change the type of measurement for room planning:",
      units: [
        { label: "Off", meaning: "Turn off all measurements" },
        {
          label: "Room measures",
          meaning: "Shows only the room inner and outer dimensions of walls",
        },
        {
          label: "Room and article measures",
          meaning: "Shows room and article measures as dimension chains",
        },
      ],
      note: null,
    },
    image:
      "https://cdn.netshop.imos3d.com/navigram/ix-net-2019/tooltips/option-measurement.jpg",
  },
  {
    title: "Wall Numbers",
    description: {
      intro: "The wall numbers give you an overview of all existing walls.",
      units: null,
      note: null,
    },
    image:
      "https://cdn.netshop.imos3d.com/navigram/ix-net-2019/tooltips/option-wall-numbers.jpg",
  },
  {
    title: "Position Numbers",
    description: {
      intro:
        "The position numbers give you an overview of all created articles.",
      units: null,
      note: "The order of the numbering depends on the creation time of the articles.",
    },
    image:
      "https://cdn.netshop.imos3d.com/navigram/ix-net-2019/tooltips/option-position-numbers.png",
  },
  {
    title: "Ruler",
    description: {
      intro:
        "Show or hide the ruler for a quick measurement while moving the objects.",
      units: null,
      note: null,
    },
    image:
      "https://cdn.netshop.imos3d.com/navigram/ix-net-2019/tooltips/option-ruler.png",
  },
  {
    title: "Laser Tape",
    description: {
      intro: "Use a laser for a detailed measurement of two objects.",
      units: null, 
      note: null, 
    },
    image:
      "https://cdn.netshop.imos3d.com/navigram/ix-net-2019/tooltips/option-laser.png",
  },
  {
    title: "Height of Laser",
    description: {
      intro:
        "Set the height of the laser to get the right snapping points of objects.",
      units: null,
      note: null, 
    },
    image:
      "https://cdn.netshop.imos3d.com/navigram/ix-net-2019/tooltips/option-laser-height.png",
  },
  {
    title: "Shadows",
    description: {
      intro: "Set the shadow of the items on or off.",
      units: null,
      note: null,
    },
    image: null,
  },
  {
    title: "Room Locked",
    description: {
      intro:
        "Lock the complete room e.g. for presentation. The navigation will be still available, but no other movement of objects can be done.",
      units: null,
      note: null, 
    },
    image:
      "https://cdn.netshop.imos3d.com/navigram/ix-net-2019/tooltips/option-lock.png",
  },
  {
    title: "Show Fronts",
    description: {
      intro: "Show or hide all fronts in the room.",
      units: null,
      note: null, 
    },
    image:
      "https://cdn.netshop.imos3d.com/navigram/ix-net-2019/tooltips/option-front.png",
  },
  {
    title: "Cutting Distance",
    description: {
      intro: "Value to set the cutting distance of the wall views.",
      units: null, 
      note: null, 
    },
    image:
      "https://cdn.netshop.imos3d.com/navigram/ix-net-2021-sr1/tooltips/option-cutting-distance.png",
  },
    {
      title: "Font Size",
      description: {
        intro: "The font size of the measuring for the wall views can be set by this specific value in pixels.",
        units: null,
        note: null 
      },
      image: null       
    }
  
];




export const houses = [
  {
    id: uuidv4(),
    version: "2.0.1a",
    corners: {
      c1: { x: -5.3684328157054875, y: 0.1, z: -6.657952283074816, elevation: 3 },
      c2: { x: 3.209880439112964, y: 0.1, z: -6.657952283074816, elevation: 3 },
      c3: { x: 3.209880439112964, y: 0.1, z: 6.004291318532954, elevation: 3 },
      c4: { x: -5.3684328157054875, y: 0.1, z: 6.004291318532954, elevation: 3 }
    },
    walls: [
      { id: "bb1ee7cd-9738-4954-acfc-16261277c1ad", corner1: "c1", corner2: "c2", thickness: 0.2, type: "STRAIGHT" },
      { id: "1825b075-5170-48c2-beec-7da379568f3c", corner1: "c2", corner2: "c3", thickness: 0.2, type: "STRAIGHT" },
      { id: "6b6fd058-e464-4885-ade4-7ac9fcc1eb54", corner1: "c3", corner2: "c4", thickness: 0.2, type: "STRAIGHT" },
      { id: "ee3e48cb-90f2-46e2-ac77-0831e36e194c", corner1: "c4", corner2: "c1", thickness: 0.2, type: "STRAIGHT" }
    ],
    rooms: { "c1,c2,c3,c4": { name: "Square Room" } },
    units: "m"
  },
  {
    id: uuidv4(),
    version: "2.0.1a",
    corners: {
      c1: { x: -5.3684328157054875, y: 0.1, z: -0.7248577706785396, elevation: 3 },
      c2: { x: 5.421337875779884, y: 0.1, z: -0.7248577706785396, elevation: 3 },
      c3: { x: 5.421337875779884, y: 0.1, z: 3.4415816835248525, elevation: 3 },
      c4: { x: -5.3684328157054875, y: 0.1, z: 3.4415816835248525, elevation: 3 }
    },
    walls: [
      { id: "bb1ee7cd-9738-4954-acfc-16261277c1ad", corner1: "c1", corner2: "c2", thickness: 0.2, type: "STRAIGHT" },
      { id: "1825b075-5170-48c2-beec-7da379568f3c", corner1: "c2", corner2: "c3", thickness: 0.2, type: "STRAIGHT" },
      { id: "6b6fd058-e464-4885-ade4-7ac9fcc1eb54", corner1: "c3", corner2: "c4", thickness: 0.2, type: "STRAIGHT" },
      { id: "ee3e48cb-90f2-46e2-ac77-0831e36e194c", corner1: "c4", corner2: "c1", thickness: 0.2, type: "STRAIGHT" }
    ],
    rooms: { "c1,c2,c3,c4": { name: "Square Room" } },
    units: "m"
  },
  {
    id: uuidv4(),
    version: "2.0.1a",
    corners: {
      c1: { x: -4.41333051570999, y: 0.1, z: -2.765118762276721, elevation: 3 },
      c2: { x: 3.7442898832230744, y: 0.1, z: -5.430118327798113, elevation: 3 },
      c3: { x: 3.7442898832230744, y: 0.1, z: 3.4415816835248525, elevation: 3 },
      c4: { x: -4.943083668154167, y: 0.1, z: 2.947856662033664, elevation: 3 }
    },
    walls: [
      { id: "bb1ee7cd-9738-4954-acfc-16261277c1ad", corner1: "c1", corner2: "c2", thickness: 0.2, type: "STRAIGHT" },
      { id: "1825b075-5170-48c2-beec-7da379568f3c", corner1: "c2", corner2: "c3", thickness: 0.2, type: "STRAIGHT" },
      { id: "6b6fd058-e464-4885-ade4-7ac9fcc1eb54", corner1: "c3", corner2: "c4", thickness: 0.2, type: "STRAIGHT" },
      { id: "ee3e48cb-90f2-46e2-ac77-0831e36e194c", corner1: "c4", corner2: "c1", thickness: 0.2, type: "STRAIGHT" }
    ],
    rooms: { "c1,c2,c3,c4": { name: "Square Room" } },
    units: "m"
  },
  {
    id: uuidv4(),
    version: "2.0.1a",
    corners: {
      c1: { x: -5.743446472746087, y: 0.1, z: -5.226899548661788, elevation: 3 },
      c2: { x: 4.295937882625246, y: 0.1, z: -5.399604425051771, elevation: 3 },
      c3: { x: 4.295036403645025, y: 0.1, z: 3.480551190336054, elevation: 3 },
      c4: { x: -3.159691468113007, y: 0.1, z: 3.081999292530576, elevation: 3 }
    },
    walls: [
      { id: "bb1ee7cd-9738-4954-acfc-16261277c1ad", corner1: "c1", corner2: "c2", thickness: 0.2, type: "STRAIGHT" },
      { id: "1825b075-5170-48c2-beec-7da379568f3c", corner1: "c2", corner2: "c3", thickness: 0.2, type: "STRAIGHT" },
      { id: "6b6fd058-e464-4885-ade4-7ac9fcc1eb54", corner1: "c3", corner2: "c4", thickness: 0.2, type: "STRAIGHT" },
      { id: "ee3e48cb-90f2-46e2-ac77-0831e36e194c", corner1: "c4", corner2: "c1", thickness: 0.2, type: "STRAIGHT" }
    ],
    rooms: { "c1,c2,c3,c4": { name: "Square Room" } },
    units: "m"
  },
  {
    id: uuidv4(),
    version: "2.0.1a",
    corners: {
      c1: { x: -3.0, y: 0.1, z: -3.5, elevation: 3 },
      c2: { x: 4.0, y: 0.1, z: -3.5, elevation: 3 },
      c3: { x: 4.0, y: 0.1, z: 3.5, elevation: 3 },
      c4: { x: -3.0, y: 0.1, z: 3.5, elevation: 3 }
    },
    walls: [
      { id: "wall1", corner1: "c1", corner2: "c2", thickness: 0.2, type: "STRAIGHT" },
      { id: "wall2", corner1: "c2", corner2: "c3", thickness: 0.2, type: "STRAIGHT" },
      { id: "wall3", corner1: "c3", corner2: "c4", thickness: 0.2, type: "STRAIGHT" },
      { id: "wall4", corner1: "c4", corner2: "c1", thickness: 0.2, type: "STRAIGHT" }
    ],
    rooms: { "c1,c2,c3,c4": { name: "Rectangular Room" } },
    units: "m"
  },
  {
    id: uuidv4(),
    version: "2.0.1a",
    corners: {
      c1: { x: -4.0, y: 0.1, z: -4.0, elevation: 3 },
      c2: { x: 4.0, y: 0.1, z: -4.0, elevation: 3 },
      c3: { x: 4.0, y: 0.1, z: 4.0, elevation: 3 },
      c4: { x: -4.0, y: 0.1, z: 4.0, elevation: 3 }
    },
    walls: [
      { id: "wall1", corner1: "c1", corner2: "c2", thickness: 0.2, type: "STRAIGHT" },
      { id: "wall2", corner1: "c2", corner2: "c3", thickness: 0.2, type: "STRAIGHT" },
      { id: "wall3", corner1: "c3", corner2: "c4", thickness: 0.2, type: "STRAIGHT" },
      { id: "wall4", corner1: "c4", corner2: "c1", thickness: 0.2, type: "STRAIGHT" }
    ],
    rooms: { "c1,c2,c3,c4": { name: "Square Room" } },
    units: "m"
  },
  {
    id: uuidv4(),
    version: "2.0.1a",
    corners: {
      c1: { x: -5.0, y: 0.1, z: -3.0, elevation: 3 },
      c2: { x: 5.0, y: 0.1, z: -3.0, elevation: 3 },
      c3: { x: 5.0, y: 0.1, z: 3.0, elevation: 3 },
      c4: { x: -5.0, y: 0.1, z: 3.0, elevation: 3 }
    },
    walls: [
      { id: "wall1", corner1: "c1", corner2: "c2", thickness: 0.2, type: "STRAIGHT" },
      { id: "wall2", corner1: "c2", corner2: "c3", thickness: 0.2, type: "STRAIGHT" },
      { id: "wall3", corner1: "c3", corner2: "c4", thickness: 0.2, type: "STRAIGHT" },
      { id: "wall4", corner1: "c4", corner2: "c1", thickness: 0.2, type: "STRAIGHT" }
    ],
    rooms: { "c1,c2,c3,c4": { name: "Rectangular Room" } },
    units: "m"
  }
];




export const ralColors = [
  { code: "RAL 9005", name: "Jet Black" },
  { code: "RAL 9010", name: "Pure White" },
  { code: "RAL 7016", name: "Anthracite Grey" },
];


export const generateUniqueProjectNumber = () => {
  const uuid = uuidv4();
  const yearPrefix = '2025';
  const uniquePart = parseInt(uuid.split('-')[0].slice(0, 4), 16); // Get numeric part by converting to base 16 (hexadecimal)
  return `${yearPrefix}${uniquePart}`;
};



 












