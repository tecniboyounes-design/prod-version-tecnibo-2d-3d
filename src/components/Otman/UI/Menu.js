"use client"
import React, { useState, useEffect } from "react";
import {
  Menu,
  MenuItem,
  Drawer,
  IconButton,
  TextField,
  LinearProgress,
  Typography,
  Select,
  InputLabel,
  FormControl,
  RadioGroup,
  Radio,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Button,
  Switch,
  Slider,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useSelector, useDispatch } from "react-redux";
import {
  updateSettings,
  resetSettings,
  setIs2DView,
  setWallConfig,
  setIsDrawing,
  setCurrentConfig,
  updateWallWithStarConfig,
} from "../../../store";
import Star from "./Star";
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import { cloisonData, glassWallProperties } from "../../../data/models";

const ConfigurationMenu = () => {
  const dispatch = useDispatch();
  const currentConfigElement = useSelector(
    (state) => state.jsonData.currentConfig
  );
  const [openDrawer, setOpenDrawer] = useState(false);
  const [material, setMaterial] = useState("Wood"); 
  const [roomName, setRoomName] = useState("Living Room"); 
  const [dimensions, setDimensions] = useState("5m x 7m");
  const [wallType, setWallType] = useState("T100"); 
  const [wallTexture, setWallTexture] = useState(false);
  const [applyToAllWalls, setApplyToAllWalls] = useState(false);
  const is2DView = useSelector((state) => state.jsonData.is2DView);
  const isDrawing = useSelector((state) => state.jsonData.isDrawing);
  const settings = useSelector((state) => state.jsonData.settings);
  const [wallHeight, setWallHeight] = React.useState(3);
  const [thickness, setThickness] = React.useState(0.1);
  

  const toggleDrawer = () => {
    setOpenDrawer(!openDrawer);
  };

  const toggleDrawingMode = () => {
    dispatch(setIsDrawing(!isDrawing));
  };

  const handleApplyToAllWallsChange = (event) => {
    setApplyToAllWalls(event.target.value === "all");
  };

  useEffect(() => {
    if (!is2DView) {
      setOpenDrawer(true);
    }
  }, [currentConfigElement, is2DView]);
  

  const handleUpdateSettingLocal = (key, value) => {
    dispatch(updateSettings({ key, value }));
  };


  const handleSwitchChange = (e, settingName) => {
    const value = e.target.checked;
    const key = settingName;
    dispatch(updateSettings({ key, value }));
  };

  
  const handleWallUpdate = (key, value) => {
    if (key === "thickness") {
      setThickness(value);
    }
    
    const payload = {
      key,
      value,
    };
  
    if (!applyToAllWalls && currentConfigElement?.id) {
      payload.id = currentConfigElement.id;
    }
    console.log('payload', payload);
  
    dispatch(setWallConfig(payload));
  };
  
  // const handleWallTypeChange = (event) => {
  //   setWallType(event.target.value);
  //   
  //   // dispatch(setWallConfig("wallType", event.target.value))
  // };

  const renderConfigDetails = () => {
    switch (currentConfigElement.type) {
      case "wall":
        return (
          <div style={{ padding: 20 }}>
            <Typography variant="h6" gutterBottom>
              Configure Wall
            </Typography>

            {/* General Settings: Apply to All Walls or Selected Wall */}
            <Typography variant="body1" gutterBottom>
              Apply settings to:
            </Typography>

            <RadioGroup
              row
              value={applyToAllWalls ? "all" : "selected"}
              onChange={handleApplyToAllWallsChange}
            >
              <FormControlLabel
                value="all"
                control={<Radio />}
                label="All Walls"
              />
              <FormControlLabel
                value="selected"
                control={<Radio />}
                label="This Wall"
              />
            </RadioGroup>

            <Typography variant="body1" gutterBottom style={{ marginTop: 20 }}>
              Thickness (cm)
            </Typography>
            <Slider
              aria-label="Wall Thickness"
              value={Number(thickness)}
              onChange={(e, newValue) =>
                handleWallUpdate("thickness", parseFloat(newValue.toFixed(1)))
              }
              valueLabelDisplay="auto"
              step={0.1}
              marks={[
                { value: 0.2, label: "0.2" },
                { value: 1, label: "1" },
                { value: 2, label: "2" },
              ]}
              min={0.2}
              max={2}
            />

            {/* Wall Height */}
            <TextField
              label="Height"
              variant="outlined"
              type="number"
              value={wallHeight}
              onChange={(e) => handleWallUpdate("height", e.target.value)}
              fullWidth
              margin="normal"
             
            />

            {/* Wall Type */}
            <FormControl>
  <InputLabel id="wall-type-label">Wall Type</InputLabel>
  <Select
    labelId="wall-type-label"
    id="wall-type-select"
    value={wallType}
    onChange={(e) => {
      const selectedWallType = e.target.value;
      setWallType(selectedWallType);
      handleWallUpdate('wallType',selectedWallType);
    }}
  >
    {cloisonData.map((cloison) => (
      <MenuItem key={cloison.name} value={cloison.name}>
        {cloison.name}
      </MenuItem>
    ))}
  </Select>
</FormControl>


 
            {/* Wall Color */}
            <TextField
  label="Wall Color"
  type="color"
  value={settings.wallColor}
  onChange={(e) => handleWallUpdate("wallColor", e.target.value)}
  fullWidth
  margin="normal"
/>



            {/* Wall Texture */}
            <FormGroup style={{ marginTop: 20 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={wallTexture}
                    onChange={(e) =>
                      handleWallUpdate("wallTexture", e.target.checked)
                    }
                  />
                }
                label="Add Texture"
              />
            </FormGroup>

            {/* Progress Bar */}
            <LinearProgress
              variant="determinate"
              value={50}
              style={{ marginTop: 20 }}
            />
            <Typography
              variant="body2"
              color="textSecondary"
              style={{ marginTop: 10 }}
            >
              Description: Standard wall configuration for interior rooms.
            </Typography>
          </div>
        );

      case "floor":
        return (
          <div>
            <Typography variant="h6" gutterBottom>Configure Floor</Typography>
            <TextField
              label="Material"
              variant="outlined"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              fullWidth
            />
            <TextField
              label="Color"
              variant="outlined"
              value="Light Brown"
              fullWidth
              disabled
              style={{ marginTop: 10 }}
            />
            <LinearProgress
              variant="determinate"
              value={70}
              style={{ marginTop: 20 }}
            />
          </div>
        );

      case "room":
        return (
          <div>
            <Typography variant="h6" gutterBottom>Configure Room</Typography>

            {/* Room Name */}
            <TextField
              label="Room Name"
              variant="outlined"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              fullWidth
            />

            {/* Dimensions */}
            <Typography style={{ marginTop: 20 }}>Dimensions</Typography>
            <TextField
              label="Dimensions"
              variant="outlined"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              fullWidth
            />
            <FormControlLabel
                control={
                  <Switch
                    checked={isDrawing}
                    onChange={toggleDrawingMode}
                  />
                }
                label="Enable Drawing Mode"
              />

            {/* Grid Size */}
            <FormControl fullWidth style={{ marginTop: 10 }}>
              <InputLabel>Grid Size</InputLabel>
              <Select
                value={settings?.gridSize || 10}
                onChange={(e) =>
                  handleUpdateSettingLocal("gridSize", e.target.value)
                }
              >
                {[10, 20, 50, 100].map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Grid Color */}
            <TextField
              label="Grid Color"
              type="color"
              value={settings.gridColor}
              onChange={(e) =>
                handleUpdateSettingLocal("gridColor", e.target.value)
              }
              fullWidth
              style={{ marginTop: 20 }}
            />

            {/* Axes Helper Visibility */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.axesHelperVisible}
                  onChange={(e) => handleSwitchChange(e, "axesHelperVisible")}
                  name="axesHelperVisible"
                />
              }
              label="Show Axes Helper"
            />

            {/* Grid Helper Visibility */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.gridHelperVisible}
                  onChange={(e) => handleSwitchChange(e, "gridHelperVisible")}
                  name="gridHelperVisible"
                />
              }
              label="Show Grid Helper"
            />

            {/* Colors */}
            <Typography style={{ marginTop: 20 }} variant="body1">
              Colors
            </Typography>
            <TextField
              label="Point Color"
              type="color"
              value={settings.pointColor}
              onChange={(e) =>
                handleUpdateSettingLocal("pointColor", e.target.value)
              }
              fullWidth
            />
            <TextField
              label="Dragging Color"
              type="color"
              value={settings.draggingColor}
              onChange={(e) =>
                handleUpdateSettingLocal("draggingColor", e.target.value)
              }
              fullWidth
              style={{ marginTop: 20 }}
            />

            {/* Divisions */}
            <Typography style={{ marginTop: 20 }}>Divisions</Typography>
            <TextField
              label="Divisions"
              type="number"
              value={settings.divisions}
              onChange={(e) =>
                handleUpdateSettingLocal("divisions", Number(e.target.value))
              }
              fullWidth
            />

          

            {/* Actions */}
            <Typography style={{ marginTop: 20 }} variant="h6">
              Actions
            </Typography>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              style={{ marginTop: 10 }}
              onClick={() => console.log("Add Item logic here")}
            >
              Add Item
            </Button>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              style={{ marginTop: 10 }}
              onClick={() => dispatch(resetSettings())}
            >
              Reset Room
            </Button>
          </div>
        );

      default:
        return <Typography>Select a configuration type.</Typography>;
    }
  };



const StarredConfigsList = () => {
  const favorite = useSelector((state) => state.jsonData.favorite || []);

  const handleStarClick = (config) => {
  //   console.log('config', config);
  // console.log('currentWall', currentConfigElement.id);
    
    dispatch(updateWallWithStarConfig({ wallId: currentConfigElement.id, config }));
    
  };

  const renderStarredConfigs = () => {
    if (favorite.length === 0) {
      return <Typography>No starred configurations yet.</Typography>;
    }

    return favorite.map((config, index) => (
      <div key={index} style={{ marginBottom: 15 }}>
        <Typography variant="h4">
          {config.name} - 
        </Typography>

        <Typography variant="body1">
          {new Date(config.starredAt).toLocaleString()}
        </Typography>

        <Tooltip title="Use this config">
          <StarOutlineIcon
            style={{
              color: '#FFD700', // Gold color for the star
              transition: 'transform 0.3s ease', // Smooth transition for scaling
            }}
            onClick={() => handleStarClick(config)} // Ensure this triggers on click
            onMouseEnter={(e) => (e.target.style.transform = 'scale(1.2)')} // Enlarge on hover
            onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')} // Reset size after hover
          />
        </Tooltip>
      </div>
    ));
  };

  return <div>{renderStarredConfigs()}</div>;
};


  
  

  return (
      
    
<>
<div
  style={{
    width: '100%',
    padding: 20,
    overflowY: 'auto',
    maxHeight: '100vh',
    scrollbarWidth: 'thin',
    scrollbarColor: '#bdbdbd #f5f5f5', 
  }}
>
  
 

  {/* Flexbox container for menu and star */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant="h6" style={{ marginRight: 10 }}>
      Menu
    </Typography>
    <Star wallId={currentConfigElement.id} />
  </div>
  {renderConfigDetails()}
</div>

<div>
  <Typography variant="h6">Starred Configurations</Typography>
  <StarredConfigsList />
</div>

</>


  ); 


};



export default ConfigurationMenu;
