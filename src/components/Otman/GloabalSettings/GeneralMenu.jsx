import React, { useState } from "react";
import HorizontalLinearStepper from "../Headers/GlobalSettingsAppBar";
import ProjectInfoBar from "../UI/ProjectInfoBar";
import LinearBuffer from "../UI/LinearBuffer";
import { CustomPanel } from "../UI/Panel";
import { PreviewArticle } from "../UI/ItemList";
import {
  Grid,
  TextField,
  FormControl,
  Typography,
  Divider,
  Box,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
} from "@mui/material";
import { ralColors } from "../../../data/models";
import PriceDisplay from "../UI/Price";


export const GeneralMenu = () => {
    const [selectedColor, setSelectedColor] = useState("32dB");
    const [finishType, setFinishType] = useState("");
    const [openingSide, setOpeningSide] = useState("");
    const [floorCeilingType, setFloorCeilingType] = useState("");
    const [leftLink, setLeftLink] = useState("");
    const [rightLink, setRightLink] = useState("");
    const [topLink, setTopLink] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [estimate, setEstimate] = useState(false);
    
    // Handle changes for Opening Side
    const handleOpeningSideChange = (event) => {
      setOpeningSide(event.target.value);
    };
  
    // Handle changes for Floor-Ceiling Type
    const handleFloorCeilingTypeChange = (event) => {
      setFloorCeilingType(event.target.value);
    };
  
    // Handle changes for Left Link
    const handleLeftLinkChange = (event) => {
      setLeftLink(event.target.value);
    };
  
    // Handle changes for Right Link
    const handleRightLinkChange = (event) => {
      setRightLink(event.target.value);
    };
  
    // Handle changes for Top Link
    const handleTopLinkChange = (event) => {
      setTopLink(event.target.value);
    };
  
    // Handle changes for Color
    const handleColorChange = (event) => {
      setSelectedColor(event.target.value);
    };
  
    // Handle changes for Finish Type
    const handleFinishChange = (event) => {
      setFinishType(event.target.value);
    };
  
    // Handle changes for Quantity
    const handleQuantityChange = (event) => {
      setQuantity(event.target.value);
    };
  
    // Handle changes for Estimate Checkbox
    const handleEstimateChange = (event) => {
      setEstimate(event.target.checked);
    };
  
    return (
      <Box
        sx={{
          padding: 5,
          width: "100%",
          margin: "0 auto",
          height: "100%",
          overflowY: "auto",
        }}
      >
        {/* Title */}
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ fontSize: "1rem" }}
        >
          General
        </Typography>
  
        <Divider
          sx={{
            borderColor: "red",
            height: "3px",
            marginTop: "12px",
            marginBottom: "12px",
          }}
        />
  
        {/* Quantity Field */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mt: 2,
          }}
        >
          <Typography sx={{ flex: 1, fontSize: "0.85rem" }}>Quantity</Typography>
          <FormControl fullWidth sx={{ flex: 3 }}>
            <TextField
              type="number"
              // value={quantity}
              variant="outlined"
              fullWidth
              defaultValue={1}
              sx={{
                "& .MuiInputBase-root": {
                  height: "35px",
                  fontSize: "0.85rem",
                },
              }}
            />
          </FormControl>
        </Box>
   
        {/* Estimate Checkbox */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mt: 2,
          }}
        >
          <Typography sx={{ flex: 1, fontSize: "0.85rem" }}>Estimate</Typography>
          <Checkbox sx={{ "& .MuiSvgIcon-root": { fontSize: "1.1rem" } }} value={estimate} onChange={handleEstimateChange} />
        </Box>
  
        <Divider sx={{ borderColor: "red", height: "3px", mt: 2, mb: 2 }} />
  
        {/* Profile Color */}
        <Typography
          variant="strong"
          sx={{ fontSize: "0.85rem", fontWeight: "bold" }}
        >
          Profile Color
        </Typography>
  
        {/* RAL Color & Finish Type */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
          {/* RAL Color Dropdown */}
          <Typography sx={{ flex: 1, fontSize: "0.85rem" }}>Color</Typography>
          <FormControl sx={{ flex: 2 }}>
            <Select
              value={selectedColor}
              onChange={handleColorChange}
              displayEmpty
              variant="outlined"
              defaultValue=""
              sx={{
                height: "35px",
                fontSize: "0.85rem",
              }}
            >
              <MenuItem value="" disabled>
                Select a RAL Color
              </MenuItem>
              {ralColors.map((color) => (
                <MenuItem key={color.code} value={color.code}>
                  {`${color.code} - ${color.name}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
  
          {/* Finish Type Dropdown */}
          <Typography sx={{ flex: 1, fontSize: "0.85rem" }}>Finish</Typography>
          <FormControl sx={{ flex: 1 }}>
            <Select
              value={finishType}
              onChange={handleFinishChange}
              displayEmpty
              variant="outlined"
              defaultValue=""
              sx={{
                height: "35px",
                fontSize: "0.85rem",
              }}
            >
              <MenuItem value="">Lisse</MenuItem>
              <MenuItem value="Mat">Mat</MenuItem>
              <MenuItem value="Coatex Lisse">Coatex Lisse</MenuItem>
            </Select>
          </FormControl>
        </Box>
  
        <Divider sx={{ borderColor: "red", height: "3px", mt: 2, mb: 2 }} />
  
        {/* Body Type */}
        <Typography sx={{ fontSize: "0.85rem", fontWeight: "bold" }}>
          Body
        </Typography>
  
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mt: 2,
          }}
        >
          <Typography sx={{ flex: 1, fontSize: "0.85rem" }}>Body Type</Typography>
          <FormControl sx={{ flex: 2 }}>
            <Select
              variant="outlined"
              fullWidth
              displayEmpty
              defaultValue=""
              sx={{
                height: "35px",
                fontSize: "0.85rem",
              }}
            >
              <MenuItem value="32dB">Rw = 32 dB</MenuItem>
              <MenuItem value="36.4dB">Rw = 36.4 dB</MenuItem>
            </Select>
          </FormControl>
        </Box>
  
        <Divider sx={{ borderColor: "red", height: "3px", mt: 2, mb: 2 }} />
  
        {/* Opening Side */}
        <Typography sx={{ fontSize: "0.85rem", fontWeight: "bold" }}>
          Opening Side
        </Typography>
  
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mt: 2,
          }}
        >
          <Typography sx={{ flex: 1, fontSize: "0.85rem" }}>
            Opening Side
          </Typography>
          <FormControl sx={{ flex: 3 }}>
            <Select
              value={openingSide}
              onChange={handleOpeningSideChange}
              displayEmpty
              variant="outlined"
              defaultValue=""
              sx={{
                height: "35px",
                fontSize: "0.85rem",
              }}
            >
              <MenuItem value="DIN Right">DIN Right</MenuItem>
              <MenuItem value="DIN Left">DIN Left</MenuItem>
            </Select>
          </FormControl>
        </Box>
  
        <Divider sx={{ borderColor: "red", height: "3px", mt: 2, mb: 2 }} />
  
        {/* Floor-Ceiling Type */}
        <Typography sx={{ fontSize: "0.85rem", fontWeight: "bold" }}>
          Floor-Ceiling Type
        </Typography>
  
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 1,
          }}
        >
          <Typography sx={{ flex: 1, fontSize: "0.85rem" }}>
            Ceiling Type
          </Typography>
          <FormControl sx={{ flex: 2 }}>
            <Select
              variant="outlined"
              fullWidth
              defaultValue="gyproc"
              sx={{
                height: "35px",
                fontSize: "0.85rem",
              }}
            >
              <MenuItem value="gyproc">Gyproc ceiling</MenuItem>
              <MenuItem value="concrete">Concrete (beton)</MenuItem>
              <MenuItem value="glued">Glued (collé)</MenuItem>
              <MenuItem value="chilled">Chilled ceiling (froid)</MenuItem>
              <MenuItem value="metal">Metal ceiling</MenuItem>
              <MenuItem value="plaf_beton" disabled>
                Plaf Beton (Don't use)
              </MenuItem>
              <MenuItem value="plaf_colle" disabled>
                Plaf Collé (Don't use)
              </MenuItem>
              <MenuItem value="plaf_froid" disabled>
                Plaf Froid (Don't use)
              </MenuItem>
              <MenuItem value="plaf_gyproc" disabled>
                Plaf Gyproc (Don't use)
              </MenuItem>
              <MenuItem value="plaf_metallique" disabled>
                Plaf Metallique (Don't use)
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
  
        {/* Floor Select Box */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography sx={{ flex: 1, fontSize: "0.85rem" }}>
            Floor Type
          </Typography>
          <FormControl sx={{ flex: 2 }}>
            <Select
              variant="outlined"
              fullWidth
              defaultValue="raised_floor"
              sx={{
                height: "35px",
                fontSize: "0.85rem",
              }}
            >
              <MenuItem value="raised_floor">Raised floor (plancher)</MenuItem>
              <MenuItem value="concrete">Concrete (beton)</MenuItem>
              <MenuItem value="glued">Glued (collé)</MenuItem>
              <MenuItem value="sol_beton" disabled>
                Sol Beton (Don't use)
              </MenuItem>
              <MenuItem value="sol_colle" disabled>
                Sol Collé (Don't use)
              </MenuItem>
              <MenuItem value="sol_plancher" disabled>
                Sol Plancher (Don't use)
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
  
        <Divider sx={{ borderColor: "red", height: "3px", mt: 2, mb: 2 }} />
  
        {/* Link type */}
        <Typography sx={{ fontSize: "0.85rem", fontWeight: "bold" }}>
          Link type
        </Typography>
  
        {/* Left Link Box */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 1,
          }}
        >
          <Typography sx={{ flex: 1, fontSize: "0.85rem" }}>Left Link</Typography>
          <FormControl sx={{ flex: 2 }}>
            <Select
              value={leftLink}
              onChange={handleLeftLinkChange}
              displayEmpty
              variant="outlined"
              defaultValue=""
              sx={{
                height: "35px",
                fontSize: "0.85rem",
              }}
            >
              <MenuItem value="">Select Left Link</MenuItem>
              <MenuItem value="solid">Solid Link</MenuItem>
              <MenuItem value="movable">Movable Link</MenuItem>
              <MenuItem value="fixed">Fixed Link</MenuItem>
            </Select>
          </FormControl>
        </Box>
  
        {/* Right Link Box */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 2,
          }}
        >
          <Typography sx={{ flex: 1, fontSize: "0.85rem" }}>
            Right Link
          </Typography>
          <FormControl sx={{ flex: 2 }}>
            <Select
              value={rightLink}
              onChange={handleRightLinkChange}
              displayEmpty
              variant="outlined"
              defaultValue=""
              sx={{
                height: "35px",
                fontSize: "0.85rem",
              }}
            >
              <MenuItem value="">Select Right Link</MenuItem>
              <MenuItem value="solid">Solid Link</MenuItem>
              <MenuItem value="movable">Movable Link</MenuItem>
              <MenuItem value="fixed">Fixed Link</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
    );
  };