"use client"

import React, { Suspense, useEffect, useRef, useState, lazy } from 'react';
import { Box, Typography, Button, Tooltip, IconButton, MenuItem, Menu, Container } from '@mui/material';
import { Add, ArrowBack, FilterList, Fullscreen, RoomPreferences } from '@mui/icons-material';
import ItemStoreGrid from './Articles';
import { setCurrentConfig, setCurrentStep, setIs2DView, setProjectInfo } from '../../../store';
import { useDispatch, useSelector } from 'react-redux';
import { Droppable } from '../../../HOC/Droppable';
import ProjectInfoBar from './ProjectInfoBar';
import PriceDisplay from './Price';
import { FileUploadAccordion, PricesAccordion, ProjectInfoMenu } from './ProjectInfoMenu';
import { CustomPanel } from './Panel';
import { GradientButtonWithTooltip } from './Button';
import { ItemList, PreviewArticle } from './ItemList';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import CircularWithValueLabel from './CircularWithValueLabel';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { manageVersionHistory, useFetchProjectById } from '@/supabaseClient';
import { articles3D } from '@/data/models';

 const MainComponent = ({ currentView, menuWidth, isDragging, openedItemGrid }) => {
  const dispatch = useDispatch();
  const router = useRouter();

  const handleStartClick = () => {
    dispatch(setCurrentStep(0));
    dispatch(setIs2DView(false));

    const roomConfig = {
      type: 'room',
      id: 'room-1',
    };

    dispatch(setCurrentConfig(roomConfig));
    router.push('/');
  }


  const renderContent = () => {
    switch (currentView) {
      case 'project info':
        return <ProjectInfoMenu menuWidth={menuWidth} isDragging={isDragging} />;
      case 'prices':
        return <PricesAccordion />;
      case 'document':
        return <FileUploadAccordion />;
      case 'showGLTF':
        return <ItemStoreGrid />
      case 'previewArticle':
        return (
          <Canvas
            shadows
            dpr={[1, 2]} // Adaptive resolution
            performance={{ min: 0.1, max: 1 }} // Adjust performance settings
            gl={{ antialias: true }}
            frameloop="demand" 
            // Renders only when necessary
          >
            <Suspense fallback={<Html center><CircularWithValueLabel /></Html>}>
              <PreviewArticle />
            </Suspense>
          </Canvas>
        ); default:
        return (
          <Box
            sx={{
              width: `100%`,
              backgroundColor: '#e0e0e0',
              height: '100%',
              transition: isDragging ? 'none' : 'background-color 0.3s ease',
              borderLeft: '2px solid #ddd',
              position: 'relative',
              padding: '16px',
            }}
          >

            <GradientButtonWithTooltip
              text={"Start Room Planning"}
              onClick={handleStartClick}
              tooltipText={"Go to Room Planning"}
              icon={<RoomPreferences />}
              styles={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            />

            {openedItemGrid ? (
              <ItemStoreGrid menuWidth={menuWidth} />
            ) : (
              <Box
                sx={{
                  width: '90%',
                  height: '90%',
                  marginTop: '80px',
                  marginX: 'auto',
                  border: '2px dashed #888',
                  borderRadius: '8px',
                  backgroundColor: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: '#888',
                    fontWeight: 'bold',
                    fontSize: '16px',
                  }}
                >
                  Create a Room
                </Typography>
              </Box>
            )}
          </Box>
        );
    }
  };

  return <>{renderContent()}</>;
};





const NewProject = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const dispatch = useDispatch();
  const [droppedData, setDroppedData] = useState([]);
  const projectInfo = useSelector((state) => state);
  const items = useSelector((state) => state.jsonData.floorplanner.items);
  // console.log('items', items);
  const fetchProjectById = useFetchProjectById();

  
useEffect(() => {
  fetchProjectById();

}, [])



const handleButtonClick = async () => {
  console.log('Fetching version history...');
  const floorplan_id = '607d355f-46d1-461a-a238-5e581cf2a8f0';
  const arrayType = 'items';
  // Assuming `articles3D[0]` is the new item to add
  const payload = articles3D[3]; 
  const targetVersion = '1.1';
  
  try {
    const res = await manageVersionHistory('C', floorplan_id, arrayType, payload, targetVersion);
    console.log('Version history:', res);
  } catch (error) {
    console.error('API request failed:', error.message);
  }
};










  

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  
  const handleClose = () => {
    setAnchorEl(null);
  };





  const handleDrop = (e) => {
    try {
      const droppedText = e.dataTransfer.getData("text/plain");
      let data;
      try {
        data = JSON.parse(droppedText);
      } catch (jsonError) {
        data = { label: droppedText };
      }
      
      // Add the new item to the array of dropped data
      setDroppedData((prevData) => [...prevData, data]);
      console.log("Dropped data:", data);
    } catch (error) {
      console.error("Failed to parse dropped data:", error);
    }
  };


  const handleOpenedItems = () => { dispatch(setProjectInfo(projectInfo === "showGLTF" ? null : "showGLTF")); };

  const handleBackClick = () => { dispatch(setCurrentStep(null)) };




  return (
    <Container maxWidth="xl" disableGutters sx={{ height: '100vh' }}>
      {/* <Button onClick={handleButtonClick}>Fetch Version History</Button> */}
      <ProjectInfoBar />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          height: '90%',
          overflow: 'hidden',
        }}>


        <CustomPanel
          isPanelVisible={true}
          panelContent={
            <MainComponent
              currentView={projectInfo}
              isDragging={false}
              openedItemGrid={false}
              handleToggleView={() => console.log('Toggle View')}
            />}
        >

          <Box
            sx={{
              flexGrow: 1,
              backgroundColor: '#ffffff',
              padding: '24px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '0px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '90vh',
            }}
          >
            <Link
              href="/"
              style={{ position: "absolute", top: 10, left: 5 }}
              onClick={handleBackClick}
            >
              <Tooltip title="Back to Projects" arrow placement="bottom">
                <ArrowBack sx={{ fontSize: 40, color: '#5f6368' }} />
              </Tooltip>
            </Link>



            <Box
              sx={{
                position: 'absolute',
                top: '16px',
                right: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >




              <GradientButtonWithTooltip
                text={"Add Articles"}
                onClick={handleOpenedItems}
                tooltipText={"Open Articles Library"}
                icon={<Add />}
              />



              <Tooltip title="Filter Options" arrow placement="bottom">
                <IconButton
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    padding: '8px',
                    boxShadow: 2,
                  }}
                  onClick={handleClick}
                >
                  <FilterList />
                </IconButton>
              </Tooltip>


              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                <MenuItem onClick={handleClose}>Position number ascending</MenuItem>
                <MenuItem onClick={handleClose}>Position number descending</MenuItem>
                <MenuItem onClick={handleClose}>Name ascending</MenuItem>
                <MenuItem onClick={handleClose}>Name descending</MenuItem>
                <MenuItem onClick={handleClose}>Quantity ascending</MenuItem>
                <MenuItem onClick={handleClose}>Quantity descending</MenuItem>
                <MenuItem onClick={handleClose}>Total price ascending</MenuItem>
                <MenuItem onClick={handleClose}>Total price descending</MenuItem>
                <MenuItem onClick={handleClose}>Total cost ascending</MenuItem>
                <MenuItem onClick={handleClose}>Total cost descending</MenuItem>
              </Menu>


              <Tooltip title="Expand Section" arrow placement="bottom">
                <IconButton
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    padding: '8px',
                    boxShadow: 2,
                  }}
                  onClick={() => console.log('Expand clicked!')}
                >
                  <Fullscreen />
                </IconButton>
              </Tooltip>


            </Box>





            <Box
              sx={{
                width: '100%',
                height: '86%'

              }}
            >




              <Droppable onDrop={handleDrop}>
                {items.length > 0 ? (
                  <ItemList items={items} />
                ) : (
                  <Typography
                    variant="h6"
                    sx={{
                      color: "#aaa",
                      fontStyle: "italic",
                      fontSize: "20px",
                      display: "flex",
                      fontWieght: 'bold',
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      width: "100%",
                    }}
                  >
                    Drag and drop an article here
                  </Typography>
                )}
              </Droppable>





            </Box>



            {/* <PriceDisplay projectTitle="My New Project" price={100.0} currencySymbol="€" /> */}




          </Box>


        </CustomPanel>





      </Box>

      <PriceDisplay />

    </Container>

  );

};


export default NewProject;





