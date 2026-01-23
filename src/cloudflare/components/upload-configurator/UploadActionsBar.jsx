// src/cloudflare/components/upload-configurator/UploadActionsBar.jsx
import React from 'react';
import { Stack, FormControl, InputLabel, Select, MenuItem, Button, Alert, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { IMAGE_PROFILES } from '../../utils/profiles';

export default function UploadActionsBar({
  creating,
  queueSource,
  selectionCount,
  handleBulkProfileChange,
  handlePrimaryAction,
  primaryLabel,
  intents,
  bulkProfileValue,
  defaultProfile,
  setDefaultProfile,
  baseRowsLength,
}) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
      <FormControl size="small" sx={{ minWidth: 220 }} disabled={selectionCount === 0}>
        <InputLabel id="sel-prof">Set Selected To</InputLabel>
        <Select
          labelId="sel-prof"
          label="Set Selected To"
          value={bulkProfileValue}
          onChange={(e) => handleBulkProfileChange(e.target.value)}
          renderValue={(v) => {
            if (selectionCount === 0) return 'Choose Profile...';
            if (v === '__mixed__') return 'Mixed (selected)';
            const found = IMAGE_PROFILES.find((x) => x.id === v);
            return found?.label ?? 'Choose Profile...';
          }}
        >
          <MenuItem value="" disabled>
            Choose Profile...
          </MenuItem>
          <MenuItem value="__mixed__" disabled>
            Mixed (selected)
          </MenuItem>
          {IMAGE_PROFILES.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="def-prof">Default Profile</InputLabel>
        <Select labelId="def-prof" label="Default Profile" value={defaultProfile} onChange={(e) => setDefaultProfile(e.target.value)}>
          {IMAGE_PROFILES.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        onClick={handlePrimaryAction}
        disabled={creating || !baseRowsLength}
        size="large"
        startIcon={<CloudUploadIcon />}
        sx={{ textTransform: 'none' }}
      >
        {primaryLabel}
      </Button>

      {creating && <CircularProgress size={24} sx={{ ml: 1 }} />}

      {queueSource === 'local' && intents?.ok && (
        <Alert severity="success" sx={{ ml: 2 }}>
          {`Created ${intents.intents?.length ?? 0} direct upload URLs.`}
        </Alert>
      )}
    </Stack>
  );
}
