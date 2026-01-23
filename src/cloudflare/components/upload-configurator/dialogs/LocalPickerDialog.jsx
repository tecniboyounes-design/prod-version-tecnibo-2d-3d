// src/cloudflare/components/upload-configurator/dialogs/LocalPickerDialog.jsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Stack, Paper, Box, Typography, Button } from '@mui/material';
import CollectionsIcon from '@mui/icons-material/Collections';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

export default function LocalPickerDialog({ open, onClose, openLocalFilesPicker, openLocalFolderPicker }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Upload from Local</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>Choose images or a folder. (Folder selection works best in Chrome/Edge.)</DialogContentText>

        <Stack spacing={1.5}>
          <Paper
            variant="outlined"
            onClick={openLocalFilesPicker}
            sx={{ p: 1.5, cursor: 'pointer', display: 'flex', gap: 1.5, alignItems: 'center', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <CollectionsIcon color="primary" />
            <Box>
              <Typography fontWeight={700}>Select Images</Typography>
              <Typography variant="body2" color="text.secondary">
                All image formats (image/*)
              </Typography>
            </Box>
          </Paper>

          <Paper
            variant="outlined"
            onClick={openLocalFolderPicker}
            sx={{ p: 1.5, cursor: 'pointer', display: 'flex', gap: 1.5, alignItems: 'center', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <FolderOpenIcon color="primary" />
            <Box>
              <Typography fontWeight={700}>Select Folder</Typography>
              <Typography variant="body2" color="text.secondary">
                Import images inside a directory
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
