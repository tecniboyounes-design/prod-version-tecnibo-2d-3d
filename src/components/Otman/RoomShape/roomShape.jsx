"use client"

import React, { useState } from 'react';
import Points from '../Points/Points';
import Box from '@mui/material/Box';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility'; // Eye icon for 2D
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'; // Eye icon for 3D
import SettingsIcon from '@mui/icons-material/Settings'; // Settings icon
import { Button, Divider, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { setHouse, setIs2DView } from '../../../store';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import { CustomPanel } from '../UI/Panel';
import { TextField, Select, MenuItem, FormControl, InputLabel, Switch, Grid, FormControlLabel, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Dialog, Paper, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { dialogsData } from '../../../data/models';
import { houses } from '../../../data/models';
import DownloadStateOnMount from '../../../HOC/DownloadStateOnMount';


export const FloatingSpeedDial = ({ actions }) => {
  const [openSpeedDial, setOpenSpeedDial] = useState(false);

  const handleSpeedDialHover = () => setOpenSpeedDial(true);
  const handleSpeedDialLeave = () => setOpenSpeedDial(false);

  React.useEffect(() => {
    setOpenSpeedDial(true);
    const timer = setTimeout(() => setOpenSpeedDial(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box sx={{ height: '100%', transform: 'translateZ(0px)', flexGrow: 1 }}>
      <SpeedDial
        ariaLabel="SpeedDial basic example"
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          '& .MuiSpeedDial-fab': {
            background: 'linear-gradient(136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
            color: 'white',
          },
        }}
        icon={<SpeedDialIcon style={{ color: 'white' }} />}
        open={openSpeedDial}
        onMouseEnter={handleSpeedDialHover}
        onMouseLeave={handleSpeedDialLeave}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            sx={{
              background: 'linear-gradient(136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
              color: 'white',
            }}
            onClick={action.action}
          />
        ))}
      </SpeedDial>
    </Box>
  );
};





export const RoomShape = () => {
  const is2DView = useSelector((state) => state.jsonData.is2DView);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [openSpeedDial, setOpenSpeedDial] = useState(false);
  const dispatch = useDispatch();



  const toggleView = () => {
    dispatch(setIs2DView(!is2DView));
  };

  const actions = [
    { icon: <SaveIcon style={{ color: 'white' }} />, name: 'Save' },
    { icon: <FilterNoneIcon style={{ color: 'white' }} />, name: 'Start Wall View' },
    {
      icon: is2DView ? <VisibilityOffIcon style={{ color: 'white' }} /> : <VisibilityIcon style={{ color: 'white' }} />,
      name: is2DView ? '3D View' : '2D View',
      action: toggleView, // Toggle the view on click
    },
    {
      icon: <SettingsIcon style={{ color: 'white' }} />,
      name: 'Settings',
      action: () => setIsPanelVisible(!isPanelVisible),
    }
  ];

  const handleSpeedDialHover = () => {
    setOpenSpeedDial(true);
  };
  const handleSpeedDialLeave = () => {
    setOpenSpeedDial(false);
  };

  React.useEffect(() => {
    // Open the SpeedDial on mount
    setOpenSpeedDial(true);

    // Set a timeout to close it after a while (e.g., 5 seconds)
    const timer = setTimeout(() => {
      setOpenSpeedDial(false);
    }, 5000); // Adjust time as necessary

    // Cleanup timeout on unmount
    return () => {
      clearTimeout(timer);
    };
  }, []);


  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow:'hidden' }}>
     <DownloadStateOnMount />
      <div
        style={{ width: '100px', position: 'relative', zIndex: 1000 }}
      >
        <FloatingSpeedDial
          open={openSpeedDial}
          actions={actions}
          onMouseEnter={handleSpeedDialHover}
          onMouseLeave={handleSpeedDialLeave}
        />
      </div>

      <CustomPanel
        isPanelVisible={true}
        panelContent={isPanelVisible ? <CustomMenu setIsPanelVisible={setIsPanelVisible} /> : <RoomShapes />}
      >
        <Points />
      </CustomPanel>

    </div>
  );


};


export const CustomMenu = ({ setIsPanelVisible }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [helpKey, setHelpKey] = useState('');
    const [unit, setUnit] = useState('cm');
    const [snappingDistance, setSnappingDistance] = useState(1);
    const [measuring, setMeasuring] = useState('Room and Article Measures');
    const [wallNumbers, setWallNumbers] = useState('on');
    const [positionNumbers, setPositionNumbers] = useState('off');
    const [ruler, setRuler] = useState('on');
    const [laserTape, setLaserTape] = useState('off');
    const [laserHeight, setLaserHeight] = useState(50);
    const [shadows, setShadows] = useState('on');
    const [roomLock, setRoomLock] = useState('off');
    const [showFronts, setShowFronts] = useState('on');
    const [cuttingDistance, setCuttingDistance] = useState(65);
    const [fontSize, setFontSize] = useState(15);

  const openDialog = (key) => {
    setHelpKey(key);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  const handleClose = () => {
    setIsPanelVisible(false);
  }





  return (

    <>
    {/* <DownloadStateOnMount /> */}

      <Box
        sx={{
          width: '100%',
          maxHeight: '90vh',
          background: 'linear-gradient(145deg, #f3f4f6, #ffffff)',  // Light gradient for depth
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: '20px',
          gap: '16px',
          overflowY: 'auto',
          borderRadius: '12px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 6px 15px rgba(0, 0, 0, 0.15)',
            background: 'linear-gradient(145deg, #f9fafb, #ffffff)', // Lighter gradient on hover
          },
        }}
      >


        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <Typography variant="h6" style={{ color: 'black' }}>
            Options
          </Typography>

          <IconButton
            sx={{
              '&:hover': {
                backgroundImage: 'linear-gradient(95deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
                color: 'white',
              },
              borderRadius: '50%', 
              padding: '8px', 
            }}
            aria-label="close"
            onClick={handleClose} 
          >
            <CloseIcon />
          </IconButton>
        </Box>




        <Box sx={{ width: '100%' }}>
      {/* Unit of Measurement */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Unit of Measurement</Typography>
        </Box>
        <Box flex={4}>
          <FormControl fullWidth>
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <MenuItem value="m">m</MenuItem>
              <MenuItem value="cm">cm</MenuItem>
              <MenuItem value="mm">mm</MenuItem>
              <MenuItem value="ft">ft</MenuItem>
              <MenuItem value="inch">inch</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Unit of Measurement')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'red', height: '4px', marginTop: '16px', marginBottom: '16px' }} />

      {/* Snapping Distance */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Snapping Distance</Typography>
        </Box>
        <Box flex={4}>
          <TextField
            fullWidth
            type="number"
            value={snappingDistance}
            onChange={(e) => setSnappingDistance(e.target.value)}
          />
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Snapping Distance')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'red', height: '4px', marginTop: '16px', marginBottom: '16px' }} />

      {/* Measuring */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Measuring</Typography>
        </Box>
        <Box flex={4}>
          <FormControl fullWidth>
            <Select value={measuring} onChange={(e) => setMeasuring(e.target.value)}>
              <MenuItem value="Room and Article Measures">Room and Article Measures</MenuItem>
              <MenuItem value="off">Off</MenuItem>
              <MenuItem value="Room Measures">Room Measures</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Measuring')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      {/* Wall Numbers */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Wall Numbers</Typography>
        </Box>
        <Box flex={4}>
          <FormControl fullWidth>
            <Select value={wallNumbers} onChange={(e) => setWallNumbers(e.target.value)}>
              <MenuItem value="on">On</MenuItem>
              <MenuItem value="off">Off</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Wall Numbers')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      {/* Position Numbers */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Position Numbers</Typography>
        </Box>
        <Box flex={4}>
          <FormControl fullWidth>
            <Select value={positionNumbers} onChange={(e) => setPositionNumbers(e.target.value)}>
              <MenuItem value="on">On</MenuItem>
              <MenuItem value="off">Off</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Position Numbers')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      {/* Ruler */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Ruler</Typography>
        </Box>
        <Box flex={4}>
          <FormControl fullWidth>
            <Select value={ruler} onChange={(e) => setRuler(e.target.value)}>
              <MenuItem value="on">On</MenuItem>
              <MenuItem value="off">Off</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Ruler')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      {/* Laser Tape */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Laser Tape</Typography>
        </Box>
        <Box flex={4}>
          <FormControl fullWidth>
            <Select value={laserTape} onChange={(e) => setLaserTape(e.target.value)}>
              <MenuItem value="on">On</MenuItem>
              <MenuItem value="off">Off</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Laser Tape')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      {/* Height of Laser */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Height of Laser</Typography>
        </Box>
        <Box flex={4}>
          <TextField
            fullWidth
            type="number"
            value={laserHeight}
            onChange={(e) => setLaserHeight(e.target.value)}
          />
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Height of Laser')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'red', height: '4px', marginTop: '16px', marginBottom: '16px' }} />

      {/* Shadows */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Shadows</Typography>
        </Box>
        <Box flex={4}>
          <FormControl fullWidth>
            <Select value={shadows} onChange={(e) => setShadows(e.target.value)}>
              <MenuItem value="on">On</MenuItem>
              <MenuItem value="off">Off</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Shadows')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      {/* Room Lock */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Room Locked</Typography>
        </Box>
        <Box flex={4}>
          <FormControl fullWidth>
            <Select value={roomLock} onChange={(e) => setRoomLock(e.target.value)}>
              <MenuItem value="on">On</MenuItem>
              <MenuItem value="off">Off</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Room Locked')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'red', height: '4px', marginTop: '16px', marginBottom: '16px' }} />

      {/* Show Fronts */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Show Fronts</Typography>
        </Box>
        <Box flex={4}>
          <FormControl fullWidth>
            <Select value={showFronts} onChange={(e) => setShowFronts(e.target.value)}>
              <MenuItem value="on">On</MenuItem>
              <MenuItem value="off">Off</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Show Fronts')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      {/* Cutting Distance */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Cutting Distance</Typography>
        </Box>
        <Box flex={4}>
          <TextField
            fullWidth
            type="number"
            value={cuttingDistance}
            onChange={(e) => setCuttingDistance(e.target.value)}
          />
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Cutting Distance')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      {/* Font Size */}
      <Box display="flex" alignItems="center" mb={2}>
        <Box flex={6}>
          <Typography sx={{ fontSize: '0.8rem' }}>Font Size</Typography>
        </Box>
        <Box flex={4}>
          <TextField
            fullWidth
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
          />
        </Box>
        <IconButton aria-label="help" sx={{ padding: '8px' }} onClick={() => openDialog('Font Size')}>
          <HelpOutlineIcon />
        </IconButton>
      </Box>
    </Box>


      </Box >


      <HelpDialog open={isDialogOpen} onClose={closeDialog} title={helpKey} />

    </>

  );
};




export const HelpDialog = ({ open, onClose, title }) => {

  const dialogContent = dialogsData.find(dialog => dialog.title === title);

  if (!dialogContent) {
    console.error(`No dialog content found for title: ${title}`);
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* Dialog Title with Close Button */}
      <DialogTitle sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="h6">{dialogContent.title || 'default'}</Typography>
        <IconButton
          onClick={onClose}
          aria-label="close"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Dialog Content */}
      <DialogContent>
        {dialogContent.image && (
          <Box sx={{ textAlign: 'center', marginBottom: '16px' }}>
            <img
              src={dialogContent.image || "https://cdn.netshop.imos3d.com/navigram/ix-net-2021-sr1/tooltips/option-cutting-distance.png"}
              alt="Help Content"
              style={{ maxWidth: '100%', height: 'auto', marginBottom: '16px' }}
            />
          </Box>
        )}


        {dialogContent.description?.intro && (
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-line',
              textAlign: 'justify',
              lineHeight: 1.8,
              fontSize: '1rem',
              color: 'text.primary',
              marginBottom: 2,
            }}
          >
            {dialogContent.description.intro}
          </Typography>
        )}


        {/* List of Units */}
        {dialogContent?.description?.units?.length > 0 && (
          <Box sx={{ paddingLeft: 2, marginBottom: 2 }}>
            {dialogContent.description.units.map((unit, index) => (
              <Typography
                key={index}
                variant="body2"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '1rem',
                  color: 'text.secondary',
                }}
              >
                <strong>{unit.label || 'label'}</strong> — {unit.meaning || 'label'}
              </Typography>
            ))}
          </Box>
        )}


        {/* Note */}
        {dialogContent?.description?.note && (
          <Typography
            variant="body2"
            sx={{
              fontStyle: 'italic',
              color: 'text.secondary',
              textAlign: 'justify',
              lineHeight: 1.6,
            }}
          >
            {dialogContent.description.note}
          </Typography>
        )}




      </DialogContent>

      {/* Dialog Actions */}
      <DialogActions sx={{ justifyContent: 'center' }}>
        <Button
          onClick={onClose}
          sx={{
            background: 'linear-gradient(95deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
            color: 'white',
            textTransform: 'none',
            padding: '8px 24px',
            '&:hover': {
              background: 'linear-gradient(95deg, rgb(233,64,87) 0%, rgb(138,35,135) 50%, rgb(242,113,33) 100%)',
            },
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};






export const RoomShapes = () => {
  const dispatch = useDispatch()

  const generateRandomTitle = () => {
    const titles = ['Cozy Cottage', 'Spacious Mansion', 'Modern Apartment', 'Luxury Villa', 'Charming Cabin', 'Stylish Loft', 'Sunny Bungalow', 'Elegant Estate', 'Rustic Retreat'];
    return titles[Math.floor(Math.random() * titles.length)];
  };
  
  const generateRandomDescription = () => {
    const descriptions = ['A beautiful home with a stunning view.', 'Modern amenities and spacious rooms.', 'Perfect for a family looking for comfort.', 'A peaceful retreat with ample garden space.', 'Close to all the action and entertainment.', 'A sleek and modern design with high-end finishes.', 'A bright and airy home, perfect for relaxation.', 'An exclusive property with luxurious details.', 'A getaway home surrounded by nature and tranquility.'];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  };
  

  const handleHouseClick = (house) => {
    console.log(`House : ${house}`);
    // Dispatch action here (currently commented out)
    dispatch(setHouse(house)); // Example dispatch action
  };

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', // Adjusted grid layout for better responsiveness
          gap: '20px',
          padding: '20px',
          width: '100%',
          height:'100%',
          overflowY: 'auto', 
          overflowX: 'hidden',

        }}
      >
        {houses.map((house) => (
          <Paper
            key={house.id} // Using the unique id for the key
            elevation={6} // Increased elevation for a more polished look
            sx={{
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              borderRadius: '8px', // Added rounded corners for a softer look
              backgroundColor: '#f9f9f9', // Lighter background color for a clean look
              transition: 'transform 0.2s ease-in-out, box-shadow 0.3s ease-in-out',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
              },
            }}
            onClick={() => handleHouseClick(house)} // Handle click and log the house id
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
              {generateRandomTitle()} {/* Randomly generated title */}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
              {generateRandomDescription()} {/* Randomly generated description */}
            </Typography>
          </Paper>
        ))}
      </Box>
    </>
  );
};






















