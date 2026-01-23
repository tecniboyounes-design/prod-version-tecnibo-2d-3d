// /app/ifc_test/test-scene.jsx
'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as THREE from 'three';
import { GLTFExporter } from 'three-stdlib';
import { Html } from '@react-three/drei';

import { RoomPoints } from './points/points';
import { useFloorShapeGeometry } from './hooks/useFloorShapeGeometry';
import Window from './Window';
import {
  updateInitRoomPoint,
  updateInitRoomWall,
  removeInitRoomWall,
  addInitRoomOpening,
  updateInitRoomOpening,
  removeInitRoomOpening,
} from '@/store';

import { useDxfExportPayload } from './hooks/useDxfExportPayload';

/* ------------------------------------------------------------------ */
/*  Small overlay dialog: edit thickness + color + openings           */
/* ------------------------------------------------------------------ */

function WallStyleDialog({
  open,
  wall,
  wallName,
  thicknessMm,
  color,
  wallOpenings = [],
  onAddOpening,
  onUpdateOpening,
  onDeleteOpening,
  onSave,
  onDelete,
  onClose,
}) {
  const [localThickness, setLocalThickness] = useState(thicknessMm ?? 100);
  const [localColor, setLocalColor] = useState(color ?? '#ffffff');

  useEffect(() => {
    if (!open) return;
    setLocalThickness((prev) => {
      const next = thicknessMm ?? 100;
      return prev === next ? prev : next;
    });
    setLocalColor((prev) => {
      const next = color ?? '#ffffff';
      return prev === next ? prev : next;
    });
  }, [open, thicknessMm, color]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          minWidth: 320,
          maxWidth: 480,
          background: '#020617',
          borderRadius: 10,
          padding: 16,
          border: '1px solid #22c55e',
          boxShadow: '0 0 30px rgba(34,197,94,0.5)',
          color: '#e5e7eb',
          fontFamily: 'system-ui, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 16,
            fontWeight: 600,
            color: '#bbf7d0',
          }}
        >
          Wall settings {wallName ? `– ${wallName}` : ''}
        </h3>

        {/* Wall style */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 13, color: '#e5e7eb' }}>
            Thickness (mm)
            <input
              type="number"
              value={localThickness}
              onChange={(e) =>
                setLocalThickness(Number(e.target.value) || 0)
              }
              style={{
                width: '100%',
                marginTop: 4,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #22c55e',
                background: '#020617',
                color: '#e5e7eb',
              }}
            />
          </label>

          <label style={{ fontSize: 13, color: '#e5e7eb' }}>
            Color
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="color"
                value={localColor}
                onChange={(e) => setLocalColor(e.target.value)}
                style={{
                  width: 40,
                  height: 32,
                  padding: 0,
                  border: '1px solid #22c55e',
                  borderRadius: 6,
                  background: '#020617',
                }}
              />
              <input
                type="text"
                value={localColor}
                onChange={(e) => setLocalColor(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid #22c55e',
                  background: '#020617',
                  color: '#e5e7eb',
                }}
              />
            </div>
          </label>
        </div>

        {/* Openings section */}
        {wall && (
          <div style={{ marginTop: 16 }}>
            <h4
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 500,
                color: '#a5b4fc',
              }}
            >
              Openings on this wall
            </h4>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                onClick={() => onAddOpening?.(wall.id, 'door')}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid #22c55e',
                  background: '#022c22',
                  color: '#bbf7d0',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                + Door
              </button>
              <button
                onClick={() => onAddOpening?.(wall.id, 'window')}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid #38bdf8',
                  background: '#020617',
                  color: '#e0f2fe',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                + Window
              </button>
            </div>

            {wallOpenings.length === 0 && (
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.7,
                  marginBottom: 6,
                }}
              >
                No openings yet. Add a door or window.
              </div>
            )}

            {wallOpenings.map((o) => (
              <div
                key={o.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  alignItems: 'center',
                  padding: '4px 6px',
                  borderRadius: 6,
                  border: '1px solid #1f2937',
                  marginBottom: 6,
                  background: '#020617',
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.9, minWidth: 80 }}>
                  {o.type === 'door' ? '🚪 Door' : '🪟 Window'}
                </span>

                {/* position along wall */}
                <label style={{ fontSize: 11 }}>
                  Pos %
                  <input
                    type="number"
                    value={Math.round((o.t ?? 0.5) * 100)}
                    onChange={(e) => {
                      const raw = Number(e.target.value) || 0;
                      const t = raw / 100;
                      onUpdateOpening?.(o.id, { t });
                    }}
                    style={{
                      width: 60,
                      marginLeft: 4,
                      padding: '4px 6px',
                      borderRadius: 4,
                      border: '1px solid #22c55e',
                      background: '#020617',
                      color: '#e5e7eb',
                      fontSize: 11,
                    }}
                  />
                </label>

                {o.type === 'window' && (
                  <label style={{ fontSize: 11 }}>
                    Sill (m)
                    <input
                      type="number"
                      step="0.1"
                      value={o.sillHeight ?? 1.0}
                      onChange={(e) => {
                        const sillHeight = Number(e.target.value) || 0;
                        onUpdateOpening?.(o.id, { sillHeight });
                      }}
                      style={{
                        width: 60,
                        marginLeft: 4,
                        padding: '4px 6px',
                        borderRadius: 4,
                        border: '1px solid #22c55e',
                        background: '#020617',
                        color: '#e5e7eb',
                        fontSize: 11,
                      }}
                    />
                  </label>
                )}

                <button
                  onClick={() => onDeleteOpening?.(o.id)}
                  style={{
                    marginLeft: 'auto',
                    padding: '4px 6px',
                    borderRadius: 4,
                    border: '1px solid #b91c1c',
                    background: '#450a0a',
                    color: '#fecaca',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* footer actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            onClick={onDelete}
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #b91c1c',
              background: '#450a0a',
              color: '#fecaca',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            🗑 Delete wall
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #4b5563',
                background: '#020617',
                color: '#e5e7eb',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() =>
                onSave({ thicknessMm: localThickness, color: localColor })
              }
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #16a34a',
                background: '#16a34a',
                color: '#022c22',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Parallel shift helper                                             */
/* ------------------------------------------------------------------ */

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


/* ------------------------------------------------------------------ */
/*  Draggable wall mesh                                               */
/* ------------------------------------------------------------------ */

const DraggableWall = forwardRef(function DraggableWall(
  {
    wall,
    p1,
    p2,
    position,
    length,
    rotation,
    wallHeight,
    thickness = 0.1,
    color = 'white',
    onOpenDialog,
    is2D = true,
    controlsRef,
  },
  ref
) {
  const dispatch = useDispatch();
  const [dragState, setDragState] = useState({
    dragging: false,
    pointerId: null,
    dx: 0,
    dz: 0,
  });

  const dragPlane = useRef(
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) // y=0
  ).current;

  const handlePointerDown = useCallback(
    (e) => {
      if (!is2D) return;
      e.stopPropagation();
      if (e.preventDefault) e.preventDefault();

      const intersection = new THREE.Vector3();
      if (e.ray && e.ray.intersectPlane(dragPlane, intersection)) {
        const dx = (position?.[0] || 0) - intersection.x;
        const dz = (position?.[2] || 0) - intersection.z;

        if (controlsRef?.current) {
          controlsRef.current.enabled = false;
        }

        if (e.target.setPointerCapture) {
          e.target.setPointerCapture(e.pointerId);
        }

        setDragState({
          dragging: true,
          pointerId: e.pointerId,
          dx,
          dz,
        });
      }
    },
    [position, dragPlane, is2D, controlsRef]
  );

  const stopDraggingIfNeeded = useCallback(
    (e) => {
      setDragState((prev) => {
        if (!prev.dragging || prev.pointerId !== e.pointerId) return prev;
        if (e.target.releasePointerCapture) {
          e.target.releasePointerCapture(e.pointerId);
        }

        if (controlsRef?.current) {
          controlsRef.current.enabled = true;
        }

        return { dragging: false, pointerId: null, dx: 0, dz: 0 };
      });
    },
    [controlsRef]
  );

  const handlePointerUp = useCallback(
    (e) => {
      e.stopPropagation();
      stopDraggingIfNeeded(e);
    },
    [stopDraggingIfNeeded]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragState.dragging || dragState.pointerId !== e.pointerId) return;

      if (!e.buttons) {
        stopDraggingIfNeeded(e);
        return;
      }

      e.stopPropagation();

      const intersection = new THREE.Vector3();
      if (e.ray && e.ray.intersectPlane(dragPlane, intersection)) {
        const mousePosition = {
          x: intersection.x + dragState.dx,
          z: intersection.z + dragState.dz,
        };

        if (!p1 || !p2) return;

        const corner1 = { x: p1.x, z: p1.y };
        const corner2 = { x: p2.x, z: p2.y };

        const { pointA, pointB } = updateWallPoints(
          corner1,
          corner2,
          mousePosition
        );

        dispatch(
          updateInitRoomPoint({
            id: wall.start,
            x: pointA.x,
            y: pointA.z,
          })
        );
        dispatch(
          updateInitRoomPoint({
            id: wall.end,
            x: pointB.x,
            y: pointB.z,
          })
        );
      }
    },
    [
      dragState,
      dragPlane,
      p1,
      p2,
      dispatch,
      wall.start,
      wall.end,
      stopDraggingIfNeeded,
    ]
  );

  const handleDoubleClick = useCallback(
    (e) => {
      e.stopPropagation();
      onOpenDialog?.(wall);
    },
    [onOpenDialog, wall]
  );

  return (
    <>
      {/* main visible wall mesh (exported) */}
      <mesh
        ref={ref}
        position={position}
        rotation={[0, rotation, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        castShadow={false}
        receiveShadow={false}
      >
        <boxGeometry args={[length, wallHeight, thickness]} />
        <meshStandardMaterial
          // 🟢 when dragging, always Matrix green
          color={dragState.dragging ? '#22c55e' : color || 'white'}
          wireframe
        />
      </mesh>

      {/* invisible "hit box" mesh (ignored by payload hook) */}
      <mesh
        position={position}
        rotation={[0, rotation, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <boxGeometry args={[length, wallHeight, thickness * 4]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>
    </>
  );
});


/* ------------------------------------------------------------------ */
/*  Draggable door mesh (wireframe + 2D drag along wall)              */
/* ------------------------------------------------------------------ */

const DraggableDoor = forwardRef(function DraggableDoor(
  {
    position,
    rotation,
    width,
    height,
    wallP1,
    wallP2,
    wallHeight = 2.8,
    is2D = true,
    controlsRef,
    onPositionChange, // (t) => void
  },
  ref
) {
  const [dragState, setDragState] = useState({
    dragging: false,
    pointerId: null,
  });

  const dragPlane = useRef(
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) // y=0
  ).current;

  const handlePointerDown = useCallback(
    (e) => {
      if (!is2D) return;
      e.stopPropagation();
      if (e.preventDefault) e.preventDefault();

      if (controlsRef?.current) {
        controlsRef.current.enabled = false;
      }

      if (e.target.setPointerCapture) {
        e.target.setPointerCapture(e.pointerId);
      }

      setDragState({
        dragging: true,
        pointerId: e.pointerId,
      });
    },
    [is2D, controlsRef]
  );

  const stopDraggingIfNeeded = useCallback(
    (e) => {
      setDragState((prev) => {
        if (!prev.dragging || prev.pointerId !== e.pointerId) return prev;

        if (e.target.releasePointerCapture) {
          e.target.releasePointerCapture(e.pointerId);
        }

        if (controlsRef?.current) {
          controlsRef.current.enabled = true;
        }

        return { dragging: false, pointerId: null };
      });
    },
    [controlsRef]
  );

  const handlePointerUp = useCallback(
    (e) => {
      e.stopPropagation();
      stopDraggingIfNeeded(e);
    },
    [stopDraggingIfNeeded]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragState.dragging || dragState.pointerId !== e.pointerId) return;

      if (!e.buttons) {
        stopDraggingIfNeeded(e);
        return;
      }

      e.stopPropagation();

      const intersection = new THREE.Vector3();
      if (e.ray && e.ray.intersectPlane(dragPlane, intersection)) {
        if (!wallP1 || !wallP2) return;

        // vector along wall
        const vx = wallP2.x - wallP1.x;
        const vz = wallP2.z - wallP1.z;
        const lenSq = vx * vx + vz * vz;
        if (!lenSq) return;

        const L = Math.sqrt(lenSq);

        // vector from start to mouse
        const wx = intersection.x - wallP1.x;
        const wz = intersection.z - wallP1.z;

        let t = (wx * vx + wz * vz) / lenSq;

        // keep door fully inside wall, accounting for width
        if (L > 0) {
          const margin = width / 2 + 0.05; // add 5cm safety
          let tMin = margin / L;
          let tMax = 1 - margin / L;

          // clamp to [0,1] and avoid degenerate
          tMin = Math.max(0, Math.min(1, tMin));
          tMax = Math.max(0, Math.min(1, tMax));
          if (tMax <= tMin) {
            t = 0.5;
          } else {
            if (t < tMin) t = tMin;
            else if (t > tMax) t = tMax;
          }
        } else {
          t = 0.5;
        }

        onPositionChange?.(t);
      }
    },
    [dragState, dragPlane, wallP1, wallP2, width, onPositionChange, stopDraggingIfNeeded]
  );

  // visible door (used for IFC/DXF exports via ref)
  const visibleDoor = (
    <mesh
      ref={ref}
      position={position}
      rotation={[0, rotation, 0]}
      castShadow={false}
      receiveShadow={false}
      name="Door_01"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <boxGeometry args={[width, height, 0.05]} />
      <meshStandardMaterial
        color={dragState.dragging ? '#22c55e' : 'brown'}
        wireframe
      />
    </mesh>
  );

  // invisible hit box, placed ABOVE the wall in Y, so in top view it is "on top"
  const hitBox = (
    <mesh
      position={[position[0], wallHeight + 0.1, position[2]]}
      rotation={[0, rotation, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      castShadow={false}
      receiveShadow={false}
    >
      <boxGeometry args={[width * 1.4, 0.2, 0.2]} />
      <meshStandardMaterial transparent opacity={0} />
    </mesh>
  );

  return (
    <>
      {visibleDoor}
      {hitBox}
    </>
  );
});


/* ------------------------------------------------------------------ */
/*  TestScene                                                         */
/* ------------------------------------------------------------------ */

export default function TestScene({ setActions, is2D, controlsRef }) {
  const exporterRef = useRef(new GLTFExporter());
  const initRoom = useSelector((state) => state.jsonData.initRoom);
  const wallRefs = useRef([]);
  const doorRefs = useRef([]);
  const windowRefs = useRef([]);
  const exportGroupRef = useRef(null); // parent group for all exportable meshes
  const dispatch = useDispatch();

  const WALL_HEIGHT = 2.8;
  const [editingWall, setEditingWall] = useState(null);

  const handlePointChange = useCallback(
    (id, x, z) => {
      console.log('[Room] Move point', id, '->', { x, z });
      dispatch(updateInitRoomPoint({ id, x, y: z }));
    },
    [dispatch]
  );

  const getWallProps = (startId, endId) => {
    const p1 = initRoom.points.find((p) => p.id === startId);
    const p2 = initRoom.points.find((p) => p.id === endId);
    if (!p1 || !p2) return null;

    const dx = p2.x - p1.x;
    const dz = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    const cx = (p1.x + p2.x) / 2;
    const cz = (p1.y + p2.y) / 2;
    const cy = WALL_HEIGHT / 2;

    return {
      p1,
      p2,
      position: [cx, cy, cz],
      length,
      rotation: -angle,
    };
  };

  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  const collectMeshes = useCallback(() => {
    const arr = [];

    wallRefs.current.forEach((ref) => {
      if (ref) arr.push(ref);
    });

    doorRefs.current.forEach((ref) => {
      if (ref) arr.push(ref);
    });

    windowRefs.current.forEach((ref) => {
      if (ref) arr.push(ref);
    });

    return arr;
  }, []);

  // Shared logic to compute IFC props for a mesh (wall/door/window/proxy).
  const computeIfcPropsForMesh = useCallback(
    (m) => {
      const wallIndex = wallRefs.current.findIndex(
        (ref) => ref && ref.uuid === m.uuid
      );
      const doorIndex = doorRefs.current.findIndex(
        (ref) => ref && ref.uuid === m.uuid
      );
      const windowIndex = windowRefs.current.findIndex(
        (ref) => ref && ref.uuid === m.uuid
      );

      const isWall = wallIndex !== -1;
      const isDoor = doorIndex !== -1;
      const isWindow = windowIndex !== -1;

      let props;

      if (isWall) {
        const wall = initRoom?.walls?.[wallIndex];
        let segments2D;

        if (wall && Array.isArray(initRoom?.points)) {
          const p1 = initRoom.points.find((p) => p.id === wall.start);
          const p2 = initRoom.points.find((p) => p.id === wall.end);
          if (p1 && p2) {
            segments2D = [
              {
                x1: p1.x,
                y1: p1.y,
                x2: p2.x,
                y2: p2.y,
                layer: 'WALLS',
                colorIndex: 7,
              },
            ];
          }
        }

        const ifc = wall?.ifc || {};

        props = {
          ifcType: 'IfcWall',
          thickness: ifc.thicknessMm ?? 100,
          height: ifc.heightMm ?? 2800,
          storey: ifc.storey || 'Ground',
          ...(segments2D ? { segments2D } : {}),
        };
      } else if (isDoor) {
        const doorOpenings =
          initRoom?.openings?.filter((o) => o.type === 'door') ?? [];
        const opening = doorOpenings[doorIndex];
        const widthMm = opening?.width ? opening.width * 1000 : 900;
        const heightMm = opening?.height ? opening.height * 1000 : 2100;
        props = {
          ifcType: 'IfcDoor',
          width: widthMm,
          height: heightMm,
          storey: 'Ground',
        };
      } else if (isWindow) {
        const windowOpenings =
          initRoom?.openings?.filter((o) => o.type === 'window') ?? [];
        const opening = windowOpenings[windowIndex];
        const widthMm = opening?.width ? opening.width * 1000 : 1400;
        const heightMm = opening?.height ? opening.height * 1000 : 900;
        const sillHeightMm = opening?.sillHeight
          ? opening.sillHeight * 1000
          : 1000;
        props = {
          ifcType: 'IfcWindow',
          width: widthMm,
          height: heightMm,
          sillHeight: sillHeightMm,
          storey: 'Ground',
        };
      } else {
        props = {
          ifcType: 'IfcBuildingElementProxy',
          storey: 'Ground',
        };
      }

      return props;
    },
    [initRoom]
  );

  const getPropsForMesh = useCallback(
    (mesh) => {
      const props = computeIfcPropsForMesh(mesh);
      const ifcType = props.ifcType || 'IfcBuildingElementProxy';
      return { ifcType, props };
    },
    [computeIfcPropsForMesh]
  );

  const { collectElementsFromGroup, exportDxfFromServer } = useDxfExportPayload({
    rootGroupRef: exportGroupRef,
    getPropsForMesh,
    projectNumber: '1987348',
    version: 'V1.0',
  });

  const buildElementsForIfcAndDxf = useCallback(
    (meshes) => {
      const elements = [];

      for (const m of meshes) {
        const geom = m.geometry;
        if (!geom || !geom.attributes?.position) continue;

        const mat = m.matrixWorld;

        const src = geom.attributes.position.array;
        const world = new Float32Array(src.length);
        const localIfc = new Float32Array(src.length);
        const v = new THREE.Vector3();

        for (let i = 0; i < src.length; i += 3) {
          v.set(src[i], src[i + 1], src[i + 2]).applyMatrix4(mat);
          // world: x, z, y (IFC/CAD axis style: X, Y, Z(=height))
          world[i] = v.x;
          world[i + 1] = v.z;
          world[i + 2] = v.y;

          // local IFC: x, z, y (same swap but no world matrix)
          localIfc[i] = src[i];
          localIfc[i + 1] = src[i + 2];
          localIfc[i + 2] = src[i + 1];
        }

        let indices = [];
        if (geom.index) {
          indices = Array.from(geom.index.array);
        } else {
          const triCount = world.length / 9;
          indices = Array.from({ length: triCount * 3 }, (_, k) => k);
        }

        try {
          const needsFlip = mat.determinant() >= 0;
          if (needsFlip) {
            for (let k = 0; k < indices.length; k += 3) {
              const b = indices[k + 1];
              indices[k + 1] = indices[k + 2];
              indices[k + 2] = b;
            }
          }
        } catch {
          // ignore
        }

        const props = computeIfcPropsForMesh(m);
        const ifcType = props.ifcType || 'IfcBuildingElementProxy';

        elements.push({
          uuid: m.uuid,
          name: m.name || '',
          ifcType,
          props,
          worldPositions: Array.from(world),
          localPositions: Array.from(localIfc),
          matrixWorld: Array.from(mat.elements),
          indices,
        });
      }

      return elements;
    },
    [computeIfcPropsForMesh]
  );

  const exportGLB = useCallback(() => {
    const nodes = collectMeshes();
    const group = new THREE.Group();
    nodes.forEach((o) => group.add(o.clone(true)));
    exporterRef.current.parse(
      group,
      (glb) => {
        const glbArray = glb;
        const glbBlob = new Blob([glbArray], { type: 'model/gltf-binary' });
        const meta = {};

        wallRefs.current.forEach((ref, idx) => {
          if (!ref) return;
          const wall = initRoom.walls[idx];
          const ifc = wall?.ifc || {};
          meta[ref.uuid] = {
            ifcType: ifc.ifcType || 'IfcWall',
            thickness: ifc.thicknessMm ?? 100,
            height: ifc.heightMm ?? 2800,
            storey: ifc.storey || 'Ground',
            color: wall?.color,
          };
        });

        const doorOpenings =
          initRoom.openings?.filter((o) => o.type === 'door') ?? [];
        doorRefs.current.forEach((ref, idx) => {
          if (!ref) return;
          const opening = doorOpenings[idx];
          meta[ref.uuid] = {
            ifcType: 'IfcDoor',
            width: opening?.width ?? 0.9,
            height: opening?.height ?? 2.1,
            storey: 'Ground',
          };
        });

        const windowOpenings =
          initRoom.openings?.filter((o) => o.type === 'window') ?? [];
        windowRefs.current.forEach((ref, idx) => {
          if (!ref) return;
          const opening = windowOpenings[idx];
          meta[ref.uuid] = {
            ifcType: 'IfcWindow',
            width: opening?.width ?? 1.4,
            height: opening?.height ?? 0.9,
            sillHeight: opening?.sillHeight ?? 1.0,
            storey: 'Ground',
          };
        });

        downloadBlob(glbBlob, 'model.glb');
        downloadBlob(
          new Blob([JSON.stringify(meta, null, 2)], {
            type: 'application/json',
          }),
          'model-meta.json'
        );
      },
      (err) => {
        console.error('[GLB] Export error:', err);
        alert('GLB export failed');
      },
      { binary: true }
    );
  }, [collectMeshes, initRoom]);

  const exportIFC = useCallback(async () => {
    const meshes = collectMeshes();
    console.log(
      '[IFC] Preparing elements from meshes:',
      meshes.map((m) => m.uuid)
    );

    const elements = buildElementsForIfcAndDxf(meshes);

    try {
      const res = await fetch('/api/ifc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'Roometry Project',
          schema: 'IFC4',
          format: 'brep',
          bakeWorld: true,
          compat: { useRootContextForBody: true },
          elements,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error('[IFC] Server error:', t);
        alert('IFC export failed: ' + t);
        return;
      }

      const blob = await res.blob();
      downloadBlob(blob, 'export.ifc');
      console.log('[IFC] IFC bytes:', blob.size);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[IFC] Fetch error:', err);
      alert('IFC export failed (network): ' + msg);
    }
  }, [buildElementsForIfcAndDxf, collectMeshes]);

  const exportDXF = useCallback(
    (options) => {
      if (typeof options === 'string') {
        return exportDxfFromServer({ exportFormat: options });
      }
      return exportDxfFromServer(options);
    },
    [exportDxfFromServer]
  );

  const {
    floorGeometry,
    ceilingGeometry,
    height: floorCeilingHeight,
  } = useFloorShapeGeometry(initRoom, {
    extrude: false,
    height: WALL_HEIGHT,
  });

  useEffect(() => {
    setActions?.({ exportGLB, exportIFC, exportDXF });
  }, [setActions, exportGLB, exportIFC, exportDXF]);

  if (!initRoom) return null;

  const openWallDialog = useCallback((wall) => {
    setEditingWall(wall);
  }, []);

  const closeWallDialog = useCallback(() => {
    setEditingWall(null);
  }, []);

  const handleSaveWallStyle = useCallback(
    ({ thicknessMm, color }) => {
      if (!editingWall) return;

      dispatch(
        updateInitRoomWall({
          id: editingWall.id,
          ifc: {
            ...(editingWall.ifc || {}),
            thicknessMm,
          },
          color,
        })
      );

      setEditingWall(null);
    },
    [dispatch, editingWall]
  );

  const handleDeleteWall = useCallback(
    (wall) => {
      dispatch(removeInitRoomWall({ id: wall.id }));
      if (editingWall && editingWall.id === wall.id) {
        setEditingWall(null);
      }
    },
    [dispatch, editingWall]
  );

  const handleAddOpening = useCallback(
    (wallId, type) => {
      if (!wallId || !type) return;
      const id = `o_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const isDoor = type === 'door';
      dispatch(
        addInitRoomOpening({
          id,
          wallId,
          type,
          t: 0.5,
          width: isDoor ? 0.9 : 1.4,
          height: isDoor ? 2.1 : 0.9,
          sillHeight: isDoor ? 0 : 1.0,
        })
      );
    },
    [dispatch]
  );

  const handleUpdateOpening = useCallback(
    (id, patch) => {
      if (!id || !patch) return;
      dispatch(updateInitRoomOpening({ id, patch }));
    },
    [dispatch]
  );

  const handleDeleteOpening = useCallback(
    (id) => {
      if (!id) return;
      dispatch(removeInitRoomOpening({ id }));
    },
    [dispatch]
  );

  return (
    <>
      {/* draggable points */}
      <RoomPoints
        points={initRoom.points}
        wallHeight={WALL_HEIGHT}
        offsetAbove={0.05}
        radius={0.06}
        color="red"
        onPointChange={handlePointChange}
        is2D={is2D}
        controlsRef={controlsRef}
      />

      {/* 🔹 all exportable meshes are children of this group */}
      <group ref={exportGroupRef}>
        {floorGeometry && (
          <mesh
            geometry={floorGeometry}
            position={[0, 0.001, 0]}
            receiveShadow
          >
            <meshStandardMaterial color="#8b4513" side={THREE.BackSide} />
          </mesh>
        )}
        {ceilingGeometry && (
          <mesh
            geometry={ceilingGeometry}
            position={[0, floorCeilingHeight - 0.001, 0]}
          >
            <meshStandardMaterial color="#f5deb3" side={THREE.FrontSide} />
          </mesh>
        )}

        {/* Walls */}
        {initRoom.walls?.map((wall, idx) => {
          const props = getWallProps(wall.start, wall.end);
          if (!props) return null;
          const { p1, p2, position, length, rotation } = props;

          const ifc = wall.ifc || {};
          const thicknessMeters =
            typeof ifc.thicknessMm === 'number'
              ? ifc.thicknessMm / 1000
              : 0.1;

          const color = wall.color || '#ffffff';

          return (
            <DraggableWall
              key={wall.id}
              ref={(el) => (wallRefs.current[idx] = el)}
              wall={wall}
              p1={p1}
              p2={p2}
              position={position}
              length={length}
              rotation={rotation}
              wallHeight={WALL_HEIGHT}
              thickness={thicknessMeters}
              color={color}
              onOpenDialog={openWallDialog}
              is2D={is2D}
              controlsRef={controlsRef}
            />
          );
        })}

        {/* Doors from openings */}
        {(initRoom.openings?.filter((o) => o.type === 'door') ?? []).map(
          (opening, idx) => {
            const wall = initRoom.walls?.find(
              (w) => w.id === opening.wallId
            );
            if (!wall) return null;
            const props = getWallProps(wall.start, wall.end);
            if (!props) return null;
            const { p1, p2, length, rotation } = props;
            if (!length) return null;

            const t = typeof opening.t === 'number' ? opening.t : 0.5;
            const tClamped = Math.max(0, Math.min(1, t));

            const dx = p2.x - p1.x;
            const dz = p2.y - p1.y;
            const dirX = dx / length;
            const dirZ = dz / length;

            const posX = p1.x + dirX * (tClamped * length);
            const posZ = p1.y + dirZ * (tClamped * length);
            const doorWidth = opening.width ?? 0.9;
            const doorHeight = opening.height ?? 2.1;

            return (
              <DraggableDoor
                key={opening.id}
                ref={(el) => (doorRefs.current[idx] = el)}
                position={[posX, doorHeight / 2, posZ]}
                rotation={rotation}
                width={doorWidth}
                height={doorHeight}
                wallP1={{ x: p1.x, z: p1.y }}
                wallP2={{ x: p2.x, z: p2.y }}
                wallHeight={WALL_HEIGHT}
                is2D={is2D}
                controlsRef={controlsRef}
                onPositionChange={(newT) => {
                  handleUpdateOpening(opening.id, { t: newT });
                }}
              />
            );
          }
        )}

        {/* Windows from openings */}
        {(initRoom.openings?.filter((o) => o.type === 'window') ?? []).map(
          (opening, idx) => {
            const wall = initRoom.walls?.find(
              (w) => w.id === opening.wallId
            );
            if (!wall) return null;
            const props = getWallProps(wall.start, wall.end);
            if (!props) return null;
            const { p1, p2, length } = props;
            if (!length) return null;

            const t = typeof opening.t === 'number' ? opening.t : 0.5;
            const tClamped = Math.max(0, Math.min(1, t));
            const width = opening.width ?? 1.4;
            const height = opening.height ?? 0.9;
            const sillHeight = opening.sillHeight ?? 1.0;

            return (
              <Window
                key={opening.id}
                ref={(el) => (windowRefs.current[idx] = el)}
                wallP1={{ x: p1.x, z: p1.y }}
                wallP2={{ x: p2.x, z: p2.y }}
                wallHeight={WALL_HEIGHT}
                width={width}
                height={height}
                sillHeight={sillHeight}
                t={tClamped}
              />
            );
          }
        )}
      </group>

      {/* wall style dialog as fullscreen Html */}
      {editingWall && (
        <Html fullscreen>
          <WallStyleDialog
            open={!!editingWall}
            wall={editingWall}
            wallName={editingWall?.name}
            thicknessMm={editingWall?.ifc?.thicknessMm}
            color={editingWall?.color}
            wallOpenings={
              initRoom.openings?.filter(
                (o) => o.wallId === editingWall.id
              ) ?? []
            }
            onAddOpening={handleAddOpening}
            onUpdateOpening={handleUpdateOpening}
            onDeleteOpening={handleDeleteOpening}
            onSave={handleSaveWallStyle}
            onDelete={() => handleDeleteWall(editingWall)}
            onClose={closeWallDialog}
          />
        </Html>
      )}
    </>
  );
}
