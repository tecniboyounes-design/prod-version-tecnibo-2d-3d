'use client';

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
 * Standalone dialog UI to reuse across pages.
 *
 * When `connectUrl` is provided the token input is replaced with an
 * Odoo OAuth connect button — same arrow-icon style as the /0Auth page.
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
  // --- Odoo connect mode ---
  connectUrl,
  connectLabel = 'Continue with Odoo Access',
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

        {connectUrl ? null : (
          <>
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
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {connectUrl ? (
          <Button
            component="a"
            href={connectUrl}
            variant="contained"
            fullWidth
            startIcon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="15" y1="12" x2="3" y2="12" />
                <polyline points="12 19 19 12 12 5" />
              </svg>
            }
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {connectLabel}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={disabled}
            sx={{ textTransform: 'none' }}
          >
            {submitting ? 'Verifying...' : unlockLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
