'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

/**
 * Shared hook to gate pages behind the Cloudflare access token.
 */
export function useAccessTokenGate() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/cloudflare/access', { method: 'GET' });
        const data = await res.json();
        if (cancelled) return;
        setAllowed(Boolean(data?.ok));
      } catch {
        if (cancelled) return;
        setAllowed(false);
      } finally {
        if (cancelled) return;
        setChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const submitToken = useCallback(async () => {
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
  }, [token]);

  return {
    allowed,
    checking,
    token,
    setToken,
    submitting,
    error,
    submitToken,
  };
}

/**
 * Standalone dialog UI to reuse across pages.
 */
export default function AccessTokenDialog({
  open,
  title = 'Access Required',
  description = 'Enter the access token to continue.',
  hint = 'Hint: token is validated server-side (stored in .env) and saved as an HttpOnly cookie.',
  unlockLabel = 'Unlock',
  token,
  onTokenChange,
  onSubmit,
  submitting,
  error,
}) {
  const disabled = !token?.trim() || submitting;

  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockIcon fontSize="small" />
        {title}
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <TextField
          autoFocus
          fullWidth
          label="Access token"
          value={token}
          onChange={(e) => onTokenChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled) onSubmit?.();
          }}
          placeholder="Paste token..."
        />

        {hint ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {hint}
          </Typography>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={disabled}
          sx={{ textTransform: 'none' }}
        >
          {submitting ? 'Verifying...' : unlockLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
