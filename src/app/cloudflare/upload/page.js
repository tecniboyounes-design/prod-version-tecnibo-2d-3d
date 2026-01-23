// src/app/cloudflare/upload/page.js
'use client';

import React, { useEffect, useState } from 'react';
import CloudflareFolderUploadConfigurator from '@/cloudflare/components/CloudflareFolderUploadConfigurator';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

export default function Page() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // NOTE: This page-level gate is the V1 "blocker".
  // If later you want hard security, reuse the same cookie check inside /api/cloudflare/* routes too.
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch('/api/cloudflare/access', { method: 'GET' });
        const data = await res.json();

        if (!mounted) return;
        setAllowed(Boolean(data?.ok));
      } catch {
        if (!mounted) return;
        setAllowed(false);
      } finally {
        if (!mounted) return;
        setChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const submitToken = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/cloudflare/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'Access denied.');
      }

      setAllowed(true);
      setToken('');
    } catch (e) {
      setAllowed(false);
      setError(e?.message || 'Access denied.');
    } finally {
      setSubmitting(false);
    }
  };

  // Full-page loader while checking cookie
  if (checking) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Checking access...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      {/* Render the upload tool ONLY if authorized */}
      {allowed ? <CloudflareFolderUploadConfigurator /> : null}

      {/* Blocking dialog (cannot use the page without token) */}
      <Dialog open={!allowed} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon fontSize="small" />
          Upload Access Required
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the access token to open the Cloudflare upload tool.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            autoFocus
            fullWidth
            label="Access token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && token.trim() && !submitting) submitToken();
            }}
            placeholder="Paste token..."
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Hint: token is validated server-side (stored in .env) and saved as an HttpOnly cookie.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={submitToken}
            disabled={!token.trim() || submitting}
            sx={{ textTransform: 'none' }}
          >
            {submitting ? 'Verifying...' : 'Unlock Upload Tool'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
