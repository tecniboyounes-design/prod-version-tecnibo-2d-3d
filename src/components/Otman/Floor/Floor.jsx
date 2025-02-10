import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Shape, DoubleSide, TextureLoader, BackSide, FrontSide, RepeatWrapping } from "three";
import { useLoader } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { setCurrentConfig } from "../../../store";
import { useDispatch } from "react-redux";


function calculateCentroid(roomCornerIds, corners) {
  let sumX = 0, sumZ = 0;
  roomCornerIds.forEach((id) => {
    const { x, z } = corners[id];
    sumX += x;
    sumZ += z;
  });
  return { x: sumX / roomCornerIds.length, z: sumZ / roomCornerIds.length };
}


function generateFloorShape(roomCornerIds, corners, walls) {
  const shape = new Shape();
  if (roomCornerIds.length < 3) return null; 

  roomCornerIds.forEach((id, index) => {
    const corner = corners[id];
    if (!corner || isNaN(corner.x) || isNaN(corner.z)) {
      console.error(`Invalid corner for ID '${id}':`, corner);
      return; // Skip this id if not found or invalid
    }
    // const y =
    const { x, z } = corner;
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });

  shape.closePath();

  // Ensure there are no invalid positions before continuing with wall generation
  walls.forEach(({ corner1, corner2, thickness, angle }) => {
    const corner1Data = corners[corner1];
    const corner2Data = corners[corner2];
    if (!corner1Data || !corner2Data) {
      console.error(`Invalid corners in wall: ${corner1}, ${corner2}`);
      return;
    }
  
    const { x: x1, z: z1 } = corner1Data;
    const { x: x2, z: z2 } = corner2Data;
  
    if (isNaN(x1) || isNaN(z1) || isNaN(x2) || isNaN(z2)) {
      console.error(`Invalid wall positions: ${corner1} -> ${corner2}`);
      return;
    }
  
    const x = (x1 + x2) / 2;
    const z = (z1 + z2) / 2;
  
    const floorY = 0.1; 
    const ceilingY = 4;  
    const wallHeight = ceilingY - floorY;  
    const wallY = (floorY + ceilingY) / 2;
  
    const halfWidth = Math.hypot(x2 - x1, z2 - z1) / 2;
    const halfThickness = thickness / 2;
    const dx = Math.cos(angle) * halfWidth;
    const dz = Math.sin(angle) * halfWidth;
    const tx = Math.cos(angle + Math.PI / 2) * halfThickness;
    const tz = Math.sin(angle + Math.PI / 2) * halfThickness;
  
    const wallShape = new Shape();
    wallShape.moveTo(x - dx - tx, z - dz - tz);
    wallShape.lineTo(x + dx - tx, z + dz - tz);
    wallShape.lineTo(x + dx + tx, z + dz + tz);
    wallShape.lineTo(x - dx + tx, z - dz + tz);
    wallShape.closePath();
  
    shape.holes.push(wallShape);
  });
  

  return shape;
}





export default function RoomsPlanes({ corners, rooms, walls }) {
  const dispatch = useDispatch();
 
  // Load textures
  const   ceilingTexture = useLoader(TextureLoader, "/models/textures/Wood049_1K-JPG_Color.jpg");
  const floorTexture = useLoader(TextureLoader, "/models/textures/laminate_floor_03_disp_4k.png");

  // Configure texture repetition
  floorTexture.wrapS = floorTexture.wrapT = RepeatWrapping;
  floorTexture.repeat.set(4, 4);

  ceilingTexture.wrapS = ceilingTexture.wrapT = RepeatWrapping;
  ceilingTexture.repeat.set(2, 2);

  const roomData = useMemo(() => {
    return Object.keys(rooms).map((roomId) => {
      const roomCornerIds = roomId.split(",");

      // Generate floor shape for each room
      const shape = generateFloorShape(roomCornerIds, corners, walls);

      // Calculate room centroid
      const centroid = calculateCentroid(roomCornerIds, corners);

      return { shape, name: rooms[roomId].name, id: roomId, centroid };
    });
  }, [corners, rooms, walls]);

  const handleClickPlafond = () => {
    dispatch(setCurrentConfig({ type: "plafond", id: "" }));
  };

  const handleClickFloor = () => {
    dispatch(setCurrentConfig({ type: "floor", id: "" }));
  };

  return (
    <>
      {roomData.map(({ id, shape, name, centroid }) => (
        <React.Fragment key={id}>
          
          {/* 🔵 Plafond (Ceiling) */}
          <mesh 
          rotation={[Math.PI / 2, 0, 0]} 
          position-y={[3.1]}
          onClick={handleClickPlafond}
          receiveShadow
          >
            <shapeGeometry args={[shape]} /> 
            <meshStandardMaterial map={ceilingTexture} side={FrontSide} />
          </mesh>

          {/* 🟤 Floor */}
          <mesh 
          rotation={[Math.PI / 2, 0, 0]} 
          onClick={handleClickFloor}
          position-y={[0.1]}
          receiveShadow
          >
            <shapeGeometry args={[shape]} />
            <meshStandardMaterial map={floorTexture} side={BackSide} />
          </mesh>

          {/* 🏷️ Room Name Label */}
          <Text
            position={[centroid.x, 0.1, centroid.z]}
            fontSize={0.5}
            color="white"
            anchorX="center"
            anchorY="middle"
            rotation={[-Math.PI / 2, 0, 0]}
            onDoubleClick={() => console.log(`Room ID: ${id}`)}
          >
            {name}
          </Text>
        </React.Fragment>
      ))}
    </>
  );
}





RoomsPlanes.propTypes = {
  corners: PropTypes.object.isRequired,
  rooms: PropTypes.object.isRequired,
  walls: PropTypes.array.isRequired,
};

