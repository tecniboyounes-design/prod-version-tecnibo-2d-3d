import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';

const SECTION_TYPES = [
  { value: 'DEFAULT', label: 'Default Settings' },
  { value: 'TREE', label: 'Conditions' },
  { value: 'USAGE', label: 'Usage' }
];

export default function AddSectionDialog({ open, onClose }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState('DEFAULT');

  const handleAdd = () => {
    // Dispatch to redux here
    console.log('Adding section:', { label, type });
    onClose();
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Section</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          label="Label"
          fullWidth
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <TextField
          select
          margin="dense"
          label="Type"
          fullWidth
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {SECTION_TYPES.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained">Add</Button>
      </DialogActions>
    </Dialog>
  );
}
