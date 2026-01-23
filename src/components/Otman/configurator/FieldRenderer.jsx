// ---------------- FieldRenderer.jsx ----------------
'use client';
import React from 'react';
import {
  TextField,
  Checkbox,
  FormControlLabel,
  Autocomplete,
} from '@mui/material';

const FieldRenderer = ({ field, detail = {}, value, onChange }) => {
  if (!field?.field_type_id) return <div>Invalid field</div>;

  const numericChange = (e) => {
    const val = e.target.value;
    onChange(val === '' ? '' : parseFloat(val));
  };

  switch (field.field_type_id) {
    case 'input_field':
      return (
        <TextField
          type={detail.type === 'number' ? 'number' : 'text'}
          label={field.label}
          value={value ?? ''}
          inputProps={{ min: detail.min, max: detail.max, step: detail.step ?? 0.1 }}
          fullWidth
          onChange={detail.type === 'number' ? numericChange : (e) => onChange(e.target.value)}
        />
      );

    case 'checkbox_field':
      return (
        <FormControlLabel
          control={<Checkbox checked={!!value} onChange={(e) => onChange(e.target.checked)} />}
          label={field.label}
        />
      );

    case 'combobox_field':
      return (
        <Autocomplete
          options={detail.options || []}
          value={value ?? null}
          onChange={(_, nv) => onChange(nv)}
          renderInput={(params) => <TextField {...params} label={field.label} fullWidth />}
        />
      );

    default:
      return <div>Unsupported field type: {field.field_type_id}</div>;
  }
};

export default FieldRenderer;
 