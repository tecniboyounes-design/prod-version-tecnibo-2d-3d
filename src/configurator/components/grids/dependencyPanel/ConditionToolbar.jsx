/* ==========================================================================
   ConditionToolbar.jsx – Toolbar to list dependencies & create a new one
   ========================================================================== */
"use client";

import React, { useMemo } from "react";
import { Toolbar, Button, Select, MenuItem, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useSelector, useDispatch } from "react-redux";
import { addDependency } from "@/store"; // your reducer action

export default function ConditionToolbar({ fieldId, selectedDepId, onSelectDependency }) {
  const dispatch = useDispatch();
  const configurator = useSelector((s) => s.jsonData.configurator);
 
  
  // Get dependencies for a specific fieldId from global state
  const dependencies = useMemo(() => {
    const findField = (sections, id) => {
      for (const sec of sections) {
        for (const f of sec.fields || []) {
          if (f.id === id) return f;
        }
        const found = findField(sec.sections || [], id);
        if (found) return found;
      }
      return null;
    };
    const field = findField(configurator?.sections || [], fieldId);

    return field?.dependencies || [];
  }, [configurator, fieldId]);
 


  const handleNewDependency = () => {
    dispatch(addDependency({ fieldId, action: "" }));
  };
   


  return (
    <Toolbar sx={{ gap: 2, bgcolor: "#f9fafc", borderBottom: "1px solid #ddd" }}>
      <Typography variant="subtitle2">Dependency:</Typography>
      <Select
        size="small"
        value={selectedDepId || ""}
        onChange={(e) => onSelectDependency?.(e.target.value)}
        sx={{ minWidth: 200 }}
      >
        {dependencies.map((d) => (
          <MenuItem key={d.id} value={d.id}>
            {`#${d.id} (${d.action || "no-action"})`}
          </MenuItem>
        ))}
        {dependencies.length === 0 && (
          <MenuItem value="">
            <em>No dependencies</em>
          </MenuItem>
        )}
      </Select>
   

      <Button
        size="small"
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleNewDependency}
      >
        New Dependency
      </Button>

      
    </Toolbar>
  );
}
