import React, { useState } from "react";
import { computeMargin } from "./computeMargin";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionIcon from "@mui/icons-material/Description";
import SearchIcon from "@mui/icons-material/Search";
import { RowActionCell1, RowActionCellField } from "../../common/RowActionCell";
import { useDispatch } from "react-redux";
import { setDrawerOpen, setSelectedField } from "@/store";

const FIELD_TYPE_OPTIONS = ["textInput", "combobox", "checkbox", "number"];
const FIELD_ROLE_OPTIONS = ["INPUT", "GROUP", "DEFAULT", "TREE"];

export default function RowCellRenderer({ row, field, onToggle }) {

  const dispatch = useDispatch();


  const baseMargin = computeMargin(row.depth);
  const margin =
    row.kind === "field"
      ? `calc(${baseMargin} + 7px)` // add 4px more for fields
      : baseMargin;

  const iconMap = {
    section: (
      <FolderIcon fontSize="small" sx={{ color: "#ffb300" }} />
    ), // yellow folder
    field: (
      <DescriptionIcon fontSize="small" sx={{ color: "#757575" }} />
    ), // gray document
    comparison: (
      <SearchIcon fontSize="small" sx={{ color: "#ff9800" }} />
    ), // orange magnifier
  };

  const [localFieldType, setLocalFieldType] = useState(
    row.kind === "field" ? row.fieldData?.type || FIELD_TYPE_OPTIONS[0] : ""
  );
 


const handleOpenDrawer = () => {
  console.log("Opening drawer for field:", row.fieldData.id);
  dispatch(setSelectedField(row.fieldData));
  dispatch(setDrawerOpen(true));
};



  const baseStyle = {
    marginLeft: margin,
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: row.kind === "section" ? 600 : 400,
    backgroundColor:
      row.kind === "section"
        ? "#f9f9f9"
        : row.kind === "field"
        ? "#fffef8"
        : "#f0f8ff",
    padding: "4px 6px",
    borderRadius: 4,
    flexWrap: "wrap",
  };



if (field === "label") {
  return (
    <div style={baseStyle}>
        {row.kind === "field" && (
        <RowActionCellField onOpenDrawer={handleOpenDrawer} />
      )} 
      {/* Section add buttons */}
    {row.kind === "section" && (
  <RowActionCell1 
    parentId={row.id}
    parentTermnum={row.termnum}
    disableAddField={row.type === 'TAB'}  // 👈 pass boolean flag
  />
)}


      {/* Icon */}
      {iconMap[row.kind]}

      {/* Label */}
      <span style={{ fontWeight: 500 }}>{row.label}</span>

      {/* ✅ Field drawer button */}
    
    </div>
  );
}

 
  if (field === "type") {
    if (row.kind === "field") {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            width: "100%",
          }}
        >
          <FormControl variant="standard" fullWidth>
            <InputLabel>Field Type</InputLabel>
            <Select
              value={row.field_type}
              onChange={(e) => setLocalFieldType(e.target.value)}
              label="Field Type"
            >
              {FIELD_ROLE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="standard" fullWidth>
            <InputLabel>Input Type</InputLabel>
            <Select
              value={row.input_type}
              onChange={() => {}}
              label="Input Type"
            >
              {FIELD_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      );
    } else {
      return <span style={{ fontStyle: "italic" }}>{row.type || "-"}</span>;
    }
  }

  if (field === "description") {
    return <span>{row.description || "-"}</span>;
  }



  return null;
}
