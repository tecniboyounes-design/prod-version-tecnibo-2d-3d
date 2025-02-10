import { Text } from "@react-three/drei";

const InteractivePointMenu = ({ isActive, OPTIONS, handleOptionSelect }) => {
  return (
    isActive && (
      <group 
      position={[0,0.1,0]} 
      rotation={[-Math.PI / 2, 0, 0]}
      >

        <mesh>
          <ringGeometry args={[0.8, 1.5, 32]} />
          <meshBasicMaterial color="blue" transparent opacity={0.6} depthTest={false} />
        </mesh>
        
        

        {/* Option Buttons */}
        {OPTIONS.map((option) => (
          <group key={option.id} position={option.position}>
            {/* Hover Background */}
            <mesh position={[0, 0, -0.01]} renderOrder={2}>
              <circleGeometry args={[0.5]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthTest={false} />
            </mesh>

            {/* Option Button */}
            <mesh
              onClick={(e) => handleOptionSelect(e, option.id)}
              renderOrder={3}
            >
              <circleGeometry args={[0.2]} />
              <meshBasicMaterial transparent opacity={0.8}  edst={false} />
            </mesh>

            {/* Option Label */}
            <Text
              position={[0, -0.45, 0]}
              fontSize={0.15}
              color="gray"
              renderOrder={3}
              depthTest={false}
            >
              {option.label}
            </Text>
          </group>
        ))}
 


      </group>
    )
  );
};


export default InteractivePointMenu;
