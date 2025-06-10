// useDrawWall.js
"use client";
import { v4 as uuidv4 } from "uuid";
import { useDispatch, useSelector } from "react-redux";
import {
  createPoint,
  createWall,
  updateCorner,
  setIsDrawing,
  createRoom,
  updateWallWithNewCorner,
  removePoint,
  setCurrentConfig,
} from "../store.js";
import { useState, useEffect } from "react";
import { calculateWallPrice } from "@/actions/calculateWallPrice"; 

const TOLERANCE = 0.5;

const arePointsNear = (p1, p2) => (
  Math.abs(p1.x - p2.x) <= TOLERANCE && Math.abs(p1.z - p2.z) <= TOLERANCE
);


const arePointsExact = (p1, p2) => p1.x === p2.x && p1.z === p2.z;

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
    dispatch(createPoint(virtualPoint));
    return virtualPointId;
  };

  const finalizeRoom = (x, z) => {
    const pointIds = pointsList.map((point) => point.id);
    const roomName = `Room ${pointIds.length}`;
    const firstPoint = pointsList[0];

    dispatch(
      updateWallWithNewCorner({
        virtualPoint: { id: currentVirtualPointId, position: { x, z } },
        realPoint: firstPoint,
      })
    );
    dispatch(removePoint({ id: currentVirtualPointId }));
    dispatch(createRoom({ pointIds, name: roomName }));
    resetDrawing();
  };

  const resetDrawing = () => {
    setCurrentRealPointId(null);
    setCurrentVirtualPointId(null);
    setPointsList([]);
  };

  const handleGridClick = async (e) => {
    if (!isDrawMode) return;

    const [x, , z] = e.point;

    if (!currentRealPointId) {
      const realPointId = uuidv4();
      const virtualPointId = addVirtualPoint(x, z);

      const realPoint = {
        id: realPointId,
        position: { x, y: 0.1, z },
        elevation: 3,
        connectedWalls: [],
      };

      dispatch(createPoint(realPoint));
      const wallId = uuidv4();
      dispatch(
        createWall({
          corner1: realPointId,
          corner2: virtualPointId,
          id: wallId,
          name: "T100", 
          height: 3,
          material: { 
            id: 15912, 

          },
          length: 0, 
        })
      );
      
      // Initial wall creation doesn’t need price yet (length = 0)
      setCurrentRealPointId(realPointId);
      setCurrentVirtualPointId(virtualPointId);
      setPointsList([{ id: realPointId, position: { x, z } }]);

    } else {
      const firstPoint = pointsList[0].position;
       
      if (arePointsExact(firstPoint, { x, z }) || arePointsNear(firstPoint, { x, z })) {
        finalizeRoom(firstPoint.x, firstPoint.z);
      } else {
        const virtualPointId = addVirtualPoint(x, z);
        const wallId = uuidv4();

        // Calculate length between currentRealPointId and new point
        const prevPoint = pointsList[pointsList.length - 1].position;
        const length = Math.sqrt((x - prevPoint.x) ** 2 + (z - prevPoint.z) ** 2);
      
        const wallData = {
          id: wallId,
          corner1: currentVirtualPointId,
          corner2: virtualPointId,
          name: "T100", // Default type
          material: { id: 15912 }, // Example material ID
          length,
          height: 3, // Default height
        }; 
    
        dispatch(createWall(wallData));

        // Calculate price after wall creation
        try {
          const price = await calculateWallPrice(wallData);
          console.log("Calculated wall price:", price);
        } catch (error) {
          console.error("Error calculating wall price:", error);
        }

        setCurrentRealPointId(currentVirtualPointId);
        setCurrentVirtualPointId(virtualPointId);
        setPointsList((prevPoints) => [
          ...prevPoints,
          { id: virtualPointId, position: { x, z } },
        ]);
      }
    }
  };

  const handlePointerMove = (e) => {
    if (!currentVirtualPointId || !isDrawMode) return;
    const [x, , z] = e.point;
    dispatch(updateCorner({ id: currentVirtualPointId, position: { x, z } }));
  };

  const handleEscKeyPress = (e) => {
    if (e.key === "Escape") {
      dispatch(setIsDrawing(false));
      resetDrawing();
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleEscKeyPress);
    return () => window.removeEventListener("keydown", handleEscKeyPress);
  }, []);

  useEffect(() => {
    if (!isDrawMode) resetDrawing();
  }, [isDrawMode]);

  return { handleGridClick, handlePointerMove };
};

export default useDrawWall;