"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Paper, TableContainer, Table, TableHead, TableRow, TableCell,
  TableBody, IconButton, Select, MenuItem, TextField, Stack,
  Typography, Button, Box
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { v4 as uuid } from "uuid";
import { useSelector, useDispatch } from "react-redux";
import { updateCondition, deleteCondition } from "@/store";
import ConditionToolbar from "./ConditionToolbar";




/* ─── enum lists ─── */
const OP_TYPES = ["And", "Or", "Not And", "Not Or"];
const CMP_TYPES = [
  "Equal", "Not Equal", "Greater Than", "Less Than",
  "Greater Than or equal to", "Less Than or equal to",
  "Contains", "Doesn't contain", "Ends with", "Doesn't end with",
];



/* ─── factories ─── */
const makeComparison = () => ({ id: uuid(), leftValue: "", comparisonType: "", rightValue: "" });
const makeOperation = () => ({ id: uuid(), operationType: "", comparisons: [makeComparison()] });
const makeCondition = () => ({ id: null, comment: "", operations: [makeOperation()] });


/* Hydration: merge comparisons into their matching operations */
function hydrateConditions(rawConditions) {
  return (rawConditions || []).map(cond => {
    const comps = cond.comparisons || [];
    const ops = (cond.operations || []).map(op => ({
      ...op,
      comparisons: comps.filter(cmp => cmp.parentTermnum === op.termnum)
    }));
    return { ...cond, operations: ops };
  });
}




export default function ConditionTable() {
  const dispatch = useDispatch();
  const cfg = useSelector(s => s.jsonData.configurator);
  const selectedField = useSelector(s => s.jsonData.selectedField);
  const [selectedDepId, setSelectedDepId] = useState(null);
  const [conditions, setConditions] = useState([]);



  // Auto-select first dependency if none selected yet
  useEffect(() => {
    if (!selectedDepId && selectedField?.dependencies?.length > 0) {
      setSelectedDepId(selectedField.dependencies[0].id);
    }
  }, [selectedField, selectedDepId]);




  // ✅ Resolve full field from cfg.sections
  const fullField = useMemo(() => {
    if (!selectedField?.id) return null;
    const findField = (sections, id) => {
      for (const sec of sections) {
        const direct = sec.fields?.find(f => f.id === id);
        if (direct) return direct;
        const nested = findField(sec.sections || [], id);
        if (nested) return nested;
      }
      return null;
    };
    return findField(cfg?.sections || [], selectedField.id);
  }, [cfg, selectedField?.id]);

  const conditionIds = useMemo(() => {
    if (!fullField?.dependencies || !selectedDepId) return [];
    const dep = fullField.dependencies.find(d => String(d.id) === String(selectedDepId));
    // Only take conditions unique to this dependency
    return dep?.dependency_values
      ?.filter(v => String(v.dependency_id) === String(selectedDepId))
      .map(v => String(v.condition_id)) || [];
  }, [fullField, selectedDepId]);


  const relatedConditions = useMemo(() => {
    if (!fullField?.dependencies || !selectedDepId) return [];
    const dep = fullField.dependencies.find(d => String(d.id) === String(selectedDepId));
    if (!dep) return [];

    // Build full hydrated objects based on only this dependency's condition_ids
    const idsForDep = dep.dependency_values.map(v => String(v.condition_id));

    const filtered = (cfg?.conditions || [])
      .filter(c => idsForDep.includes(String(c.id)));

    return filtered;
  }, [cfg?.conditions, fullField, selectedDepId]);


  // ✅ Debug log
  useEffect(() => {
    if (!selectedDepId) return;
    const dep = fullField?.dependencies?.find(d => String(d.id) === String(selectedDepId));

    console.group(`🔍 Selected Dependency #${selectedDepId}`);
    //console.log("Full Field Dependencies:", fullField?.dependencies);
    //console.log("Selected Dependency Object:", dep);
    //console.log("Condition IDs for this dep only:", conditionIds);
    //console.log("Global cfg.conditions:", cfg?.conditions);

    // Find conditions linked to more than one dependency
    const conditionToDeps = {};
    fullField?.dependencies?.forEach(d => {
      d.dependency_values.forEach(v => {
        const cid = String(v.condition_id);
        if (!conditionToDeps[cid]) conditionToDeps[cid] = [];
        conditionToDeps[cid].push(d.id);
      });
    });
    //console.log("Condition → Dependencies Map:", conditionToDeps);

    //console.log("Matched hydrated conditions:", relatedConditions);
    console.groupEnd();
  }, [selectedDepId, fullField, conditionIds, relatedConditions, cfg?.conditions]);












  /* CRUD helpers */
  const addCondition = () =>
    setConditions(cs => [...cs, makeCondition()]);

  const removeCondition = id => {
    setConditions(cs => cs.filter(c => String(c.id) !== String(id)));
    dispatch(deleteCondition(id));
  };

  const addOperation = cid =>
    setConditions(cs => cs.map(c =>
      c.id === cid
        ? { ...c, operations: [...(c.operations || []), makeOperation()] }
        : c
    ));

  const removeOperation = (cid, oid) =>
    setConditions(cs => cs.map(c =>
      c.id === cid
        ? { ...c, operations: (c.operations || []).filter(o => o.id !== oid) }
        : c
    ));

  const addComparison = (cid, oid) =>
    setConditions(cs => cs.map(c =>
      c.id === cid
        ? {
          ...c,
          operations: (c.operations || []).map(o =>
            o.id === oid
              ? { ...o, comparisons: [...(o.comparisons || []), makeComparison()] }
              : o
          )
        }
        : c
    ));

  const removeComparison = (cid, oid, cmpId) =>
    setConditions(cs => cs.map(c =>
      c.id === cid
        ? {
          ...c,
          operations: (c.operations || []).map(o =>
            o.id === oid
              ? {
                ...o,
                comparisons: (o.comparisons || []).filter(cp => cp.id !== cmpId)
              }
              : o
          )
        }
        : c
    ));


  const updateConditionField = (cid, mutator) =>
    setConditions(cs => cs.map(c => (c.id === cid ? mutator(c) : c)));

const handleSaveAll = () => {
  conditions.forEach(cond => {
    dispatch(updateCondition({ condition: cond, dependencyId: selectedDepId }));
  });
};

// 🔁 Sync when dependency or field changes
useEffect(() => {
  setConditions(relatedConditions || []);
}, [relatedConditions]);


  useEffect(() => {
    //console.log("🟢 [DependencyTable] Selected dependency changed:", selectedDepId);

  }, [selectedDepId])



  return (
    <Paper variant="outlined">

      <ConditionToolbar
        fieldId={selectedField?.id}
        selectedDepId={selectedDepId}
        onSelectDependency={(depId) => setSelectedDepId(depId)}
      />


      <TableContainer>
        <Table size="small">



          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 60 }}>#</TableCell>
              <TableCell>Description / Op / Left-value</TableCell>
              <TableCell sx={{ width: 200 }}>Comparison type</TableCell>
              <TableCell sx={{ width: 140 }}>Right value</TableCell>
              <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>





          <TableBody>
            {conditions.map((cond, idx) => (
              <React.Fragment key={cond.id ?? `tmp-${idx}`}>
                {/* Condition row */}
                <TableRow sx={{ background: idx % 2 ? "#f5f5f5" : "#e9e9e9" }}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <TextField
                      variant="standard" size="small" fullWidth
                      placeholder="Condition comment"
                      value={cond.comment || ""}
                      onChange={e =>
                        updateConditionField(cond.id, c => ({ ...c, comment: e.target.value }))
                      }
                    />
                  </TableCell>
                  <TableCell colSpan={2}>
                    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
                      Add an operation
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => addOperation(cond.id)}><AddIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => removeCondition(cond.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>

                {/* Operations & comparisons */}
                {(cond.operations || []).map(op => (
                  <React.Fragment key={op.id}>
                    {/* Operation row */}
                    <TableRow>
                      <TableCell />
                      <TableCell sx={{ pl: 4 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Select
                            variant="standard" size="small" sx={{ width: 110 }}
                            value={op.operationType || ""}
                            onChange={e => updateConditionField(cond.id, c => ({
                              ...c,
                              operations: (c.operations || []).map(o =>
                                o.id === op.id ? { ...o, operationType: e.target.value } : o
                              )
                            }))}
                          >
                            <MenuItem value=""><em>Operation</em></MenuItem>
                            {OP_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                          </Select>
                          <Typography variant="body2" sx={{ opacity: .7 }}>then</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => addComparison(cond.id, op.id)}><AddIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => removeOperation(cond.id, op.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>

                    {/* Comparisons under that op */}
                    {(op.comparisons || []).map(cmp => (
                      <TableRow key={cmp.id}>
                        <TableCell />
                        <TableCell sx={{ pl: 8 }}>
                          <TextField
                            variant="standard" size="small" fullWidth
                            placeholder="Left value"
                            value={cmp.leftValue || ""}
                            onChange={e => updateConditionField(cond.id, c => ({
                              ...c,
                              operations: (c.operations || []).map(o =>
                                o.id === op.id ? {
                                  ...o,
                                  comparisons: (o.comparisons || []).map(cp =>
                                    cp.id === cmp.id ? { ...cp, leftValue: e.target.value } : cp
                                  )
                                } : o
                              )
                            }))}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            variant="standard" size="small" fullWidth
                            value={cmp.comparisonType || ""}
                            onChange={e => updateConditionField(cond.id, c => ({
                              ...c,
                              operations: (c.operations || []).map(o =>
                                o.id === op.id ? {
                                  ...o,
                                  comparisons: (o.comparisons || []).map(cp =>
                                    cp.id === cmp.id ? { ...cp, comparisonType: e.target.value } : cp
                                  )
                                } : o
                              )
                            }))}
                          >
                            <MenuItem value=""><em>Comparison</em></MenuItem>
                            {CMP_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TextField
                            variant="standard" size="small" fullWidth
                            placeholder="Right value"
                            value={cmp.rightValue || ""}
                            onChange={e => updateConditionField(cond.id, c => ({
                              ...c,
                              operations: (c.operations || []).map(o =>
                                o.id === op.id ? {
                                  ...o,
                                  comparisons: (o.comparisons || []).map(cp =>
                                    cp.id === cmp.id ? { ...cp, rightValue: e.target.value } : cp
                                  )
                                } : o
                              )
                            }))}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => removeComparison(cond.id, op.id, cmp.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}

            {/* Footer */}
            <TableRow>
              <TableCell colSpan={5}>
                <Stack direction="row" spacing={2}>
                  <IconButton size="small" onClick={addCondition}>
                    <AddIcon fontSize="small" /> Add condition
                  </IconButton>
                  <Box flexGrow={1} />
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveAll}
                  >
                    Save
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          </TableBody>



        </Table>
      </TableContainer>
    </Paper>


  );
}
