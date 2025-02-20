"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import Walls from '../Walls/Walls';
import {setCurrentConfig, setIs2DView, setIsDrawing, updateCorner } from '../../../store';
import useDrawWall from '../../../HOC/useDrawWall';
import InteractivePointMenu from '../UI/InteractivePointMenu';
import FloorPlane from '../Floor/Floor';
import { FloatingSpeedDial } from '../RoomShape/roomShape';
import GLTFDoor from '../Articles/Articles';


const Points = () => {
  const corners = useSelector((state) => state.jsonData.floorplanner.corners);
  const rooms = useSelector((state) => state.jsonData.floorplanner.rooms);
  const walls = useSelector((state) => state.jsonData.floorplanner.walls);
  const items = useSelector((state) => state.jsonData.items);
  const isDrawMode = useSelector((state) => state.jsonData.isDrawing);
  const is2DView = useSelector((state) => state.jsonData.is2DView);
  const [draggedPoint, setDraggedPoint] = useState(false);
  const [activePoint, setActivePoint] = useState(false);
  const dispatch = useDispatch();
  const groupRef = useRef();
  const { handleGridClick , handlePointerMove } = useDrawWall();
  const { gridSize, gridColor, axesHelperVisible, gridHelperVisible, pointColor, draggingColor, divisions } = useSelector((state) => state.jsonData.settings);



const positions = useMemo(
    () =>
      Object.keys(corners).reduce((acc, id) => {
        acc[id] = [corners[id].x, 0.1, corners[id].z];
        return acc;
      }, {}),
    [corners]
);





useEffect(() => {
  console.log('Draw mode changed:', isDrawMode); 

  if (isDrawMode) {
    console.log('Entering drawing mode, setting custom cursor'); 
    document.body.style.cursor = 'crosshair';
  } else {
    console.log('Exiting drawing mode, resetting to default cursor'); 
    document.body.style.cursor = 'auto';
  }
}, [isDrawMode]);

  



const handleDragStart = (id) => setDraggedPoint(id);





const handleDrag = (e) => {
  if (!draggedPoint || !is2DView) return;

  const [x, , z] = e.point.toArray();

  dispatch(updateCorner({ id: draggedPoint, position: { x, z } }));

  // Loop through all corners in the global state and check if any match the dragged point
  Object.keys(corners).forEach((cornerId) => {
    const corner = corners[cornerId];

    // Compare x and z coordinates
    if (corner.x === x && corner.z === z) {
      console.log(`Match found for point (${x}, ${z}) at corner ID: ${cornerId}`);
      
      // Action 1: Remove the existing point (corner) if close
      // You might remove or flag the old corner as obsolete
      // dispatch(removeCorner(cornerId));  // You need to handle this action in your reducer
      
      // Action 2: Update walls that are connected to this matched corner
      // Find walls that reference the old corner and replace it with the dragged point
      // dispatch(updateWallWithNewCorner(cornerId, draggedPoint));  // Implement this in your reducer to update walls
      
      // Action 3: Disconnect and remove from other walls connected to the old corner
      // You need to update the wall connections to ensure the dragged point is correctly assigned
      // dispatch(removeCornerFromWalls(cornerId));  // Disconnect the matched corner from any walls
      
      // Action 4: Add the new corner position to the walls connected to it
      // You need to update the walls to reference the new dragged corner
      // dispatch(addCornerToWalls(draggedPoint, [/* walls that are connected to this point */])); 

      // Action 5: If the new corner position is already the same as the matched position, do nothing
      // Compare the x and z with some tolerance range to ensure it's not exactly the same point
      // if (Math.abs(corner.x - x) < 0.01 && Math.abs(corner.z - z) < 0.01) return; 

      // Action 6: Add a new corner to the global state with the new position
      // dispatch(addCorner({ id: `new-${cornerId}`, position: { x, z } }));  // Implement this in your reducer to add new corners
    }
  });
};




const CameraController2D = () => {
  const { camera, gl } = useThree();
  const is2DView = useSelector((state) => state.jsonData.is2DView);
  const orbitRef = useRef();

  useEffect(() => {
    if (!orbitRef.current || !is2DView) return;

    orbitRef.current.minPolarAngle = 0;
    orbitRef.current.maxPolarAngle = 0;
    orbitRef.current.enableRotate = false;
    camera.position.set(0, 20, 0); // 2D Top-Down View
    camera.lookAt(0, 0, 0);
  }, [camera, is2DView]);

  return is2DView ? (
    <OrbitControls ref={orbitRef} args={[camera, gl.domElement]} enableDamping dampingFactor={0.1} />
  ) : null;
};







const handleDoubleClick = (e) => {
  // console.log('handleDoubleClick', e);
  // console.log('group:', groupRef)
}


const handleEmptySpaceClick = (e) => { 
  // console.log('handleEmptySpaceClick', e)
    const roomConfig = {
        type: 'room',
        id: 'room-1',
      };
      dispatch(setCurrentConfig(roomConfig));
}


const isPerfOpen = true;




  return (
    <>

    <Canvas 
  shadows
  onPointerMissed={handleEmptySpaceClick}
  gl={{ antialias: true }}
  camera={{ position: [10, 10, 10], fov: 45 }}     
  >


  {/* {isPerfOpen && <Perf position="bottom-right" /> } */}
  
  
  <GLTFDoor /> 

 {is2DView ? <CameraController2D /> : 
 <> 
 <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={500}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-10}
      />
      <OrbitControls 
      minDistance={0}
      maxDistance={400}
      enableZoom
      enablePan
      enableRotate
           />
    </>

}
  {/* <Lights /> */}

      
        <group ref={groupRef}>
          <Walls isDrawMode={isDrawMode || is2DView}/>
          <FloorPlane corners={corners} rooms={rooms} walls={walls} wallHeight={4} />
           
          {/* Interactive grid */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={(e) => handleGridClick(e)}
            onPointerMove={(e) => { 
              if (isDrawMode) { handlePointerMove(e) } else { handleDrag(e) } 
            }}
            onDoubleClick={handleDoubleClick}
          >
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="transparent" transparent opacity={0.01} />
          </mesh>

          {/* Points */}
          {Object.keys(positions).map((id) => (

            <mesh
              key={id}
              position={positions[id]}
              onPointerDown={() => handleDragStart(id)}
              onPointerUp={() => setDraggedPoint(null)}
              onPointerOver={() => setActivePoint(id)}
              onPointerOut={() => setActivePoint(null)}
              scale={activePoint === id ? [1.6, 1.6, 1.6] : [1.3, 1.3, 1.3]}
            >
              {is2DView ? (
                <sphereGeometry args={[0.1, 16, 16]} />
              ) : (
                <>
                </>
                // <boxGeometry args={[0.3, 3, 0.3]} /> 
                )}
              <meshStandardMaterial
                color={
                  activePoint === id
                    ? "black"
                    : draggedPoint === id
                    ? draggingColor
                    : pointColor
                }
              />

{activePoint === id &&  is2DView &&  (
  <InteractivePointMenu
    point={positions[id]}
    isActive={true}
    OPTIONS={[
      { id: 'resize', label: 'Resize', icon: null, position: [1, 0, 0] },
      { id: 'delete', label: `${id}`, icon: null, position: [-1, 0, 0] },
    ]}
    handleOptionSelect={(e, id) => {
      console.log(`Option ${id} selected for point`);
    }}
  />
)}

            </mesh>
          ))}

        
        </group>
  
  

  {/* Fixed grid and axes helpers outside the group */}
  {gridHelperVisible && <gridHelper args={[gridSize, divisions, gridColor, gridColor]} />}
  {axesHelperVisible && <axesHelper args={[gridSize]} />}
  
  {/* Lighting */}
  <ambientLight intensity={0.5} />
  <directionalLight position={[5, 5, 5]} intensity={1} />
</Canvas>


</>


  );


};


export default Points;
