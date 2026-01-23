// src/cloudflare/components/upload-configurator/dialogs/MergeReplaceDialog.jsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  FormControlLabel,
  Checkbox,
  Button,
} from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

export default function MergeReplaceDialog({
  open,
  pendingItemsLength,
  baseRowsLength,
  dontAskAgain,
  setDontAskAgain,
  handleUserReplace,
  handleUserMerge,
  handleDialogClose,
}) {
  return (
    <Dialog open={open} onClose={handleDialogClose}>
      <DialogTitle>Importing {pendingItemsLength} items</DialogTitle>
      <DialogContent>
        <DialogContentText gutterBottom>You already have {baseRowsLength} images. Add to list or replace?</DialogContentText>
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={<Checkbox checked={dontAskAgain} onChange={(e) => setDontAskAgain(e.target.checked)} />}
            label="Don't ask again"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleUserReplace} color="error" startIcon={<DeleteForeverIcon />}>
          Replace
        </Button>
        <Button onClick={handleUserMerge} variant="contained" autoFocus startIcon={<AddPhotoAlternateIcon />}>
          Merge
        </Button>
      </DialogActions>
    </Dialog>
  );
}
