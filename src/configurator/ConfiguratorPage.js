/*  DemoPersistentShell.jsx  */
"use client";
import React, { Suspense, lazy, useEffect } from "react";
import { styled } from "@mui/material/styles";
import {
  Box,
  CssBaseline,
  Toolbar,
  Divider,
  Drawer,
  Typography,
  IconButton,
} from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import ConfigSectionAccordion from "./components/accordion/SectionAccordion";
import { setSnackbar } from "@/store.js";
import ConfigToolbar from "./components/toolbar/ConfigToolbar";
import FileExplorer from "./components/toolbar/FileExplorer";
import SnackbarAlert from "./components/toolbar/SnackbarAlert";
import ConditionsTreeGrid from "./components/grids/ConditionsTreeGrid";
import { keyframes } from '@mui/system';
import RefreshIcon from '@mui/icons-material/Refresh';
import FieldInfoDrawer from "./components/grids/helpers/FieldInfoDrawer";
import LoadingSpinner from "./lib/LoadingSpinner";
import ConfiguratorTreeView from "./components/toolbar/helpers/ ConfiguratorTreeView";
import DescriptorInputPanel from "./components/grids/helpers/DescriptorInputPanel";
import { loadConfiguratorList } from "./components/toolbar/helpers/loadConfigurator";
import DetailPanelExpandOnRowClick from "./components/grids/helpers/exampleNewTable";
import TableCollapsible from "./components/grids/helpers/exampleNewTable";

const drawerWidth = 320;

/* ---------- Drawer that animates between 0 px ↔ 280 px ---------- */
const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
});

const closedMixin = (theme) => ({
  width: 0,
  overflowX: "hidden",
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
});


const MiniDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  flexShrink: 0,
  whiteSpace: "nowrap",
  ...(open ? openedMixin(theme) : closedMixin(theme)),
  "& .MuiDrawer-paper": open ? openedMixin(theme) : closedMixin(theme),
}));

const MiniDrawerRight = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  flexShrink: 0,
  whiteSpace: "nowrap",
  ...(open ? openedMixin(theme) : closedMixin(theme)),
  "& .MuiDrawer-paper": open ? openedMixin(theme) : closedMixin(theme),
}));


/* ---------- Main scroll area ---------- */
const Main = styled("main")({
  flexGrow: 1,
  overflow: "auto",     // both axes
  padding: 16,
});

export default function ConfiguratorPage() {
  const [open, setOpen] = React.useState(false);
  const opened = useSelector((state) => state.jsonData.drawerOpen);
  // console.log("Drawer open state ####### :", opened);
  const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;
  /* ----- Redux ----- */
  const dispatch = useDispatch();
  const configurator = useSelector((s) => s.jsonData.configurator);
  const snackbar = useSelector((s) => s.jsonData.snackbar);

  /* ----- pull TREE section for accordion ----- */
  const sections = configurator?.sections || [];
  const conditionsSection = sections.find((s) => s.type === "TREE");
  const rulesCount =
    conditionsSection?.condition_tree?.comparisons?.length || 0;

  const [busy, setBusy] = React.useState(false);



  useEffect(() => {
    console.log("[useEffect] Auto-refreshing configurator list on mount");
    loadConfiguratorList(dispatch);
  }, [dispatch]);



  const handleRefresh = async () => {
    try {
      setBusy(true);
      console.log('Refresh clicked');
      await loadConfiguratorList(dispatch);
      console.log('Refresh done');
    } catch (err) {
      console.error('Refresh error', err);
      dispatch(setSnackbar({ open: true, message: "Failed to refresh list", severity: "error" }));
    } finally {
      setBusy(false);
    }
  };



  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <CssBaseline />



      {/* ───────── Drawer ───────── */}
      <MiniDrawer variant="permanent" open={open}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: "100%" }}>
          {/* Header */}
          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
            }}
          >
            <Typography
              variant="subtitle2"
              component="div"
              noWrap
              sx={{
                fontWeight: 'bold',
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'primary.main',
                fontSize: '0.75rem',
              }}
            >
              Oxom & Imos Configurator
            </Typography>

            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{
                animation: busy ? `${spin} 1s linear infinite` : 'none',
                color: 'gray.600',
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 1 }} />

          {/* Scrollable content */}
          <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
            <FileExplorer />
            <Box sx={{ mt: 2 }}>
              <ConfiguratorTreeView />
            </Box>
          </Box>
        </Box>
      </MiniDrawer>









      {/* ───────── Page ───────── */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          /* allow Main to shrink while drawer is open */
          minWidth: 0,
        }}
      >
        {/* Header (toolbar carries its own hamburger) */}
        <ConfigToolbar
          drawerOpen={open}                 //  ← NEW
          onToggleDrawer={() => setOpen((p) => !p)}
        />
      


        {/* Main content */}
        <Main>
          <Suspense fallback={<LoadingSpinner />}>
            <ConfigSectionAccordion
              label={conditionsSection?.label || "Conditions"}
              description={conditionsSection?.description}
              info={`${rulesCount} rule${rulesCount !== 1 ? "s" : ""}`}
              meta={{
                id: configurator?.id,
                cp_id: configurator?.cpid,
                created_at: configurator?.created_at,
                updated_at: configurator?.updated_at,
              }}
            >
              <ConditionsTreeGrid />
            </ConfigSectionAccordion>

           


          </Suspense>
        </Main>




      </Box>





      <MiniDrawerRight variant="permanent" open={opened} anchor="right">
        <FieldInfoDrawer />
      </MiniDrawerRight>



      <SnackbarAlert
        open={snackbar.open}
        onClose={() => dispatch(setSnackbar({ ...snackbar, open: false }))}
        message={snackbar.message}
        severity={snackbar.severity}
      />


    </Box>
  );
}
