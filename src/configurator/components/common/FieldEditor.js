"use client";
import React from 'react';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';

/**
 * FieldEditor renders the editable version of a field, for inline editing.
 */
export default function FieldEditor({ type, value, onChange, options }) {
  switch (type) {
    case 'TEXT':
    case 'INPUT':
      return (
        <TextField
          size="small"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'COMBOBOX':
      return (
        <Select size="small" value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {options?.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      );
    case 'CHECKBOX':
      return (
        <Checkbox
          size="small"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    default:
      return null;
  }
}
