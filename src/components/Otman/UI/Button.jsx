import { Tooltip, Button } from "@mui/material";
import React from 'react'

 
export const GradientButtonWithTooltip = ({ text, onClick, tooltipText, icon, styles, variant = "outlined" }) => {
  return (
    <Tooltip title={tooltipText} arrow placement="bottom">
      <Button
        variant={variant}
        sx={{
          background: 'linear-gradient(136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
          color: 'white',
          transition: 'transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease, filter 0.3s ease',
          border: 'none',
          '&:hover': {
            background: 'linear-gradient(136deg, rgb(255,128,0) 0%, rgb(255,85,127) 50%, rgb(158,50,158) 100%)',
            transform: 'scale(1.05)',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.2)',
            filter: 'brightness(1.1)',
          },
          ...styles, 
          // Merge with existing style 
        }}
        startIcon={icon}
        onClick={onClick}
      >
        {text}
      </Button>
    </Tooltip>
  );
};



