// /src/components/Otman/Points/Points.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useSelector } from "react-redux";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useControls } from "leva";

import Walls from "../Walls/Walls";
import FloorPlane from "../Floor/Floor";

/* ---------------- helpers ---------------- */

function niceStep(x) {
  if (x <= 0 || !isFinite(x)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const n = x / p;
  let m = 1;
  if (n < 1.5) m = 1;
  else if (n < 3.5) m = 2;
  else if (n < 7.5) m = 5;
  else m = 10;
  return m * p;
}

/** Top-down lock when 2D (no orbit controls). */
function CameraTopDown({ enabled }) {
  const { camera } = useThree();
  useEffect(() => {
    if (!enabled) return;
    camera.position.set(0, 50, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
  }, [enabled, camera]);
  return null;
}

/** OrbitControls that invalidates on change (frameloop="demand"). */
function OrbitControlsPerf({ enabled }) {
  const { invalidate } = useThree();
  if (enabled) return null;
  return (
    <OrbitControls
      enableDamping={false}
      enableZoom
      enablePan
      enableRotate
      minDistance={0}
      maxDistance={400}
      onChange={invalidate}
    />
  );
}

/** Instanced dots for corners (optional for perf). */
function CornerPoints({ positions, radius = 0.1, segments = 12, color = "#222" }) {
  const ids = useMemo(() => Object.keys(positions), [positions]);
  const meshRef = useRef(null);
  const temp = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let i = 0;
    for (const id of ids) {
      const [x, y, z] = positions[id];
      temp.position.set(x, y, z);
      temp.rotation.set(0, 0, 0);
      temp.scale.set(1.3, 1.3, 1.3);
      temp.updateMatrix();
      mesh.setMatrixAt(i++, temp.matrix);
    }
    if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
  }, [ids, positions, temp]);

  if (!ids.length) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, ids.length]}>
      <sphereGeometry args={[radius, segments, segments]} />
      <meshStandardMaterial color={color} />
    </instancedMesh>
  );
}

/** Dynamic grid with readable cell size. */
function AdaptiveGrid({
  baseSize = 100,
  targetPx = 32,
  minDiv = 10,
  maxDiv = 220,
  colorMajor = "#888",
  colorMinor = "#888",
  axesLength,
}) {
  const gridRef = useRef(null);
  const [gridKey, setGridKey] = useState(0);
  const [args, setArgs] = useState([baseSize, 50, colorMajor, colorMinor]);
  const { camera, size } = useThree();
  const last = useRef({ divisions: 50, cell: baseSize / 50 });

  useFrame(() => {
    const altitude = Math.abs(camera.position.y) + 1e-6;
    const vFovRad = (camera.fov * Math.PI) / 180;
    const worldH = 2 * altitude * Math.tan(vFovRad / 2);
    const pxPerMeter = size.height / worldH;

    let cellMeters = targetPx / pxPerMeter;
    cellMeters = niceStep(cellMeters);
    cellMeters = Math.max(0.01, cellMeters);

    let divisions = Math.round(baseSize / cellMeters);
    divisions = Math.max(minDiv, Math.min(maxDiv, divisions));

    if (divisions !== last.current.divisions && Math.abs(divisions - last.current.divisions) >= 2) {
      last.current = { divisions, cell: baseSize / divisions };
      setArgs([baseSize, divisions, colorMajor, colorMinor]);
      setGridKey((k) => k + 1);
    }
  });

  return (
    <>
      <gridHelper key={gridKey} ref={gridRef} args={args} />
      <axesHelper args={[axesLength ?? baseSize]} />
    </>
  );
}

/* ---------------- main ---------------- */

const AUTO_HIDE_POINTS_AT = 300;

const Points = () => {
  // store
  const corners  = useSelector((s) => s.jsonData.floorplanner.corners);
  const rooms    = useSelector((s) => s.jsonData.floorplanner.rooms);
  const walls    = useSelector((s) => s.jsonData.floorplanner.walls);
  const is2DView = useSelector((s) => s.jsonData.is2DView);

  const { pointColor = "#222", gridColor = "#888", gridSize = 100 } =
    useSelector((s) => s.jsonData.settings ?? {}) || {};

  // UI toggles
  const { showPoints } = useControls("Display", {
    showPoints: { value: false }, // default OFF for perf
  });

  const { invalidate } = useThree();
  const hasGeometry = (walls?.length ?? 0) > 0;

  // 👉 Defer mounting the heavy walls by 1 frame so the grid paints immediately
  const [showWalls, setShowWalls] = useState(false);
  useEffect(() => {
    setShowWalls(false);
    if (hasGeometry) {
      const id = requestAnimationFrame(() => setShowWalls(true));
      return () => cancelAnimationFrame(id);
    }
  }, [hasGeometry]);

  // make sure a new frame is rendered when toggles / data change
  useEffect(() => invalidate(), [hasGeometry, showWalls, showPoints, invalidate]);

  const cornerCount = Object.keys(corners || {}).length;
  const shouldRenderPoints = showPoints && cornerCount > 0 && cornerCount <= AUTO_HIDE_POINTS_AT;

  const positions = useMemo(() => {
    if (!shouldRenderPoints) return {};
    const out = {};
    for (const id in corners) out[id] = [corners[id].x, 0.1, corners[id].z];
    return out;
  }, [corners, shouldRenderPoints]);

  return (
    <>
      {/* 1) Grid first (always visible) */}
      <AdaptiveGrid
        baseSize={gridSize || 100}
        targetPx={32}
        minDiv={10}
        maxDiv={220}
        colorMajor={gridColor}
        colorMinor={gridColor}
      />

      {/* Camera & controls */}
      <CameraTopDown enabled={is2DView} />
      <OrbitControlsPerf enabled={is2DView} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {/* 2) In-canvas fallback while walls are deferred */}
      {hasGeometry && !showWalls && (
        <Html center transform={false} zIndexRange={[10, 0]}>
          <div
            style={{
              background: "rgba(255,255,255,0.75)",
              borderRadius: 12,
              padding: "12px 16px",
              fontFamily: "sans-serif",
              fontSize: 12,
              color: "#333",
              boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
            }}
          >
            Loading walls…
          </div>
        </Html>
      )}

      {/* 3) Walls & floor (mount one frame after geometry exists) */}
      {showWalls && (
        <group>
          <Walls isDrawMode={false} />
          <FloorPlane corners={corners} rooms={rooms} walls={walls} wallHeight={4} />
        </group>
      )}

      {/* 4) Optional corner dots via Leva */}
      {showWalls && shouldRenderPoints && <CornerPoints positions={positions} color={pointColor} />}
    </>
  );
};

export default Points;
