// src/cloudflare/components/upload-configurator/dialogs/GoogleDriveDialog.jsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Alert, TextField, Button } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';

export default function GoogleDriveDialog({
  open,
  onClose,
  targetCloudflareFolder,
  googleDriveUrl,
  setGoogleDriveUrl,
  saveDriveUrl,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Google Drive URL</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          For now, all files must be <b>publicly accessible</b> at the moment you choose this action.
        </Alert>

        <Alert severity="info" sx={{ mb: 2 }}>
          Target folder: <b>{targetCloudflareFolder ? `/${targetCloudflareFolder}` : '(root - not allowed for Drive import)'}</b>
        </Alert>

        <TextField
          fullWidth
          label="Google Drive folder/file URL"
          placeholder="https://drive.google.com/..."
          value={googleDriveUrl}
          onChange={(e) => setGoogleDriveUrl(e.target.value)}
          InputProps={{ startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>

        <Button onClick={saveDriveUrl} variant="contained" disabled={!googleDriveUrl.trim() || !targetCloudflareFolder.trim()}>
          Save URL
        </Button>
      </DialogActions>
    </Dialog>
  );
}
