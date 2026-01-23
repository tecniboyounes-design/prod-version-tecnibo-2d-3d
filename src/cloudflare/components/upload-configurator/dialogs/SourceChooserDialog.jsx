// src/cloudflare/components/upload-configurator/dialogs/SourceChooserDialog.jsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Stack, Paper, Box, Typography, Button } from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import AddToDriveIcon from '@mui/icons-material/AddToDrive';

export default function SourceChooserDialog({ open, onClose, chooseLocalSource, chooseGoogleDriveSource }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Choose Source</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>Select where you want to import images from.</DialogContentText>

        <Stack spacing={1.5}>
          <Paper
            variant="outlined"
            onClick={chooseLocalSource}
            sx={{ p: 1.5, cursor: 'pointer', display: 'flex', gap: 1.5, alignItems: 'center', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <ComputerIcon color="primary" />
            <Box>
              <Typography fontWeight={700}>Local Computer</Typography>
              <Typography variant="body2" color="text.secondary">
                Select images or a folder from your machine.
              </Typography>
            </Box>
          </Paper>

          <Paper
            variant="outlined"
            onClick={chooseGoogleDriveSource}
            sx={{ p: 1.5, cursor: 'pointer', display: 'flex', gap: 1.5, alignItems: 'center', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <AddToDriveIcon color="primary" />
            <Box>
              <Typography fontWeight={700}>Google Drive</Typography>
              <Typography variant="body2" color="text.secondary">
                Provide a public URL (UI only for now).
              </Typography>
            </Box>
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
