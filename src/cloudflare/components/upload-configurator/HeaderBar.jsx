// src/cloudflare/components/upload-configurator/HeaderBar.jsx
import React from 'react';
import { Stack, Box, Typography, Tooltip, IconButton, Button } from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

export default function HeaderBar({ mode, toggleMode, openSourceDialog }) {
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
      <CloudIcon fontSize="large" color="primary" />
      <Box>
        <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          Cloudflare Images
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Navigate to target folders and drop files to start.
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      <Tooltip title={mode === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}>
        <IconButton onClick={toggleMode} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
          {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Button variant="outlined" startIcon={<CloudIcon />} onClick={openSourceDialog} sx={{ textTransform: 'none' }}>
        Choose Source
      </Button>
    </Stack>
  );
}
