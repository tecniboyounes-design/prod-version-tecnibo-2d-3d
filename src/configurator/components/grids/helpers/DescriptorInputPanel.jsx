// DescriptorInputPanel.jsx
"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Paper,
  Divider
} from "@mui/material";
import { setDescriptorInput } from "@/store";

const WALL_TYPES = ["T100", "ART", "HAAS", "V100"];
const MATERIALS = ["glass", "wood", "metal"];

export default function DescriptorInputPanel() {
  const dispatch = useDispatch();
  const descriptors = useSelector((s) => s.jsonData.descriptorInputs);

  const handleChange = (key, value) => {
    dispatch(setDescriptorInput({ key, value }));
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Descriptor Input Panel
      </Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>

        <TextField
          select
          label="Wall Type"
          value={descriptors.wall_type}
          onChange={(e) => handleChange("wall_type", e.target.value)}
          fullWidth
        >
          {WALL_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
       
        <TextField
          select
          label="Neighbor Type"
          value={descriptors.neighbor_type}
          onChange={(e) => handleChange("neighbor_type", e.target.value)}
          fullWidth
        >
          {WALL_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Material"
          value={descriptors.material}
          onChange={(e) => handleChange("material", e.target.value)}
          fullWidth
        >
          {MATERIALS.map((mat) => (
            <MenuItem key={mat} value={mat}>
              {mat}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          type="number"
          label="Width"
          value={descriptors.width}
          onChange={(e) => handleChange("width", e.target.value)}
          fullWidth
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={descriptors.door_system}
              onChange={(e) => handleChange("door_system", e.target.checked)}
            />
          }
          label="Door System Required"
        />
      </Box>

      <Divider sx={{ mt: 2 }} />
      <Typography variant="caption" color="text.secondary">
        These descriptors are the base input for condition filtering.
      </Typography>
    </Paper>
  );
}
