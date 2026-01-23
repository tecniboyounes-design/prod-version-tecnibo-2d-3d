// /src/ifc_test/components/points/points.jsx
'use client';

import React, { memo, useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';

/**
 * RoomPoints
 * - Renders corner points as small spheres in R3F.
 * - Assumes floorplan in XZ plane:
 *    X = point.x
 *    Z = point.z || point.y
 *    Y = wallHeight + offsetAbove
 *
 * onPointChange(id, x, z) will be called while dragging,
 * where (x, z) are the 2D floor coordinates (X, Z).
 */


function RoomPointsBase({
  points,
  wallHeight = 2.8,
  offsetAbove = 0.05,
  radius = 0.06,
  color = 'red',
  onPointChange,
  is2D = true,
  controlsRef,
}) {

  // dragState: which point is dragged, with pointerId + offset

  const [dragState, setDragState] = useState({
    id: null,
    pointerId: null,
    dx: 0,
    dz: 0,
  });

  // Drag plane at y=0 is enough (we only care about x/z)
  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    []
  );

  // If we switch to 3D → cancel any ongoing drag
  useEffect(() => {
    if (!is2D) {
      setDragState((prev) => {
        // Avoid calling setState when state is already the default to prevent unnecessary renders
        if (
          prev.id === null &&
          prev.pointerId === null &&
          prev.dx === 0 &&
          prev.dz === 0
        ) {
          return prev;
        }
        return { id: null, pointerId: null, dx: 0, dz: 0 };
      });
    }
  }, [is2D]);

  if (!points || points.length === 0) return null;

  const y = wallHeight + offsetAbove; // point is above the wall

  return (
    <>
      {points.map((pt) => {
        const id = pt.id;
        const x = pt.x ?? 0;
        const z = (pt.z ?? pt.y) ?? 0; // support {x,y} or {x,y,z}

        const handlePointerDown = (e) => {
          if (!is2D) return; // no point dragging in 3D
          e.stopPropagation();
          if (e.preventDefault) e.preventDefault();

          // Intersection on ground plane to compute offset
          const intersection = new THREE.Vector3();
          if (e.ray && e.ray.intersectPlane(dragPlane, intersection)) {
            const dx = x - intersection.x;
            const dz = z - intersection.z;

            // Capture pointer so move/up keep coming
            if (e.target.setPointerCapture) {
              e.target.setPointerCapture(e.pointerId);
            }

            // Temporarily disable OrbitControls while dragging a point
            if (controlsRef?.current) {
              controlsRef.current.enabled = false;
            }

            setDragState({
              id,
              pointerId: e.pointerId,
              dx,
              dz,
            });
          }
        };

        const stopDraggingIfNeeded = (e) => {
          setDragState((prev) => {
            if (prev.pointerId !== e.pointerId) return prev;
            if (e.target.releasePointerCapture) {
              e.target.releasePointerCapture(e.pointerId);
            }

            // Re-enable OrbitControls when drag ends
            if (controlsRef?.current) {
              controlsRef.current.enabled = true;
            }

            return { id: null, pointerId: null, dx: 0, dz: 0 };
          });
        };

        const handlePointerUp = (e) => {
          if (!is2D) return;
          e.stopPropagation();
          stopDraggingIfNeeded(e);
        };

        const handlePointerMove = (e) => {
          if (!is2D) return;

          // Only move if we're dragging this point with same pointer
          if (dragState.id !== id || dragState.pointerId !== e.pointerId) {
            return;
          }

          // No buttons pressed → stop drag
          if (!e.buttons) {
            stopDraggingIfNeeded(e);
            return;
          }

          e.stopPropagation();

          const intersection = new THREE.Vector3();
          if (e.ray && e.ray.intersectPlane(dragPlane, intersection)) {
            const newX = intersection.x + dragState.dx;
            const newZ = intersection.z + dragState.dz;
            onPointChange?.(id, newX, newZ);
          }
        };

        return (
          <mesh
            key={id ?? `${x}-${z}`}
            position={[x, y, z]}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
          >
            <sphereGeometry args={[radius, 16, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * Memo comparator: only re-render if:
 * - visual props changed
 * - or any point's id/x/y/z changed
 * - or is2D changed
 */
function arePropsEqual(prev, next) {
  if (
    prev.wallHeight !== next.wallHeight ||
    prev.offsetAbove !== next.offsetAbove ||
    prev.radius !== next.radius ||
    prev.color !== next.color ||
    prev.is2D !== next.is2D
  ) {
    return false;
  }

  const a = prev.points || [];
  const b = next.points || [];

  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const pa = a[i];
    const pb = b[i];

    if (
      pa.id !== pb.id ||
      pa.x !== pb.x ||
      pa.y !== pb.y ||
      (pa.z ?? 0) !== (pb.z ?? 0)
    ) {
      return false;
    }
  }

  return true;
}

export const RoomPoints = memo(RoomPointsBase, arePropsEqual);