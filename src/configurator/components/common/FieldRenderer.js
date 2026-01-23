import React from 'react';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

/**
 * FieldRenderer renders the value based on type (for read-only cells).
 */
export default function FieldRenderer({ type, value, options }) {
  switch (type) {
    case 'TEXT':
    case 'INPUT':
      return <span>{value}</span>;
    case 'COMBOBOX':
      return <span>{options?.find(opt => opt.value === value)?.label || value}</span>;
    case 'CHECKBOX':
      return <Checkbox checked={!!value} disabled size="small" />;
    default:
      return <span>{value}</span>;
  }
}
