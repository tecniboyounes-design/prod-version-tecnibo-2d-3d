"use client";
import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";

/**
 * CreateConfiguratorDialog – gathers the minimum metadata to create a new configurator.
 *
 * Props
 * -------
 * • open:        boolean – show / hide dialog
 * • loading:     boolean – show busy state (spinners are shown on the caller‑side)
 * • onClose():   void    – called when user cancels / closes
 * • onCreate({ cpid, description }): void – called with collected data when user confirms
 */
export default function CreateConfiguratorDialog({ open, loading = false, onClose, onCreate }) {
  /* ───────────  local state  ─────────── */
  const [cpid, setCpid] = useState("");
  const [desc, setDesc] = useState("");
  const [touched, setTouched] = useState(false);

  /* ───────────  helpers  ─────────── */
  const CPID_REGEX = /^[A-Za-z0-9_-]{3,}$/; // simple: letters, digits, dash, underscore – min 3
  const cpidError  = touched && !CPID_REGEX.test(cpid.trim());

  /* reset when reopened */
  useEffect(() => {
    if (open) {
      setCpid("");
      setDesc("");
      setTouched(false);
    }
  }, [open]);

  /* ───────────  render  ─────────── */
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight="bold">Create a new configurator</DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2}}>
        {/* cp_id */}
        <TextField
          sx={{ mt:1 }}
          autoFocus
          fullWidth
          label="Unique cp_id *"
          placeholder="e.g. WALL_T100_F60"
          value={cpid}
          onChange={(e) => setCpid(e.target.value.toUpperCase())}
          onBlur={() => setTouched(true)}
          disabled={loading}
          error={cpidError}
          helperText={cpidError ? "Use ≥3 letters/digits. Allowed: A‑Z, 0‑9, _ or -" : ""}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Inventory2OutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {/* description */}
        <TextField
          label="Description"
          placeholder="Short human‑friendly description…"
          multiline
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          disabled={loading}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                <NotesOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Box fontSize="0.8em" color="text.secondary" display="flex" alignItems="center" gap={1}>
          <ErrorOutlineOutlinedIcon fontSize="inherit" />
          cp_id links 3D articles (walls, doors, etc.) & must be **unique** within your catalogue.
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Tooltip title={cpidError ? "Please fix cp_id" : ""} disableInteractive>
          <span>
            {/* span wrapper allows disabled button inside tooltip */}
            <Button
              variant="contained"
              disabled={loading || cpidError || !cpid.trim()}
              onClick={() => onCreate({ cpid: cpid.trim(), description: desc.trim() })}
            >
              Create
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
