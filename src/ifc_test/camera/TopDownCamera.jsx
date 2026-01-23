// /src/ifc_test/components/camera/TopDownCamera.jsx
'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * TopDownCamera
 *
 * Simple camera controller:
 *  - On mode/center change, positions the camera and updates OrbitControls target.
 *  - No per-frame animation; OrbitControls owns zoom/pan/orbit.
 */
export default function TopDownCamera({
  mode = '2D',
  center = [0, 0, 0],
  distance = 10,
  default3DPosition = [3, 3, 3],
  controlsRef,
}) {
  const { camera } = useThree();

  useEffect(() => {
    const [cx, cy, cz] = center;
    const [dx, dy, dz] = default3DPosition;

    console.log('[TopDownCamera] effect', {
      mode,
      center,
      distance,
      default3DPosition,
      hasControlsRef: !!controlsRef?.current,
    });

    if (mode === '2D') {
      // Top-down: camera above room center
      camera.position.set(cx, distance, cz);
      // CAD-style: screen up points to negative Z (optional)
      camera.up.set(0, 0, -1);
    } else {
      // Classic 3D orbit start
      camera.position.set(dx, dy, dz);
      camera.up.set(0, 1, 0);
    }

    camera.lookAt(cx, cy, cz);
    camera.updateProjectionMatrix();

    if (controlsRef?.current) {
      controlsRef.current.target.set(cx, cy, cz);
      controlsRef.current.update();
      console.log('[TopDownCamera] synced OrbitControls target', {
        target: controlsRef.current.target.toArray(),
      });
    } else {
      console.log('[TopDownCamera] no controlsRef, only camera updated', {
        cameraPos: camera.position.toArray(),
      });
    }
  }, [camera, mode, center, distance, default3DPosition, controlsRef]);

  return null;
}