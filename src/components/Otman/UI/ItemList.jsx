"use client"

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Typography from '@mui/material/Typography';
import { ArrowDropDown, ArrowLeft, Delete, MoreVert, Visibility } from '@mui/icons-material';
import MuiAccordion from '@mui/material/Accordion';
import MuiAccordionSummary from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import { styled } from '@mui/material/styles';
import BuildIcon from '@mui/icons-material/Build';
import { deleteArticle, setProjectInfo, updateItemQuantity, updatePreview } from '../../../store';
import { useGLTF } from '@react-three/drei';
import { Box, IconButton, Menu, MenuItem, TextField, Tooltip } from '@mui/material';
import { Canvas, DirectionalLight, useLoader, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { TextureLoader } from 'three';
import { Suspense } from 'react';
import * as THREE from "three";
import CircularWithValueLabel from './CircularWithValueLabel';
import { useRouter } from "next/navigation";
import { manageFloorplanInDatabase } from '@/supabaseClient';


const Accordion = styled((props) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(2),
  '&:not(:last-child)': {
    borderBottom: 0,
  },
  '&::before': {
    display: 'none',
  },
}));



const AccordionSummary = styled((props) => (
  <MuiAccordionSummary
    expandIcon={props.expandIcon}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, .03)',
  flexDirection: 'row-reverse',
  [`& .MuiAccordionSummary-expandIconWrapper.Mui-expanded`]: {
    transform: 'rotate(90deg)',
  },
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  [`& .MuiAccordionSummary-content`]: {
    marginLeft: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
  }
}));



const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(0.8),
  borderTop: '1px solid rgba(0, 0, 0, .125)',
}));




export const ItemList = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuItemId, setMenuItemId] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [hoverStates, setHoverStates] = useState({});
  const menuRef = useRef(null);
  const dispatch = useDispatch();
  const items = useSelector((state) => state.jsonData.floorplanner.items);
  const router = useRouter();
  const { floorplan_id } = useSelector((state) => state.jsonData.project);
  




  if (!items || items.length === 0) {
    return (
      <Typography sx={{ textAlign: "center", padding: 2 }}>
        No items to display.
      </Typography>
    );
  }



  const handleAccordionToggle = () => setFilterOpen(!filterOpen);

  const handleBuildClick = (id, item, event) => {
    event.stopPropagation();
    dispatch(updatePreview(item));

    // Check if item contains modelURL
    if (!item?.modelURL) {
      // Navigate to /pngConfig if modelURL is missing
      router.push('/pngConfig');
    } else {
      // Proceed to configurator with modelURL as query param
      const modelURL = item.modelURL;
      router.push(`/configurator/${id}?modelURL=${encodeURIComponent(modelURL)}`);
    }
  };


  const handleOpenMenu = (id, item, event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuItemId(id);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuItemId(null);
  };

  const onDelete = async () => {
    // console.log(`Delete position for item ${menuItemId}`);
    dispatch(deleteArticle(menuItemId));
    handleCloseMenu();
    await manageFloorplanInDatabase('delete', floorplan_id, 'items', { id: menuItemId });
  };


  const onPreview = (item) => {
    dispatch(updatePreview(item));
    dispatch(setProjectInfo("previewArticle"));
    handleCloseMenu();
  };

  const handleHover = (id, type, isHovering) => {
    setHoverStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], [type]: isHovering },
    }));
  };
   
  const handleQuantityChange = async (itemId, value) => {
    const newQuantity = Math.max(1, Number(value));
    setQuantities((prev) => ({ ...prev, [itemId]: newQuantity }));
    dispatch(updateItemQuantity({ id: itemId, quantity: newQuantity }));
    try {
      await manageFloorplanInDatabase('update', floorplan_id, 'items', { id: itemId, quantity: newQuantity });
      console.log(`✅ Quantity updated for item ID ${itemId} to ${newQuantity}`);
    } catch (error) {
      console.error("Failed to update quantity in the database:", error);
    }
  };

  return (
    <div
      style={{
        marginTop: "20px",
        width: "90%",
        maxHeight: "500px",
        overflowY: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {items.map((item) => {
        const totalPrice = item.price * item.quantity;
        
        return (
          <Accordion key={item.id}>
            <AccordionSummary
              aria-controls={`${item.id}-content`}
              id={`${item.id}-header`}
              expandIcon={filterOpen ? <ArrowDropDown /> : <ArrowLeft />}
              onClick={handleAccordionToggle}
            >
              <Typography component="span">
                {item?.attributes?.name || item?.itemName || "Unnamed Item"}
              </Typography>

              <Box
                sx={{
                  position: "absolute",
                  right: 0,
                  display: "flex",
                  gap: 1,
                }}
              >

                <TextField
                  type="number"
                  variant="outlined"
                  size="small"
                  value={item?.quantity || 1}
                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                  inputProps={{ min: 1 }}
                  sx={{ width: "70px", marginLeft: 2 }}
                />


                <Tooltip title="Configure" arrow>
                  <IconButton
                    onClick={(e) => handleBuildClick(item.id, item, e)}
                    onMouseEnter={() => handleHover(item.id, "build", true)}
                    onMouseLeave={() => handleHover(item.id, "build", false)}
                  >
                    <BuildIcon
                      color={hoverStates[item.id]?.build ? "error" : "inherit"}
                    />
                  </IconButton>
                </Tooltip>

                <Tooltip title="More options" arrow>
                  <IconButton
                    onClick={(e) => handleOpenMenu(item.id, item, e)}
                    onMouseEnter={() => handleHover(item.id, "more", true)}
                    onMouseLeave={() => handleHover(item.id, "more", false)}
                  >
                    <MoreVert
                      color={hoverStates[item.id]?.more ? "error" : "inherit"}
                    />
                  </IconButton>
                </Tooltip>

                <Menu
                  ref={menuRef}
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl) && menuItemId === item.id}
                  onClose={handleCloseMenu}
                  anchorOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                >
                  <MenuItem onClick={onDelete}>
                    <Delete fontSize="small" style={{ marginRight: 8 }} />
                    Delete Position
                  </MenuItem>
                  <MenuItem onClick={() => onPreview(item)}>
                    <Visibility fontSize="small" style={{ marginRight: 8 }} />
                    3D Preview
                  </MenuItem>
                </Menu>
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-around",
                  alignItems: "center",
                }}
              >
                <Typography sx={{ fontSize: "0.7rem" }}>
                  <strong>Label:</strong> {item?.attributes?.label}
                </Typography>

                {/* 🔥 PRICE & QUANTITY UI */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: '2px',
                    width: '35%',
                  }}
                >
                  <Typography sx={{ fontSize: "0.8rem" }}>
                    <strong>Unit Price:</strong> {item.price} <span>&#8364;</span>
                  </Typography>
                  <Typography sx={{ fontSize: "0.8rem" }}>
                    <strong>Total Price:</strong> {totalPrice} <span>&#8364;</span>
                  </Typography>
                </Box>


              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}

    </div>
  );
};





export const Floor = () => {
  const texture = useLoader(THREE.TextureLoader, "/models/textures/laminate_floor_03_diff_4k.jpg");

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[600, 600]} />
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
};



const GLTFModel = () => {
  const { modelURL } = useSelector((state) => state.jsonData.previewArticle);
  const { scene } = useGLTF(modelURL, true);
  const group = useRef();
  const boundingBoxRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);


  useEffect(() => {
    if (scene) {
      // console.log("Scene loaded. Preparing bounding box logic...", scene);

      console.log('im,ran', group);
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();

      box.getSize(size);
      box.getCenter(center);

      if (group.current) {
        group.current.position.y = -box.min.y;
      }

      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        opacity: 0,
        transparent: true,
      });

      const boundingBoxMesh = new THREE.Mesh(geometry, material);
      boundingBoxMesh.position.copy(center);

      scene.children.forEach(child => {

        // Check if the child is a Mesh and its geometry is a BoxGeometry
        if (child.isMesh && child.geometry && child.geometry.type === 'BoxGeometry') {
          scene.remove(child);
          // console.log('Removed BoxGeometry:', child);
        }

      });


      // console.log("All children removed from the scene:", scene);
      scene.add(boundingBoxMesh);
      boundingBoxRef.current = boundingBoxMesh;

      // console.log("Bounding box created and added to the scene.");
    }
  }, [scene]);


  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = false;
        }
      });
    }
  }, [scene, modelURL]);


  const handleOnClick = (e) => {
    const door = e.object;
    if (door.name === "Door_mechanism") {
      const rotationValue = isOpen ? 0 : Math.PI / 2;
      door.rotation.y = rotationValue;
      setIsOpen(!isOpen);
    }
  };

  const handlePointerOver = () => {
    setIsHovered(true);
  };

  const handlePointerOut = () => {
    setIsHovered(false);
  };

  useEffect(() => {
    if (boundingBoxRef.current) {
      boundingBoxRef.current.material.opacity = isHovered ? 0.3 : 0;
    }
  }, [isHovered]);


  return (
    <primitive
      ref={group}
      object={scene}
      onClick={handleOnClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
};






const cssStyles = {
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '95%',
    height: '95%',
    objectFit: 'cover',  // This will ensure the image covers the entire area, while maintaining its aspect ratio
    objectPosition: 'center', // This ensures the image is centered if it doesn't fully fill the container
  },
};


export const PreviewImage = () => {
  const item = useSelector((state) => state.jsonData.previewArticle);

  if (!item || !item?.attributes?.image) return null;

  const imageUrl = `https://tecnibo-2d-3d.onrender.com/${item?.attributes?.image}`;

  return (
    <div style={cssStyles.container}>
      <img
        src={imageUrl}
        alt="Preview"
        style={cssStyles.image}
      />
    </div>
  );
};






export const PreviewArticle = () => {
  const item = useSelector((state) => state.jsonData.previewArticle);
  console.log('item:', item);


  return (
    <>
      <Suspense fallback={<Html center><CircularWithValueLabel /></Html>}>

        <GLTFModel modelPath={item?.modelURL} />
        {item?.attributes && <PreviewImage src={item?.attributes} />}

      </Suspense>


      <Floor />
      <ambientLight intensity={1} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={500}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-10}
      />
      <OrbitControls
        minDistance={300}
        maxDistance={800}
        enableZoom
        enablePan
        enableRotate
      />

    </>
  );



};

