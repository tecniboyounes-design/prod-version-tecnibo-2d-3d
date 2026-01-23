import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';

const FIELD_TYPES = [
  { value: 'INPUT', label: 'Input' },
  { value: 'TEXT', label: 'Text' },
  { value: 'COMBOBOX', label: 'Combobox' }
];

export default function AddFieldDialog({ open, onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('INPUT');
  const [label, setLabel] = useState('');
  const [required, setRequired] = useState(false);

  const handleAdd = () => {
    // Dispatch to redux here
    console.log('Adding field:', { name, type, label, required });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Field</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          label="Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
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
          {FIELD_TYPES.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          margin="dense"
          label="Required"
          fullWidth
          value={required ? 'Yes' : 'No'}
          onChange={(e) => setRequired(e.target.value === 'Yes')}
        >
          <MenuItem value={'Yes'}>Yes</MenuItem>
          <MenuItem value={'No'}>No</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained">Add</Button>
      </DialogActions>
    </Dialog>
  );
}