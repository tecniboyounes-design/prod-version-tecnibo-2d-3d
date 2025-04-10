"use client";

import { useState, useRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useSelector } from "react-redux";
import * as THREE from "three";

const GLTFDoor = () => {
    const { modelURL } = useSelector((state) => state.jsonData.previewArticle);
    const { scene, nodes } = useGLTF(modelURL || '/models/InWallFloorItems/Door.glb', true);
    const group = useRef();

    const [position, setPosition] = useState(new THREE.Vector3(3, 1.5, 0));
    const [isDragging, setIsDragging] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const PLANE_SIZE = 10;

    /**
    * Handles when the user starts dragging the door.
    */
    const handlePointerDown = (e) => {
        e.stopPropagation();
        setIsDragging(true);
    };

    /**
    * Handles when the user releases the drag.
    */
    const handlePointerUp = () => {
        setIsDragging(false);
    };

    /**
    * Handles door movement within the plane boundaries.
    */

    const handlePointerMove = (e) => {
        if (isDragging) {
            const newPosition = new THREE.Vector3(
                THREE.MathUtils.clamp(e.point.x, -PLANE_SIZE, PLANE_SIZE),
                1.5, // Keep the Y position fixed
                THREE.MathUtils.clamp(e.point.z, -PLANE_SIZE, PLANE_SIZE)
            );
            setPosition(newPosition);
        }
    };

    /**
    * Toggles the door rotation between open and closed.
    */
    const handleDoorClick = () => {
        setIsOpen((prev) => !prev);
    };

    const doorRotation = useMemo(() => (isOpen ? Math.PI / 2 : 0), [isOpen]);

    // Memoized door and handle positions for optimization
    const doorMechanismPosition = useMemo(() => [-0.6, 0, 0], []);
    const handlePosition = useMemo(() => [0, 0, 0], []);

    return (
        <>
            {/* Plane to restrict door movement */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="lightgray" opacity={0} transparent />
            </mesh>

            {scene && (
                <group
                    ref={group}
                    position={position.toArray()}
                    onClick={handleDoorClick}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                >

                    {/* Door frame */}
                    {nodes["Door_"] && (
                        <mesh geometry={nodes["Door_"].geometry} material={nodes["Door_"].material} />
                    )}

                    {/* Door mechanism (toggles between open and closed) */}
                    {nodes["Door_mechanism"] && (
                        <mesh
                            geometry={nodes["Door_mechanism"].geometry}
                            material={nodes["Door_mechanism"].material}
                            position={doorMechanismPosition}
                            rotation={[0, doorRotation, 0]}
                        >
                            {/* Handle follows the door mechanism */}
                            {nodes["Handle"] && (
                                <mesh
                                    geometry={nodes["Handle"].geometry}
                                    material={nodes["Handle"].material}
                                    position={handlePosition}
                                    rotation={[Math.PI, 0, 0]}
                                />
                            )}
                        </mesh>
                    )}
                </group>
            )}
        </>
    );
};

export default GLTFDoor;