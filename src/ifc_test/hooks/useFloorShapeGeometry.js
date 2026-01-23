// /app/ifc_test/hooks/useFloorShapeGeometry.js
'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

function buildOrderedLoop(points, walls) {
  if (!Array.isArray(points) || !Array.isArray(walls)) return [];

  const pointById = new Map(points.map((p) => [p.id, p]));
  const neighbors = new Map();

  for (const w of walls) {
    if (!pointById.has(w.start) || !pointById.has(w.end)) continue;
    if (!neighbors.has(w.start)) neighbors.set(w.start, []);
    if (!neighbors.has(w.end)) neighbors.set(w.end, []);
    neighbors.get(w.start).push(w.end);
    neighbors.get(w.end).push(w.start);
  }

  const firstWall = walls[0];
  if (!firstWall) return [];

  const startId = firstWall.start;
  const loop = [];
  let prevId = null;
  let currentId = startId;

  while (true) {
    const p = pointById.get(currentId);
    if (!p) break;
    loop.push(p);

    const nbrs = neighbors.get(currentId) || [];
    const nextId = nbrs.find((n) => n !== prevId);

    if (!nextId || nextId === startId) {
      break;
    }

    prevId = currentId;
    currentId = nextId;

    // safety
    if (loop.length > points.length + 2) {
      break;
    }
  }

  return loop;
}

export function useFloorShapeGeometry(
  initRoom,
  { extrude = false, extrudeHeight = 0.05, height = 2.8 } = {}
) {
  return useMemo(() => {
    if (!initRoom?.points || !initRoom?.walls) {
      return { floorGeometry: null, ceilingGeometry: null, height };
    }

    // If explicitly marked "open", don't create floor
    if (initRoom.isClosed === false) {
      return { floorGeometry: null, ceilingGeometry: null, height };
    }

    const { points, walls, lastClosedLoopPointIds } = initRoom;

    let loop = null;

    // ✅ 1) Prefer the explicit closed loop from drawing
    if (
      Array.isArray(lastClosedLoopPointIds) &&
      lastClosedLoopPointIds.length >= 3
    ) {
      const byId = new Map(points.map((p) => [p.id, p]));
      loop = lastClosedLoopPointIds
        .map((id) => byId.get(id))
        .filter(Boolean);
    }

    // ✅ 2) Fallback: old graph-walk if no loop stored (e.g. initial room)
    if (!loop || loop.length < 3) {
      loop = buildOrderedLoop(points, walls);
    }

    if (!loop || loop.length < 3) {
      return { floorGeometry: null, ceilingGeometry: null, height };
    }

    const pts2 = loop.map((p) => new THREE.Vector2(p.x, p.y));
    if (THREE.ShapeUtils.area(pts2) < 0) pts2.reverse();

    const shape = new THREE.Shape(pts2);

    let baseGeometry;

    if (extrude) {
      baseGeometry = new THREE.ExtrudeGeometry(shape, {
        depth: extrudeHeight,
        bevelEnabled: false,
      });
      baseGeometry.rotateX(Math.PI / 2);
    } else {
      baseGeometry = new THREE.ShapeGeometry(shape);
      baseGeometry.rotateX(Math.PI / 2);
    }

    const floorGeometry = baseGeometry;
    const ceilingGeometry = baseGeometry.clone();

    return { floorGeometry, ceilingGeometry, height };
  }, [
    extrude,
    extrudeHeight,
    height,
    initRoom?.points,
    initRoom?.walls,
    initRoom?.isClosed,
    initRoom?.lastClosedLoopPointIds,
  ]);
}
