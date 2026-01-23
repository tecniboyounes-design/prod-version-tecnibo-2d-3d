'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import ScienceIcon from '@mui/icons-material/Science';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const BASE_URL =
  (process.env.NEXT_PUBLIC_CONVERT_BASE_URL || 'http://192.168.30.92:9004').replace(/\/+$/, '');

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Failed to read file'));
    r.onload = () => {
      const s = String(r.result || '');
      resolve(s.includes(',') ? s.split(',')[1] : s);
    };
    r.readAsDataURL(file);
  });
}

function extOf(name) {
  return (name && name.split('.').pop() || '').toLowerCase();
}

export default function ConvertTesterPage() {
  // form state (PLAIN JS — no TS generics)
  const [file, setFile] = useState(null);
  const [inputFormat, setInputFormat] = useState(''); // blank = infer
  const [outputFormat, setOutputFormat] = useState('svg');
  const [inlineResult, setInlineResult] = useState(true);
  const [extractGeometry, setExtractGeometry] = useState(true);
  const [assumePlan2D, setAssumePlan2D] = useState(true);
  const [thickness, setThickness] = useState(0.2);
  const [yLevel, setYLevel] = useState(0.1);
  const [elevation, setElevation] = useState(3);

  // ui state
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: 'info'|'ok'|'err', text: string }
  const [logs, setLogs] = useState('');

  // response state
  const [resp, setResp] = useState(null);
  const [svgObjectUrl, setSvgObjectUrl] = useState(null);

  const addLog = useCallback((line) => {
    setLogs((prev) => prev + (prev ? '\n' : '') + line);
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setResp(null);
    setSvgObjectUrl(null);
    setLogs('');
    setNotice(null);
  }, []);

  const handleFile = useCallback((f) => {
    setFile(f);
    if (f && !inputFormat) {
      const ext = extOf(f.name);
      if (ext === 'dwg' || ext === 'dxf') setInputFormat(ext);
    }
  }, [inputFormat]);

  const openInNewTab = (url) => window.open(url, '_blank');

  const buildFileUrl = (requestId, name) => {
    const base = `${BASE_URL}/convert/file/${encodeURIComponent(requestId)}`;
    return name ? `${base}?name=${encodeURIComponent(name)}` : base;
  };

  const fetchFileAsBlobUrl = async (requestId, name) => {
    const url = buildFileUrl(requestId, name);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
    const blob = await r.blob();
    return URL.createObjectURL(blob);
  };

  const previewSvg = useCallback(
    async (r) => {
      try {
        // 1) Inline payload
        if (r.inline && r.inline.mime && r.inline.mime.includes('svg') && r.inline.fileText) {
          const blob = new Blob([r.inline.fileText], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          setSvgObjectUrl(url);
          addLog('Previewing inline SVG.');
          return;
        }
        // 2) Artifact
        const art = (r.artifacts || []).find((a) => a.name.toLowerCase().endsWith('.svg'));
        if (art) {
          const url = await fetchFileAsBlobUrl(r.requestId, art.name);
          setSvgObjectUrl(url);
          addLog('Previewing artifact SVG.');
          return;
        }
        setSvgObjectUrl(null);
        addLog('No SVG available to preview.');
      } catch (e) {
        addLog(`Preview error: ${e && e.message ? e.message : String(e)}`);
      }
    },
    [addLog]
  );

  const onSubmit = useCallback(async () => {
    if (!file) {
      setNotice({ kind: 'err', text: 'Please choose a .dwg or .dxf file.' });
      return;
    }
    setBusy(true);
    setNotice({ kind: 'info', text: 'Uploading & converting…' });
    setResp(null);
    setSvgObjectUrl(null);
    setLogs('');

    try {
      addLog(`Reading ${file.name}…`);
      const base64 = await readFileAsBase64(file);
      addLog(`Base64 length: ${Number(base64.length).toLocaleString()} chars`);

      const inferred = inputFormat || extOf(file.name) || 'bin';
      const payload = {
        file: base64,
        filename: file.name,
        inputFormat: inferred,
        outputFormat,
        inline: inlineResult,
        // geometry knobs
        extractGeometry,
        assumePlan2D,
        thickness,
        yLevel,
        elevation,
        meta: { source: 'convert-tester' },
      };

      addLog(`POST /convert/any -> ${inferred} → ${outputFormat}`);
      const r = await fetch(`${BASE_URL}/convert/any`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data || !data.ok) {
        const msg = (data && data.message) ? data.message : `HTTP ${r.status}`;
        throw new Error(msg);
      }

      setResp(data);
      addLog(`OK requestId=${data.requestId}, artifacts=${(data.artifacts && data.artifacts.length) || 0}`);
      if (data.geometry) {
        const c = Object.keys(data.geometry.corners || {}).length;
        const w = (data.geometry.walls || []).length;
        addLog(`Geometry: ${c} corners, ${w} walls`);
      } else {
        addLog('No geometry in response (maybe binary DXF or extractGeometry=false).');
      }

      await previewSvg(data);
      setNotice({ kind: 'ok', text: 'Done.' });
    } catch (e) {
      setNotice({ kind: 'err', text: (e && e.message) || 'Unexpected error' });
      addLog(`Error: ${(e && e.message) || String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [
    file,
    inputFormat,
    outputFormat,
    inlineResult,
    extractGeometry,
    assumePlan2D,
    thickness,
    yLevel,
    elevation,
    addLog,
    previewSvg,
  ]);

  const onListFormats = useCallback(async () => {
    setBusy(true);
    setNotice({ kind: 'info', text: 'Fetching formats…' });
    try {
      const q = new URLSearchParams();
      if (inputFormat) q.set('input', inputFormat);
      if (outputFormat) q.set('output', outputFormat);
      const url = `${BASE_URL}/convert/formats${q.toString() ? `?${q}` : ''}`;
      addLog(`GET ${url}`);
      const r = await fetch(url);
      const data = await r.json();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      addLog(`Formats count: ${(data && data.count) || 0}`);
      setNotice({ kind: 'ok', text: `Formats loaded (${(data && data.count) || 0}). Check console area.` });
      setLogs((prev) => prev + (prev ? '\n' : '') + JSON.stringify(data, null, 2));
    } catch (e) {
      setNotice({ kind: 'err', text: (e && e.message) || 'Failed to fetch formats' });
      addLog(`Formats error: ${(e && e.message) || String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [inputFormat, outputFormat, addLog]);

  const onOpenArtifact = useCallback(
    async (name) => {
      if (!resp) return;
      openInNewTab(buildFileUrl(resp.requestId, name));
    },
    [resp]
  );

  const onOpenSvgNewTab = useCallback(() => {
    if (svgObjectUrl) openInNewTab(svgObjectUrl);
  }, [svgObjectUrl]);

  const onFetchGeometryById = useCallback(async () => {
    const id = resp && resp.requestId ? String(resp.requestId).trim() : '';
    if (!id) return;
    setBusy(true);
    setNotice({ kind: 'info', text: 'Fetching geometry…' });
    try {
      const url = `${BASE_URL}/convert/geometry/${encodeURIComponent(id)}`;
      addLog(`GET ${url}`);
      const r = await fetch(url);
      const data = await r.json();
      if (!r.ok || !data || !data.ok) throw new Error((data && data.message) || `HTTP ${r.status}`);
      const geo = data.geometry;
      setResp((prev) => (prev ? { ...prev, geometry: geo } : prev));
      addLog(`Geometry fetched: ${Object.keys(geo.corners || {}).length} corners, ${(geo.walls || []).length} walls`);
      setNotice({ kind: 'ok', text: 'Geometry loaded.' });
    } catch (e) {
      setNotice({ kind: 'err', text: (e && e.message) || 'Failed to fetch geometry' });
      addLog(`Geometry fetch error: ${(e && e.message) || String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [resp, addLog]);

  const cornerEntries = useMemo(
    () => (resp && resp.geometry ? Object.entries(resp.geometry.corners || {}) : []),
    [resp]
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        CAD Convert Tester (CloudConvert)
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Base URL: <code>{BASE_URL}</code>
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Button component="label" variant="contained" startIcon={<CloudUploadIcon />} fullWidth>
              {file ? `Selected: ${file.name}` : 'Choose DWG/DXF'}
              <input
                type="file"
                hidden
                accept=".dwg,.dxf"
                onChange={(e) => handleFile((e.target.files && e.target.files[0]) || null)}
              />
            </Button>
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              label="Input format (auto)"
              value={inputFormat}
              onChange={(e) => setInputFormat((e.target.value || '').trim())}
              fullWidth
              placeholder="dwg | dxf | (auto)"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel id="outfmt">Output format</InputLabel>
              <Select
                labelId="outfmt"
                label="Output format"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
              >
                {['svg', 'dxf', 'pdf', 'png', 'jpg', 'webp'].map((fmt) => (
                  <MenuItem key={fmt} value={fmt}>
                    {fmt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <FormControlLabel
                control={<Checkbox checked={inlineResult} onChange={(e) => setInlineResult(e.target.checked)} />}
                label="Return inline (when possible)"
              />
              <FormControlLabel
                control={<Checkbox checked={extractGeometry} onChange={(e) => setExtractGeometry(e.target.checked)} />}
                label="Extract geometry (DXF only)"
              />
              <FormControlLabel
                control={<Checkbox checked={assumePlan2D} onChange={(e) => setAssumePlan2D(e.target.checked)} />}
                label="Assume 2D plan"
              />
              <TextField
                label="Thickness (m)"
                type="number"
                inputProps={{ step: 0.01 }}
                value={thickness}
                onChange={(e) => setThickness(Number(e.target.value))}
                sx={{ width: 160 }}
              />
              <TextField
                label="Y level (m)"
                type="number"
                inputProps={{ step: 0.01 }}
                value={yLevel}
                onChange={(e) => setYLevel(Number(e.target.value))}
                sx={{ width: 160 }}
              />
              <TextField
                label="Elevation (m)"
                type="number"
                inputProps={{ step: 0.1 }}
                value={elevation}
                onChange={(e) => setElevation(Number(e.target.value))}
                sx={{ width: 160 }}
              />
              <Box flexGrow={1} />
              <Button variant="outlined" startIcon={<ScienceIcon />} onClick={onListFormats}>
                List formats
              </Button>
              <Button variant="contained" onClick={onSubmit} disabled={!file || busy}>
                Convert
              </Button>
              <Button variant="text" color="inherit" startIcon={<RestartAltIcon />} onClick={reset}>
                Reset
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {busy && <LinearProgress sx={{ mt: 2 }} />}

        {notice && (
          <Alert
            severity={notice.kind === 'ok' ? 'success' : notice.kind === 'err' ? 'error' : 'info'}
            sx={{ mt: 2 }}
          >
            {notice.text}
          </Alert>
        )}
      </Paper>

      {!!resp && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6" fontWeight={700}>Result</Typography>
            <Chip label={`requestId: ${resp.requestId}`} size="small" />
            <Chip label={`${(resp.artifacts && resp.artifacts.length) || 0} artifacts`} size="small" />
            {resp.geometry && (
              <>
                <Chip label={`corners: ${Object.keys(resp.geometry.corners || {}).length}`} size="small" color="success" />
                <Chip label={`walls: ${(resp.geometry.walls || []).length}`} size="small" color="success" />
              </>
            )}
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* SVG preview */}
          <Typography variant="subtitle2" gutterBottom>SVG Preview</Typography>
          {svgObjectUrl ? (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, mb: 2, bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button size="small" startIcon={<OpenInNewIcon />} onClick={onOpenSvgNewTab}>
                  Open in new tab
                </Button>
              </Box>
              <Box sx={{ height: 420, overflow: 'auto', bgcolor: '#fff' }}>
                <object data={svgObjectUrl} type="image/svg+xml" style={{ width: '100%', height: '100%' }} />
              </Box>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>No SVG to preview.</Alert>
          )}

          {/* Artifacts table */}
          <Typography variant="subtitle2" gutterBottom>Artifacts</Typography>
          {(resp.artifacts && resp.artifacts.length) ? (
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Filename</TableCell>
                  <TableCell align="right">Size (bytes)</TableCell>
                  <TableCell>SHA-256</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resp.artifacts.map((a) => (
                  <TableRow key={a.name}>
                    <TableCell>{a.name}</TableCell>
                    <TableCell align="right">{Number(a.size).toLocaleString()}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{a.sha256}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => onOpenArtifact(a.name)}>
                          Open
                        </Button>
                        <Button size="small" startIcon={<DownloadIcon />} onClick={() => onOpenArtifact(a.name)}>
                          Download
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>No artifacts listed.</Alert>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Geometry */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Geometry</Typography>
            <Button size="small" variant="outlined" onClick={onFetchGeometryById} disabled={!resp || !resp.requestId}>
              Fetch geometry by requestId
            </Button>
          </Stack>

          {resp.geometry ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Corners: {Object.keys(resp.geometry.corners || {}).length} — Walls: {(resp.geometry.walls || []).length}
              </Typography>

              <Typography variant="body2" fontWeight={700} sx={{ mt: 1 }}>Corners</Typography>
              <Box sx={{ maxHeight: 240, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell align="right">X (m)</TableCell>
                      <TableCell align="right">Y (m)</TableCell>
                      <TableCell align="right">Z (m)</TableCell>
                      <TableCell align="right">Elevation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(resp.geometry.corners || {}).map(([id, c]) => (
                      <TableRow key={id}>
                        <TableCell>{id}</TableCell>
                        <TableCell align="right">{c.x}</TableCell>
                        <TableCell align="right">{c.y}</TableCell>
                        <TableCell align="right">{c.z}</TableCell>
                        <TableCell align="right">{c.elevation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <Typography variant="body2" fontWeight={700}>Walls</Typography>
              <Box sx={{ maxHeight: 240, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Corner 1</TableCell>
                      <TableCell>Corner 2</TableCell>
                      <TableCell align="right">Thickness (m)</TableCell>
                      <TableCell>Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(resp.geometry.walls || []).map((w) => (
                      <TableRow key={w.id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{w.id}</TableCell>
                        <TableCell>{w.corner1}</TableCell>
                        <TableCell>{w.corner2}</TableCell>
                        <TableCell align="right">{w.thickness}</TableCell>
                        <TableCell>{w.type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          ) : (
            <Alert severity="info">No geometry available yet.</Alert>
          )}
        </Paper>
      )}

      {/* Console / logs */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Console</Typography>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            maxHeight: 260,
            overflow: 'auto',
            fontSize: 12,
          }}
        >
          {logs || '—'}
        </Box>
      </Paper>
    </Container>
  );
}
