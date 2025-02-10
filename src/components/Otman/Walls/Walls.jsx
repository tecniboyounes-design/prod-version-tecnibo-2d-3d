import { useDispatch, useSelector } from "react-redux";
import { Box, Edges, Html, Shape } from '@react-three/drei';
import { useEffect, useRef, useState } from "react";
import { setCurrentConfig, updateBothCorners } from "../../../store";
import { cloisonData, cloisonStyles } from "../../../data/models";
import { BackSide, FrontSide } from "three";


const calculateWallData = (walls, corners, wallHeight = 3, isDrawMode) => {
  return walls.map((wall) => {
    const { corner1, corner2, thickness, id, ...otherProps } = wall; 
    const c1 = corners[corner1], c2 = corners[corner2];

    if (!c1 || !c2) return null;

    const width = Math.hypot(c2.x - c1.x, c2.z - c1.z);
    const angle = Math.atan2(c2.z - c1.z, c2.x - c1.x);
    const height = isDrawMode ? Math.max(c1.y, c2.y) : wallHeight;

    return {
      ...otherProps, 
      id,
      position: [(c1.x + c2.x) / 2,  height / 2.68 + 0.1, (c1.z + c2.z) / 2], 
      width,
      angle,
      thickness,
      height,
      corner1,
      corner2,
    };
  }).filter(Boolean);  
};







const UICalculateWallAngle = ({ height, angle, length, cornerPosition, angle90 }) => {
  // console.log('corner position', cornerPosition)

  return (
    <>
      <Html
        position={cornerPosition}
        rotation={[0, angle90 * (Math.PI / 180), 0]}
        center
        style={{
          color: 'red',
          background: 'white',
          padding: '2px 5px',
          borderRadius: '5px',
          fontSize: '12px',
          pointerEvents: 'none',
        }}
      >
        {`${angle90.toFixed(2)}°`}
      </Html>
    </>
  );

};





const WallWidthCalculator = ({ angle, length, position }) => {
  // console.log('UICalculator Params:', { angle, length, unit, position });
  const unit = useSelector((state) => state.jsonData.floorplanner.units);
  const conversionFactors = {
    cm: 100,
    m: 1,
    mm: 1000,
  };

  const convertedLength = (length * conversionFactors[unit]).toFixed(2);

  return (
    <Html
      position={position}
      rotation={[0, -angle, 0]}
      center
      style={{
        color: 'black',
        background: 'none',
        padding: '2px 5px',
        borderRadius: '5px',
        fontSize: '20px',
        pointerEvents: 'none',
      }}
    >
      {`${convertedLength} ${unit}`}
    </Html>
  );
};





const updateWallPoints = (corner1, corner2, mousePosition) => {
  if (!corner1 || !corner2 || !mousePosition) {
    console.error("Invalid input to updateWallPoints:", { corner1, corner2, mousePosition });
    return { pointA: corner1, pointB: corner2 };
  }

  const { x: mouseX, z: mouseZ } = mousePosition;
  const directionX = corner2.x - corner1.x;
  const directionZ = corner2.z - corner1.z;

  const distance = Math.sqrt(directionX ** 2 + directionZ ** 2);
  if (distance === 0) {
    console.warn("Zero-length wall detected. No movement will be applied.");
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





const Wall = ({
  position,
  width,
  height,
  thickness,
  angle,
  angle90,
  corner1Id,
  corner2Id,
  corners,
  wallId,
  wallColor,
}) => {
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dz: 0 });
  const [draggingBlocked, setDraggingBlocked] = useState(false);
  const [virtualWall, setVirtualWall ] = useState(0.2);
  const dispatch = useDispatch();
  const is2D = useSelector((state) => state.jsonData.is2DView);
  const corner1 = corners[corner1Id];
  const corner2 = corners[corner2Id];
  const walls = useSelector((state) => state.jsonData.floorplanner.walls);
  
  const wallCenter = [
    (corner1.x + corner2.x) / 2,
    height / 2,
    (corner1.z + corner2.z) / 2,
  ];

  const handlePointerDown = (e) => {
    if (draggingBlocked) return;
    e.stopPropagation();
    setDragging(true);
    setVirtualWall(20); // Increase thickness while dragging
  
    const point = e.intersections[0]?.point || e.point || {};
    setDragOffset({
      dx: (position[0] || 0) - (point.x || 0),
      dz: (position[2] || 0) - (point.z || 0),
    });
  };
  
  const handlePointerUp = () => {
    setDragging(false);
    setVirtualWall(0.2);
  };
  
  
  const handlePointerMove = (e) => {
    if (!dragging || draggingBlocked) return;
  
    e.stopPropagation();
    const point = e.intersections[0]?.point || e.point || {};
    const mousePosition = {
      x: point.x + dragOffset.dx,
      z: point.z + dragOffset.dz,
    };
  
    if (!corner1 || !corner2) {
      console.error(`Corners ${corner1Id} or ${corner2Id} not found.`);
      return;
    }
  
    if (is2D) {
      // In 2D, restrict movement to the X and Z axes only.
      const { pointA, pointB } = updateWallPoints(corner1, corner2, mousePosition);
      dispatch(
        updateBothCorners({
          corner1Id,
          corner2Id,
          position1: pointA,
          position2: pointB,
        })
      );
    }
  };
  
  

  const handleClick = (e) => {
    const wallConfig = {
      type: 'wall',
      id: wallId,
    };
    dispatch(setCurrentConfig(wallConfig));
  };
  

  const wall = walls.find(w => w.id === wallId);
  let wallStyle = { thickness, wallColor };

  if (wall && wall.wallType) {
    const style = cloisonStyles.find(style => style.name === wall.wallType);
    if (style) {
      wallStyle = {
        thickness: style.thickness,
        wallColor: style.color,
        material: style.material,
        position: style.position,
        rotation: style.rotation,
      };
    }
  }

  // rotation={[0, -angle, 0]}



  const adjustedHeight = is2D ? height : 3;

  console.log('adjusted height:', adjustedHeight)
 
  return (
    <>
      {is2D && (
        <>
          <UICalculateWallAngle height={height} angle={angle} length={width} cornerPosition={position} angle90={angle90} />
          <WallWidthCalculator angle={angle} length={width} position={wallCenter} />
        </>
      )}

   <mesh
      position={position}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      castShadow
      receiveShadow
      rotation={[0, -angle, 0]}
    >
      {is2D ? (
        // 2D Mode: Use BoxGeometry with thickness
        <>
          <boxGeometry args={[width, thickness, adjustedHeight]} />
          <meshStandardMaterial
            color={dragging ? "purple" : wallStyle.wallColor || "white"}
            {...(wallStyle.material || {})}
          />
        </>
      ) : (
        // 3D Mode: Use PlaneGeometry (one-sided)
        <>

          <planeGeometry args={[width, adjustedHeight]} />
          <meshStandardMaterial
            color={dragging ? "purple" : wallStyle.wallColor || "white"}
            {...(wallStyle.material || {})}
            side={FrontSide} // Inside visible, outside invisible
          />
        </>
      )}
      <Edges color="black" lineWidth={2} />
    </mesh>

      <mesh
        position={position}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <Box args={[width, height, virtualWall]} rotation={[0, -angle, 0]}>
          <meshStandardMaterial color="blue" transparent opacity={0}  />
        </Box>
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="blue" transparent opacity={0} />
      </mesh>
    </>
  );
};




const Walls = ({ isDrawMode }) => {
  const walls = useSelector((state) => state.jsonData.floorplanner.walls);
  const corners = useSelector((state) => state.jsonData.floorplanner.corners);
  const wallHeight = useSelector((state) => state.jsonData.wallHieght);
  const wallData = calculateWallData(walls, corners, wallHeight, isDrawMode);
 


  return (
    <>
      {wallData.map((wall, index) => {

        const angle90 = (wall.angle * 180) / Math.PI;

        return (
          <>
            <Wall
 
              key={wall.id}
              wallId={wall.id}
              position={wall.position}
              width={wall.width}
              height={wall.height}
              thickness={wall.thickness}
              angle={wall.angle}
              angle90={angle90}
              corner1Id={wall.corner1}
              corner2Id={wall.corner2}
              corners={corners}
              wallColor={wall.wallColor}

            />
          </>

        );
      })}

    </>
  );
};


export default Walls;
