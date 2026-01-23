/*  ConfigToolbar.jsx  */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Stack,
  Button,
  IconButton,
  CircularProgress,
  Toolbar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import SnackbarAlert from "../toolbar/SnackbarAlert";
import CreateConfiguratorDialog from "../dialogs/CreateConfiguratorDialog";
import {
  setDrawerOpen
} from "@/store.js";
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { prepareConfiguratorForApi } from "./helpers/apiMapper";


export default function ConfigToolbar({ onToggleDrawer = () => { }, drawerOpen = false }) {
  const dispatch = useDispatch();
  const configurator = useSelector((s) => s.jsonData.configurator);
  const drawerOpenR = useSelector((s) => s.jsonData.drawerOpen);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
    autoHideDuration: 3000,
  });

  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const lastSavedRef = useRef(JSON.stringify(configurator));
  const [unsaved, setUnsaved] = useState(false);

  useEffect(() => {
    const current = JSON.stringify(configurator);
    const lastSaved = lastSavedRef.current;
    setUnsaved(current !== lastSaved);
  }, [configurator]);


  const exportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(configurator, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: "configurator-export.json" });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: "Exported JSON downloaded.", severity: "success" });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: "Export failed.", severity: "error" });
    }
  };



  /* ---------------------------------------------------------------
     saveConfigurator() – updated version
     --------------------------------------------------------------- */


  /* … inside the component … */


  const saveConfigurator = async () => {
    setBusy(true);
    setSnackbar({
      open: true,
      message: "Saving… keep the page open ⏳",
      severity: "info",
      autoHideDuration: null,
    });

    try {
      /* 1 ▸ reshape the payload */
      const payload = prepareConfiguratorForApi(configurator);

      /* 2 ▸ PATCH to backend */
      const res = await fetch(
        `/api/configurator/${configurator.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );


      if (!res.ok) throw new Error(`Save failed (${res.status})`);

      lastSavedRef.current = JSON.stringify(configurator);
      setUnsaved(false);

      setSnackbar({
        open: true,
        message: "Saved successfully ✔️",
        severity: "success",
      });
    } catch (e) {
      console.error(e);
      setSnackbar({
        open: true,
        message: "Save failed – see console.",
        severity: "error",
      });
    } finally {
      setBusy(false);
    }
  };



  const createConfigurator = async ({ cpid, description }) => {
    setBusy(true);
    setSnackbar({ open: true, message: "Creating configurator… ⏳", severity: "info", autoHideDuration: null });
    try {
      const res = await fetch("h/configurator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpid, description }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      const data = await res.json();
      setSnackbar({ open: true, message: `Configurator “${data.cpid}” created ✔️`, severity: "success" });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: "Create failed – see console.", severity: "error" });
    } finally {
      setBusy(false);
    }
  };



  return (
    <>
      <Box borderBottom={1} borderColor="divider" px={1} py={0.5}>
        <Toolbar
          variant="dense"
          sx={{
            minHeight: 48,
            bgcolor: "background.paper",
            px: 1,
          }}
        >
          <IconButton size="small" edge="start" onClick={onToggleDrawer}>
            {drawerOpen ? (
              <MenuOpenIcon fontSize="small" />
            ) : (
              <MenuIcon fontSize="small" />
            )}
          </IconButton>

          <Stack direction="row" spacing={2} alignItems="center" sx={{ ml: 4 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon fontSize="small" />}
              onClick={() => setDialogOpen(true)}
              disabled={busy}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Create
            </Button>

            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={exportJSON}
              disabled={busy}
            >
              Export
            </Button>
          </Stack>

          <Box flexGrow={1} />

          <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
            <Button
              size="small"
              variant="contained"
              disabled={busy}
              onClick={saveConfigurator}
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <SaveIcon fontSize="small" />}
              sx={{
                minWidth: 92,
                bgcolor: unsaved ? "#ffcccc" : undefined,
                borderColor: unsaved ? "#cc0000" : undefined,
                color: unsaved ? "#660000" : undefined
              }}
            >
              {busy ? "Saving…" : unsaved ? "Save*" : "Save"}
            </Button>

            {drawerOpenR && (
              <IconButton
                size="small"
                edge="start"
                onClick={() => dispatch(setDrawerOpen(false))}
                sx={{ ml: 1 }}
              >
                <MenuOpenIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </Box>

      <CreateConfiguratorDialog
        open={dialogOpen}
        loading={busy}
        onClose={() => setDialogOpen(false)}
        onCreate={(data) => {
          setDialogOpen(false);
          createConfigurator(data);
        }}
      />

      <SnackbarAlert
        open={snackbar.open}
        autoHideDuration={snackbar.autoHideDuration}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </>
  );


}
