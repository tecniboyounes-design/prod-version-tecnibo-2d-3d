import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconButton, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import { setIs2DView, setIsDrawing } from '../../../store';
import { Html } from '@react-three/drei';

const ViewSwitcher = () => {
  const dispatch = useDispatch();
  const is2DView = useSelector((state) => state.jsonData.is2DView);
  const currentStep = useSelector((state) => state.jsonData.currentStep); // Access the current step
  const [hover, setHover] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);

  const handleToggleView = () => {
    dispatch(setIs2DView(!is2DView));
  };

  const handleStartDrawing = () => {
    const newDrawingMode = !drawingMode;
    setDrawingMode(newDrawingMode);
    dispatch(setIsDrawing(newDrawingMode));
  }; // 

  return (
    <div
      draggable="true"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1px',
        borderRadius: '10px',
        background:
          'linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)',
        cursor: 'pointer',
        position: 'absolute',
        top: '20px',
        right: '5px',
        transition: 'background 20s ease', 
        backgroundColor: drawingMode ? 'rgba(0, 255, 0, 0.7)' : undefined,
      }}
    >
      <Tooltip title={is2DView ? 'Switch to 3D View' : 'Switch to 2D View'}>
        <IconButton onClick={handleToggleView} color="primary">
          {is2DView ? (
            <VisibilityOffIcon style={{ color: 'white' }} />
          ) : (
            <VisibilityIcon style={{ color: 'white' }} />
          )}
        </IconButton>
      </Tooltip>
      <Typography style={{ color: 'white', marginLeft: '1px' }}>
        {is2DView ? '2D' : '3D'}
      </Typography>
      {/* Check if currentStep is not 0 to display the drawing mode icon */}
      {
      currentStep !== 0 && 
      currentStep !== 1 &&
      hover && (
        <Tooltip title={drawingMode ? 'Disable Drawing Mode' : 'Start Drawing Mode'}>
          <IconButton onClick={handleStartDrawing} color="primary">
            {drawingMode ? (
              <EditOffIcon style={{ color: 'white' }} />
            ) : (
              <EditIcon style={{ color: 'white' }} />
            )}
          </IconButton>
        </Tooltip>
      )}
    </div>
  );


};

export default ViewSwitcher;
