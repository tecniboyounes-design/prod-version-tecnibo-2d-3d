import React from 'react';
import { Box, Typography } from '@mui/material';

const PriceDisplay = ({ projectTitle, price, currencySymbol }) => {
  return (
    
    <Box
      sx={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        padding: 2,
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        boxShadow: 2,
        display: 'flex',
        flexDirection: 'row',
        gap: 2,
      }}
    >
      <Box sx={{ marginRight: '15px' }}>
        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
          Project Title
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {projectTitle || 'Untitled Project'}
        </Typography>
      </Box> 

      <Box>
        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
          Total Price
        </Typography>
        <Typography variant="body2" color="secondary">
          {currencySymbol}{price.toFixed(2)}
        </Typography>
      </Box>

    </Box>

  );
};

export default PriceDisplay;
