// src/cloudflare/components/upload-configurator/QueueSummaryBar.jsx
import React from 'react';
import { Stack, Chip, Box, Tooltip, IconButton, Button } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { formatBytes } from '../../utils/format';

export default function QueueSummaryBar({
  baseRows,
  totalSizeBytes,
  resolutionStats,
  queueSource,
  handleClearAll,
  clearPreference,
  storagePrefKey,
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      <Chip icon={<ImageIcon />} label={`${baseRows.length} images`} size="small" color="primary" />
      <Chip label={`Total: ${formatBytes(totalSizeBytes)}`} size="small" variant="outlined" />
      <Chip label={`High: ${resolutionStats.high}`} size="small" color="error" variant={resolutionStats.high ? 'filled' : 'outlined'} />
      <Chip label={`Web: ${resolutionStats.web}`} size="small" color="primary" variant={resolutionStats.web ? 'filled' : 'outlined'} />
      <Chip label={`Low: ${resolutionStats.low}`} size="small" color="success" variant={resolutionStats.low ? 'filled' : 'outlined'} />

      <Chip label={queueSource === 'local' ? 'Source: Local' : 'Source: Server'} size="small" variant="outlined" />

      <Box sx={{ flexGrow: 1 }} />

      <Tooltip title="Clear all files">
        <IconButton size="small" onClick={handleClearAll} color="error" sx={{ border: '1px solid', borderColor: 'error.main' }}>
          <DeleteSweepIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {typeof window !== 'undefined' && storagePrefKey && localStorage.getItem(storagePrefKey) && (
        <Button size="small" onClick={clearPreference} sx={{ ml: 1, textTransform: 'none' }}>
          Reset Preference
        </Button>
      )}
    </Stack>
  );
}
