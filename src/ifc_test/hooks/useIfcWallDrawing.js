// /src/hooks/useIfcWallDrawing.js
"use client";

import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const CLOSE_TOLERANCE = 0.25;

function isNear(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy) <= CLOSE_TOLERANCE;
}

/**
 * useIfcWallDrawing
 *
 * Pure drawing logic:
 *  - Tracks a chain of points in 2D floor coords (x, y = floor Z).
 *  - On each click: creates points / walls via callbacks.
 *  - Closes the room when user clicks near the first point.
 *
 * You decide what to do with:
 *   - onCreatePoint({ id, x, y })
 *   - onCreateWall({ id, start, end, ifc })
 *   - onCloseLoop({ pointIds })
 *
 * "ifc" is generic IFC metadata (type, height, thickness, storey, etc.).
 */
export default function useIfcWallDrawing({
  enabled = true,
  defaultIfcWall = {
    ifcType: "IfcWall",
    name: "T100",
    storey: "Ground",
    heightMm: 2800,
    thicknessMm: 100,
    materialId: 15912,
  },
  onCreatePoint,
  onCreateWall,
  onCloseLoop,
} = {}) {
  // current start of chain
  const [start, setStart] = useState(null); // { id, x, y }
  // full chain (for room closing)
  const [chain, setChain] = useState([]);   // [{ id, x, y }]
  // hover position for preview segment
  const [hover, setHover] = useState(null); // { x, y }

  const reset = useCallback(() => {
    setStart(null);
    setChain([]);
    setHover(null);
  }, []);

  const handleClick = useCallback(
    (e) => {
      if (!enabled) return;
      if (!e?.point) return;

      // R3F pointer: e.point is a THREE.Vector3
      const x = e.point.x;
      const z = e.point.z;
      const floor = { x, y: z }; // y = floor Z (your initRoom convention)

      // First click: create first point only
      if (!start) {
        const id = uuidv4();
        onCreatePoint?.({ id, x: floor.x, y: floor.y });

        const first = { id, ...floor };
        setStart(first);
        setChain([first]);
        setHover(null);
        return;
      }

      const firstPoint = chain[0];

      // Click near first point → close the loop
      if (isNear(firstPoint, floor)) {
        const wallId = uuidv4();
        onCreateWall?.({
          id: wallId,
          start: start.id,
          end: firstPoint.id,
          ifc: { ...defaultIfcWall },
        });

        onCloseLoop?.({ pointIds: chain.map((p) => p.id) });
        reset();
        return;
      }

      // Otherwise: add a new point and a wall from start → new point
      const newId = uuidv4();
      onCreatePoint?.({ id: newId, x: floor.x, y: floor.y });

      const wallId = uuidv4();
      onCreateWall?.({
        id: wallId,
        start: start.id,
        end: newId,
        ifc: { ...defaultIfcWall },
      });

      const newPoint = { id: newId, ...floor };
      setStart(newPoint);
      setChain((prev) => [...prev, newPoint]);
      setHover(null);
    },
    [enabled, start, chain, defaultIfcWall, onCreatePoint, onCreateWall, onCloseLoop, reset]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!enabled || !start) return;
      if (!e?.point) return;

      const x = e.point.x;
      const z = e.point.z;
      setHover({ x, y: z });
    },
    [enabled, start]
  );

  const previewSegment = useMemo(() => {
    if (!start || !hover) return null;
    return { from: start, to: hover };
  }, [start, hover]);


  return {
    isDrawing: !!start,
    handleClick,
    handlePointerMove,
    reset,
    previewSegment,
    chain,
  };

  
}