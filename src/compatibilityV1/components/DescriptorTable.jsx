'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Chip,
  Stack,
  Collapse,
  TextField,
  MenuItem,
  Tooltip,
  Divider,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Add,
  AddBox,
  Delete,
  UnfoldMore,
  UnfoldLess,
} from '@mui/icons-material';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import NumbersRoundedIcon from '@mui/icons-material/NumbersRounded';
import CloudRoundedIcon from '@mui/icons-material/CloudRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';

import {
  addChildToOperation,
  removeNodeAtPath,
  updateNodeAtPath,
  opLabel,
} from '../helpers/manageNodes';
import axios from 'axios';
import CustomAlert from '@/components/Otman/UI/CustomAlert';

// IMOS mapping + operator canonicalization
import {
  KeyMapping,
  normalizeComparisonOp,
  COMP_CHOICES as COMP_CHOICES_CANON,
  OP_CHOICES,
  COMP_CHOICES,
  OP_HUMAN,
} from '../helpers/ConstantDescriptor';
import { useRouter } from 'next/navigation';

import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import { clone, makeId, normCmp, normStr, sanitiseForest, validateForestHuman } from '../helpers/validationHelper';





export default function DescriptorTable({ descriptor, trees, onChange }) {
  const [data, setData] = useState(() => clone(trees || []));
  const [open, setOpen] = useState(() => new Set());
  const [applying, setApplying] = useState(false);


  // Canonical token -> human label list for the menu
const COMP_OPTIONS = (COMP_CHOICES || []).map((tok) => ({
  token: tok,
  label: OP_HUMAN?.[tok] || tok,
}));


  // DB switcher persisted
  const [db, setDb] = useState(() => {
    if (typeof window === 'undefined') return 'rp';
    return localStorage.getItem('compat.activeDb') || 'rp';
  });
  const isReadOnly = db === 'imos'; // IMOS = PROD (read-only)

  const router = useRouter();

  // Clone dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [newName, setNewName] = useState(() =>
    descriptor ? `${String(descriptor)}_____` : 'COMPAT_NEW_____'
  );
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState(null);

  // CID/Table dialog state
  const [cidOpen, setCidOpen] = useState(false);
  const [cidCsv, setCidCsv] = useState('');

  // inline edit states (per-branch) for value + cid
  const [editValueIdx, setEditValueIdx] = useState(null);
  const [tmpValue, setTmpValue] = useState('');
  const [editCidIdx, setEditCidIdx] = useState(null);
  const [tmpCid, setTmpCid] = useState('');

  // toast
  const [toast, setToast] = useState({ open: false, severity: 'info', message: '' });
  const notify = (message, severity = 'info') =>
    setToast({ open: true, severity, message });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  // validation
  const issues = useMemo(() => validateForestHuman(data), [data]);
  const hasErrors = issues.some((i) => i.severity === 'error');
  const errorCount = issues.filter((i) => i.severity === 'error').length;

  const issueMap = useMemo(() => {
    const m = new Map();
    for (const it of issues) {
      const bucket = m.get(it.key) ?? { any: [], warnings: [] };
      if (it.field) bucket[it.field] = it.message;
      if (it.severity === 'warning') bucket.warnings.push(it.message);
      bucket.any = (bucket.any || []).concat(it.message);
      m.set(it.key, bucket);
    }
    return m;
  }, [issues]);

  // sync db selection ↔ localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('compat.activeDb', db);
      window.dispatchEvent(new Event('compat-db-change'));
    }
  }, [db]);

  // collapse editors when switching into RO
  useEffect(() => {
    if (isReadOnly) {
      setEditValueIdx(null);
      setEditCidIdx(null);
    }
  }, [isReadOnly]);

  // expand helpers
  const collectOpIds = (treeIndex, nodes) => {
    const acc = [];
    const dfs = (node, path) => {
      if (!node || node.type !== 'operation') return;
      acc.push(makeId(treeIndex, path));
      (node.children || []).forEach((child, idx) => dfs(child, [...path, idx]));
    };
    (nodes || []).forEach((n, i) => dfs(n, [i]));
    return acc;
  };
  const expandAllInTree = (treeIndex) => {
    const ids = collectOpIds(treeIndex, data[treeIndex]?.tree || []);
    setOpen((prev) => new Set([...prev, ...ids]));
  };
  const collapseAllInTree = (treeIndex) => {
    const ids = new Set(collectOpIds(treeIndex, data[treeIndex]?.tree || []));
    setOpen((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  // sync when descriptor/trees change
  useEffect(() => {
    setData(clone(trees || []));
    const rootIds = new Set();
    (trees || []).forEach((t, treeIndex) => {
      (t.tree || []).forEach((_n, idx) => rootIds.add(makeId(treeIndex, [idx])));
    });
    setOpen(rootIds);
    setNewName(descriptor ? `${String(descriptor)}_____` : 'COMPAT_NEW_____');
  }, [trees, descriptor]);

  const emitChange = (next) => {
    setData(next);
    if (typeof onChange === 'function') onChange({ descriptor, trees: next });
  };

  const toggle = (id) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ------------------------------- CID/Table helpers ----------------------------- */

  const prettyOp = (op) => OP_HUMAN[normCmp(op || '=')] ?? op ?? '=';

  function walkTreeToRows(treeIndex, node, path, acc) {
    if (!node) return;
    if (node.type === 'operation') {
      (node.children || []).forEach((c, i) => walkTreeToRows(treeIndex, c, [...path, i], acc));
      return;
    }
    if (node.type === 'comparison') {
      acc.push({
        branch: treeIndex + 1,
        path: path.join('/'),
        left: normStr(node.left),
        operator: prettyOp(node.operator),
        right: normStr(node.right),
      });
    }
  }

  function summarizeBranches() {
    const rowsSummary = [];
    const rowsDetail = [];

    (data || []).forEach((b, i) => {
      let ops = 0, cmps = 0;
      const walk = (node) => {
        if (!node) return;
        if (node.type === 'operation') {
          ops++;
          (node.children || []).forEach(walk);
        } else if (node.type === 'comparison') {
          cmps++;
        }
      };
      (b.tree || []).forEach(walk);
      rowsSummary.push({
        branch: i + 1,
        lindiv: String(b.value ?? ''),
        conditionId: Number.isFinite(b.conditionId) ? Number(b.conditionId) : null,
        opCount: ops,
        cmpCount: cmps,
      });
      (b.tree || []).forEach((n, idx) => walkTreeToRows(i, n, [idx], rowsDetail));
    });

    return { rowsSummary, rowsDetail };
  }

  function toCsv(headers, rows) {
    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(',')),
    ].join('\n');
  }

  function prepareCsv() {
    const { rowsSummary, rowsDetail } = summarizeBranches();
    const csv1 = toCsv(['branch','lindiv','conditionId','opCount','cmpCount'], rowsSummary);
    const csv2 = toCsv(['branch','path','left','operator','right'], rowsDetail);
    setCidCsv(`${csv1}\n\n${csv2}`);
  }

  const handleOpenCidTable = () => {
    prepareCsv();
    setCidOpen(true);
  };

  const handleCopyCidCsv = async () => {
    try {
      await navigator.clipboard.writeText(cidCsv);
      notify('CID table copied to clipboard.', 'success');
    } catch {
      notify('Clipboard not available.', 'error');
    }
  };

  const handleDownloadCidCsv = () => {
    const blob = new Blob([cidCsv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${descriptor}_conditions.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    notify('CSV downloaded.', 'success');
  };

  /** Generate ConditionIDs on server, then inject into local branches + auto-open table */
  const handleGenerateConditionIds = async () => {
    if (isReadOnly) {
      notify('Read-only (IMOS PROD). Generating Condition IDs is disabled.', 'warning');
      return;
    }
    try {
      const clean = sanitiseForest(data);

      const res = await axios.post(
        `/api/descriptor/conditions/generate?db=${encodeURIComponent(db)}`,
        { descriptor, trees: clean },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const returnedTrees = res?.data?.trees;
      if (Array.isArray(returnedTrees)) {
        const next = clone(data);
        for (let i = 0; i < next.length; i++) {
          if (returnedTrees[i] && returnedTrees[i].conditionId != null) {
            next[i].conditionId = returnedTrees[i].conditionId;
          }
        }
        setData(next);
        prepareCsv();
        setCidOpen(true);
        notify(`ConditionIDs allocated: ${res?.data?.allocated ?? 0}.`, 'success');
        return;
      }

      const mappings = res?.data?.mapping || res?.data?.branches || [];
      const next = clone(data);
      let applied = 0;
      for (const m of mappings) {
        const idx = Number(m.index ?? m.branch ?? m.branchIndex);
        const cid = Number(m.to ?? m.conditionId ?? m.cid ?? m.CONDITIONID);
        if (Number.isFinite(idx) && Number.isFinite(cid) && next[idx]) {
          next[idx].conditionId = cid;
          applied++;
        }
      }
      setData(next);
      prepareCsv();
      setCidOpen(true);
      notify(`Generated ConditionIDs — applied ${applied}.`, 'success');
    } catch (e) {
      notify(`Failed to generate ConditionIDs: ${e?.message || 'unknown error'}`, 'error');
    }
  };

  /* ------------------------------- send helpers ----------------------------- */

  const sendWithSanitise = async (cb) => {
    if (hasErrors) {
      const errMsgs = issues.filter(i => i.severity === 'error').map(i => i.message);
      const base = errMsgs.length ? errMsgs : issues.map(i => i.message);
      const list = base.slice(0, 6).join(' • ');
      notify(`Please fix these issues: ${list}${base.length > 6 ? ' …' : ''}`, 'error');
      return;
    }
    const clean = sanitiseForest(data);
    await cb(clean);
  };

  const handleApplyUpdate = async () => {
    if (isReadOnly) {
      notify('Read-only (IMOS PROD). Updates are disabled. Switch to RP to edit.', 'warning');
      return;
    }
    if (applying) return;
    setApplying(true);
    try {
      await sendWithSanitise(async (clean) => {
        const payload = { descriptor, trees: clean, mode: 'retain' };
        const res = await axios.post(
          `/api/descriptor/descriptors/update?db=${encodeURIComponent(db)}`,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );
        const c = res?.data?.counts || {};
        notify(
          `Updated "${descriptor}" — upserted: ${c.upsertedBranches ?? 0}, newCids: ${c.newCids ?? 0}, reused: ${c.reusedCids ?? 0}, disabled: ${c.disabled ?? 0}`,
          'success'
        );
      });
    } catch (err) {
      console.error('❌ Apply update failed:', err);
      notify(`Failed to update "${descriptor}". Check console/logs.`, 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleSubmitTree = async () => {
    try {
      await sendWithSanitise(async (clean) => {
        const payload = { descriptor, trees: clean };
        const res = await axios.post(
          `/api/descriptor/sql?db=${encodeURIComponent(db)}`,
          payload,
          { responseType: 'text', headers: { 'Content-Type': 'application/json' } }
        );

        const filename = `${payload.descriptor}_update.sql`;
        const blob = new Blob([res.data], { type: 'application/sql; charset=utf-8' });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        notify(`SQL file downloaded: ${filename}`, 'success');
      });
    } catch (error) {
      console.error('❌ Error submitting tree:', error);
      notify('Error generating update SQL. See console for details.', 'error');
    }
  };

  const handleCreateSql = async () => {
    try {
      await sendWithSanitise(async (clean) => {
        const res = await axios.post(
          `/api/descriptor/sql/new?name=${encodeURIComponent(descriptor)}&db=${encodeURIComponent(db)}`,
          { descriptor, trees: clean },
          { responseType: 'text', headers: { 'Content-Type': 'application/json' } }
        );

        const filename = `${descriptor}_create.sql`;
        const blob = new Blob([res.data], { type: 'application/sql; charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);

        notify(`Create-SQL file downloaded: ${filename}`, 'success');
      });
    } catch (error) {
      console.error('❌ Error submitting create-sql tree:', error);
      notify('Error generating create SQL. See console for details.', 'error');
    }
  };

  /* ------------------------ Clone descriptor (create-empty + update) -------- */

  const nameNeedsChange = (source, target) => {
    const s = String(source || '').trim().toUpperCase();
    const t = String(target || '').trim().toUpperCase();
    if (!t) return true;
    if (t === s) return true;
    if (s && t === `${s}_____`) return true; // unchanged default
    return false;
  };

  const handleCloneDescriptor = async () => {
    if (isReadOnly) {
      setCreateErr('Read-only (IMOS PROD). Cloning is disabled.');
      return;
    }
    if (!newName.trim()) return;
    if (nameNeedsChange(descriptor, newName)) {
      setCreateErr('Please change the name (the default with "_____" is not allowed).');
      return;
    }
    setCreating(true);
    setCreateErr(null);
    try {
      const target = String(newName || '').toUpperCase();
      const source = String(descriptor || '').toUpperCase();
      const clean = sanitiseForest(data);

      // 1) ensure target descriptor exists (idempotent)
      await axios.post(
        `/api/descriptor/create-empty?db=${encodeURIComponent(db)}`,
        { name: target, ifNotExists: true },
        { headers: { 'Content-Type': 'application/json' } }
      );

      // 2) upsert same trees into the new descriptor
      await axios.post(
        `/api/descriptor/descriptors/update?db=${encodeURIComponent(db)}`,
        { descriptor: target, trees: clean, mode: 'retain' },
        { headers: { 'Content-Type': 'application/json' } }
      );

      setOpenCreate(false);
      notify(`Cloned ${source} ➜ ${target} in ${db.toUpperCase()}.`, 'success');
      if (target !== source) {
        router.push(`/descriptor/${encodeURIComponent(target)}`);
      }
    } catch (e) {
      setCreateErr(e?.message ?? 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  /* ------------------------------- inline editors --------------------------- */

  const startEditValue = (idx) => {
    if (isReadOnly) return;
    setEditValueIdx(idx);
    setTmpValue(String(data[idx]?.value ?? ''));
  };
  const cancelEditValue = () => {
    setEditValueIdx(null);
    setTmpValue('');
  };
  const saveEditValue = (idx) => {
    const next = clone(data);
    next[idx].value = String(tmpValue ?? '');
    emitChange(next);
    cancelEditValue();
  };

  const startEditCid = (idx) => {
    if (isReadOnly) return;
    setEditCidIdx(idx);
    setTmpCid(
      data[idx]?.conditionId != null && Number.isFinite(Number(data[idx].conditionId))
        ? String(data[idx].conditionId)
        : ''
    );
  };
  const cancelEditCid = () => {
    setEditCidIdx(null);
    setTmpCid('');
  };
  const saveEditCid = (idx) => {
    const n = tmpCid.trim();
    if (n === '') {
      const next = clone(data);
      delete next[idx].conditionId;
      emitChange(next);
      cancelEditCid();
      return;
    }
    if (!/^\d+$/.test(n)) {
      notify('ConditionID must be a non-negative integer (or leave blank to clear).', 'error');
      return;
    }
    const cid = Number(n);
    const next = clone(data);
    next[idx].conditionId = cid;
    emitChange(next);
    cancelEditCid();
  };

  /* ------------------------------- handlers -------------------------------- */

  const guardRO = (msg = 'Read-only (IMOS PROD). Switch to RP to edit.') => {
    notify(msg, 'warning');
  };

  const handleCompChange = (treeIndex, path, field, value) => {
    if (isReadOnly) return guardRO();
    const next = updateNodeAtPath(data, treeIndex, path, (node) => {
      if (node.type !== 'comparison') return node;
      if (field === 'operator') return { ...node, operator: value };
      return { ...node, [field]: value };
    });
    emitChange(next);
  };

  const handleOpChange = (treeIndex, path, newOp) => {
    if (isReadOnly) return guardRO();
    const next = updateNodeAtPath(data, treeIndex, path, (node) => ({
      ...node,
      operator: newOp,
    }));
    emitChange(next);
  };

  const handleDeleteNode = (treeIndex, path) => {
    if (isReadOnly) return guardRO();
    const next = removeNodeAtPath(data, treeIndex, path);
    emitChange(next);
  };

  const handleAddComparison = (treeIndex, path) => {
    if (isReadOnly) return guardRO();
    const child = { type: 'comparison', left: '', operator: '=', right: '' };
    const next = addChildToOperation(data, treeIndex, path, child);
    const parentId = makeId(treeIndex, path);
    setOpen((prev) => new Set(prev).add(parentId));
    emitChange(next);
  };

  const handleAddGroup = (treeIndex, path) => {
    if (isReadOnly) return guardRO();
    const child = { type: 'operation', operator: 'AND', children: [] };
    const next = addChildToOperation(data, treeIndex, path, child);
    const parentChildren = getChildrenAtPath(next, treeIndex, path);
    const newIndex = (parentChildren?.length ?? 1) - 1;
    const parentId = makeId(treeIndex, path);
    const newPathId = makeId(treeIndex, [...path, newIndex]);
    setOpen((prev) => new Set(prev).add(parentId).add(newPathId));
    emitChange(next);
  };

  // ROOT adders
  const handleAddRootGroup = (treeIndex) => {
    if (isReadOnly) return guardRO();
    const next = clone(data);
    const child = { type: 'operation', operator: 'AND', children: [] };
    if (!Array.isArray(next[treeIndex].tree)) next[treeIndex].tree = [];
    next[treeIndex].tree.push(child);
    const newIdx = next[treeIndex].tree.length - 1;
    const newId = makeId(treeIndex, [newIdx]);
    setOpen((prev) => new Set(prev).add(newId));
    emitChange(next);
  };

  const handleAddRootComparison = (treeIndex) => {
    if (isReadOnly) return guardRO();
    const next = clone(data);
    const child = { type: 'comparison', left: '', operator: '=', right: '' };
    if (!Array.isArray(next[treeIndex].tree)) next[treeIndex].tree = [];
    next[treeIndex].tree.push(child);
    emitChange(next);
  };

  // helper: return children array for an operation at path
  function getChildrenAtPath(state, treeIndex, path) {
    if (!path || path.length === 0) return state[treeIndex].tree || [];
    let cursor = state[treeIndex].tree;
    for (let i = 0; i < path.length; i++) {
      const node = cursor[path[i]];
      if (!node || node.type !== 'operation') return null;
      if (i === path.length - 1) return node.children || [];
      cursor = node.children || [];
    }
    return null;
  }

  /* ------------------------------- renderers ------------------------------- */

  const renderOperationHeader = (
    node,
    expanded,
    pad,
    onToggle,
    onAddComp,
    onAddGroup,
    onChangeOp
  ) => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'action.hover',
          pl: `${pad + 10}px`,
          py: 0.5,
          gap: 1,
        }}
      >
        <IconButton size="small" onClick={onToggle}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>

        {/* black square operator badge */}
        <Box
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 0.75,
            bgcolor: 'common.black',
            color: 'common.white',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            minWidth: 64,
            textAlign: 'center',
          }}
        >
          {opLabel(node.operator)}
        </Box>

        {/* inline select to change operator */}
        <TextField
          select
          size="small"
          value={node.operator || 'AND'}
          onChange={(e) => onChangeOp(e.target.value)}
          sx={{ width: 120 }}
          disabled={isReadOnly}
        >
          {OP_CHOICES.map((op) => (
            <MenuItem key={op} value={op}>
              {op}
            </MenuItem>
          ))}
        </TextField>

        <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />

        <Tooltip title={isReadOnly ? 'Read-only (IMOS PROD)' : 'Add condition'}>
          <span>
            <IconButton size="small" onClick={onAddComp} disabled={isReadOnly}>
              <Add />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={isReadOnly ? 'Read-only (IMOS PROD)' : 'Add group'}>
          <span>
            <IconButton size="small" onClick={onAddGroup} disabled={isReadOnly}>
              <AddBox />
            </IconButton>
          </span>
        </Tooltip>

        {!hasChildren && (
          <Chip
            label="Empty group (will be removed)"
            size="small"
            sx={{ ml: 1 }}
            color="warning"
            variant="outlined"
          />
        )}
      </Box>
    );
  };



  const renderTree = (treeIndex, treeValue, nodes) => {
    let rowNum = 1;

    const renderNode = (node, level, path) => {
      const id = makeId(treeIndex, path);
      const pad = level * 20;

      if (node.type === 'operation') {
        const expanded = open.has(id);
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;

        return (
          <Fragment key={`${treeIndex}::${id}::operation`}>
            <TableRow>
              <TableCell width={60}>{rowNum++}</TableCell>
              <TableCell width={180} sx={{ fontWeight: 600 }}>
                {`desc ${level + 1}`}
              </TableCell>
              <TableCell colSpan={3} sx={{ p: 0 }}>
                {renderOperationHeader(
                  node,
                  expanded,
                  pad,
                  () => toggle(id),
                  () => handleAddComparison(treeIndex, path),
                  () => handleAddGroup(treeIndex, path),
                  (newOp) => handleOpChange(treeIndex, path, newOp)
                )}
              </TableCell>
              <TableCell width={56} align="right">
                {level > 0 && (
                  <Tooltip title={isReadOnly ? 'Read-only (IMOS PROD)' : 'Delete group'}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteNode(treeIndex, path)}
                        disabled={isReadOnly}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>

            <TableRow key={`${treeIndex}::${id}::children`}>
              <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                <Collapse in={expanded && hasChildren} timeout="auto" unmountOnExit>
                  <Box>
                    {(node.children || []).map((child, idx) =>
                      renderNode(child, level + 1, [...path, idx])
                    )}
                  </Box>
                </Collapse>
              </TableCell>
            </TableRow>
          </Fragment>
        );
      }

      if (node.type === 'comparison') {
        const op = node.operator || '=';
        const rowIssues = issueMap.get(id);

        return (
          <TableRow key={`${treeIndex}::${id}::comparison`}>
            <TableCell width={60}>{rowNum++}</TableCell>
            <TableCell width={180}>{`desc ${level + 1}`}</TableCell>

            {/* Left */}
            <TableCell sx={{ pl: `${pad + 40}px` }}>
              <TextField
                size="small"
                value={node.left ?? ''}
                onChange={(e) => handleCompChange(treeIndex, path, 'left', e.target.value)}
                placeholder="Left value"
                error={Boolean(rowIssues?.left)}
                helperText={rowIssues?.left}
                fullWidth
                disabled={isReadOnly}
              />
            </TableCell>

            {/* Operator */}
<TableCell width={220}>
  <TextField
    select
    size="small"
    value={normalizeComparisonOp(node.operator || '=')}
    onChange={(e) =>
      handleCompChange(
        treeIndex,
        path,
        'operator',
        normalizeComparisonOp(e.target.value)
      )
    }
    error={Boolean(rowIssues?.operator)}
    helperText={rowIssues?.operator}
    fullWidth
    disabled={isReadOnly}
    SelectProps={{
      renderValue: (v) => {
        const tok = normalizeComparisonOp(v);
        const human = OP_HUMAN?.[tok] || tok;
        return `${human} (${tok})`;
      },
      MenuProps: { MenuListProps: { dense: true } },
    }}
  >
    {COMP_OPTIONS.map(({ token, label }) => (
      <MenuItem key={token} value={token}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <span style={{ flex: 1 }}>{label}</span>
          <Chip size="small" variant="outlined" label={token} />
        </Box>
      </MenuItem>
    ))}
  </TextField>
</TableCell>


            {/* Right */}
            <TableCell>
              <TextField
                size="small"
                value={node.right ?? ''}
                onChange={(e) =>
                  handleCompChange(treeIndex, path, 'right', e.target.value)
                }
                placeholder="Right value"
                error={Boolean(rowIssues?.right)}
                helperText={rowIssues?.right}
                fullWidth
                disabled={isReadOnly}
              />
            </TableCell>

            {/* actions */}
            <TableCell width={56} align="right">
              <Tooltip title={isReadOnly ? 'Read-only (IMOS PROD)' : 'Delete condition'}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteNode(treeIndex, path)}
                    disabled={isReadOnly}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </TableCell>
          </TableRow>
        );
      }

      return null;
    };

    const isEditingValue = !isReadOnly && editValueIdx === treeIndex;
    const isEditingCid = !isReadOnly && editCidIdx === treeIndex;
    const branchIsEmpty = !nodes || nodes.length === 0;

    return (
      <Fragment key={`tree-${treeIndex}`}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mt: treeIndex ? 3 : 0, gap: 1 }}>
          <Typography variant="subtitle1" sx={{ mr: 0.5, fontWeight: 700 }}>
            Linear division
          </Typography>

          {/* LINDIV (value) chip — editable only if not RO */}
          {isReadOnly ? (
            <Chip
              label={treeValue || <i>(empty)</i>}
              size="small"
              variant="outlined"
              icon={<LockRoundedIcon />}
            />
          ) : !isEditingValue ? (
            <Chip
              label={treeValue || <i>(empty)</i>}
              size="small"
              onClick={() => startEditValue(treeIndex)}
              onDelete={() => startEditValue(treeIndex)}
              deleteIcon={<EditRoundedIcon />}
              sx={{ cursor: 'pointer' }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TextField
                size="small"
                value={tmpValue}
                onChange={(e) => setTmpValue(e.target.value)}
                placeholder="e.g. AF20 or FALSE"
                sx={{ width: 220 }}
                autoFocus
              />
              <IconButton size="small" color="success" onClick={() => saveEditValue(treeIndex)}>
                <CheckRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={cancelEditValue}>
                <ClearRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {/* CID chip — editable only if not RO */}
          {isReadOnly ? (
            <Chip
              label={
                branchIsEmpty
                  ? 'CID: —'
                  : (data?.[treeIndex]?.conditionId != null
                      ? `CID: ${data[treeIndex].conditionId}`
                      : 'CID: —')
              }
              size="small"
              variant="outlined"
              icon={<LockRoundedIcon />}
            />
          ) : !isEditingCid ? (
            <Chip
              label={
                branchIsEmpty
                  ? 'CID: —'
                  : (data?.[treeIndex]?.conditionId != null
                      ? `CID: ${data[treeIndex].conditionId}`
                      : 'CID: —')
              }
              size="small"
              color={branchIsEmpty ? 'default' : 'primary'}
              variant={branchIsEmpty ? 'outlined' : 'filled'}
              onClick={() => startEditCid(treeIndex)}
              onDelete={() => startEditCid(treeIndex)}
              deleteIcon={<EditRoundedIcon />}
              sx={{ cursor: 'pointer' }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TextField
                size="small"
                value={tmpCid}
                onChange={(e) => setTmpCid(e.target.value)}
                placeholder="enter CID or leave blank"
                sx={{ width: 160 }}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                autoFocus
              />
              <IconButton size="small" color="success" onClick={() => saveEditCid(treeIndex)}>
                <CheckRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={cancelEditCid}>
                <ClearRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {branchIsEmpty && (
            <Chip
              label="Empty branch: CID will be stripped on save"
              size="small"
              variant="outlined"
              color="warning"
            />
          )}

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1}>
            <Tooltip title={isReadOnly ? 'Read-only (IMOS PROD)' : 'Add root condition'}>
              <span>
                <IconButton size="small" onClick={() => handleAddRootComparison(treeIndex)} disabled={isReadOnly}>
                  <Add />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={isReadOnly ? 'Read-only (IMOS PROD)' : 'Add root group'}>
              <span>
                <IconButton size="small" onClick={() => handleAddRootGroup(treeIndex)} disabled={isReadOnly}>
                  <AddBox />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Expand entire tree">
              <span>
                <IconButton size="small" onClick={() => expandAllInTree(treeIndex)}>
                  <UnfoldMore />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Collapse entire tree">
              <span>
                <IconButton size="small" onClick={() => collapseAllInTree(treeIndex)}>
                  <UnfoldLess />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell width={60}>No.</TableCell>
                <TableCell width={180}>Description</TableCell>
                <TableCell>Left</TableCell>
                <TableCell width={180}>Operator</TableCell>
                <TableCell>Right</TableCell>
                <TableCell width={56} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(nodes && nodes.length ? nodes : []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}
                  >
                    No rules in this branch.&nbsp;
                    <Button size="small" onClick={() => handleAddRootGroup(treeIndex)} sx={{ mr: 1 }} disabled={isReadOnly}>
                      Add first group
                    </Button>
                    <Button size="small" onClick={() => handleAddRootComparison(treeIndex)} disabled={isReadOnly}>
                      Add first condition
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                (nodes || []).map((n, idx) => renderNode(n, 0, [idx]))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Fragment>
    );
  };
  


  if (!data || !data.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2">No conditions found for this descriptor.</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          rowGap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mr: 2 }}>
          {descriptor}
        </Typography>

        <Chip
          size="small"
          color={hasErrors ? 'error' : (issues.length ? 'warning' : 'success')}
          label={
            hasErrors
              ? `Errors: ${errorCount}`
              : issues.length
                ? `Warnings: ${issues.length}`
                : 'Valid'
          }
          sx={{ mr: 1 }}
        />

        {/* DB Switcher */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
          <CloudRoundedIcon fontSize="small" sx={{ opacity: 0.8 }} />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={db}
            onChange={(_, val) => { if (val) setDb(val); }}
            color="primary"
          >
            <ToggleButton value="rp">RP</ToggleButton>
            <ToggleButton value="imos">IMOS</ToggleButton>
          </ToggleButtonGroup>
          <Chip
            size="small"
            variant="outlined"
            color={isReadOnly ? 'secondary' : 'default'}
            label={`DB: ${db.toUpperCase()}`}
          />
          {isReadOnly && (
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              icon={<LockRoundedIcon />}
              label="Read-only · PROD"
            />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }} />

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: 'wrap',
            alignItems: 'center',
            px: 1.25,
            py: 1,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (t) =>
              t.palette.mode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
            boxShadow: (t) => t.shadows[1],
            gap: 1.25,
          }}
        >
          <Tooltip title={isReadOnly ? 'Disabled in IMOS (read-only PROD)' : ''}>
            <span>
              <Button
                variant="contained"
                size="small"
                color="primary"
                onClick={handleApplyUpdate}
                disabled={isReadOnly || applying || hasErrors}
                startIcon={
                  applying
                    ? <CircularProgress size={16} sx={{ color: 'inherit' }} />
                    : <RocketLaunchRoundedIcon />
                }
                sx={{ textTransform: 'none' }}
              >
                {applying ? 'Applying…' : 'Apply update'}
              </Button>
            </span>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

          {/* Allowed in RO: Generate SQL */}
          <Button
            variant="contained"
            size="small"
            color="secondary"
            startIcon={<DownloadRoundedIcon />}
            onClick={handleSubmitTree}
            disabled={hasErrors}
            sx={{ textTransform: 'none', boxShadow: 0, '&:hover': { boxShadow: 1 } }}
          >
            Generate SQL
          </Button>

          {/* Allowed in RO: Create SQL */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<ScienceRoundedIcon />}
            onClick={handleCreateSql}
            disabled={hasErrors}
            sx={{ textTransform: 'none' }}
          >
            Create SQL
          </Button>

          {/* Allowed in RO: open table */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<TableChartRoundedIcon />}
            onClick={handleOpenCidTable}
            sx={{ textTransform: 'none' }}
          >
            CID / Table
          </Button>

          {/* Clone as new (blocked in RO) */}
          <Tooltip title={isReadOnly ? 'Disabled in IMOS (read-only PROD)' : ''}>
            <span>
              <Button
                variant="outlined"
                size="small"
                color="success"
                startIcon={<ContentCopyIcon />}
                onClick={() => {
                  if (isReadOnly) return;
                  setNewName(descriptor ? `${String(descriptor)}_____` : 'COMPAT_NEW_____');
                  setOpenCreate(true);
                }}
                disabled={isReadOnly}
                sx={{
                  textTransform: 'none',
                  borderStyle: 'dashed',
                  bgcolor: (t) => t.palette.mode === 'light'
                    ? 'rgba(46, 204, 113, 0.04)'
                    : 'rgba(46, 204, 113, 0.08)',
                  '&:hover': {
                    borderStyle: 'dashed',
                    bgcolor: (t) => t.palette.mode === 'light'
                      ? 'rgba(46, 204, 113, 0.08)'
                      : 'rgba(46, 204, 113, 0.12)',
                  },
                }}
              >
                Clone as new
              </Button>
            </span>
          </Tooltip>

          {/* Clone dialog */}
          <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ContentCopyIcon color="success" />
              Clone descriptor
            </DialogTitle>

            <DialogContent dividers>
              <Alert severity={isReadOnly ? 'warning' : 'info'} sx={{ mb: 2 }}>
                {isReadOnly
                  ? 'Read-only (IMOS PROD). Cloning is disabled here.'
                  : <>We’ve added <b>_____</b> to the end. Replace it with your new name to avoid duplicates.</>}
              </Alert>

              <TextField
                autoFocus
                margin="dense"
                label="New descriptor name"
                fullWidth
                value={newName}
                onChange={(e) => setNewName(e.target.value.toUpperCase())}
                placeholder={`${descriptor || 'COMPAT_NEW'}_____`}
                helperText="Will be uppercased automatically. Name must differ from the source and not end with only '_____'." 
                disabled={isReadOnly}
                InputProps={{
                  sx: {
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
                    letterSpacing: 0.3,
                  },
                }}
              />
              {createErr && <Alert severity="error" sx={{ mt: 2 }}>{createErr}</Alert>}
            </DialogContent>

            <DialogActions sx={{ px: 2, py: 1.5 }}>
              <Button onClick={() => setOpenCreate(false)} disabled={creating}>
                Cancel
              </Button>
              <Button
                onClick={handleCloneDescriptor}
                variant="contained"
                color="success"
                disabled={isReadOnly || creating || !newName.trim()}
                startIcon={
                  creating
                    ? <CircularProgress size={16} sx={{ color: 'inherit' }} />
                    : <ContentCopyIcon />
                }
                sx={{ textTransform: 'none' }}
              >
                {creating ? 'Cloning…' : 'Clone'}
              </Button>
            </DialogActions>
          </Dialog>


        </Stack>
      </Box>

      {/* Human-friendly issues list */}
      {issues.length > 0 && (
        <Alert severity={hasErrors ? 'error' : 'warning'} variant="outlined">
          <b>{hasErrors ? 'Please fix the following:' : 'Heads up:'}</b>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingInlineStart: 20 }}>
            {issues.map((it, i) => (
              <li key={i}>{it.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {data.map((t, i) => renderTree(i, t.value, t.tree))}

      {/* CID / Table dialog */}
      <Dialog open={cidOpen} onClose={() => setCidOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableChartRoundedIcon />
          ConditionID Preview
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Copy CSV">
            <IconButton size="small" onClick={handleCopyCidCsv}>
              <ContentCopyRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </DialogTitle>

        <DialogContent dividers>

          {/* Summary table */}
          {(() => {
            const { rowsSummary } = summarizeBranches();
            return (
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Branch</TableCell>
                    <TableCell>LINDIV</TableCell>
                    <TableCell>ConditionID</TableCell>
                    <TableCell align="right">Groups</TableCell>
                    <TableCell align="right">Conditions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rowsSummary.map((r) => (
                    <TableRow key={r.branch}>
                      <TableCell>{r.branch}</TableCell>
                      <TableCell>{r.lindiv || <i>(empty)</i>}</TableCell>
                      <TableCell>
                        {r.conditionId ?? <Chip size="small" color="warning" label="New on save" />}
                      </TableCell>
                      <TableCell align="right">{r.opCount}</TableCell>
                      <TableCell align="right">{r.cmpCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}

          {/* Details table */}
          {(() => {
            const { rowsDetail } = summarizeBranches();
            return rowsDetail.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Branch</TableCell>
                    <TableCell>Path</TableCell>
                    <TableCell>Left</TableCell>
                    <TableCell>Operator</TableCell>
                    <TableCell>Right</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rowsDetail.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.branch}</TableCell>
                      <TableCell>{r.path}</TableCell>
                      <TableCell>{r.left}</TableCell>
                      <TableCell>{r.operator}</TableCell>
                      <TableCell>{r.right}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Alert severity="info">No conditions to display.</Alert>
            );
          })()}

          {/* Action bar below tables */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tooltip title={isReadOnly ? 'Disabled in IMOS (read-only PROD)' : ''}>
              <span>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AutoAwesomeRoundedIcon />}
                  onClick={handleGenerateConditionIds}
                  disabled={isReadOnly}
                  sx={{ textTransform: 'none' }}
                >
                  Generate Condition IDs
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="text"
              size="small"
              startIcon={<RefreshRoundedIcon />}
              onClick={prepareCsv}
              sx={{ textTransform: 'none' }}
            >
              Refresh Preview
            </Button>
            <Box sx={{ ml: 'auto' }}>
              <Chip size="small" icon={<NumbersRoundedIcon />} label={`Branches: ${data.length}`} />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleDownloadCidCsv}>Download CSV</Button>
          <Button variant="contained" onClick={() => setCidOpen(false)} startIcon={<CloseRoundedIcon />}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    
      <CustomAlert
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={closeToast}
        autoHideDuration={5000}
      />
    </Stack>
  );


}
