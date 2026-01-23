// /app/ifc_test/Window.jsx
'use client';

import React, { forwardRef } from 'react';
import * as THREE from 'three';

const Window = forwardRef(function Window(
  {
    wallP1,
    wallP2,
    wallHeight = 2.8,
    width = 1.2,
    height = 1.0,
    sillHeight = 1.0,
    color = '#2563eb',
    t = 0.5, // 0..1 along wall
  },
  ref
) {
  if (!wallP1 || !wallP2) return null;

  const dx = wallP2.x - wallP1.x;
  const dz = wallP2.z - wallP1.z;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  const angle = Math.atan2(dz, dx);

  const tClamped = Math.max(0, Math.min(1, t));
  const nx = wallP1.x + (dx / len) * (tClamped * len);
  const nz = wallP1.z + (dz / len) * (tClamped * len);

  const cy = sillHeight + height / 2;

  return (
    <mesh
      ref={ref}
      position={[nx, cy, nz]}
      rotation={[0, -angle, 0]}
      castShadow={false}
      receiveShadow={false}
      name="Window_01"
    >
      <boxGeometry args={[width, height, 0.08]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.4}
        wireframe
        side={THREE.DoubleSide}
      />
    </mesh>
  );
});

export default Window;
