"use client";
import React from 'react';
import IconButton from '@mui/material/IconButton';

/**
 * A reusable small icon button with size and spacing override.
 * Supports disabled state and tooltip.
 *
 * @param {object} props
 * @param {JSX.Element} props.icon - Icon element (e.g., <Add />)
 * @param {function} props.onClick - Click handler
 * @param {string} [props.title] - Tooltip text (optional)
 * @param {boolean} [props.disabled] - Disable button (optional)
 */
export default function IconButtonSmall({ icon, onClick, title = '', disabled = false }) {
  return (
    <IconButton
      onClick={disabled ? undefined : onClick} // prevent onClick if disabled
      size="small"
      title={title}
      disabled={disabled} // MUI handles opacity + cursor
      sx={{
        p: 0.5,
        m: 0.25,
        color: disabled ? 'text.disabled' : 'text.secondary',
        '&:hover': {
          color: disabled ? 'text.disabled' : 'primary.main',
        },
      }}
    >
      {icon}
    </IconButton>
  );
}
