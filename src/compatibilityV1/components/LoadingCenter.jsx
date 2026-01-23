'use client';

import * as React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingCenter({
  title = 'Loading…',
  subtitle = 'Please wait a moment while we prepare everything for you.',
  minHeight = '80vh',
  spinnerSize = 48,
  spinnerThickness = 4,
}) {
  return (
    <Box
      sx={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress size={spinnerSize} thickness={spinnerThickness} />
      <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.secondary' }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}
