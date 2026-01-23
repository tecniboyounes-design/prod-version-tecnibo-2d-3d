// src/cloudflare/components/upload-configurator/UploadQueueGrid.jsx
import React from 'react';
import { Paper, Box, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

export default function UploadQueueGrid({
  baseRowsLength,
  gridRows,
  columns,
  loading,
  rowSelectionModel,
  setRowSelectionModel,
  paginationModel,
  setPaginationModel,
  gridPaperRef,
}) {
  return (
    <Paper ref={gridPaperRef} variant="outlined" sx={{ mt: 3, height: 600, width: '100%' }}>
      <DataGrid
        key={baseRowsLength > 0 ? 'data-grid-populated' : 'data-grid-empty'}
        rows={gridRows}
        columns={columns}
        checkboxSelection
        disableRowSelectionOnClick
        density="compact"
        rowHeight={72}
        columnBuffer={5}
        loading={loading}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={setRowSelectionModel}
        pagination
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[20, 50, 100]}
        slots={{
          loadingOverlay: () => (
            <Box
              sx={{
                display: 'flex',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
                opacity: 0.85,
              }}
            >
              <CircularProgress size={50} />
            </Box>
          ),
        }}
      />
    </Paper>
  );
}
