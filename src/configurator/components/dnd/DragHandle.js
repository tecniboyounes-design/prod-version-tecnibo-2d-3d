import React from 'react';
import { useDrag } from '@dnd-kit/core';
import IconButton from '@mui/material/IconButton';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

export default function DragHandle({ id }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDrag({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <IconButton size="small">
        <DragIndicatorIcon fontSize="small" />
      </IconButton>
    </div>
  );
}

