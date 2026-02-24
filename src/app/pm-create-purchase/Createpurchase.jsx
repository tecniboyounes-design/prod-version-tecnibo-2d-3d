// OdooPurchasePage.jsx
// Changes:
// - Vendor selector (res.partner): default selected = id=1 (Wood CAM SRL ‒ BE0600808201)
// - Calls your new /api/searchVendors endpoint to fetch suppliers
// - Includes chosen supplier in submit payload (backend may still override to 1 — that's fine)
// - Phase date auto-fill: prefer date_end, fallback date_start, with hint chip

"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import axiosBase from "axios";
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { DataGrid } from "@mui/x-data-grid";
import Autocomplete from "@mui/material/Autocomplete";
import { checkSessionIsValid } from "@/compatibilityV1/helpers/checkSessionIsValid";

/** Axios client -> points to your Node API that proxies Odoo */
const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PURCHASE_API) || "/api";

function makeApi(sessionId) {
  const inst = axiosBase.create({
    baseURL: API_URL,
    withCredentials: true,
  });
  return inst;
}

// Defaults for vendor
const DEFAULT_VENDOR_ID = 1;
const DEFAULT_VENDOR_LABEL = "Wood CAM SRL ‒ BE0600808201";

// "now" -> "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
const fmtInputDT = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

// "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DD HH:mm:ss" for Odoo
const toOdooDatetime = (v) =>
  v ? v.replace("T", " ") + (v.length === 16 ? ":00" : "") : undefined;

// "YYYY-MM-DD" -> "YYYY-MM-DDTHH:mm" (use 08:00 to avoid midnight DST weirdness)
const fromDateOnlyToInputDT = (dateOnly, hour = 8, minute = 0) => {
  if (!dateOnly) return "";
  const [y, m, d] = dateOnly.split("-").map(Number);
  const pad = (n) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T${pad(hour)}:${pad(minute)}`;
};

/**
 * Odoo Purchase Builder — Products -> Projects -> Phases -> Cart -> Submit
 * Expects `sessionId` prop from the parent Server Component.
 */
export default function OdooPurchasePage({ sessionId: propSessionId }) {
  // --- user info ---
  const [userInfo, setUserInfo] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);
  const [sessionId, setSessionId] = useState(propSessionId ?? null);

  // --- project search & selection ---
  const [projectQuery, setProjectQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  // --- phases ---
  const [phases, setPhases] = useState([]);
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);

  // --- products ---
  const [productQuery, setProductQuery] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [products, setProducts] = useState([]); // grid results

  // --- cart ---
  const [cart, setCart] = useState([]); // { id, name, price, quantity }

  // --- submit ---
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);

  const projectInputRef = useRef(null);

  // --- products params (chips) ---
const [prodModel, setProdModel] = useState("imos.conndesc");
const [prodField, setProdField] = useState("imos_order_id");
const [prodFlags, setProdFlags] = useState(["WS"]);
const [prodLimit, setProdLimit] = useState(0); // 0 = All
const [newFlag, setNewFlag] = useState("");


  // --- "Other Information" fields ---
  const [orderDate, setOrderDate] = useState(""); // datetime-local
  const [plannedDate, setPlannedDate] = useState(""); // datetime-local
  const [origin, setOrigin] = useState("");
  const [incotermLocation, setIncotermLocation] = useState("");
  const [paymentTermId, setPaymentTermId] = useState(""); // number (id)
  const [fiscalPositionId, setFiscalPositionId] = useState(""); // number (id)

  // --- NEW: track where planned date came from / user overrides
  const [plannedDirty, setPlannedDirty] = useState(false); // user edited planned date?
  const [phaseAuto, setPhaseAuto] = useState(null); // { phaseId, dateOnly, source: 'end'|'start' }

  // --- NEW: vendors (suppliers) ---
  const [vendors, setVendors] = useState([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorQuery, setVendorQuery] = useState("");

  // Helper: try to extract a product.product id from any common shape
  function getVariantId(r) {
    // Odoo JSON shapes: [id, "name"], {id, display_name}, or plain id
    const pick = (x) => (Array.isArray(x) ? x[0] : (x && x.id) || x);
    return (
      pick(r.product_id) || // already product.product
      pick(r.product_variant_id) || // typical on product.template
      (Array.isArray(r.product_variant_ids) && pick(r.product_variant_ids[0])) ||
      r.id
    );
  }

  // Normalize your network response shape
  const normalizeUser = (payload) => {
    const si = payload?.session_info || {};
    return {
      uid: payload?.uid ?? si?.uid,
      name: si?.name,
      login: si?.username,
      company_id: { id: si?.user_companies?.current_company ?? null },
      user_companies: si?.user_companies,
      lang: si?.user_context?.lang,
      tz: si?.user_context?.tz,
      server_version: si?.server_version,
      job_title: payload?.job_position?.result?.[0]?.job_title,
    };
  };

  // -------- API calls --------
  const fetchUser = async (sid) => {
    console.group("[USER] Fetch user by session");
    console.log("sessionId:", sid);
    setUserLoading(true);
    setUserError(null);
    try {
      const result = await checkSessionIsValid(sid);
      if (!result.ok) {
        setUserInfo(null);
        setUserError("Invalid or missing session. Please sign in.");
        console.warn("[USER] Invalid session");
      } else {
        const normalized = normalizeUser(result.data?.result || result.data);
        setUserInfo(normalized);
        console.log("[USER] Normalized user:", normalized);

        // Prefill dates on first load if empty (local time)
        if (!orderDate) {
          const now = fmtInputDT(new Date());
          setOrderDate(now);
          setPlannedDate(now);
        }
      }
    } catch (e) {
      setUserError(e?.message || String(e));
      setUserInfo(null);
      console.error("[USER] Error:", e);
    } finally {
      setUserLoading(false);
      console.groupEnd();
    }
  };

  // --- VENDORS ---
  const searchVendors = async (q = "") => {
    if (!sessionId) return;
    setVendorLoading(true);
    const api = makeApi(sessionId);
    try {
      const { data } = await api.post("/searchVendors", {
        q,
        limit: 200,
        companyId:
          userInfo?.user_companies?.current_company ?? userInfo?.company_id?.id ?? null,
      });
      const list =
        data?.records || data?.result?.records || (Array.isArray(data) ? data : []) || [];

      // Ensure default vendor (id=1) is present on initial blank search
      let final = list;
      if (!q && !list.find((v) => v.id === DEFAULT_VENDOR_ID)) {
        final = [
          { id: DEFAULT_VENDOR_ID, display_name: DEFAULT_VENDOR_LABEL, vat: "BE0600808201" },
          ...list,
        ];
      }
      setVendors(final);

      // Preselect default if no selection yet
      if (!selectedVendor) {
        const def = final.find((v) => v.id === DEFAULT_VENDOR_ID);
        if (def) setSelectedVendor(def);
      }
    } catch (e) {
      console.error("[VENDORS] Error:", e);
      setVendors([]);
      if (!selectedVendor) {
        // Fallback selection to default label if fetch fails
        setSelectedVendor({ id: DEFAULT_VENDOR_ID, display_name: DEFAULT_VENDOR_LABEL });
      }
    } finally {
      setVendorLoading(false);
    }
  };

  // Products (GET /getAllProducts with session header)
  const searchProducts = async () => {
  if (!sessionId) return;
  console.group("[PRODUCTS] Search");
  console.log("query:", productQuery);
  setProductLoading(true);
  const api = makeApi(sessionId);
  try {
    const params = new URLSearchParams();
    // our dedicated endpoint now
    params.set("model", prodModel);
    params.set("field", prodField);
    if (prodFlags.length) params.set("flags", prodFlags.join(","));
    // limit is optional; include only if not 0 (0 = All)
    if (prodLimit !== 0) params.set("limit", String(prodLimit));
    if (productQuery) params.set("q", productQuery); // kept for compatibility

    const { data } = await api.get(`/getAllProducts?${params.toString()}`);
    const list = Array.isArray(data)
      ? data
      : data?.records ||
        data?.result?.records ||
        data?.data?.result?.records ||
        [];
    setProducts(list);
    console.log("results:", list.length);
    if (list.length) console.log("example:", list[0]);
  } catch (e) {
    setProducts([]);
    console.error("[PRODUCTS] Error:", e);
  } finally {
    setProductLoading(false);
    console.groupEnd();
  }
};


  // Projects: POST /searchProject (open selector dialog after fetch)
  const searchProjects = async () => {
    if (!sessionId) return;
    console.group("[PROJECTS] Search");
    console.log("query:", projectQuery);
    setProjectLoading(true);
    const api = makeApi(sessionId);
    try {
      const { data } = await api.post("/searchProject", {
        projectName: projectQuery || undefined,
      });
      const list = data?.records || data?.result?.records || [];
      setProjects(list);
      setProjectDialogOpen(true);
      console.log("results:", list.length);
      if (list.length) console.log("example:", list[0]);
    } catch (e) {
      setProjects([]);
      setProjectDialogOpen(true);
      console.error("[PROJECTS] Error:", e);
    } finally {
      setProjectLoading(false);
      console.groupEnd();
    }
  };


 useEffect(() => {
  if (!sessionId) return;
  // auto-load products whenever params change
  searchProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [sessionId, prodModel, prodField, JSON.stringify(prodFlags), prodLimit]);



  // Phases: POST /phasesOfProject { projectId }
  const fetchPhases = async (projectId) => {
    if (!sessionId || !projectId) return;
    console.group("[PHASES] Fetch by project");
    console.log("projectId:", projectId);
    setPhaseLoading(true);
    const api = makeApi(sessionId);
    try {
      const { data } = await api.post("/phasesOfProject", { projectId });
      console.log("raw response:", data);

      // Keep server shape; enhance locally with delivery hints (non-breaking)
      const listRaw = data?.records || data?.result?.records || [];
      const list = (listRaw || []).map((p) => {
        const hasEnd = !!p?.date_end;
        const hasStart = !!p?.date_start;
        return {
          ...p,
          delivery_date: hasEnd ? p.date_end : hasStart ? p.date_start : null,
          delivery_source: hasEnd ? "end" : hasStart ? "start" : null,
        };
      });

      setPhases(list);
      console.log("results:", list.length);
      if (list.length) console.log("example:", list[0]);
    } catch (e) {
      setPhases([]);
      console.error("[PHASES] Error:", e);
    } finally {
      setPhaseLoading(false);
      console.groupEnd();
    }
  };

  // Cart ops
  const addToCart = (row) => {
    console.group("[CART] Add");
    console.log("row:", row);
    setCart((prev) => {
      const exists = prev.find((p) => p.id === row.id);
      if (exists) {
        const next = prev.map((p) => (p.id === row.id ? { ...p, quantity: p.quantity + 1 } : p));
        console.table(next);
        console.groupEnd();
        return next;
      }
      const next = [
        ...prev,
        {
          id: row.id, // product.product id
          name: row.display_name || row.name,
          price: Number(row.list_price ?? row.price ?? 0),
          quantity: 1,
        },
      ];
      console.table(next);
      console.groupEnd();
      return next;
    });
  };

  const removeFromCart = (id) => {
    console.group("[CART] Remove");
    console.log("remove id:", id);
    setCart((prev) => {
      const next = prev.filter((p) => p.id !== id);
      console.table(next);
      console.groupEnd();
      return next;
    });
  };

  const updateQty = (id, q) => {
    const value = Math.max(1, Number(q) || 1);
    console.group("[CART] Update qty]");
    console.log("id:", id, "qty:", value);
    setCart((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, quantity: value } : p));
      console.table(next);
      console.groupEnd();
      return next;
    });
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, l) => sum + Number(l.price || 0) * Number(l.quantity || 0), 0),
    [cart]
  );

  // Submit -> POST /createPurchase with your payload
  const submitPurchase = async () => {
    if (!selectedProject) {
      setSubmitMsg({ type: "error", text: "Select a project first." });
      return;
    }
    if (!selectedPhase) {
      setSubmitMsg({ type: "error", text: "Select a phase." });
      return;
    }
    if (!cart.length) {
      setSubmitMsg({ type: "error", text: "Add at least one product." });
      return;
    }
    if (!userInfo) {
      setSubmitMsg({ type: "error", text: "No valid user session. Please sign in." });
      return;
    }

    setSubmitting(true);
    setSubmitMsg(null);
    console.group("[SUBMIT] Create Purchase");
    try {
      const api = makeApi(sessionId);

      // keep original payload structure, just adding optional fields
      const payload = {
        // When backend stops forcing id=1, this will be honored:
        partner_id: selectedVendor?.id ?? DEFAULT_VENDOR_ID,

        odoo_project_id: selectedProject.id,
        analytic_account_id:
          (selectedProject.analytic_account_id && selectedProject.analytic_account_id.id) ||
          undefined,
        userData: {
          uid: userInfo?.uid ?? 0,
          user_companies: {
            current_company:
              userInfo?.user_companies?.current_company ?? userInfo?.company_id?.id ?? null,
          },
        },
        phase_id: selectedPhase?.id,
        items: cart.map((c) => ({
          id: c.id,
          name: c.name,
          quantity: c.quantity,
          price: c.price,
        })),
        knobs: { picking_type_id: 95, notes: "Auto-created from RoomPlanner test" },

        // NEW optional fields for "Other Information"
        date_order: toOdooDatetime(orderDate) || undefined, // header date_order
        date_planned: toOdooDatetime(plannedDate) || undefined, // apply to lines on server
        origin: origin || undefined,
        incoterm_location: incotermLocation || undefined,
        payment_term_id: paymentTermId ? Number(paymentTermId) : undefined,
        fiscal_position_id: fiscalPositionId ? Number(fiscalPositionId) : undefined,

        // Convenience mirrors (won't break server if ignored)
        project_id: selectedProject.id,
        user_id: userInfo?.uid ?? 0,
        company_id:
          userInfo?.user_companies?.current_company ?? userInfo?.company_id?.id ?? null,
      };

      console.log("project_id:", selectedProject?.id);
      console.log("phase_id:", selectedPhase?.id);
      console.log("partner_id:", payload.partner_id);
      console.table(cart);
      console.log("[SUBMIT] Payload:", JSON.stringify(payload, null, 2));

      const { data } = await api.post("/createPurchase", payload);

      console.log("[SUBMIT] API Response:", data);
      if (data?.success) {
        setSubmitMsg({ type: "success", text: "Purchase created successfully." });
        setCart([]);
      } else {
        const err = data?.error || "Failed to create purchase.";
        console.error("[SUBMIT] Error:", err);
        setSubmitMsg({ type: "error", text: err });
      }
    } catch (e) {
      const msg =
        e?.response?.data?.details || e?.response?.data?.error || e?.message || String(e);
      console.error("[SUBMIT] Exception:", e);
      setSubmitMsg({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
      console.groupEnd();
    }
  };

  // sync prop -> state and (re)fetch on change
  useEffect(() => {
    setSessionId(propSessionId ?? null);
  }, [propSessionId]);

  useEffect(() => {
    console.group("[APP] Session change");
    console.log("sessionId:", sessionId);
    if (sessionId) {
      (async () => {
        await fetchUser(sessionId);
        // After user is known (for company scope), load vendors and preselect default
        await searchVendors("");
      })();
    } else {
      setUserInfo(null);
      setUserLoading(false);
      setUserError("Missing session. Please sign in.");
    }
    console.groupEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (selectedProject) {
      console.group("[PROJECTS] Selected");
      console.log(selectedProject);
      console.groupEnd();

      // prefill origin from project if empty
      if (!origin || origin.trim() === "") {
        const code = selectedProject.code || selectedProject.ref || "";
        const name =
          selectedProject.display_name || selectedProject.name || `#${selectedProject.id}`;
        setOrigin(code || name);
      }

      // Reset phase-derived state when switching project
      setSelectedPhase(null);
      setPhases([]);
      setPlannedDirty(false);
      if (selectedProject?.id) fetchPhases(selectedProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  // NEW: when phase changes, auto-fill from phase dates if the user hasn't typed a custom value
  useEffect(() => {
    if (!selectedPhase) {
      setPhaseAuto(null);
      return;
    }
    console.group("[PHASES] Selected");
    console.log(selectedPhase);
    console.groupEnd();

    const end = selectedPhase.date_end || null;
    const start = selectedPhase.date_start || null;
    const source = end ? "end" : start ? "start" : null;
    const base = end || start || null;

    if (base) {
      setPhaseAuto({ phaseId: selectedPhase.id, dateOnly: base, source });
      if (!plannedDirty) {
        setPlannedDate(fromDateOnlyToInputDT(base)); // 08:00 local
      }
    } else {
      setPhaseAuto(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhase]);

  // --------- UI (order: PRODUCTS -> PROJECTS -> SUPPLIER -> PHASES -> CART -> OTHER INFO -> SUBMIT) ---------
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2} sx={{ p: 3, maxWidth: 1300, mx: "auto" }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <img src="/odoo.png" alt="Odoo" style={{ height: 40 }} />
          <Typography variant="h6">Odoo Purchase Builder</Typography>
          <Chip icon={<ShoppingBagIcon />} label="Paper View" size="small" />
          <Box flex={1} />
          {userLoading ? (
            <CircularProgress size={20} />
          ) : userError ? (
            <Chip color="error" label="User info failed" size="small" />
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar sx={{ bgcolor: "primary.main" }}>
                {String(userInfo?.name || userInfo?.login || "?").slice(0, 1)}
              </Avatar>
              <Stack spacing={0}>
                <Typography variant="body2">
                  {userInfo?.name || userInfo?.login || "Unknown"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {userInfo?.job_title ? `${userInfo.job_title} • ` : ""}Company #
                  {userInfo?.user_companies?.current_company}
                </Typography>
              </Stack>
            </Stack>
          )}
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* 1) PRODUCTS */}
   {/* 1) PRODUCTS */}
<Stack spacing={2}>
  <Typography variant="subtitle1">1) Find Products</Typography>

  {/* Chips bar for dynamic params */}
  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
    <Chip
      color="primary"
      label={`Model: ${prodModel}`}
      onClick={() => {
        const v = prompt("Model", prodModel);
        if (v) setProdModel(v.trim());
      }}
    />
    <Chip
      color="primary"
      label={`Field: ${prodField}`}
      onClick={() => {
        const v = prompt("Field", prodField);
        if (v) setProdField(v.trim());
      }}
    />
    <Chip
      color="secondary"
      label={`Limit: ${prodLimit === 0 ? "All" : prodLimit}`}
      onClick={() => {
        const v = prompt("Limit (0 = All)", String(prodLimit));
        const n = Number(v);
        if (!Number.isNaN(n) && n >= 0) setProdLimit(n);
      }}
    />
    {prodFlags.map((f) => (
      <Chip key={f} label={`Flag: ${f}`} onDelete={() => setProdFlags(prodFlags.filter(x => x !== f))} />
    ))}
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <TextField
        size="small"
        placeholder="Add flag (e.g. EQUIP_CAB)"
        value={newFlag}
        onChange={(e) => setNewFlag(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (() => {
          const v = newFlag.trim();
          if (v && !prodFlags.includes(v)) setProdFlags([...prodFlags, v]);
          setNewFlag("");
        })()}
      />
      <Button
        size="small"
        variant="outlined"
        onClick={() => {
          const v = newFlag.trim();
          if (v && !prodFlags.includes(v)) setProdFlags([...prodFlags, v]);
          setNewFlag("");
        }}
      >
        Add
      </Button>
    </Box>
    <Box flex={1} />
    {/* Manual refresh still available */}
    <Button
      onClick={searchProducts}
      variant="outlined"
      startIcon={<SearchIcon />}
      disabled={productLoading || !sessionId}
    >
      {productLoading ? "Loading…" : "Refresh"}
    </Button>
  </Stack>

  {/* Optional free text search stays (kept intact) */}
  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
    <TextField
      label="Search products"
      value={productQuery}
      onChange={(e) => setProductQuery(e.target.value)}
      fullWidth
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            {productLoading ? <CircularProgress size={20} /> : products.length > 0 ? <Inventory2Icon /> : null}
          </InputAdornment>
        ),
      }}
      helperText="Filters by flags on imos_order_id by default. Limit=All unless changed."
    />
    {/* Button is optional now; auto-fetch runs on param changes */}
    <Button
      onClick={searchProducts}
      variant="outlined"
      startIcon={<SearchIcon />}
      disabled={productLoading || !sessionId}
    >
      Search
    </Button>
  </Stack>

  <div style={{ height: 360, width: "100%" }}>
    <DataGrid
      rows={(products || []).map((r) => ({
        id: getVariantId(r) || r.id,
        name: r.display_name || r.name,
        default_code: r.default_code,
        list_price: r.list_price ?? r.imos_price, // try imos_price too
      }))}
      columns={[
        { field: "id", headerName: "ID", width: 90 },
        { field: "default_code", headerName: "Code", width: 160 },
        { field: "name", headerName: "Name", flex: 1, minWidth: 220 },
        {
          field: "list_price",
          headerName: "Price",
          width: 120,
          valueFormatter: (p) => (p?.value != null ? Number(p.value).toFixed(2) : "-"),
        },
        {
          field: "actions",
          headerName: "",
          width: 80,
          renderCell: (params) => (
            <Tooltip title="Add to cart">
              <IconButton size="small" onClick={() => addToCart(params.row)}>
                <AddShoppingCartIcon />
              </IconButton>
            </Tooltip>
          ),
        },
      ]}
      disableRowSelectionOnClick
      loading={productLoading}
      pageSizeOptions={[5, 10]}
      initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
    />
  </div>
</Stack>


        <Divider sx={{ my: 3 }} />

        {/* 2) PROJECT */}
        <Stack spacing={2}>
          <Typography variant="subtitle1">2) Project</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              inputRef={projectInputRef}
              label="Search by Project Name or Reference Code"
              value={projectQuery}
              onChange={(e) => setProjectQuery(e.target.value)}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {projectLoading ? (
                      <CircularProgress size={20} />
                    ) : projects.length > 0 ? (
                      <CloudDoneIcon color="success" />
                    ) : null}
                  </InputAdornment>
                ),
              }}
            />
            <Button
              onClick={searchProjects}
              variant="contained"
              startIcon={<SearchIcon />}
              disabled={projectLoading || !sessionId}
            >
              Search Projects
            </Button>
          </Stack>

          {selectedProject && (
            <Stack direction="row" spacing={2} alignItems="center">
              <AvatarGroup max={6}>
                <Tooltip title={selectedProject.user_id?.display_name || "Unknown"}>
                  <Avatar sx={{ bgcolor: "primary.main" }}>
                    {selectedProject.user_id?.display_name?.[0] || "?"}
                  </Avatar>
                </Tooltip>
              </AvatarGroup>
              <Tooltip title="Date of project start" placement="top">
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarTodayIcon fontSize="small" />
                  <Typography variant="body2">
                    {selectedProject.date_start
                      ? new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }).format(new Date(selectedProject.date_start))
                      : "N/A"}
                  </Typography>
                </Stack>
              </Tooltip>
            </Stack>
          )}
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* 2b) SUPPLIER (VENDEUR) */}
        <Stack spacing={2}>
          <Typography variant="subtitle1">2b) Supplier</Typography>
          <Autocomplete
            options={vendors}
            loading={vendorLoading}
            value={selectedVendor}
            onChange={(_, v) => setSelectedVendor(v)}
            onInputChange={(_, q, reason) => {
              setVendorQuery(q);
              if (reason === "input") {
                if (q.length >= 2 || q.length === 0) searchVendors(q);
              }
            }}
            getOptionLabel={(o) =>
              o?.display_name || o?.name || (o?.vat ? `${o?.id} - ${o?.vat}` : String(o?.id || ""))
            }
            isOptionEqualToValue={(opt, val) => Number(opt?.id) === Number(val?.id)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Supplier"
                placeholder="Type to search vendors…"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {vendorLoading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                helperText={
                  selectedVendor?.id === DEFAULT_VENDOR_ID
                    ? "Default: Wood CAM SRL (id=1)."
                    : "Selected supplier will be sent as partner_id (backend currently defaults to id=1)."
                }
              />
            )}
          />
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={`Supplier ID: ${selectedVendor?.id ?? DEFAULT_VENDOR_ID}`} />
            {selectedVendor?.vat && <Chip size="small" label={`VAT: ${selectedVendor.vat}`} />}
          </Stack>
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* 3) PHASE */}
        <Stack spacing={2}>
          <Typography variant="subtitle1">3) Phase</Typography>
          <Autocomplete
            options={phases}
            loading={phaseLoading}
            getOptionLabel={(p) => p.name || String(p.id)}
            value={selectedPhase}
            onChange={(_, v) => setSelectedPhase(v)}
            isOptionEqualToValue={(opt, val) => Number(opt?.id) === Number(val?.id)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Phase"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {phaseLoading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* 4) CART */}
        <Stack spacing={2}>
          <Typography variant="subtitle1">4) Cart</Typography>
          <Stack spacing={1}>
            {cart.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No products yet.
              </Typography>
            )}
            {cart.map((line) => (
              <Paper key={line.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip size="small" label={`#${line.id}`} />
                  <Typography sx={{ flex: 1 }} noWrap title={line.name}>
                    {line.name}
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    label="Qty"
                    value={line.quantity}
                    onChange={(e) => updateQty(line.id, e.target.value)}
                    sx={{ width: 100 }}
                    inputProps={{ min: 1 }}
                  />
                  <Typography sx={{ width: 120, textAlign: "right" }}>
                    {Number(line.price).toFixed(2)}
                  </Typography>
                  <Typography sx={{ width: 140, textAlign: "right" }}>
                    {(Number(line.price) * Number(line.quantity)).toFixed(2)}
                  </Typography>
                  <IconButton color="error" onClick={() => removeFromCart(line.id)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
            {cart.length > 0 && (
              <Stack direction="row" justifyContent="flex-end">
                <Typography variant="subtitle2">Total: {cartTotal.toFixed(2)}</Typography>
              </Stack>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* 5) OTHER INFORMATION */}
        <Stack spacing={2}>
          <Typography variant="subtitle1">5) Other Information</Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Order Date (date_order)"
              type="datetime-local"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              sx={{ flex: 1 }}
              helperText="If empty, server will default to now"
              InputLabelProps={{ shrink: true }}
            />

            {/* Planned Date with hint chip */}
            <TextField
              label="Planned Date (date_planned)"
              type="datetime-local"
              value={plannedDate}
              onChange={(e) => {
                setPlannedDate(e.target.value);
                setPlannedDirty(true);
              }}
              sx={{ flex: 1 }}
              InputLabelProps={{ shrink: true }}
              helperText={
                phaseAuto
                  ? plannedDirty
                    ? `Manual override. Phase #${phaseAuto.phaseId} has ${
                        phaseAuto.source === "end" ? "end" : "start"
                      } date ${phaseAuto.dateOnly}.`
                    : `Auto from phase #${phaseAuto.phaseId} (${
                        phaseAuto.source === "end" ? "end" : "start"
                      }: ${phaseAuto.dateOnly}).`
                  : "Applied to all lines. If the phase has no dates, set it here."
              }
              InputProps={{
                endAdornment: (
                  <>
                    {phaseAuto && (
                      <InputAdornment position="end">
                        <Chip
                          size="small"
                          color={plannedDirty ? "default" : "warning"}
                          label={plannedDirty ? "Use phase date" : "From phase"}
                          onClick={
                            plannedDirty
                              ? () => {
                                  const restored = fromDateOnlyToInputDT(phaseAuto.dateOnly);
                                  setPlannedDate(restored);
                                  setPlannedDirty(false);
                                }
                              : undefined
                          }
                        />
                      </InputAdornment>
                    )}
                  </>
                ),
              }}
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Source Document (origin)"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Incoterm Location"
              value={incotermLocation}
              onChange={(e) => setIncotermLocation(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Payment Terms ID"
              type="number"
              value={paymentTermId}
              onChange={(e) => setPaymentTermId(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Fiscal Position ID"
              type="number"
              value={fiscalPositionId}
              onChange={(e) => setFiscalPositionId(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <Chip size="small" label={`Buyer (user_id): ${userInfo?.uid ?? "-"}`} />
            <Chip
              size="small"
              label={`Company: ${userInfo?.user_companies?.current_company ?? "-"}`}
            />
            <Chip size="small" label={`Project ID: ${selectedProject?.id ?? "-"}`} />
            <Chip size="small" label={`Phase ID: ${selectedPhase?.id ?? "-"}`} />
            <Chip size="small" label={`Supplier ID: ${selectedVendor?.id ?? DEFAULT_VENDOR_ID}`} />
          </Stack>
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* 6) SUBMIT */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end">
          {submitMsg && (
            <Chip
              color={
                submitMsg.type === "success"
                  ? "success"
                  : submitMsg.type === "error"
                  ? "error"
                  : "default"
              }
              label={submitMsg.text}
            />
          )}
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={submitPurchase}
            disabled={submitting || !selectedProject || !selectedPhase || cart.length === 0}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : "Submit Purchase"}
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
          Note: product IDs must be Odoo product variants (product.product). If your search returns
          template IDs, make sure your backend maps them to variants before submit.
        </Typography>
      </Paper>

      {/* Project chooser dialog */}
      <Dialog
        fullWidth
        maxWidth="md"
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
      >
        <DialogTitle>Select a Project</DialogTitle>
        <DialogContent dividers>
          <div style={{ height: 420, width: "100%" }}>
            <DataGrid
              rows={(projects || []).map((r) => ({
                id: getVariantId(r) || r.id, // keep as-is
                name: r.display_name || r.name || `#${r.id}`,
                code: r.code || r.ref || "",
                date_start: r.date_start || null,
              }))}
              columns={[
                { field: "id", headerName: "ID", width: 90 },
                { field: "code", headerName: "Code", width: 160 },
                { field: "name", headerName: "Name", flex: 1, minWidth: 220 },
                {
                  field: "date_start",
                  headerName: "Start",
                  width: 160,
                  valueFormatter: (params) => {
                    const v = params?.value;
                    return v ? new Date(v).toLocaleDateString() : "-";
                  },
                },
                {
                  field: "pick",
                  headerName: "",
                  width: 120,
                  renderCell: (params) => (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={async () => {
                        const proj = projects.find((x) => x.id === params.row.id);
                        setSelectedProject(proj || null);
                        setProjectDialogOpen(false);
                      }}
                    >
                      Select
                    </Button>
                  ),
                },
              ]}
              disableRowSelectionOnClick
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25, page: 0 } },
              }}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
