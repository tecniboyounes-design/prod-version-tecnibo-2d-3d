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
    status: "temp",
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
    status: "temp",
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


export const formatDate = (dateString, formatType) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  if (formatType === 'short') {
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(',', '');
  }

  if (formatType === 'long') {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour12: false,
    }).replace(',', ''); // This will give you 'October 3, 2025'
  }

  // Default long format if no formatType is provided
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};





// Function to convert corners object to an array
export const cornersToArray = (corners) => {
  return Object.entries(corners).map(([key, value]) => ({
    id: key,
    ...value,
  }));
};


// Function to convert an array back to corners object
export const arrayToCorners = (array) => {
  return array.reduce((acc, { id, ...values }) => {
    acc[id] = values;
    return acc;
  }, {});
};



// target object : {
//   "UN_DE_HGW_MDFBL_0L100_SA1_18:3:2.5": {
//     "material": "Decorative 0L100 SA1 sur MDF black WR",
//     "width": 3,
//     "height": 2.5,
//     "area": 7.5,
//     "pricePerUnit": 1,
//     "totalPrice": 7.5,
//     "unitOfMeasure": "M2"
//   }
// } 


[

  {
    "lines": [
      {
        "id": "line-1738841848668-0",
        "startPointId": "point-1738841848668-0",
        "endPointId": "point-1738841848668-1",
        "length": 12.54,
        "rotation": 3.141592653589793,
        "thickness": 0.012,
        "color": "#f5f5f5",
        "texture": "default.avif",
        "height": 4,
        "angles": [
          {
            "internalAngle": 1.5707963267948966,
            "externalAngle": 4.71238898038469,
            "internalAngleDeg": 90,
            "externalAngleDeg": 270,
            "connectedLineId": "line-1738841848668-3",
            "pointId": "point-1738841848668-0",
            "startAngle": 0,
            "direction": 1
          }
        ]
      },
      {
        "id": "line-1738841848668-1",
        "startPointId": "point-1738841848668-1",
        "endPointId": "point-1738841848668-2",
        "length": 9.11,
        "rotation": -1.5707963267948966,
        "thickness": 0.012,
        "color": "#f5f5f5",
        "texture": "default.avif",
        "height": 4,
        "angles": [
          {
            "internalAngle": 1.5707963267948966,
            "externalAngle": 4.71238898038469,
            "internalAngleDeg": 90,
            "externalAngleDeg": 270,
            "connectedLineId": "line-1738841848668-2",
            "pointId": "point-1738841848668-2",
            "startAngle": -1.5707963267948966,
            "direction": -1
          }
        ]
      },
      {
        "id": "line-1738841848668-2",
        "startPointId": "point-1738841848668-2",
        "endPointId": "point-1738841848668-3",
        "length": 12.54,
        "rotation": 0,
        "thickness": 0.012,
        "color": "#f5f5f5",
        "texture": "default.avif",
        "height": 4,
        "angles": [
          {
            "internalAngle": 1.5707963267948966,
            "externalAngle": 4.71238898038469,
            "internalAngleDeg": 90,
            "externalAngleDeg": 270,
            "connectedLineId": "line-1738841848668-1",
            "pointId": "point-1738841848668-2",
            "startAngle": -1.5707963267948966,
            "direction": -1
          }
        ]
      },
      {
        "id": "line-1738841848668-3",
        "startPointId": "point-1738841848668-3",
        "endPointId": "point-1738841848668-0",
        "length": 9.11,
        "rotation": 1.5707963267948966,
        "thickness": 0.012,
        "color": "#f5f5f5",
        "texture": "default.avif",
        "height": 4,
        "angles": [
          {
            "internalAngle": 1.5707963267948966,
            "externalAngle": 4.71238898038469,
            "internalAngleDeg": 90,
            "externalAngleDeg": 270,
            "connectedLineId": "line-1738841848668-0",
            "pointId": "point-1738841848668-0",
            "startAngle": 0,
            "direction": 1
          }
        ]
      },
      {
        "id": "cloison-1740739964866",
        "startPointId": "point-1740739964867",
        "endPointId": "point-1740739964868",
        "length": 5.18,
        "rotation": -1.5707963267948968,
        "thickness": 0.01,
        "color": {
          "code": "RAL 1013",
          "finish": "Mat"
        },
        "texture": "default.avif",
        "height": 3.2,
        "name": "T100",
        "image": "P_T100_START_LEF.png",
        "quantity": 1,
        "estimate": false,
        "acoustic_performance": "Rw = 45 dB",
        "ceiling_type": "Gyproc ceiling",
        "floor_type": "Raised floor (plancher)",
        "links": {
          "top": "Coated steel profile U",
          "left": "Wall or Gyproc (Coated steel profile)",
          "right": "Wall or Gyproc (Coated steel profile)"
        },
        "dimensions": {
          "height": 3.2,
          "width": 5.18,
          "thickness": 0.1
        },
        "material": {
          "producer": "Unilin",
          "category": "DE",
          "group": "Uni",
          "substrate": "MDFGR 18.0 mm",
          "substrateProperty": "Water-resistant",
          "decor": "UN_0L103_SM1",
          "profile": "UN_DE_HGW_MDFGR_0L103_SM1_18",
          "preGluedProfile": "Unilim Evola 025 CST 0.3mm préencollé",
          "differentSides": false
        }
      },
      {
        "id": "cloison-1740739990795",
        "startPointId": "point-1740739990796",
        "endPointId": "point-1740739990797",
        "length": 3.17,
        "rotation": 1.5707963267948966,
        "thickness": 0.01,
        "color": {
          "0": "R",
          "1": "A",
          "2": "L",
          "3": " ",
          "4": "3",
          "5": "0",
          "6": "1",
          "7": "1",
          "code": "RAL 3009",
          "finish": "Mat"
        },
        "texture": "default.avif",
        "height": 3.2,
        "name": "T100",
        "image": "P_T100_START_LEF.png",
        "quantity": 1,
        "estimate": false,
        "acoustic_performance": "Rw = 45 dB",
        "ceiling_type": "Gyproc ceiling",
        "floor_type": "Raised floor (plancher)",
        "links": {
          "top": "Coated steel profile U",
          "left": "Wall or Gyproc (Coated steel profile)",
          "right": "Wall or Gyproc (Coated steel profile)"
        },
        "dimensions": {
          "height": 3.2,
          "width": 3.17,
          "thickness": 0.1
        },
        "material": {
          "producer": "Unilin",
          "category": "Evola",
          "group": "Uni",
          "substrate": "Particle Board 18.0 mm",
          "substrateProperty": "Water-resistant",
          "decor": "UN_00025_CST",
          "profile": "Unilim Evola 025 CST 0.3mm",
          "preGluedProfile": "Unilim Evola 025 CST 0.3mm préencollé",
          "differentSides": false
        }
      },
      {
        "id": "cloison-1740740025570",
        "startPointId": "point-1740740025571",
        "endPointId": "point-1740740025572",
        "length": 6.13,
        "rotation": -1.4489044367049354e-16,
        "thickness": 0.01,
        "color": {
          "code": "RAL 1013",
          "finish": "Mat"
        },
        "texture": "default.avif",
        "height": 2.7,
        "name": "T100-Left",
        "image": "P_T100_START_LEF_HAAS_RIG.png",
        "quantity": 1,
        "estimate": false,
        "acoustic_performance": "Rw = 45 dB",
        "ceiling_type": "Gyproc ceiling",
        "floor_type": "Raised floor (plancher)",
        "links": {
          "top": "Coated steel profile U",
          "left": "Wall or Gyproc (Coated steel profile)",
          "right": "Wall or Gyproc (Coated steel profile)"
        },
        "dimensions": {
          "height": 2.7,
          "width": 6.13,
          "thickness": 0.1
        },
        "material": {
          "producer": "Unilin",
          "category": "Evola",
          "group": "Uni",
          "substrate": "Particle Board 18.0 mm",
          "substrateProperty": "Water-resistant",
          "decor": "UN_00025_CST",
          "profile": "Unilim Evola 025 CST 0.3mm",
          "preGluedProfile": "Unilim Evola 025 CST 0.3mm préencollé",
          "differentSides": false
        }
      },
      {
        "id": "cloison-1740745325673",
        "startPointId": "point-1740745325674",
        "endPointId": "point-1740745325675",
        "length": 4.46,
        "rotation": 3.141592653589793,
        "thickness": 0.01,
        "color": {
          "code": "RAL 1013",
          "finish": "Mat"
        },
        "texture": "default.avif",
        "height": 2.7,
        "name": "T100-Left",
        "image": "P_T100_START_LEF_HAAS_RIG.png",
        "quantity": 1,
        "estimate": false,
        "acoustic_performance": "Rw = 45 dB",
        "ceiling_type": "Gyproc ceiling",
        "floor_type": "Raised floor (plancher)",
        "links": {
          "top": "Coated steel profile U",
          "left": "Wall or Gyproc (Coated steel profile)",
          "right": "Wall or Gyproc (Coated steel profile)"
        },
        "dimensions": {
          "height": 2.7,
          "width": 4.46,
          "thickness": 0.1
        },
        "material": {
          "producer": "Unilin",
          "category": "DE",
          "group": "Uni",
          "substrate": "MDFBL 18.0 mm",
          "substrateProperty": "Water-resistant",
          "decor": "UN_0L100_HG1",
          "profile": "UN_DE_HGW_MDFBL_0L100_HG1_18",
          "preGluedProfile": "Unilim Evola 025 CST 0.3mm préencollé",
          "differentSides": false
        }
      }
    ],
    "points": [
      {
        "id": "point-1738841848668-0",
        "position": {
          "x": -5.85,
          "y": 0.01,
          "z": -4.245
        },
        "rotation": 0,
        "snapAngle": 0
      },
      {
        "id": "point-1738841848668-1",
        "position": {
          "x": 6.694,
          "y": 0.01,
          "z": -4.245
        },
        "rotation": 0,
        "snapAngle": 0
      },
      {
        "id": "point-1738841848668-2",
        "position": {
          "x": 6.694,
          "y": 0.01,
          "z": 4.862
        },
        "rotation": 0,
        "snapAngle": 0
      },
      {
        "id": "point-1738841848668-3",
        "position": {
          "x": -5.85,
          "y": 0.01,
          "z": 4.862
        },
        "rotation": 0,
        "snapAngle": 0
      },
      {
        "id": "point-1740739964867",
        "position": {
          "x": 1.5529999999999997,
          "y": 0.01,
          "z": -4.244
        },
        "rotation": 0,
        "snapAngle": 0
      },
      {
        "id": "point-1740739964868",
        "position": {
          "x": 1.5530000000000002,
          "y": 0.01,
          "z": 0.9359999999999999
        },
        "rotation": 0,
        "snapAngle": 0
      },
      {
        "id": "point-1740739990796",
        "position": {
          "x": -2.799,
          "y": 0.01,
          "z": 4.859500000000001
        },
        "rotation": 0,
        "snapAngle": 0
      },
      {
        "id": "point-1740739990797",
        "position": {
          "x": -2.799,
          "y": 0.01,
          "z": 1.6895000000000002
        },
        "rotation": 0,
        "snapAngle": 0
      },
      {
        "id": "point-1740740025571",
        "position": {
          "x": 6.6915,
          "y": 0.01,
          "z": 2.3749999999999996
        },
        "rotation": 0,
        "snapAngle": 0
      },
      {
        "id": "point-1740740025572",
        "position": {
          "x": 0.5615000000000001,
          "y": 0.01,
          "z": 2.3750000000000004
        },
        "rotation": 0,
        "snapAngle": 0
      },
      {
        "id": "point-1740745325674",
        "position": {
          "x": -1.3904999999999998,
          "y": 0.01,
          "z": -0.7340000000000002
        },
        "rotation": 0,
        "snapAngle": 0
      },
      {
        "id": "point-1740745325675",
        "position": {
          "x": -5.8505,
          "y": 0.01,
          "z": -0.7339999999999998
        },
        "rotation": 0,
        "snapAngle": 0
      }
    ],
    "doors": [
      {
        "id": "window-1738841866599",
        "position": {
          "x": 3.383,
          "y": 0,
          "z": -4.245
        },
        "rotation": 0,
        "article_id": "window-1",
        "name": "Standard Window",
        "image": "/src/assets/window.png",
        "width": 1.2,
        "height": 2.6,
        "wallId": "line-1738841848668-0",
        "referencePointId": "point-1738841848668-1",
        "referenceDistance": 3.3108564095498187
      },
      {
        "id": "window-1738841870976",
        "position": {
          "x": -1.192,
          "y": 0,
          "z": -4.245
        },
        "rotation": 0,
        "article_id": "window-1",
        "name": "Standard Window",
        "image": "/src/assets/window.png",
        "width": 1.2,
        "height": 2.6,
        "wallId": "line-1738841848668-0",
        "referencePointId": "point-1738841848668-0",
        "referenceDistance": 4.6581525126331496
      },
      {
        "id": "window-1738841875304",
        "position": {
          "x": 6.694,
          "y": 0,
          "z": -1.301
        },
        "rotation": 1.5707963267948966,
        "article_id": "window-1",
        "name": "Standard Window",
        "image": "/src/assets/window.png",
        "width": 1.2,
        "height": 2.6,
        "wallId": "line-1738841848668-1",
        "referencePointId": "point-1738841848668-1",
        "referenceDistance": 2.944
      },
      {
        "id": "cloison-1739790738167",
        "position": {
          "x": 1.437,
          "y": 0,
          "z": 0.44799999999999995
        },
        "rotation": 0,
        "article_id": "cloison-1",
        "name": "T100-Left",
        "dimension": {
          "height": {
            "min": 0.2,
            "max": 3.1
          },
          "width": {
            "min": 0.1,
            "max": 1.2
          }
        },
        "lines": {
          "id": "cloison-1739790738167",
          "startPointId": "point-1739790738168",
          "endPointId": "point-1739790738169",
          "length": 1.2,
          "rotation": 0,
          "thickness": 0.01,
          "color": "#f5f5f5",
          "texture": "default.avif",
          "height": 3.2
        },
        "points": [
          {
            "id": "point-1739790738168",
            "position": {
              "x": 0.837,
              "y": 0.01,
              "z": 0.448
            },
            "rotation": 0,
            "snapAngle": 0
          },
          {
            "id": "point-1739790738169",
            "position": {
              "x": 2.037,
              "y": 0.01,
              "z": 0.448
            },
            "rotation": 0,
            "snapAngle": 0
          }
        ]
      },
      {
        "id": "cloison-1739790779751",
        "position": {
          "x": -1.815,
          "y": 0,
          "z": 0.9260000000000002
        },
        "rotation": 0,
        "article_id": "cloison-1",
        "name": "T100-Left",
        "dimension": {
          "height": {
            "min": 0.2,
            "max": 3.1
          },
          "width": {
            "min": 0.1,
            "max": 1.2
          }
        },
        "lines": {
          "id": "cloison-1739790779751",
          "startPointId": "point-1739790779752",
          "endPointId": "point-1739790779753",
          "length": 1.2,
          "rotation": 0,
          "thickness": 0.01,
          "color": "#f5f5f5",
          "texture": "default.avif",
          "height": 3.2
        },
        "points": [
          {
            "id": "point-1739790779752",
            "position": {
              "x": -2.415,
              "y": 0.01,
              "z": 0.926
            },
            "rotation": 0,
            "snapAngle": 0
          },
          {
            "id": "point-1739790779753",
            "position": {
              "x": -1.215,
              "y": 0.01,
              "z": 0.926
            },
            "rotation": 0,
            "snapAngle": 0
          }
        ]
      },
      {
        "id": "cloison-1740129868445",
        "lines": {
          "id": "cloison-1740129868445",
          "startPointId": "point-1740129868446",
          "endPointId": "point-1740129868447",
          "length": 1.2,
          "rotation": 0,
          "thickness": 0.01,
          "color": "RAL 1013",
          "texture": "default.avif",
          "height": 2.7,
          "name": "T100-Left"
        },
        "points": [
          {
            "id": "point-1740129868446",
            "position": {
              "x": 24.641,
              "y": 0.01,
              "z": 4.403
            },
            "rotation": 0,
            "snapAngle": 0
          },
          {
            "id": "point-1740129868447",
            "position": {
              "x": 25.841,
              "y": 0.01,
              "z": 4.403
            },
            "rotation": 0,
            "snapAngle": 0
          }
        ]
      },
      {
        "id": "cloison-1740129876085",
        "lines": {
          "id": "cloison-1740129876085",
          "startPointId": "point-1740129876086",
          "endPointId": "point-1740129876087",
          "length": 1.2,
          "rotation": 0,
          "thickness": 0.01,
          "color": "RAL 1013",
          "texture": "default.avif",
          "height": 2.7,
          "name": "T100-Left"
        },
        "points": [
          {
            "id": "point-1740129876086",
            "position": {
              "x": 25.675,
              "y": 0.01,
              "z": 9.968
            },
            "rotation": 0,
            "snapAngle": 0
          },
          {
            "id": "point-1740129876087",
            "position": {
              "x": 26.875,
              "y": 0.01,
              "z": 9.968
            },
            "rotation": 0,
            "snapAngle": 0
          }
        ]
      },
      {
        "id": "cloison-1740739964866",
        "lines": {
          "id": "cloison-1740739964866",
          "startPointId": "point-1740739964867",
          "endPointId": "point-1740739964868",
          "length": 1.2,
          "rotation": 0,
          "thickness": 0.01,
          "color": "RAL 3011",
          "texture": "default.avif",
          "height": 3.2,
          "name": "T100",
          "image": "P_T100_START_LEF.png"
        },
        "points": [
          {
            "id": "point-1740739964867",
            "position": {
              "x": 11.414,
              "y": 0.01,
              "z": -5.416
            },
            "rotation": 0,
            "snapAngle": 0
          },
          {
            "id": "point-1740739964868",
            "position": {
              "x": 12.614,
              "y": 0.01,
              "z": -5.416
            },
            "rotation": 0,
            "snapAngle": 0
          }
        ]
      },
      {
        "id": "cloison-1740739990795",
        "lines": {
          "id": "cloison-1740739990795",
          "startPointId": "point-1740739990796",
          "endPointId": "point-1740739990797",
          "length": 1.2,
          "rotation": 0,
          "thickness": 0.01,
          "color": "RAL 3011",
          "texture": "default.avif",
          "height": 3.2,
          "name": "T100",
          "image": "P_T100_START_LEF.png"
        },
        "points": [
          {
            "id": "point-1740739990796",
            "position": {
              "x": 8.835,
              "y": 0.01,
              "z": 7.615
            },
            "rotation": 0,
            "snapAngle": 0
          },
          {
            "id": "point-1740739990797",
            "position": {
              "x": 10.035,
              "y": 0.01,
              "z": 7.615
            },
            "rotation": 0,
            "snapAngle": 0
          }
        ]
      },
      {
        "id": "cloison-1740740025570",
        "lines": {
          "id": "cloison-1740740025570",
          "startPointId": "point-1740740025571",
          "endPointId": "point-1740740025572",
          "length": 1.2,
          "rotation": 0,
          "thickness": 0.01,
          "color": "RAL 1013",
          "texture": "default.avif",
          "height": 2.7,
          "name": "T100-Left",
          "image": "P_T100_START_LEF_HAAS_RIG.png"
        },
        "points": [
          {
            "id": "point-1740740025571",
            "position": {
              "x": 14.48,
              "y": 0.01,
              "z": 2.528
            },
            "rotation": 0,
            "snapAngle": 0
          },
          {
            "id": "point-1740740025572",
            "position": {
              "x": 15.68,
              "y": 0.01,
              "z": 2.528
            },
            "rotation": 0,
            "snapAngle": 0
          }
        ]
      },
      {
        "id": "cloison-1740745325673",
        "lines": {
          "id": "cloison-1740745325673",
          "startPointId": "point-1740745325674",
          "endPointId": "point-1740745325675",
          "length": 1.2,
          "rotation": 0,
          "thickness": 0.01,
          "color": "RAL 1013",
          "texture": "default.avif",
          "height": 2.7,
          "name": "T100-Left",
          "image": "P_T100_START_LEF_HAAS_RIG.png"
        },
        "points": [
          {
            "id": "point-1740745325674",
            "position": {
              "x": 10.802,
              "y": 0.01,
              "z": 2.311
            },
            "rotation": 0,
            "snapAngle": 0
          },
          {
            "id": "point-1740745325675",
            "position": {
              "x": 12.002,
              "y": 0.01,
              "z": 2.311
            },
            "rotation": 0,
            "snapAngle": 0
          }
        ]
      }
    ],
    "floors": [
      {
        "id": "floor-room1",
        "color": "#fff",
        "texture": "EG_F204.jpg"
      }
    ],
    "version": "1.1",
    "created": "2025-02-28T12:21:51.574Z",
    "lastModified": "2025-03-03T12:23:12.997Z",
    "versionDescription": "Cloned from v1.0"
  }
  
]



const data = {
  state: {
    interventions: [
      {
        id: 1742395859979,
        timestamp: "2025-03-19T14:50:59.979Z",
        action: "Opened project \"T10P10\" version 1.0",
        projectName: "T10P10",
        version: "1.0",
        intervener: {
          id: "1",
          firstName: "Rabie",
          lastName: "ELMA",
          role: "Design Manager"
        },
        metadata: {}
      }
    ],
    isLoading: false
  },
  version: 0
};




