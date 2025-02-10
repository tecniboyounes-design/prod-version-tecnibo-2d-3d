"use client"
import { v4 as uuidv4 } from 'uuid';
import { useDispatch, useSelector } from 'react-redux';
import {
  createPoint,
  createWall,
  updateCorner,
  setIsDrawing,
  createRoom,
  updateWallWithNewCorner,
  removePoint,
  setCurrentConfig,
} from '../store.js';
import { useState, useEffect } from 'react';

const TOLERANCE = 0.3; 

const arePointsNear = (p1, p2) => (
  Math.abs(p1.x - p2.x) <= TOLERANCE &&
  Math.abs(p1.z - p2.z) <= TOLERANCE
);

const arePointsExact = (p1, p2) => (
  p1.x === p2.x && p1.z === p2.z
);


const useDrawWall = () => {
  const isDrawMode = useSelector((state) => state.jsonData.isDrawing);
  const dispatch = useDispatch();

  const [currentRealPointId, setCurrentRealPointId] = useState(null);
  const [currentVirtualPointId, setCurrentVirtualPointId] = useState(null);
  const [pointsList, setPointsList] = useState([]);

  const addVirtualPoint = (x, z) => {
    
    const virtualPointId = uuidv4();
    const virtualPoint = {
      id: virtualPointId,
      position: { x, y: 0.1, z },
      elevation: 3,
      connectedWalls: [],
    };
    // console.log("Creating virtual point:", virtualPoint);
    dispatch(createPoint(virtualPoint));
    return virtualPointId;
  };

  const finalizeRoom = (x, z) => {
    // console.log("Finalizing virtual point", x , z )
    const pointIds = pointsList.map((point) => point.id); // Declare pointIds only once here
    const roomName = `Room ${pointIds.length}`; // Corrected room name template
    const firstPoint = pointsList[0];

    // console.log("Finalizing room with points:", pointsList);

    dispatch(updateWallWithNewCorner({ 
      virtualPoint: { id: currentVirtualPointId, position: { x, z } }, 
      realPoint: firstPoint 
    }));

    dispatch(removePoint({ id: currentVirtualPointId }));
    dispatch(createRoom({ pointIds, name: roomName }));

    // Reset drawing state
    resetDrawing();
  };

  const resetDrawing = () => {
    // console.log("Resetting drawing state.");
    setCurrentRealPointId(null);
    setCurrentVirtualPointId(null);
    setPointsList([]);
  };

  const handleGridClick = (e) => {
    // dispatch(setCurrentConfig('room'));
    if (!isDrawMode) return;

    const [x, , z] = e.point;
    // console.log("Grid clicked at:", { x, z });

    if (!currentRealPointId) {
      // First point logic
      const realPointId = uuidv4();
      const virtualPointId = addVirtualPoint(x, z);

      const realPoint = {
        id: realPointId,
        position: { x, y: 0.1, z },
        elevation: 3,
        connectedWalls: [],
      };

      // console.log("Creating real point:", realPoint);

      dispatch(createPoint(realPoint));
      dispatch(createWall({ corner1: realPointId, corner2: virtualPointId }));

      setCurrentRealPointId(realPointId);
      setCurrentVirtualPointId(virtualPointId);
      setPointsList([{ id: realPointId, position: { x, z } }]);
    } else {
      // Subsequent points logic
      const firstPoint = pointsList[0].position;

      if (arePointsExact(firstPoint, { x, z }) || arePointsNear(firstPoint, { x, z })) {
        // Close the room if clicking the first point
        finalizeRoom(firstPoint.x, firstPoint.z);
      } else {
        // Add a new virtual point and connect it
        const virtualPointId = addVirtualPoint(x, z);
        dispatch(createWall({ corner1: currentVirtualPointId, corner2: virtualPointId }));

        // console.log("Connecting points: ", currentVirtualPointId, " -> ", virtualPointId);

        setCurrentRealPointId(currentVirtualPointId);
        setCurrentVirtualPointId(virtualPointId);
        setPointsList((prevPoints) => [
          ...prevPoints,
          { id: virtualPointId, position: { x, z } },
        ]);
      }
    }

    // console.log("Current points list:", pointsList);
  };

  const handlePointerMove = (e) => {
    if (!currentVirtualPointId || !isDrawMode) return;
    const [x, , z] = e.point;
    // console.log("Pointer moved to:", { x, z });
    dispatch(updateCorner({ id: currentVirtualPointId, position: { x, z } }));
  };

  const handleEscKeyPress = (e) => {
    if (e.key === 'Escape') {
      // console.log("Escape key pressed. Exiting draw mode.");
      dispatch(setIsDrawing(false));
      resetDrawing();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleEscKeyPress);
    return () => window.removeEventListener('keydown', handleEscKeyPress);
  }, []);

  useEffect(() => {
    if (!isDrawMode) resetDrawing();
  }, [isDrawMode]);

  return { handleGridClick, handlePointerMove };
};

export default useDrawWall;
