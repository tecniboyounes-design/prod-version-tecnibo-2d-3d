'use client';

import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  Paper,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Typography,
  LinearProgress,
  Alert,
  TextField,
  Divider,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Canvas } from '@react-three/fiber';
import { Leva } from 'leva';

import { loadPlanGeometry } from '@/store';
import Points from './Points';

/* ---------- optional: layer → color fallbacks (customize freely) ---------- */
/* ---------- optional: layer → color fallbacks (customize freely) ---------- */
const LAYER_COLOR_MAP = {
  WALL: '#3b82f6',
  WALLS: '#3b82f6',
  MURS: '#3b82f6',
  STRUCTURE: '#1e293b',
  DOOR: '#22c55e',
  DOORS: '#22c55e',
  PORTE: '#22c55e',
  WINDOW: '#06b6d4',
  WINDOWS: '#06b6d4',
};

/* ---------- tiny utils for stable random colors ---------- */
const hash32 = (str) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const hslToHex = (h, s, l) => {
  // h [0..360], s/l [0..100]
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};
/** Deterministic “random” color from a key (prefer layer; else wall id) */
const colorFromKey = (key) => {
  const h = hash32(key);
  const hue = h % 360;            // 0..359
  const sat = 62 + (h % 8);       // 62..69 — keep pleasant saturation
  const light = 52 + (h % 8);     // 52..59 — avoid too dark/too bright
  return hslToHex(hue, sat, light);
};

/* ---------- adapter: backend geometry → floorplanner store shape (with scaling & colors) ---------- */
function toFloorplanner(geometry, { scale = 1, scaleThickness = true } = {}) {
  if (!geometry) return { corners: {}, walls: [] };
  const s = Number(scale) || 1;

  const corners = Object.fromEntries(
    Object.entries(geometry.corners || {}).map(([id, p]) => [
      id,
      { id, x: (Number(p.x) || 0) * s, z: (Number(p.z) || 0) * s },
    ]),
  );

  const pickColor = (w) => {
    // 1) True color from backend (DXF/SVG)
    const direct = w?.wallColor || w?.style?.colorHex;
    if (direct) return direct;

    // 2) Layer presets
    const layer = (w?.style?.layer || '').trim();
    if (layer) {
      const preset = LAYER_COLOR_MAP[layer.toUpperCase()];
      if (preset) return preset;
    }

    // 3) Deterministic fallback by layer (stable within a drawing)
    if (layer) return colorFromKey(`LAYER:${layer}`);

    // 4) Deterministic fallback by wall id (last resort)
    return colorFromKey(`WALL:${w?.id || Math.random().toString(36)}`);
  };

  const walls = (geometry.walls || []).map((w) => {
    const color = pickColor(w);
    return {
      id: w.id,
      corner1: w.corner1,
      corner2: w.corner2,
      thickness: (Number(w.thickness ?? 0.2)) * (scaleThickness ? s : 1),
      type: w.type || 'STRAIGHT',
      wallColor: color,                 // <- what Walls.jsx expects
      wallLayer: w?.style?.layer,
      wallLinetype: w?.style?.linetype,
      wallLineweight: w?.style?.lineweight,
      style: { ...(w?.style || {}), colorHex: color }, // keep style in sync
    };
  });

  return { corners, walls };
}


/* ---------- small utils ---------- */
const BASE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CONVERT_BASE_URL?.replace(/\/+$/, '')) ||
  'http://192.168.30.92:9004';

const extOf = (n) => (n?.split('.').pop() || '').toLowerCase();

const readFileAsBase64 = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      res(s.includes('base64,') ? s.split('base64,')[1] : s);
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });

/* ---------- component ---------- */
export default function Plan2DSVGCanvas() {
  const dispatch = useDispatch();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [svgUrl, setSvgUrl] = useState('');
  const [meta, setMeta] = useState({ requestId: '', files: 0, points: 0, walls: 0 });
  const [scaleMul, setScaleMul] = useState(100); // 🔥 make it bigger by default

  const onUpload = useCallback(
    async (ev) => {
      const f = ev.target.files?.[0];
      if (!f) return;

      setBusy(true);
      setErr('');
      setSvgUrl('');
      setMeta({ requestId: '', files: 0, points: 0, walls: 0 });

      try {
        const base64 = await readFileAsBase64(f);
        const ext = extOf(f.name);

        // Ask server to output svg+geometry only and WAIT for geometry
        const common = {
          file: base64,
          filename: f.name,
          inline: false,
          extractGeometry: true,
          outputs: ['svg', 'geometry'],
          noArtifacts: true,
          meta: { source: 'Plan2DSVGCanvas.jsx' },
          scaleMultiplier: Number(scaleMul) || 1, // sent to server (optional)
        };

        let url, body;

        if (ext === 'dxf') {
          url = `${BASE_URL}/convert/any`;
          body = {
            ...common,
            inputFormat: 'dxf',
            outputFormat: 'svg',
            thickness: 0.2,
            yLevel: 0.1,
            elevation: 3,
          };
        } else {
          url = `${BASE_URL}/convert/dwg-to-svg`;
          body = common;
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const payload = await res.json();

        if (!res.ok || !payload?.ok) {
          throw new Error(payload?.message || `HTTP ${res.status}`);
        }

        if (payload.requestId) {
          const name = payload.svg?.name ? `?name=${encodeURIComponent(payload.svg.name)}` : '';
          setSvgUrl(`${BASE_URL}/convert/file/${payload.requestId}${name}`);
        }

        if (payload.geometry) {
          // ⬆️ client scaling + 🎨 color injection
          const adapted = toFloorplanner(payload.geometry, {
            scale: Number(scaleMul) || 1,
            scaleThickness: true,
          });

          dispatch(loadPlanGeometry(adapted));

          setMeta({
            requestId: payload.requestId || '',
            files: payload.artifacts?.length ?? 0,
            points: Object.keys(adapted.corners).length,
            walls: adapted.walls.length,
          });
        } else {
          setMeta({
            requestId: payload.requestId || '',
            files: payload.artifacts?.length ?? 0,
            points: 0,
            walls: 0,
          });
        }
      } catch (e) {
        setErr(e?.message || String(e));
      } finally {
        setBusy(false);
      }
    },
    [dispatch, scaleMul],
  );

  const resetAll = useCallback(() => {
    setBusy(false);
    setErr('');
    setSvgUrl('');
    setMeta({ requestId: '', files: 0, points: 0, walls: 0 });
  }, []);

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {/* Toolbar */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          gap={1}
        >
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Button component="label" startIcon={<CloudUploadIcon />} variant="contained">
              Upload DWG / DXF
              <input hidden type="file" accept=".dwg,.dxf,.DWG,.DXF" onChange={onUpload} />
            </Button>

            <TextField
              size="small"
              type="number"
              label="Scale ×"
              value={scaleMul}
              onChange={(e) => setScaleMul(Number(e.target.value) || 1)}
              InputProps={{ inputProps: { min: 0.1, step: 1 } }}
              helperText="Multiply positions & thickness (e.g. 100 for mm→cm→m visual)"
            />

            <Tooltip title="Reset">
              <IconButton onClick={resetAll}>
                <RestartAltIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Open last SVG in new tab">
              <span>
                <IconButton href={svgUrl || undefined} target="_blank" rel="noreferrer" disabled={!svgUrl}>
                  <OpenInNewIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {BASE_URL}
          </Typography>
        </Stack>

        {/* Thin top loader during server conversion */}
        {busy && <LinearProgress sx={{ mt: 2 }} />}
        {!!err && <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{err}</Alert>}

        {!!meta.requestId && !err && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack spacing={0.5}>
                <Typography variant="subtitle2">Request ID: {meta.requestId}</Typography>
                <Typography variant="body2">
                  Files: {meta.files} • Points: {meta.points} • Walls: {meta.walls}
                </Typography>
              </Stack>
            </Stack>
          </Alert>
        )}
      </Paper>

      {/* Single panel: Floorplanner only */}
      <Paper variant="outlined" sx={{ p: 1, flex: 1, minHeight: 480 }}>
        <Typography variant="subtitle2" sx={{ px: 1, py: 0.5 }}>
          Floorplanner
        </Typography>
        <Divider sx={{ mb: 1 }} />

        <Box sx={{ position: 'relative', height: 480 }}>
          {/* Canvas always mounted so grid shows immediately */}
          <Box sx={{ position: 'absolute', inset: 0 }}>
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              <Canvas
                frameloop="demand"
                dpr={[1, 1]}
                gl={{ antialias: false, stencil: false, depth: true, powerPreference: 'high-performance' }}
                shadows={false}
                camera={{ position: [0, 5, 10], fov: 50 }}
              >
                <Points />
              </Canvas>
            </div>
          </Box>
        </Box>
      </Paper>

      {/* Leva UI (toggle corner dots) */}
      <Leva collapsed />
    </Stack>
  );
}
