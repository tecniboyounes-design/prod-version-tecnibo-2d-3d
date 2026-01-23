// components/OdooCodeLogin.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, Divider, IconButton, InputAdornment,
  Tab, Tabs, TextField, Typography, Paper, Stack, Chip, Tooltip, Alert
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function OdooCodeLogin({
  defaultEmail = '',
  onSuccess,
  onError,
  pollIntervalMs = 1500,
  timeoutMs = 5 * 60_000,
}) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';
  const START_URL = `${API_BASE}/api/authenticate/odooCode`;
  const POLL_URL = `${API_BASE}/api/authenticate/odooCode`;

  const [tab, setTab] = useState('code');

  // shared
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // code flow
  const [code, setCode] = useState('');
  const [polling, setPolling] = useState(false);
  const [pollMsg, setPollMsg] = useState('Waiting for approval…');
  const startedAtRef = useRef(null);
  const pollTimerRef = useRef(null);

  // password flow
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const canGetCode = useMemo(() => !!email && !busy && !polling, [email, busy, polling]);
  const canLoginPwd = useMemo(() => !!email && !!password && !busy, [email, password, busy]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const startPolling = (challengeCode) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    startedAtRef.current = Date.now();
    setPolling(true);
    setPollMsg('Waiting for approval…');
  
    pollTimerRef.current = setInterval(async () => {
      // timeout
      if (startedAtRef.current && Date.now() - startedAtRef.current > timeoutMs) {
        stopPolling();
        setErr('Request expired. Please request a new code.');
        return;
      }
      try {
        const r = await fetch(`${POLL_URL}?code=${encodeURIComponent(challengeCode)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        const j = await r.json();
        if (j.status === 'approved' && j.session_id) {
          stopPolling();
          onSuccess && onSuccess(j.session_id, j);
        } else if (j.status === 'expired' || j.status === 'invalid') {
          stopPolling();
          setErr(j.status === 'expired' ? 'Code expired. Please request a new one.' : 'Invalid code.');
        } else {
          setPollMsg('Waiting for approval…');
        }
      } catch (e) {
        // don’t kill the loop on transient errors; surface a soft warning
        setPollMsg('Reconnecting…');
      }
    }, pollIntervalMs);
  };

  const stopPolling = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = null;
    startedAtRef.current = null;
    setPolling(false);
  };

  const handleGetCode = async () => {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch(START_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }), // no password ⇒ pending
      });
      const j = await r.json();
      if (r.ok && (j.result === 'pending' || j.code)) {
        setCode(j.code);
        startPolling(j.code);
      } else {
        const msg = (j && j.message) || 'Failed to create approval request';
        setErr(msg);
        onError && onError(msg);
      }
    } catch (e) {
      const msg = (e && e.message) || 'Network error';
      setErr(msg);
      onError && onError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    stopPolling();
    setCode('');
    setErr(null);
    setPollMsg('Waiting for approval…');
  };

  const handleLoginPwd = async () => {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch(START_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (r.ok && j.result === true && j.session_id) {
        onSuccess && onSuccess(j.session_id, j);
      } else {
        const msg = (j && j.message) || 'Authentication failed';
        setErr(msg);
        onError && onError(msg);
      }
    } catch (e) {
      const msg = (e && e.message) || 'Network error';
      setErr(msg);
      onError && onError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, maxWidth: 520 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        Sign in with Odoo
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="code" label="Approve in Odoo (no password)" />
        <Tab value="password" label="Password" />
      </Tabs>

      {tab === 'code' && (
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            size="small"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {!code ? (
            <Button
              variant="contained"
              disabled={!canGetCode}
              onClick={handleGetCode}
            >
              {busy ? 'Creating request…' : 'Get approval code'}
            </Button>
          ) : (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ mr: 1 }}>Your code</Typography>
                <Chip color="primary" label={code} />
                <Tooltip title="Copy">
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(code)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Show QR">
                  <span><IconButton size="small" disabled><QrCode2Icon fontSize="small" /></IconButton></span>
                </Tooltip>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Start over">
                  <IconButton size="small" onClick={handleReset}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Stack direction="row" spacing={1} alignItems="center">
                {polling ? <CircularProgress size={18} /> : null}
                <Typography variant="body2" color="text.secondary">
                  {pollMsg}
                </Typography>
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Ask an administrator to approve your login using this code. Once approved, you’ll be signed in automatically.
              </Typography>
            </Box>
          )}

          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      )}

      {tab === 'password' && (
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            size="small"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type={showPwd ? 'text' : 'password'}
            size="small"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            disabled={!canLoginPwd}
            onClick={handleLoginPwd}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      )}
    </Paper>
  );
}
