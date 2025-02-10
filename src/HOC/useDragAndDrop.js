// @ts-nocheck
import { useCallback, useEffect, useState } from "react"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"

/**
 * Custom hook for handling drag and drop interactions in Three.js scenes
 * @param {Object} options - Configuration options
 * @param {THREE.Mesh} options.targetRef - Reference to the mesh that can receive drops
 * @param {Function} options.onDrop - Callback function when drop occurs (receives worldPosition and original event)
 * @param {boolean} options.requireHover - Whether drop should only occur when hovering over target (default: false)
 * @param {boolean} options.usePlaneIntersection - Whether to use plane intersection instead of mesh intersection (default: false)
 * @returns {Object} - Hook return values including hover state and helper functions
 */


export const useThreeDragDrop = ({
  targetRef,
  onDrop,
  requireHover = false,
  usePlaneIntersection = false
}) => {
  const { camera, gl, size } = useThree()
  const [isHovered, setIsHovered] = useState(false)

  const convertMouseToWorldPosition = useCallback(
    (clientX, clientY) => {
      // Calculate normalized device coordinates (-1 to +1)
      const x = (clientX / size.width) * 2 - 1
      const y = -(clientY / size.height) * 2 + 1

      if (usePlaneIntersection) {
        // Use plane intersection (for ground plane drops)
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        const intersectionPoint = new THREE.Vector3()
        raycaster.ray.intersectPlane(plane, intersectionPoint)
        return intersectionPoint
      } else {
        // Use mesh intersection
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera({ x, y }, camera)
        return raycaster
      }
    },
    [camera, size, usePlaneIntersection]
  )

  useEffect(() => {
    const handleDragOver = event => {
      event.preventDefault()
    }

    const handleDrop = event => {
      event.preventDefault()

      // Check hover requirement
      if (requireHover && !isHovered) return

      const worldPosition = convertMouseToWorldPosition(
        event.clientX,
        event.clientY
      )

      if (usePlaneIntersection) {
        // For plane intersection
        if (worldPosition && onDrop) {
          onDrop(worldPosition, event)
        }
      } else {
        // For mesh intersection
        if (targetRef.current && worldPosition) {
          const intersects = worldPosition.intersectObject(targetRef.current)
          if (intersects.length > 0 && onDrop) {
            onDrop(intersects[0].point, event)
          }
        }
      }
    }

    const canvas = gl.domElement
    canvas.addEventListener("dragover", handleDragOver)
    canvas.addEventListener("drop", handleDrop)

    return () => {
      canvas.removeEventListener("dragover", handleDragOver)
      canvas.removeEventListener("drop", handleDrop)
    }
  }, [
    convertMouseToWorldPosition,
    onDrop,
    isHovered,
    requireHover,
    targetRef,
    gl
  ])

  return {
    isHovered,
    setIsHovered,
    convertMouseToWorldPosition
  }
}
