// /src/components/Otman/Walls/Walls.jsx
"use client";

import React, { useMemo, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Edges, Html } from "@react-three/drei";
import { setCurrentConfig, updateBothCorners } from "../../../store";
import { cloisonStyles } from "../../../data/models";
import { DoubleSide, FrontSide, BackSide } from "three";

/* ---------------- side selector (settings.wallSide: "double" | "front" | "back") ---------------- */
const mapSide = (s) => {
  switch ((s || "double").toLowerCase()) {
    case "front":
      return FrontSide;
    case "back":
      return BackSide;
    default:
      return DoubleSide; // show both sides by default
  }
};

/* ---------------- geometry helpers ---------------- */

const calculateWallData = (walls, corners, wallHeight = 3, isDrawMode) => {
  return (walls || [])
    .map((wall) => {
      const { corner1, corner2, thickness, id, ...otherProps } = wall;
      const c1 = corners?.[corner1];
      const c2 = corners?.[corner2];

      if (!c1 || !c2) return null;

      const width = Math.hypot(c2.x - c1.x, c2.z - c1.z);
      const angle = Math.atan2(c2.z - c1.z, c2.x - c1.x);
      const height = isDrawMode ? Math.max(c1.y ?? wallHeight, c2.y ?? wallHeight) : wallHeight;

      return {
        ...otherProps,
        id,
        position: [(c1.x + c2.x) / 2, height / 2.68 + 0.1, (c1.z + c2.z) / 2],
        width,
        angle,
        thickness,
        height,
        corner1,
        corner2,
      };
    })
    .filter(Boolean);
};

const UICalculateWallAngle = React.memo(function UICalculateWallAngle({
  height,
  angle,
  length,
  cornerPosition,
  angle90,
}) {
  return (
    <Html
      position={cornerPosition}
      rotation={[0, (angle90 * Math.PI) / 180, 0]}
      center
      style={{
        color: "red",
        background: "white",
        padding: "2px 5px",
        borderRadius: "5px",
        fontSize: "12px",
        pointerEvents: "none",
      }}
    >
      {`${angle90.toFixed(2)}°`}
    </Html>
  );
});

const WallWidthCalculator = React.memo(function WallWidthCalculator({ angle, length, position }) {
  const unit = useSelector((state) => state.jsonData.floorplanner.units);
  const conversionFactors = { cm: 100, m: 1, mm: 1000 };
  const convertedLength = (length * (conversionFactors[unit] ?? 1)).toFixed(2);

  return (
    <Html
      position={position}
      rotation={[0, -angle, 0]}
      center
      style={{
        color: "black",
        background: "none",
        padding: "2px 5px",
        borderRadius: "5px",
        fontSize: "20px",
        pointerEvents: "none",
      }}
    >
      {`${convertedLength} ${unit}`}
    </Html>
  );
});

/** Shift a wall parallel to itself based on pointer position (2D). */
const updateWallPoints = (corner1, corner2, mousePosition) => {
  if (!corner1 || !corner2 || !mousePosition) {
    return { pointA: corner1, pointB: corner2 };
  }

  const { x: mouseX, z: mouseZ } = mousePosition;
  const directionX = corner2.x - corner1.x;
  const directionZ = corner2.z - corner1.z;

  const distance = Math.sqrt(directionX ** 2 + directionZ ** 2);
  if (distance === 0) {
    return { pointA: corner1, pointB: corner2 };
  }

  const normalizedX = directionX / distance;
  const normalizedZ = directionZ / distance;

  const wallCenterX = (corner1.x + corner2.x) / 2;
  const wallCenterZ = (corner1.z + corner2.z) / 2;

  const dx = mouseX - wallCenterX;
  const dz = mouseZ - wallCenterZ;

  const parallelProjection = dx * normalizedX + dz * normalizedZ;
  const perpendicularDisplacementX = dx - parallelProjection * normalizedX;
  const perpendicularDisplacementZ = dz - parallelProjection * normalizedZ;

  const pointA = {
    x: corner1.x + perpendicularDisplacementX,
    z: corner1.z + perpendicularDisplacementZ,
  };

  const pointB = {
    x: corner2.x + perpendicularDisplacementX,
    z: corner2.z + perpendicularDisplacementZ,
  };

  return { pointA, pointB };
};

/* ---------------- wall mesh ---------------- */

const Wall = React.memo(function Wall({
  position,
  width,
  height,
  thickness,
  angle,
  angle90,
  corner1Id,
  corner2Id,
  corners,
  wallId,
  wallColor,
  showUI,
  showEdges,
}) {
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dz: 0 });
  const [draggingBlocked] = useState(false);
  const [virtualWall, setVirtualWall] = useState(0.2);

  const dispatch = useDispatch();
  const is2D = useSelector((state) => state.jsonData.is2DView);
  const walls = useSelector((state) => state.jsonData.floorplanner.walls);
  const settings = useSelector((s) => s.jsonData.settings ?? {});
  const sideConst = mapSide(settings.wallSide || "double"); // "double" | "front" | "back"

  const corner1 = corners[corner1Id];
  const corner2 = corners[corner2Id];
  const wallCenter = [(corner1.x + corner2.x) / 2, height / 2, (corner1.z + corner2.z) / 2];

  const handlePointerDown = useCallback(
    (e) => {
      if (draggingBlocked) return;
      e.stopPropagation();
      setDragging(true);
      setVirtualWall(20); // fat hitbox during drag
      const point = e.intersections?.[0]?.point || e.point || {};
      setDragOffset({
        dx: (position?.[0] || 0) - (point.x || 0),
        dz: (position?.[2] || 0) - (point.z || 0),
      });
    },
    [draggingBlocked, position]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    setVirtualWall(0.2);
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging || draggingBlocked) return;
      e.stopPropagation();
      const point = e.intersections?.[0]?.point || e.point || {};
      const mousePosition = { x: point.x + dragOffset.dx, z: point.z + dragOffset.dz };
      if (!corner1 || !corner2) return;
      if (is2D) {
        const { pointA, pointB } = updateWallPoints(corner1, corner2, mousePosition);
        dispatch(
          updateBothCorners({
            corner1Id,
            corner2Id,
            position1: pointA,
            position2: pointB,
          })
        );
      }
    },
    [dragging, draggingBlocked, dragOffset, corner1, corner2, is2D, dispatch, corner1Id, corner2Id]
  );

  const handleClick = useCallback(() => {
    dispatch(setCurrentConfig({ type: "wall", id: wallId }));
  }, [dispatch, wallId]);

  const wallDef = walls.find((w) => w.id === wallId);
  let wallStyle = { thickness, wallColor };
  if (wallDef?.wallType) {
    const style = cloisonStyles.find((s) => s.name === wallDef.wallType);
    if (style) {
      wallStyle = {
        thickness: style.thickness,
        wallColor: style.color,
        material: style.material,
        position: style.position,
        rotation: style.rotation,
      };
    }
  }

  const adjustedHeight = is2D ? height : 3;

  return (
    <>
      {/* Wall UI labels only in 2D (optional) */}
      {showUI && is2D && (
        <>
          <UICalculateWallAngle
            height={height}
            angle={angle}
            length={width}
            cornerPosition={position}
            angle90={(angle * 180) / Math.PI}
          />
          <WallWidthCalculator angle={angle} length={width} position={wallCenter} />
        </>
      )}

      <mesh
        position={position}
        rotation={[0, -angle, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        castShadow={false}
        receiveShadow={false}
      >
        {is2D ? (
          // 2D: thin box (thickness is the "Y" of the box)
          <>
            <boxGeometry args={[width, wallStyle.thickness ?? thickness, adjustedHeight]} />
            <meshStandardMaterial
              color={dragging ? "purple" : wallStyle.wallColor || "white"}
              {...(wallStyle.material || {})}
            />
          </>
        ) : (
          // 3D: plane with selectable side (DoubleSide by default)
          <>
            <planeGeometry args={[width, adjustedHeight]} />
            <meshStandardMaterial
              color={dragging ? "purple" : wallStyle.wallColor || "white"}
              {...(wallStyle.material || {})}
              side={sideConst}
            />
          </>
        )}

        {/* Edges are optional (they cost CPU/GPU), keep off unless needed */}
        {showEdges && <Edges color="black" lineWidth={1} />}
      </mesh>

      {/* Invisible fat hit area for easier interaction */}
      <mesh position={position} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <Box args={[width, adjustedHeight, virtualWall]} rotation={[0, -angle, 0]}>
          <meshStandardMaterial transparent opacity={0} />
        </Box>
      </mesh>
    </>
  );
});

/* ---------------- list ---------------- */

const Walls = ({ isDrawMode }) => {
  const walls = useSelector((state) => state.jsonData.floorplanner.walls);
  const corners = useSelector((state) => state.jsonData.floorplanner.corners);
  const wallHeight = useSelector((state) => state.jsonData.wallHieght);

  // Perf toggles from settings (default off)
  const { showWallUI = false, showEdges = false } =
    useSelector((s) => s.jsonData.settings ?? {}) || {};

  const wallData = useMemo(
    () => calculateWallData(walls, corners, wallHeight, isDrawMode),
    [walls, corners, wallHeight, isDrawMode]
  );

  return (
    <>
      {wallData.map((w) => (
        <Wall
          key={w.id}
          wallId={w.id}
          position={w.position}
          width={w.width}
          height={w.height}
          thickness={w.thickness}
          angle={w.angle}
          angle90={(w.angle * 180) / Math.PI}
          corner1Id={w.corner1}
          corner2Id={w.corner2}
          corners={corners}
          wallColor={w.wallColor}
          showUI={showWallUI}
          showEdges={showEdges}
        />
      ))}
    </>
  );
};

export default React.memo(Walls);
