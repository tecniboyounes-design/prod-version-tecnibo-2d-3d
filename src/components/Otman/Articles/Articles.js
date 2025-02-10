"use client"
import { useState, useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useSelector } from "react-redux";
import * as THREE from "three";

const GLTFDoor = ({ walls }) => {
  const { modelURL } = useSelector((state) => state.jsonData.previewArticle);
  const { scene, nodes, materials } = useGLTF(modelURL, true);
  const group = useRef();
  const doorMeshRef = useRef();
  const mechanismMeshRef = useRef();
  const handleMeshRef = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [closestWall, setClosestWall] = useState(null);

  // Log the "Door_" and "Door_mechanism" nodes to the console for debugging
  useEffect(() => {
    if (scene) {
      console.log('Door_ node:', nodes["Door_"]);
      console.log('Door_mechanism node:', nodes["Door_mechanism"]);
    }
  }, [scene, nodes]);

  return (
    <>
      {scene && (
        <group ref={group} position={[3, 1.5, 0]}>
          {/* Render the "Door_" mesh */}
          {nodes["Door_"] && (
            <mesh
              ref={doorMeshRef}
              geometry={nodes["Door_"].geometry}
              material={nodes["Door_"].material}
              // position={[0, 1.5, 0]} // Adjust position for the door
            />
          )}

          {/* Render the "Door_mechanism" mesh */}
          {nodes["Door_mechanism"] && (
            <mesh
              ref={mechanismMeshRef}
              geometry={nodes["Door_mechanism"].geometry}
              material={nodes["Door_mechanism"].material}
              position={[-0.6, 0, 0]}
            />
          )}

          {/* Render the "Handle" mesh */}
          {nodes["Handle"] && (
            <mesh
              ref={handleMeshRef}
              geometry={nodes["Handle"].geometry}
              material={nodes["Handle"].material}
              position={[0, 0, 0]} 
              rotation={[Math.PI , 0 , 0 ]}
            />
          )}
        </group>
      )}
    </>
  );
};

export default GLTFDoor;
