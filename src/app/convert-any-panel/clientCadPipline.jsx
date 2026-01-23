'use client';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  IconButton,
  Tooltip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const extOf = (name) => (name?.split('.').pop() || '').toLowerCase();

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      resolve(s.includes('base64,') ? s.split('base64,')[1] : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function ConvertAnyPanel() {
  const fileInputRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [file, setFile] = useState(null);
  const [fileB64, setFileB64] = useState('');
  const [inputExt, setInputExt] = useState('');
  const [availableOuts, setAvailableOuts] = useState([]);
  const [outputExt, setOutputExt] = useState('svg');

  // Optional geometry toggles when input is DWG/DXF
  const [extractGeometry, setExtractGeometry] = useState(false);
  const [yLevel, setYLevel] = useState(0.1);
  const [thickness, setThickness] = useState(0.2);
  const [elevation, setElevation] = useState(3);
  const [assumePlan2D, setAssumePlan2D] = useState(false);
  const [debugGeom, setDebugGeom] = useState(false);

  const [result, setResult] = useState(null); // stores server payload

  // ✅ NEW: drag-over animation state (with nested dragenter/leaves handling to avoid flicker)
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const canAskGeometry = useMemo(() => ['dwg', 'dxf'].includes(inputExt), [inputExt]);

  const reset = useCallback(() => {
    setBusy(false);
    setErr('');
    setFile(null);
    setFileB64('');
    setInputExt('');
    setAvailableOuts([]);
    setOutputExt('svg');
    setExtractGeometry(true);
    setYLevel(0.1);
    setThickness(0.2);
    setElevation(3);
    setAssumePlan2D(false);
    setDebugGeom(false);
    setResult(null);
  }, []);

  const fetchFormats = useCallback(async (ext) => {
    setErr('');
    try {
      const res = await fetch(`/api/convert/formats?input=${encodeURIComponent(ext)}`);
      const payload = await res.json();
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || `HTTP ${res.status}`);
      const outs = Array.from(
        new Set(
          (payload.data || [])
            .filter((row) => row?.input_format?.toLowerCase() === ext)
            .map((row) => String(row.output_format || '').toLowerCase())
            .filter(Boolean)
        )
      ).sort();

      setAvailableOuts(outs);
      setOutputExt(outs.includes('svg') ? 'svg' : (outs[0] || ''));
    } catch (e) {
      setAvailableOuts([]);
      setOutputExt('');
      setErr(e?.message || String(e));
    }
  }, []);

  const handlePickFile = useCallback(() => fileInputRef.current?.click(), []);
  const handleFileInput = useCallback(
    async (ev) => {
      const f = ev.target.files?.[0];
      if (!f) return;
      await handleIncomingFile(f);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleIncomingFile = useCallback(
    async (f) => {
      setBusy(true);
      setErr('');
      setResult(null);

      try {
        const b64 = await readFileAsBase64(f);
        const ext = extOf(f.name);

        setFile(f);
        setFileB64(b64);
        setInputExt(ext);
        await fetchFormats(ext);
      } catch (e) {
        setErr(e?.message || String(e));
      } finally {
        setBusy(false);
      }
    },
    [fetchFormats]
  );

  // drag & drop (with animated feedback)
  const onDrop = useCallback(
    async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const f = ev.dataTransfer?.files?.[0];
      if (!f) return;
      await handleIncomingFile(f);
    },
    [handleIncomingFile]
  );

  const onDragOver = useCallback((ev) => {
    ev.preventDefault();
    ev.stopPropagation();
  }, []);

  const onDragEnter = useCallback((ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
    }
  }, []);

  const convertNow = useCallback(async () => {
    if (!file || !fileB64 || !outputExt) {
      setErr('Pick a file and output format first.');
      return;
    }

    setBusy(true);
    setErr('');
    setResult(null);

    try {
      const body = {
        file: fileB64,
        filename: file.name,
        inputFormat: inputExt || extOf(file.name),
        outputFormat: outputExt,
        inline: true,
        ...(canAskGeometry && extractGeometry
          ? {
              extractGeometry: true,
              thickness: Number(thickness) || 0.2,
              yLevel: Number(yLevel) || 0.1,
              elevation: Number(elevation) || 3,
              assumePlan2D: !!assumePlan2D,
              debug: !!debugGeom,
            }
          : {}),
      };

      const res = await fetch(`/api/convert/any`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await res.json();
      if (!res.ok || !payload?.ok) {
        const msg = payload?.message || `HTTP ${res.status}`;
        throw new Error(
          /unauthorized|401/i.test(msg)
            ? 'CloudConvert Unauthorized: check API key vs sandbox/prod and scopes.'
            : msg
        );
      }

      setResult(payload);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [
    file,
    fileB64,
    outputExt,
    inputExt,
    canAskGeometry,
    extractGeometry,
    thickness,
    yLevel,
    elevation,
    assumePlan2D,
    debugGeom,
  ]);

  // same helper you already use in your result section
  const downloadHref = (reqId, name) =>
    `/api/convert/file/${encodeURIComponent(reqId)}${
      name ? `?name=${encodeURIComponent(name)}` : ''
    }`;

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">DWG/DXF → Any (CloudConvert)</Typography>
          <Tooltip title="Reset">
            <IconButton onClick={reset}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Drag & Drop Zone (with animation) */}
        <Box
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          sx={(theme) => ({
            border: '2px dashed',
            borderColor: isDragging ? theme.palette.primary.main : 'divider',
            borderRadius: 2,
            p: isDragging ? 4 : 3,                  // animated padding
            textAlign: 'center',
            bgcolor: isDragging
              ? theme.palette.action.hover
              : 'background.default',
            cursor: 'pointer',
            transition: 'all 180ms ease-in-out',   // smooth!
            boxShadow: isDragging
              ? `0 8px 24px ${theme.palette.action.disabledBackground}`
              : 'none',
            outline: 'none',
            position: 'relative',
            // subtle animated glow on the border
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: -2,
              borderRadius: 10,
              pointerEvents: 'none',
              transition: 'opacity 180ms ease-in-out',
              opacity: isDragging ? 1 : 0,
              boxShadow: isDragging ? `0 0 0 3px ${theme.palette.primary.main}33` : 'none',
            },
          })}
          onClick={handlePickFile}
        >
          <CloudUploadIcon sx={{ fontSize: 40, mb: 1, transition: 'transform 180ms ease' , transform: isDragging ? 'scale(1.05)' : 'scale(1)'}} />
          <Typography variant="body1" sx={{ mb: 1 }}>
            Drag & drop a file here, or click to choose
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We’ll detect the format and ask the server for available conversions.
          </Typography>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            onChange={handleFileInput}
            accept="*/*"
          />
        </Box>

        {busy && <LinearProgress sx={{ mt: 2 }} />}

        {!!file && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">Selected:</Typography>
              <Typography variant="body2">{file.name}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={`Input: ${inputExt || '(unknown)'}`} />
                <Chip
                  size="small"
                  label={`Size: ${(file.size / 1024).toFixed(1)} KB`}
                  variant="outlined"
                />
              </Stack>
            </Stack>
          </Alert>
        )}

        {!!availableOuts.length && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="outfmt-label">Output format</InputLabel>
              <Select
                labelId="outfmt-label"
                value={outputExt}
                label="Output format"
                onChange={(e) => setOutputExt(e.target.value)}
              >
                {availableOuts.map((fmt) => (
                  <MenuItem key={fmt} value={fmt}>
                    {fmt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {canAskGeometry && (
              <Stack spacing={1} sx={{ flex: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={extractGeometry}
                      onChange={(e) => setExtractGeometry(e.target.checked)}
                    />
                  }
                  label="Extract geometry (DXF/SVG fallback)"
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    size="small"
                    label="Thickness"
                    type="number"
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                    InputProps={{ inputProps: { step: 0.1 } }}
                  />
                  <TextField
                    size="small"
                    label="Y level"
                    type="number"
                    value={yLevel}
                    onChange={(e) => setYLevel(e.target.value)}
                    InputProps={{ inputProps: { step: 0.1 } }}
                  />
                  <TextField
                    size="small"
                    label="Elevation"
                    type="number"
                    value={elevation}
                    onChange={(e) => setElevation(e.target.value)}
                    InputProps={{ inputProps: { step: 0.5 } }}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={assumePlan2D}
                        onChange={(e) => setAssumePlan2D(e.target.checked)}
                      />
                    }
                    label="Assume plan 2D"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={debugGeom}
                        onChange={(e) => setDebugGeom(e.target.checked)}
                      />
                    }
                    label="Debug geometry parse"
                  />
                </Stack>
              </Stack>
            )}
          </Stack>
        )}

        {!!availableOuts.length && (
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={convertNow}
              disabled={!file || !outputExt || busy}
            >
              Convert to {outputExt.toUpperCase()}
            </Button>
            <Tooltip title="Pick another file">
              <span>
                <Button variant="outlined" onClick={handlePickFile} disabled={busy}>
                  Change file
                </Button>
              </span>
            </Tooltip>
          </Stack>
        )}

        {!!err && (
          <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
            {err}
          </Alert>
        )}
      </Paper>

      {!!result && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Conversion Result
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip label={`requestId: ${result.requestId}`} size="small" />
              {'svg' in (result || {}) && result.svg?.name && (
                <Tooltip title="Open SVG">
                  <IconButton
                    size="small"
                    href={downloadHref(result.requestId, result.svg.name)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            {Array.isArray(result.artifacts) && result.artifacts.length > 0 && (
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Artifacts
                </Typography>
                <Stack spacing={0.5}>
                  {result.artifacts.map((a) => (
                    <Stack
                      key={a.name}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography variant="body2">{a.name}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${(a.size / 1024).toFixed(1)} KB`}
                        />
                        <Button
                          size="small"
                          variant="text"
                          href={downloadHref(result.requestId, a.name)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download
                        </Button>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            )}

            {result.geometry && (
              <>
                <Divider sx={{ my: 1 }} />
                <Alert severity="success">
                  Geometry extracted • corners: {Object.keys(result.geometry.corners || {}).length} •
                  walls: {result.geometry.walls?.length || 0}
                </Alert>
              </>
            )}

            {result.inline?.fileText && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Inline preview ({result.inline?.name || result.inline?.mime || 'text'})
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    maxHeight: 260,
                    overflow: 'auto',
                    p: 1,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    fontSize: 12,
                  }}
                >
                  {result.inline.fileText.slice(0, 5000)}
                  {result.inline.fileText.length > 5000 ? '…' : ''}
                </Box>
              </>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
