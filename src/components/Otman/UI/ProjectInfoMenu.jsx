"use client"

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography, IconButton, Box, Tooltip, Button
} from '@mui/material';
import React, { useMemo, useRef, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import { useDispatch, useSelector } from 'react-redux';
import { setProjectInfo } from '../../../store';
import AddIcon from '@mui/icons-material/Add';
import { Delete } from '@mui/icons-material';


export const ProjectInfoMenu = ({ menuWidth, isDragging }) => {
  const [expanded, setExpanded] = React.useState(false);
  const dispatch = useDispatch();
  const selectedProject = useSelector((state) => state.jsonData.project);
  const user = useSelector((state) => state.jsonData.user);

  console.log('user', user);
  console.log('user', selectedProject);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleClose = () => {
    dispatch(setProjectInfo(""));
    setExpanded(false);
  };

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: '#e0e0e0',
        height: '100vh',
        transition: isDragging ? 'none' : 'background-color 0.3s ease',
        borderLeft: '2px solid #ddd',
        position: 'relative',
        padding: '16px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <Typography
          variant="h6"
          component="h3"
        >
          Project Info
        </Typography>


        <IconButton
          aria-label="close"
          // onClick={dispatch(setProjectInfo(""))}
          onClick={handleClose}
          sx={{ color: '#000' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Accordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1bh-content" id="panel1bh-header">
          <Typography component="span" sx={{ width: '33%', flexShrink: 0 }}>
            Header Data
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            <strong>Project Name:</strong> {selectedProject?.title || selectedProject?.display_name}<br />
            <strong>Project No.:</strong> {
              selectedProject?.display_name?.match(/\[(\d+)\]/)?.[1] || selectedProject.id
            }<br />
            <strong>Creation Date:</strong> {selectedProject?.createdOn || selectedProject.date_start}<br />
            <strong>Change Date:</strong> {selectedProject?.changedOn || selectedProject.last_update?.status}<br />
            <strong>Delivery Date:</strong> {selectedProject?.remaining_hours}
          </Typography>
        </AccordionDetails>


      </Accordion>

      {/* Accordion for Editor Info */}
      <Accordion expanded={expanded === 'panel2'} onChange={handleChange('panel2')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel2bh-content" id="panel2bh-header">
          <Typography component="span" sx={{ width: '33%', flexShrink: 0 }}>
            Editor
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {selectedProject.manager && (managers?.length > 0 ? (
            managers.map((manager, index) => (
              <Typography key={manager.id}>
                <strong>Name:</strong> {manager.name}<br />
                <strong>Role:</strong> {manager.role || "Manager"}
              </Typography>
            ))
          ) : (
            <Typography>
              <strong>Name:</strong> {selectedProject.display_name || "No manager available"}<br />
              <strong>Role:</strong> {"Manager"}
            </Typography>
          ))}

        </AccordionDetails>
      </Accordion>

      {/* Accordion for Creator Info */}
      <Accordion expanded={expanded === 'panel3'} onChange={handleChange('panel3')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3bh-content"
          id="panel3bh-header"
        >
          <Typography component="span" sx={{ width: '33%', flexShrink: 0 }}>
            Creator Info
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            <strong>Name:</strong> {user?.name} <br />
            <strong>Username:</strong> {user?.username} <br />
            <strong>Partner Display Name:</strong> {user?.partner_display_name} <br />
            <strong>Email:</strong> {user?.username} <br />
            <strong>Timezone:</strong> {user?.user_context?.tz} <br />
            <strong>Database:</strong> {user?.db} <br />
            <strong>Server Version:</strong> {user?.server_version} <br />
            <strong>Support URL:</strong> {user?.support_url} <br />
            <strong>Expiration Date:</strong> {user?.expiration_date} <br />
            <strong>Expiration Reason:</strong> {user?.expiration_reason} <br />
          </Typography>
        </AccordionDetails>


      </Accordion>
    </div>
  );

};




export const PricesAccordion = () => {
  const [expanded, setExpanded] = useState(false);
  const dispatch = useDispatch();
  const items = useSelector((state) => state.jsonData.floorplanner.items);

  const VAT_RATE = 0.19; // 19% VAT rate
  const SHIPPING_COST = 10; // Example shipping cost

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleOnClose = () => {
    dispatch(setProjectInfo(null));
  };

  // Memoize the calculation of prices to prevent unnecessary recalculations
  const calculatePrices = useMemo(() => {
    let totalPurchase = 0;
    let totalArticlePrice = 0;
    let totalVAT = 0;
    let totalWithVAT = 0;

    items.forEach((item) => {
      const itemPrice = item.price || 0;
      const quantity = item?.quantity || 1;

      totalArticlePrice += itemPrice * quantity;
      const itemVAT = itemPrice * VAT_RATE * quantity;
      totalVAT += itemVAT;

      totalPurchase += itemPrice * quantity;
    });

    const totalShipping = SHIPPING_COST;
    const totalVATIncludingShipping = totalVAT + totalShipping * VAT_RATE;
    totalWithVAT = totalPurchase + totalVAT + totalShipping + totalVATIncludingShipping;

    return {
      totalPurchase,
      totalArticlePrice,
      totalVAT,
      totalShipping,
      totalWithVAT,
    };
  }, [items]); // Recalculate when items change

  const { totalPurchase, totalArticlePrice, totalVAT, totalShipping, totalWithVAT } = calculatePrices;

  return (
    <Box
      sx={{
        width: "100%",
        backgroundColor: '#e0e0e0',
        height: '100vh',
        transition: 'background-color 0.3s ease',
        borderLeft: '2px solid #ddd',
        position: 'relative',
        padding: '16px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <Typography variant="h6" component="h3">
          Prices
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleOnClose}
          sx={{ color: '#000' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <Accordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
        >
          <Typography component="span" sx={{ fontWeight: 'bold' }}>
            Prices excl. VAT
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            <strong>Purchase:</strong> €{totalPurchase.toFixed(2)}<br />
            {/* Price purchase */}
            <strong>Article price:</strong> €{totalArticlePrice.toFixed(2)}<br />
            <strong>Additional VAT:</strong> 19%<br />
            <strong>VAT absolute:</strong> €{totalVAT.toFixed(2)}<br />
            <strong>Shipping cost:</strong> €{totalShipping.toFixed(2)}<br />
            <strong>Additional VAT (shipping):</strong> 19%<br />
            <strong>VAT absolute (shipping):</strong> €{(totalShipping * VAT_RATE).toFixed(2)}<br />
            <strong>Total:</strong> €{totalPurchase + totalVAT + totalShipping}<br />
            <strong>Total incl. VAT:</strong> €{totalWithVAT.toFixed(2)}
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};






export const FileUploadAccordion = () => {
  const [expanded, setExpanded] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const newFile = {
        name: file.name,
        url: URL.createObjectURL(file),
      };
      setUploadedFiles((prevFiles) => [...prevFiles, newFile]); // Add new file to state
    }
  };

  const handleBoxClick = () => {
    // Trigger the hidden file input's click event
    fileInputRef.current.click();
  };

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleOnClose = () => {
    dispatch(setProjectInfo(null));
  };
  const handleDelete = (index) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#e0e0e0',
        height: '100vh',
        borderLeft: '2px solid #ddd',
        position: 'relative',
        padding: '16px',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Typography variant="h6" component="h3">
          Document
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="This will download all the files being uploaded">
            <Button
              variant="outlined"
              sx={{
                marginRight: 2,
                padding: '2px 6px',
                fontSize: '0.7rem',
                color: 'secondary.main',
                borderColor: 'secondary.main',
              }}
            >
              Download All Files
            </Button>
          </Tooltip>

          <IconButton aria-label="close" onClick={handleOnClose} sx={{ color: '#000' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Accordion expanded={expanded === 'panel4'} onChange={handleChange('panel4')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel4bh-content" id="panel4bh-header">
          <Typography component="span" sx={{ width: '33%', flexShrink: 0 }}>
            User Upload
          </Typography>
        </AccordionSummary>
        <AccordionDetails>



          <Uploader uploadedFiles={uploadedFiles} handleDelete={handleDelete} />


          <Box
            sx={{
              display: 'flex',
              zIndex: 4,
              flexDirection: 'column',
              gap: '16px',
              border: '2px dashed',
              borderColor: 'grey.500',
              borderRadius: '8px',
              padding: '16px',
              transition: 'border-color 0.3s ease',
              '&:hover': {
                borderColor: 'secondary.main',
              },
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: '150px',
              position: 'relative',
            }}

            onClick={handleBoxClick}
          >


            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />





            <AddIcon sx={{ fontSize: '60px', color: 'text.secondary', position: 'absolute' }} />

            {/* "New Upload" Text */}
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                fontWeight: 'bold',
                color: 'text.secondary',
              }}
            >
              New Upload
            </Typography>

            <Typography
              variant="body2"
              sx={{
                marginTop: '48px',
                position: 'relative',
                zIndex: 2,
              }}
            >



            </Typography>
          </Box>



        </AccordionDetails>
      </Accordion>
    </div>
  );
};




export const Uploader = ({ uploadedFiles, handleDelete }) => {

  const getFilePreview = (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'pdf') {
      return (
        <embed
          src={file.url}
          width="100%"
          height="120px"
          type="application/pdf"
        />
      );
    }

    if (fileExtension === 'mp4' || fileExtension === 'mov' || fileExtension === 'avi') {
      return (
        <video
          controls
          src={file.url}
          style={{ width: '100%', height: 'auto' }}
        />
      );
    }

    if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png' || fileExtension === 'gif') {
      return (
        <img
          src={file.url}
          alt={file.name}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '120px',
            objectFit: 'contain',
          }}
        />
      );
    }

    return <Typography variant="body2">Unsupported file type</Typography>;
  };

  const uploadedFilesStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: '2px solid',
    borderColor: 'grey.300',
    borderRadius: '12px',
    padding: '16px',
    height: '200px',
    position: 'relative',
    overflow: 'hidden',
    textAlign: 'center',
    marginBottom: '24px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.5s ease, box-shadow 0.2s ease',
    '&:hover': {
      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
      transform: 'scale(1.02)',
    },
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        padding: '16px',
      }}
    >
      {uploadedFiles.map((file, index) => (
        <Box
          key={index}
          sx={uploadedFilesStyle}
        >

          {/* Tooltip for delete button */}
          <Tooltip title="Delete this file" arrow>
            <IconButton
              size="small"
              sx={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: 'white',
                '&:hover': { backgroundColor: 'red', color: 'white' },
              }}
              onClick={() => handleDelete(index)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* File preview based on file type */}
          {getFilePreview(file)}

          {/* Display file name */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 'bold',
              color: 'text.secondary',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              width: '100%',
            }}
          >
            {file.name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

