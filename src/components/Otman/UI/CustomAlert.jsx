// components/CustomAlert.js
import React from 'react';
import { Snackbar, Alert } from '@mui/material';

const CustomAlert = ({ open, message, severity, onClose, autoHideDuration = 6000 }) => {
  return (
    <Snackbar
      open={Boolean(open)}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top', horizontal: 'center'
      }}
    >
      <Alert onClose={onClose} severity={severity || 'info'} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default CustomAlert;
