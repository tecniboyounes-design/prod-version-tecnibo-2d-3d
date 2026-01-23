'use client';

import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import * as THREE from 'three';
import { TextureLoader } from 'three';

/**
 * @param {string} svgUrl      object URL or http(s) URL to an SVG (from your backend)
 * @param {number[]} position  [x,y,z]
 * @param {number[]} rotation  default flat on XZ plane
 * @param {number} worldScale  meters per SVG unit (tune if plan looks too big/small)
 * @param {number} opacity     0..1
 * @param {boolean} fallbackTexture  draw plane with texture if SVG parsing fails
 */

export default function Plan2DSVG({
  svgUrl,
  position = [0, 0.01, 0],
  rotation = [-Math.PI / 2, 0, 0],
  worldScale = 0.001,
  opacity = 0.9,
  fallbackTexture = true,
}) {
  let data = null;
  try {
    data = useLoader(SVGLoader, svgUrl);
  } catch (_) {
    data = null;
  }

  const group = useMemo(() => {
    if (!data) return null;
    const g = new THREE.Group();

    for (const path of data.paths) {
      const fill = path.userData?.style?.fill;
      const stroke = path.userData?.style?.stroke;
      const style = path.userData?.style || {};

      if (fill && fill !== 'none') {
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(fill),
          opacity,
          transparent: opacity < 1,
          depthWrite: false,
        });
        const shapes = SVGLoader.createShapes(path);
        for (const s of shapes) g.add(new THREE.Mesh(new THREE.ShapeGeometry(s), mat));
      }

      if (stroke && stroke !== 'none') {
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(stroke),
          opacity,
          transparent: opacity < 1,
          depthWrite: false,
        });

        for (const sub of path.subPaths) {
          const geo = SVGLoader.pointsToStroke(sub.getPoints(), style);
          if (geo) g.add(new THREE.Mesh(geo, mat));
          else {
            const pts = sub.getPoints().map(p => new THREE.Vector3(p.x, 0, p.y));
            const buf = new THREE.BufferGeometry().setFromPoints(pts);
            g.add(new THREE.Line(buf, new THREE.LineBasicMaterial({ color: stroke, opacity, transparent: opacity < 1 })));
          }
        }
      }
    }

    // center & scale
    const box = new THREE.Box3().setFromObject(g);
    const center = new THREE.Vector3();
    box.getCenter(center);
    g.position.x = -center.x;
    g.position.y = -center.y;
    g.position.z = -center.z;
    g.scale.setScalar(worldScale);

    return g;
  }, [data, worldScale, opacity]);

  if (group) {
    return (
      <group position={position} rotation={rotation}>
        <primitive object={group} />
      </group>
    );
  }

  if (fallbackTexture && svgUrl) {
    const tex = useLoader(TextureLoader, svgUrl);
    const w = (tex?.image?.width || 1000) * worldScale;
    const h = (tex?.image?.height || 1000) * worldScale;
    return (
      <mesh position={position} rotation={rotation}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    );
  }

  return null;
}
