// /app/ifc_test/hooks/useInitRoomIfcDrawing.js
"use client";

import { useDispatch } from "react-redux";
import useIfcWallDrawing from "./useIfcWallDrawing";
import {
  addInitRoomPoint,
  addInitRoomWall,
  setInitRoomClosed,
} from "../../store";

export default function useInitRoomIfcDrawing({ enabled = true } = {}) {
  const dispatch = useDispatch();

  const {
    isDrawing,
    handleClick,
    handlePointerMove,
    reset,
    previewSegment,
    chain,
  } = useIfcWallDrawing({
    enabled,
    onCreatePoint: (pt) => {
      dispatch(addInitRoomPoint(pt));
    },
    onCreateWall: (wall) => {
      dispatch(addInitRoomWall(wall));
    },
    onCloseLoop: ({ pointIds }) => {
      // 🔴 before: dispatch(setInitRoomClosed({ isClosed: true }));
      // ✅ after: also send the loop
      dispatch(setInitRoomClosed({ isClosed: true, pointIds }));
      console.log("[IFC Draw] Room closed with points:", pointIds);
    },
  });

  return {
    enabled,
    isDrawing,
    handleClick,
    handlePointerMove,
    reset,
    previewSegment,
    chain,
  };
}
