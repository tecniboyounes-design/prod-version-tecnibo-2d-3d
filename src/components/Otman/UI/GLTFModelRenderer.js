import React, { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useGLTF } from "@react-three/drei";
import { Typography } from "@mui/material";


const GLTFModel = React.memo(({ items }) => {
const stagedItems = useSelector((state) => state.jsonData.floorplanner.items)
const dispatch = useDispatch();

console.log('staged ',stagedItems)


  return (
    <>
      {stagedItems.map((item, index) => {
        const { id, modelURL, position, rotation, scale, itemName } = item;
        return (
          <ModelRenderer
            key={`${id}-${index}`}           
            id={id}
            modelURL={modelURL}
            position={position}
            rotation={rotation}
            scale={scale}
            name={itemName}
          />
        );
      })}
    </>
  );
});




const ModelRenderer = ({ id, modelURL, position, rotation, scale, name }) => {
  const { scene, error } = useGLTF(modelURL);
  
  if (error) {
    return (
      <Typography color="error">
        Error loading {name || "model"}: {error.message}
      </Typography>
    );
  }

  return (
    <primitive
      object={scene}
      position={position || [0, 0, 0]}
      rotation={ rotation || [0, 0, 0]}
      scale={scale || [0.01, 0.01, 0.01]} 
      onClick={() => console.log(`Item ID: ${id}`)}
    />
  );
};


export default GLTFModel;



