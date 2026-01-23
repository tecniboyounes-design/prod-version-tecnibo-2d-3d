/* =========================================================================
   FieldInfoDrawer.jsx  —  edit a field (no comparisons here anymore)
   ========================================================================= */
"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box, Typography, IconButton, TextField,
  Select, MenuItem, Button, Tabs, Tab,
  Checkbox, FormControlLabel, Paper
} from "@mui/material";
import CloseIcon  from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import { v4 as uuidv4 }             from "uuid";
import { setDrawerOpen, updateConditionRow } from "@/store";

/* ─────────────────────────────────────────────────────────── */

export default function FieldInfoDrawer() {
  const dispatch     = useDispatch();
  const selected     = useSelector(s => s.jsonData.selectedField);
  const configurator = useSelector(s => s.jsonData.configurator);
  const [editData, setEditData] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  console.log("FieldInfoDrawer render", { selected, configurator });

  
/* ── hydrate the drawer when a field is selected ─────────────────────────── */
useEffect(() => {
  if (!selected || !configurator) return;

  const rawField = findField(configurator, selected.id);
  if (!rawField) return;

  /* normalise backend → shape the drawer expects */
  const normalised = {
    id   : `field-${rawField.id}`,
    kind : "field",

    /* main props */
    label      : rawField.label || "",
    description: rawField.info  || "",
    field_type : rawField.type  || "",
    input_type : rawField.input_type || "",
    required   : !!rawField.required,

    /* INPUT-specific details */
    input_details: rawField.inputField
      ? {
          defaultValue: rawField.inputField.defaultValue || "",
          validation  : rawField.inputField.validation  || "",
          type        : rawField.inputField.type        || "",
          attributes  : rawField.inputField.attributes  || {},
        }
      : {},

    /* COMBOBOX-specific details */
    combobox_details: rawField.comboboxField
      ? {
          type        : rawField.comboboxField.type        || "",
          code        : rawField.comboboxField.code        || "",
          content     : rawField.comboboxField.content     || "",
          source      : rawField.comboboxField.source      || "",
          dynamic     : !!rawField.comboboxField.dynamic,
          defaultValue: rawField.comboboxField.defaultValue || "",
        }
      : {},

    /* arrays */
    impacted_variables: rawField.variables    ?? [],
    field_descriptions: rawField.descriptions ?? [],
    dependencies      : rawField.dependencies ?? [],
  };

  setEditData(normalised);
}, [selected, configurator]);


  /* ── helpers ── */
  const handleClose = () => dispatch(setDrawerOpen(false));

  const handleSave = () => {
    dispatch(updateConditionRow({
      ...editData,
      input_type: editData.input_type || "",
    }));
    handleClose();
  };

  /* ── render inputs specific to INPUT / COMBOBOX / TEXT ── */
  const renderInputFieldByType = () => {
    if (editData.field_type === "INPUT") {
      const htmlAttrs = editData.input_details.attributes || {};

      /* local change helpers */
      const updAttr = (idx, keyOrVal, val) => {
        const entries = Object.entries(htmlAttrs);
        const clone   = [...entries];
        const [oldK, oldV] = clone[idx];

        if (keyOrVal === "key") clone[idx] = [val.trim(), oldV];
        else                    clone[idx] = [oldK       , val  ];

        setEditData(ed=>({
          ...ed,
          input_details: {
            ...ed.input_details,
            attributes: Object.fromEntries(clone),
          },
        }));
      };

      const delAttr = k => {
        const { [k]:_, ...rest } = htmlAttrs;
        setEditData(ed=>({
          ...ed,
          input_details:{ ...ed.input_details, attributes:rest }
        }));
      };

      return (
        <>
          <TextField
            label="defaultValue" fullWidth margin="dense"
            value={editData.input_details.defaultValue || ""}
            onChange={e=>setEditData(ed=>({
              ...ed, input_details:{ ...ed.input_details, defaultValue:e.target.value }
            }))}
          />
          <TextField
            label="validation (regex)" fullWidth margin="dense"
            value={editData.input_details.validation || ""}
            onChange={e=>setEditData(ed=>({
              ...ed, input_details:{ ...ed.input_details, validation:e.target.value }
            }))}
          />
          <TextField
            label="type" fullWidth margin="dense"
            value={editData.input_details.type || ""}
            onChange={e=>setEditData(ed=>({
              ...ed, input_details:{ ...ed.input_details, type:e.target.value }
            }))}
          />

          <Typography variant="caption" sx={{ mt:2, fontWeight:600 }}>
            HTML input attributes
          </Typography>

          {Object.entries(htmlAttrs).map(([k,v], i)=>(
            <Box key={i} component={Paper} elevation={1}
                 sx={{ display:"flex", alignItems:"center", gap:1, p:1, mb:1 }}>
              <TextField
                label="Attribute" fullWidth value={k}
                onChange={e=>updAttr(i,"key",e.target.value)}
              />
              <TextField
                label="Value" fullWidth value={v}
                onChange={e=>updAttr(i,"val",e.target.value)}
              />
              <IconButton size="small" color="error"
                          onClick={()=>delAttr(k)}><DeleteIcon fontSize="small"/></IconButton>
            </Box>
          ))}
          <Button size="small" onClick={()=>
            setEditData(ed=>({
              ...ed,
              input_details:{
                ...ed.input_details,
                attributes:{ ...htmlAttrs, "":"" }
              }
            }))
          }>
            + Add attribute
          </Button>
        </>
      );
    }

    if (editData.field_type === "COMBOBOX") {
      return Object.entries(editData.combobox_details).map(([k,v])=>(
        k==="dynamic" ? (
          <FormControlLabel key={k}
            control={
              <Checkbox checked={Boolean(v)}
                        onChange={e=>setEditData(ed=>({
                          ...ed, combobox_details:{ ...ed.combobox_details, dynamic:e.target.checked }
                        }))}/>
            }
            label={<Typography variant="caption" sx={{ fontSize:"0.7rem" }}>Dynamic</Typography>}
          />
        ) : (
          <TextField key={k} label={k} fullWidth margin="dense"
                     value={v || ""}
                     onChange={e=>setEditData(ed=>({
                       ...ed, combobox_details:{ ...ed.combobox_details, [k]:e.target.value }
                     }))}/>
        )
      ));
    }

    if (editData.field_type === "TEXT") {
      return (
        <Box sx={{ p:2, bgcolor:"#f9f9f9", borderRadius:2, textAlign:"center" }}>
          <Typography variant="h5" sx={{ fontWeight:"bold", mb:1 }}>
            {editData.label || "No Label Set"}
          </Typography>
          <Typography variant="body1" sx={{ color:"text.secondary", whiteSpace:"pre-wrap" }}>
            {editData.description || "No description available."}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (!editData) return null;

  /* ───────────────────────────── render ───────────────────────────── */
  return (
    <Box sx={{ width:"100%", height:"100%", display:"flex", flexDirection:"column" }}>
      {/* header */}
      <Box sx={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        p:2, borderBottom:"1px solid #e0e0e0", bgcolor:"#f5f5f5"
      }}>
        <Typography variant="subtitle2" sx={{ fontWeight:600 }}>
          Edit Field:&nbsp;{editData.label || "Unnamed Field"}
        </Typography>
        <IconButton size="small" onClick={handleClose}><CloseIcon/></IconButton>
      </Box>

      {/* tabs */}
      <Tabs value={tabIndex} onChange={(e,i)=>setTabIndex(i)} variant="scrollable" scrollButtons="auto">
        <Tab label="Main Info"          />
        <Tab label="Type-Specific"      />
        <Tab label="Impacted Variables" />
        <Tab label="Descriptions"       />
        <Tab label="Dependencies"       />
      </Tabs>

      {/* panels */}
      <Box sx={{ p:2, flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:1 }}>

        {/* Main Info */}
        {tabIndex===0 && (
          <>
            <TextField
              label="Label" fullWidth margin="dense"
              value={editData.label}
              onChange={e=>setEditData({ ...editData, label:e.target.value })}
            />
            <TextField
              label="Description" fullWidth margin="dense"
              value={editData.description}
              onChange={e=>setEditData({ ...editData, description:e.target.value })}
            />

            <Select
              fullWidth margin="dense"
              value={editData.field_type}
              onChange={e=>{
                const t=e.target.value;
                const next={ ...editData, field_type:t };
                if (t==="INPUT")    { next.input_details={ defaultValue:"",validation:"",type:"text",attributes:{} }; next.combobox_details={}; }
                if (t==="COMBOBOX") { next.combobox_details={ type:"static",code:"material",content:"wood,glass,metal",source:"local",dynamic:false,defaultValue:"wood" }; next.input_details={}; }
                if (t==="TEXT")     { next.input_details={}; next.combobox_details={}; }
                setEditData(next);
              }}
            >
              <MenuItem value="TEXT">TEXT</MenuItem>
              <MenuItem value="INPUT">INPUT</MenuItem>
              <MenuItem value="COMBOBOX">COMBOBOX</MenuItem>
            </Select>

            <FormControlLabel
              control={
                <Checkbox checked={editData.required}
                          onChange={e=>setEditData({ ...editData, required:e.target.checked })}/>
              }
              label="Required"
            />
          </>
        )}

        {/* Type-specific */}
        {tabIndex===1 && renderInputFieldByType()}

        {/* Impacted variables */}
        {tabIndex===2 && renderArraySection("impacted_variables", ["name","path","type"])}

        {/* Field descriptions */}
        {tabIndex===3 && renderArraySection("field_descriptions", ["lang","description"])}

        {/* Dependencies */}
        {tabIndex===4 && renderArraySection("dependencies", ["action"])}
      </Box>

      {/* footer */}
      <Box sx={{ p:2 }}>
        <Button fullWidth variant="contained" onClick={handleSave}>Save Changes</Button>
      </Box>
    </Box>
  );


  
  /* helper renders */
function renderArraySection(key, cols) {
  /** Update one cell in the array-of-objects held in editData[key] */
  const updateArr = (rowIdx, col, val) => {
    setEditData(ed => {
      const clone = [...ed[key]];                // shallow copy the rows
      clone[rowIdx] = { ...clone[rowIdx], [col]: val };
      return { ...ed, [key]: clone };
    });
  };

  return (
    <>
      {editData[key].map((item, rowIdx) => (
        <Box key={rowIdx} component={Paper} elevation={1}
             sx={{ p: 1, mb: 1, display: "flex", flexDirection: "column", gap: 1 }}>

          {cols.map(col => {
            /* Selects for enum-type columns ------------------------ */
            if (key === "impacted_variables" && col === "type") {
              return (
                <Select
                  key={col} fullWidth margin="dense"
                  value={item[col] || ""}
                  onChange={e => updateArr(rowIdx, col, e.target.value)}
                >
                  {["MAT", "SURF", "DESCR"].map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              );
            }
            if (key === "dependencies" && col === "action") {
              return (
                <Select
                  key={col} fullWidth margin="dense"
                  value={item[col] || ""}
                  onChange={e => updateArr(rowIdx, col, e.target.value)}
                >
                  {["HIDE", "CLEAR", "FILTER", "DISABLE", "REQUIRE"].map(a => (
                    <MenuItem key={a} value={a}>{a}</MenuItem>
                  ))}
                </Select>
              );
            }
            /* Default text field ----------------------------------- */
            return (
              <TextField
                key={col} label={col} fullWidth margin="dense"
                value={item[col] || ""}
                onChange={e => updateArr(rowIdx, col, e.target.value)}
              />
            );
          })}

          <Button
            size="small" color="error"
            onClick={() =>
              setEditData(ed => {
                const clone = [...ed[key]];
                clone.splice(rowIdx, 1);
                return { ...ed, [key]: clone };
              })}
          >
            Remove
          </Button>
        </Box>
      ))}

      {/* Add-row button */}
      <Button
        size="small"
        onClick={() => {
          const blank = Object.fromEntries(cols.map(c => [c, ""]));
          setEditData(ed => ({
            ...ed,
            [key]: [...ed[key], { id: uuidv4(), ...blank }],
          }));
        }}
      >
        + Add {key.replace("_", " ")}
      </Button>
    </>
  );
}




}



/* ─────────────────────────── helpers ─────────────────────────── */

function findField(cfg, id){
  const walk = secs => {
    for (const s of secs){
      if (s.fields)   for (const f of s.fields) if (f.id===id) return f;
      if (s.sections){ const r=walk(s.sections); if (r) return r; }
    }
    return null;
  };
  return cfg.fields.find(f=>f.id===id) || walk(cfg.sections) || null;
}
