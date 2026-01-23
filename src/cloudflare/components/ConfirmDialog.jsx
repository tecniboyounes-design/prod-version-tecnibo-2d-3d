// src/cloudflare/components/ConfirmDialog.jsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  CircularProgress,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

/**
 * Generic confirmation dialog with optional item list.
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = '',
  items = [],
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'error',
  loading = false,
}) {
  const hasItems = Array.isArray(items) && items.length > 0;

  return (
    <Dialog open={Boolean(open)} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={hasItems ? 2 : 1}>
          {message && <DialogContentText>{message}</DialogContentText>}

          {hasItems && (
            <Paper
              variant="outlined"
              sx={{
                maxHeight: 280,
                overflow: 'auto',
                bgcolor: 'background.default',
              }}
            >
              <List dense disablePadding>
                {items.map((it, idx) => (
                  <ListItem key={it?.key || it?.primary || idx} sx={{ px: 1.25, py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningAmberIcon color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={it?.primary || ''}
                      secondary={it?.secondary || ''}
                      primaryTypographyProps={{ noWrap: false }}
                      secondaryTypographyProps={{ noWrap: false }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
