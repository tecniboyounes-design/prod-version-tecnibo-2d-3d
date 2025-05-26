import React from "react";
import { Html } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";

/**
 * Plan2DImage component displays a 2D architectural plan image using drei's Html overlay.
 * @param {Object} props
 * @param {string} props.src - The image source URL.
 * @param {Array} [props.position=[0, 0, 0]] - The 3D position for the Html overlay.
 * @param {Array} [props.rotation=[-Math.PI / 2, 0, 0]] - The rotation for the Html overlay (default: flat on XZ plane).
 * @param {Object} [props.style] - Optional style for the image.
 */
const Plan2DImage = ({
  src,
  position = [0, 0.01, 0],
  rotation = [-Math.PI / 2, 0, 0],
  style,
  width = 50, // width in 3D units
  height = 50, // height in 3D units
}) => {
  if (!src) return null;
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={useImageTexture(src)}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </mesh>
  );
};

// Helper hook to load a texture from an image URL
function useImageTexture(src) {
  return useLoader(TextureLoader, src);
}

export default Plan2DImage;
