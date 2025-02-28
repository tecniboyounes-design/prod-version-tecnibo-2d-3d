"use client"

import React, { useMemo, useState } from 'react';
import {
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Stack,
  Box,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Html, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGLTF } from '@react-three/drei';
import { InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import withDraggable from '../../../HOC/Draggable';
import CircularWithValueLabel from './CircularWithValueLabel';
import QuincailleriesViewer from './QuincailleriesViewer';
import { AddCircle, BuildCircle } from '@mui/icons-material';
import { articles3D } from '../../../data/models';
import { pushArticles } from '@/store';
import { manageFloorplanInDatabase } from '@/supabaseClient';

const ItemStoreGrid = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Door');
  const categories = ['3D Articles', 'Room', 'Door', 'Kitchen', 'Office Catalog'];

  const filteredItems = useMemo(() => {
    return articles3D.filter(item =>
      (activeCategory === 'All' || item.category === activeCategory) &&
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [articles3D, searchQuery, activeCategory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', backgroundColor: 'rgb(224, 224, 224)' }}>

      {/* Search and Category Filter */}
      <div style={{ position: 'relative', backgroundColor: 'transparent', zIndex: 10, padding: '16px' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 40,
              borderRadius: 25,
              '& fieldset': {
                borderColor: 'rgb(242,113,33)',
              },
              '&:hover fieldset': {
                borderColor: 'rgb(233,64,87)',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'rgb(233,64,87)',
              },
            },
            '& .MuiInputBase-input': {
              paddingLeft: '12px',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <Stack spacing={1} direction="row" justifyContent="center" sx={{ mt: 2 }}>
          {categories.map((category, index) => (
            <Button
              key={index}
              variant={activeCategory === category ? "contained" : "outlined"}
              onClick={() => setActiveCategory(category)}
              sx={{
                fontSize: "0.75rem",
                padding: "4px 8px",
                minWidth: "auto",
                background: activeCategory === category
                  ? 'linear-gradient(136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)'
                  : 'transparent',
                color: activeCategory === category ? 'white' : 'rgb(242,113,33)',
                border: activeCategory === category ? 'none' : '1px solid rgb(242,113,33)',
                transition: 'transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease, filter 0.3s ease',
                '&:hover': {
                  background: activeCategory === category
                    ? 'linear-gradient(136deg, rgb(255,128,0) 0%, rgb(255,85,127) 50%, rgb(158,50,158) 100%)'
                    : 'rgba(242,113,33, 0.1)',
                  transform: 'scale(1.05)',
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.2)',
                  filter: 'brightness(1.1)',
                },
              }}
            >
              {category}
            </Button>
          ))}
        </Stack>
      </div>

      {activeCategory === 'Office Catalog' ? (
        <QuincailleriesViewer xmlPath={"/data/Quinquailleries.xml"} imagesDir={"/QUINCAILLERIES/"} />
      ) : activeCategory === 'Kitchen' ? (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <QuincailleriesViewer xmlPath={"/data/Kitchen.xml"} imagesDir={"/"} />
        </div>
      ) : activeCategory === '3D Articles' ? (
        <DraggableItemGrid items={filteredItems} />
      ) : activeCategory === 'Door' ? (
        <QuincailleriesViewer xmlPath={"/data/DOORS.xml"} imagesDir={"/"} />

      ) : (
        <DraggableItemGrid items={filteredItems} />
      )}


    </div>
  );
};



















export const DraggableItemGrid = () => {
const dispatch = useDispatch();
  const { floorplan_id } = useSelector((state) => state.jsonData.project);


  const handleAdd = async (item) => {
    try {
      dispatch(pushArticles(item));

        await manageFloorplanInDatabase('add', floorplan_id, 'items', item);
        
        // Then update state with the saved item (use response data if needed)
        
        console.log('Adding item to state:', item); // Fixed variable name
    } catch (error) {
        console.error("Failed to add item to the database:", error);
        // Consider rolling back state here if needed
    }
};

  return (
    <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "16px",
      padding: "16px",
      width: "100%",
      maxHeight: "500px", // Set max height to enable scrolling
      overflowY: "auto",  // Enable vertical scrolling
      overflowX: "hidden", // Prevent horizontal scroll
    }}
  >
  
      {articles3D.map((item) => (
        <Box key={item.id} sx={{ position: "relative" }}>
          {/* <DraggableCard id={item.id} item={item}> */}
            <Card  sx={{ boxShadow: 3, padding: "16px", height: "290px" }}>
              <CardContent
                sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <Canvas>
                  <Suspense fallback={<Html center><CircularWithValueLabel /></Html>}>
                    <GLTFModel modelPath={item.modelURL} />
                  </Suspense>
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[5, 5, 5]} intensity={1} />
                  <OrbitControls
                    minDistance={250}
                    maxDistance={350}
                    enableZoom
                    enablePan
                    enableRotate
                  />
                </Canvas>
                <Typography variant="body1" align="center" sx={{ mt: 1 }}>
                  {item.itemName}
                </Typography>
              </CardContent>
            </Card>
          {/* </DraggableCard> */}

          <Box
            sx={{
              position: "absolute",
              top: 5,
              right: 5,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              zIndex: 2,
            }}
          >
            <Tooltip title="Configure Article" arrow placement="left">
              <IconButton
              // onClick={() => handleBuild(item)}
              >
                <BuildCircle color="secondary" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Insert Article" arrow placement="left">
              <IconButton
              onClick={() => handleAdd(item)}
              >
                <AddCircle color="primary" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      ))}
    </div>
  );
};





const GLTFModel = ({ modelPath }) => {
  const { scene } = useGLTF(modelPath);
  return scene ? <primitive object={scene} /> : <Html center>Loading...</Html>;
};

export default ItemStoreGrid;