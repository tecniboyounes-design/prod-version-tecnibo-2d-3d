import React, { useCallback, useMemo, useState, useEffect } from "react";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { useDispatch, useSelector } from "react-redux";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import RowCellRenderer from "./helpers/RowCellRenderer";
import { updateConditionRow, deleteSection, deleteField, deleteRootField, setSelectedField } from "@/store.js";
import { buildFlatRows } from "./helpers/buildFlatRows";
import { getTreePath } from "./helpers/getTreePath";
import { RowActionCell2 } from '../common/RowActionCell';
import FieldCollapse from "./dependencyPanel/FieldCollapse";
import AdjustIcon from "@mui/icons-material/Adjust";


const FIELD_ROLE_OPTIONS = ["INPUT", "GROUP", "DEFAULT", "TREE"];
const FIELD_TYPE_OPTIONS = ["textInput", "combobox", "checkbox", "number"];


export function assignSequentialTermnums(flatRows) {
  return flatRows.map((row, index) => {
    const humanIndex = index + 1;

    const updatedFieldData = row.kind === 'field' && row.fieldData
      ? { ...row.fieldData, termnum: humanIndex }
      : row.fieldData;

    return {
      ...row,
      termnum: humanIndex,
      label: `C.T ${humanIndex} P.T ${row.parentTermnum !== null ? row.parentTermnum : 'root'}`,
      fieldData: updatedFieldData
    };
  });
}





export default function ConditionsTreeGrid() {
  const dispatch = useDispatch();
  const configurator = useSelector((state) => state.jsonData.configurator);
  const [openIds, setOpenIds] = useState(new Set());
  const apiRef = useGridApiRef();
  const [depDlgField, setDepDlgField] = useState(null);




  const rows = useMemo(() => {
    const flat = buildFlatRows(
      configurator?.sections || [],
      configurator?.fields || []
    );
    const cleaned = assignSequentialTermnums(flat);

    const out = [];
    cleaned.forEach((r) => {
      out.push(r);

      // inject a pseudo “detail” row directly after an opened FIELD row
      if (r.kind === "field" && openIds.has(r.id)) {
        out.push({
          id: `${r.id}-DETAIL`,
          kind: "detail",
          parentId: r.parentId,
          depth: r.depth + 1,
          detailFor: r.id,
          fieldData: r.fieldData,
        });
      }
    });

    return out;
  }, [configurator, openIds]);


  // console.log("🚀 ~ ConditionsTreeGrid ~ rows:", rows);


  const toggleRow = useCallback((params) => {
    const id = params.row.id;
    console.log("Toggling row:", id);
    dispatch(setSelectedField(params.row.fieldData));
    setOpenIds(prev => (prev.has(id) ? new Set() : new Set([id])));
  }, []);
 


  useEffect(() => {
    if (!apiRef.current) return;

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        apiRef.current.resetRowHeights();
      });
      return () => cancelAnimationFrame(raf2);
    });

    return () => cancelAnimationFrame(raf1);
  }, [rows, apiRef]);

  



  const [columnsState, setColumnsState] = useState([
    { field: "label", headerName: "Name", width: 500, editable: false },
    { field: "description", headerName: "Description", width: 150, editable: true },
    { field: "actions", headerName: "Actions", width: 130, sortable: false, filterable: false },
  ]);




  const handleColumnWidthChange = (params) => {
    console.log(`📏 Column "${params.colDef.field}" new width:`, params.width);

    setColumnsState((prev) =>
      prev.map((col) => {
        if (col.field === params.colDef.field) {
          // Always store a width for "label" to make it persistent
          if (col.field === "label") {
            return { ...col, width: params.width, flex: undefined };
          }
          return { ...col, width: params.width, flex: undefined };
        }
        return col;
      })
    );
  };







  const handleDeleteSection = (sectionId) => {
    console.log('🚀 Dispatching deleteSection for id:', sectionId);
    dispatch(deleteSection({ sectionId: String(sectionId) }));
  };





  // ✅ centralised delete logic
  const handleDeleteField = (rowId) => {
    // strip the "field-" prefix we add in buildFlatRows
    const fieldId = rowId.replace("field-", "");

    const row = rows.find(r => r.id === rowId);
    const parentSection = row?.parentId ?? null;        // <- can be null

    if (parentSection === null) {
      // 🌳 root-level field – dispatch dedicated action
      dispatch(deleteRootField({ fieldId }));
    } else {
      // 🗂  nested field – old behaviour
      dispatch(deleteField({ sectionId: String(parentSection), fieldId }));
    }
  };





  const columns = useMemo(
    () =>
      columnsState.map((col) => {
        if (col.field === "label") {
          return {
            ...col,
            colSpan: (params) =>
              params?.row?.kind === "detail" ? columnsState.length : 1,
            renderCell: (params) => {
              if (params?.row?.kind === "detail") {
                // Render FieldCollapse full-width
                return (
                  <div style={{ width: "100%" }}>
                    <FieldCollapse fieldRow={params.row} />
                  </div>
                );
              }
              return (
                <RowCellRenderer
                  row={params.row}
                  field="label"
                  onToggle={toggleRow}
                />
              );
            },
          };
        }
 
        // ❌ Hide all other columns for detail rows
        return {
          ...col,
          renderCell: (params) => {
            if (params?.row?.kind === "detail") return null;
            if (col.field === "description") {
              return (
                <RowCellRenderer row={params.row} field="description" />
              );
            }
            if (col.field === "actions") {
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <RowActionCell2
                    onDelete={() => {
                      if (params.row.kind === "section") {
                        handleDeleteSection(params.row.id);
                      } else if (params.row.kind === "field") {
                        handleDeleteField(params.row.id);
                      }
                    }}
                    onDrag={() => console.log("TODO: drag", params.row.id)}
                  />
                  {params.row.kind === "field" && (
                    <AdjustIcon
                      fontSize="small"
                      sx={{ color: "orange", cursor: "pointer" }}
                      titleAccess="Open Despondency"
                      onClick={() => 
                        

                        toggleRow(params)
                      
                      }
                    />
                  )}
                </div>
              );
            }
            return params.value || "-";
          },
        };
      }),
    [columnsState, rows, dispatch, toggleRow]
  );






  return (
    <>
    <DataGrid
      apiRef={apiRef}
      columns={columns}
      rows={rows}
      treeData
      sx={{
        '& .MuiDataGrid-row[data-id$="-DETAIL"] .MuiDataGrid-cell': {
          width: '100% !important',

        },
      }}
      onColumnWidthChange={handleColumnWidthChange}
      getRowClassName={(params) =>
        params.row.kind === "section"
          ? "section-row"
          : params.row.kind === "field"
            ? "field-row"
            : ""
      }
      getTreeDataPath={(row) => getTreePath(row, rows)}
      getRowId={(row) => row.id}
      autoHeight
      disableColumnMenu
      density="compact"
      getRowHeight={(params) => {
        if (params.model.kind === "detail") {
          return 'auto'; // Let it grow based on content
        }
        return null; // Default for others
      }}
      processRowUpdate={async (newRow, oldRow) => {
        console.log("🔄 Edited row (new):", newRow);
        console.log("🔄 Edited row (old):", oldRow);

        const changes = {};
        Object.keys(newRow).forEach((key) => {
          if (newRow[key] !== oldRow[key]) {
            changes[key] = newRow[key];
          }
        });

        if (Object.keys(changes).length === 0) {
          console.log("⚠️ No changes detected, skipping update.");
          return oldRow;
        }

        const updatedPayload = { ...oldRow, ...changes };

        try {
          dispatch(updateConditionRow(updatedPayload));
          console.log("✅ Dispatched updateConditionRow:", updatedPayload);

          // Optional: sync with DB
          // await syncWithDB({ row: updatedPayload, changes });

          return updatedPayload; // ← important for MUI DataGrid to update row locally
        } catch (error) {
          console.error("❌ Error in processRowUpdate:", error);
          throw error; // will trigger onProcessRowUpdateError if defined
        }
      }}

      experimentalFeatures={{ newEditingApi: true }}
      isCellEditable={(params) => {
        if (params.row.kind === "section" && ["label", "description"].includes(params.field)) return true;
        if (params.row.kind === "field" && ["field_type", "input_type", "label", "description"].includes(params.field)) return true;
        return false;
      }}
      pagination
      pageSizeOptions={[15, 50, 100]}
      initialState={{ pagination: { paginationModel: { pageSize: 15, page: 0 } } }}
    />



    </>
  );

}