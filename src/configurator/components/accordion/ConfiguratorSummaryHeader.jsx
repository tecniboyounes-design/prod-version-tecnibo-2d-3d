import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import PostAddIcon from '@mui/icons-material/PostAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import FileCopy from '@mui/icons-material/FileCopy';
import { useDispatch, useSelector } from 'react-redux';
import { addRootSection, addRootField, setSnackbar } from '@/store.js';
import { v4 as uuidv4 } from 'uuid';

export default function ConfiguratorSummaryHeader({
  onDuplicate,
  onDelete,
}) {
  const dispatch = useDispatch();
  const configurator = useSelector((state) => state?.jsonData?.configurator || {});
  console.log('[ConfiguratorPage] configurator:', configurator);

  const handleAddRootSection = () => {
    const newSection = {
      id: uuidv4(),
      label: 'New Section',
      type: 'NONE',
      description: 'Root-level section',
      order_index: (configurator.sections?.length || 0) + 1,
      termnum: null,
      parentTermnum: null,
      configuratorId: configurator.id,
      fields: [],
      sections: [],
      createdAt: new Date().toISOString(),
    };

    dispatch(addRootSection({ newSection }));
    dispatch(setSnackbar({ open: true, message: `Section "${newSection.label}" added.`, severity: 'success' }));
  };

  const handleAddRootField = () => {
    const newField = {
      id: uuidv4(),
      name: `new_field_${(configurator.fields?.length || 0) + 1}`,
      type: 'INPUT',
      label: 'New Field',
      info: '',
      required: false,
      order_index: (configurator.fields?.length || 0) + 1,
      termnum: null,
      parentTermnum: null,
      configuratorId: configurator.id,
      createdAt: new Date().toISOString(),
    };

    dispatch(addRootField({ newField }));
    dispatch(setSnackbar({ open: true, message: `Field "${newField.label}" added.`, severity: 'success' }));
  };

  return (
    <Box display="flex" alignItems="center" width="100%" justifyContent="space-between">
      {/* Left: Configurator name and description */}
      <Box display="flex" flexDirection="column">
        <Typography variant="subtitle2" fontWeight="bold">
          {configurator?.cpid}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {configurator?.description || 'No description'}
        </Typography>
      </Box>

      {/* Center: Duplicate / Delete */}
      <Box display="flex" alignItems="center" gap={1}>
        <Tooltip title="Duplicate Configurator">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              if (onDuplicate) onDuplicate();
            }}
            sx={{
              bgcolor: '#1976d2',
              color: '#fff',
              '&:hover': { bgcolor: '#1565c0' },
              width: 36,
              height: 36,
            }}
          >
            <FileCopy fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Delete Configurator">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete();
            }}
            sx={{
              bgcolor: '#d32f2f',
              color: '#fff',
              '&:hover': { bgcolor: '#c62828' },
              width: 36,
              height: 36,
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Right: Add Root Section / Field */}
      <Box display="flex" alignItems="center" gap={1}>
        <Tooltip title="Add Root Section">
          <IconButton
            fontSize="small"
            sx={{ color: '#ffb300' }}
            onClick={(e) => {
              e.stopPropagation();
              handleAddRootSection();
            }}
          >
            <CreateNewFolderIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Add Root Field">
          <IconButton
            fontSize="small"
            sx={{ color: '#757575' }}
            onClick={(e) => {
              e.stopPropagation();
              handleAddRootField();
            }}
          >
            <PostAddIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
