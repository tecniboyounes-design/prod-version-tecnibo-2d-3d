"use client";

import React from 'react';
import { Delete, DragIndicator } from '@mui/icons-material';
import IconButtonSmall from './IconButtonSmall';

export default function FieldActionCell({ onDelete, onDrag }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <IconButtonSmall
        icon={<Delete sx={{ color: "#d32f2f" }} />}
        onClick={onDelete}
        title="Delete"
      />
      <IconButtonSmall
        icon={<DragIndicator sx={{ color: "#757575" }} />}
        onClick={() => {
          if (onDrag) onDrag();
          else console.log('Drag action triggered');
        }}
        title="Drag"
      />
    </div>
  );
}
