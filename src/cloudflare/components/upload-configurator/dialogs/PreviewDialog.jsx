// src/cloudflare/components/upload-configurator/dialogs/PreviewDialog.jsx
import React, { useMemo, useState } from 'react';
import {
  Dialog,
  Box,
  CircularProgress,
  Typography,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';

// Icons
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import FitScreenIcon from '@mui/icons-material/FitScreen'; 
import AspectRatioIcon from '@mui/icons-material/AspectRatio';

const FOOTER_HEIGHT = 64;

export default function PreviewDialog({
  open,
  previewTitle,
  previewBusy,
  previewUrl,
  previewMime,
  closePreview,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const viewportHeight = isMobile ? '80vh' : '90vh';
  
  // Toggle: false = "Contain" (See whole image), true = "Cover" (Fill space)
  const [isCoverMode, setIsCoverMode] = useState(false);

  const isImage = useMemo(() => {
    const mime = String(previewMime || '').toLowerCase();
    if (mime.startsWith('image/')) return true;
    if (!previewUrl) return false;
    return /\.(png|jpe?g|gif|webp|bmp|svg)(?=[/?#]|$)/i.test(previewUrl);
  }, [previewMime, previewUrl]);

  const imageStyle = {
    display: 'block',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    width: '-webkit-fill-available',
    height: '-webkit-fill-available',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: isCoverMode ? 'cover' : 'contain',
    objectPosition: 'center center',
    transition: 'all 0.25s ease',
  };

  const handleOpenNewTab = () => {
    if (!previewUrl) return;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog
      open={open}
      onClose={closePreview}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#000',
          borderRadius: 2,
          overflow: 'hidden',
          height: viewportHeight,
          maxHeight: viewportHeight,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          m: isMobile ? 1 : 2,
        }
      }}
    >
      {/* --- MAIN PREVIEW AREA --- */}
      <Box sx={{ 
        flex: 1,
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        bgcolor: '#000',
        overflow: 'hidden',
        width: '100%',
        height: `calc(${viewportHeight} - ${FOOTER_HEIGHT}px)`,
        maxHeight: `calc(${viewportHeight} - ${FOOTER_HEIGHT}px)`,
        minHeight: 240,
      }}>
        
        {/* Loading Spinner */}
        {previewBusy && <CircularProgress size={50} sx={{ color: '#fff' }} />}

        {/* Empty State */}
        {!previewBusy && !previewUrl && (
          <Typography sx={{ color: '#666' }}>No preview available</Typography>
        )}

        {/* IMAGE: The key here is width/height 100% combined with object-fit */}
        {!previewBusy && previewUrl && isImage && (
          <img
            src={previewUrl}
            alt={previewTitle}
            style={imageStyle}
          />
        )}

        {/* IFRAME (PDFs etc) */}
        {!previewBusy && previewUrl && !isImage && (
          <Box
            component="iframe"
            src={previewUrl}
            title={previewTitle}
            sx={{
              width: '100%',
              height: '100%',
              border: 0,
              bgcolor: '#fff'
            }}
          />
        )}

        {/* Close Button - Floating Top Right */}
        <IconButton
          onClick={closePreview}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: '#fff',
            bgcolor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* --- BOTTOM BAR --- */}
      <Box sx={{
        height: 64, // Fixed height for footer
        px: 3,
        bgcolor: '#121212', // Dark Grey footer
        borderTop: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        
        {/* Title */}
        <Typography variant="body1" sx={{ color: '#fff', fontWeight: 500, opacity: 0.9 }}>
          {previewTitle || 'Image Preview'}
        </Typography>

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          
          {/* Fit/Cover Toggle */}
          {isImage && !previewBusy && (
             <Tooltip title={isCoverMode ? "Fit to screen" : "Zoom to fill"}>
                <IconButton 
                  onClick={() => setIsCoverMode(!isCoverMode)}
                  sx={{ color: '#fff', opacity: 0.7, '&:hover': { opacity: 1 } }}
                >
                  {isCoverMode ? <FitScreenIcon /> : <AspectRatioIcon />}
                </IconButton>
             </Tooltip>
          )}

          {/* Open Original */}
          <Button
            onClick={handleOpenNewTab}
            startIcon={<OpenInNewIcon />}
            disabled={!previewUrl}
            sx={{
              color: '#90caf9', // Light blue text
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.08)' }
            }}
          >
            Open Original
          </Button>

          {/* Done Button */}
          <Button 
            onClick={closePreview} 
            variant="contained"
            size="small"
            sx={{ 
                bgcolor: '#fff', 
                color: '#000', 
                fontWeight: 'bold',
                '&:hover': { bgcolor: '#e0e0e0' }
            }}
          >
            Done
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
