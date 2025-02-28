"use client";

import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Badge } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import axios from 'axios';
import { GradientButtonWithTooltip } from './Button';
import CustomAlert from './CustomAlert';
import { updateProjectStatus } from '@/store';
import { SearchForProjectOnOdooDialog } from './MyProjects';
import { updateProjectOdooData } from '@/supabaseClient';

const PriceDisplay = () => {
  const items = useSelector((state) => state.jsonData.floorplanner.items);
  const projectDetails = useSelector((state) => state.jsonData.project);
  const [isExpanded, setIsExpanded] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');
  const user = useSelector((state) => state.jsonData.user);
  const project = useSelector((state) => state.jsonData.project);
  const dispatch = useDispatch();
  const [openFetch, setOpenFetch] = useState(false);


  const VAT_RATE = 0.19;
  const SHIPPING_COST = 10;
  
  const { totalPrice, totalVAT, totalWithVAT } = useMemo(() => {
    let totalPrice = 0;
    let totalVAT = 0;

    items.forEach((item) => {
      const itemPrice = item?.price || 0;
      const quantity = item?.quantity || 1;
      totalPrice += itemPrice * quantity;
      totalVAT += itemPrice * VAT_RATE * quantity;
    });

    return {
      totalPrice,
      totalVAT,
      totalWithVAT: totalPrice + totalVAT + SHIPPING_COST,
    };
  }, [items]);
  
  const { id } = project;
  console.log('projectID', id); 

  const handleOrderClick = async () => {
    handleOpenFetch();
    const orderPayload = {
      items: items?.map((item) => ({
        name: item?.attributes?.name || item.itemName,
        product_id: item?.id || null,
        quantity: item?.quantity || 1,
        price: item?.attributes?.price || 0,
      })) || [],
      orderName: projectDetails?.title || 'Untitled Project',
      userData: user || { uid: 447, allowed_company_ids: [11] },
      projectId: id,
    };
  
    try {
      const { data } = await axios.post('/api/orderSales', orderPayload);
  
      if (data?.id) {
        const orderId = data.id;
        console.log('orderID', orderId); // Check if the order ID is correctly logged
  
        // Remove the updateProjectOdooData logic
        // You can handle any other logic here if needed
  
        setAlertOpen(true);
        setAlertMessage('Order placed successfully!');
        setAlertSeverity('success');
        dispatch(updateProjectStatus({ id: project.id, status: "ordered" }));
      }
    } catch (error) {
      console.error('Error placing the order:', error);
      setAlertMessage('Failed to place the order.');
      setAlertSeverity('error');
    } finally {
      setAlertOpen(true); // Show alert after the order attempt
    }
  };
  
  

  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  const handleOpenFetch = () => {
    setOpenFetch(true);
  };

  const handleCloseFetch = () => {
    setOpenFetch(false);
  };
  
  return (
    <>
    <Box
      sx={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        padding: '8px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        boxShadow: 2,
        display: 'flex',
        flexDirection: 'row',
        gap: 2,
        alignItems: 'flex-start'
      }}
    >
      {/* Toggle Button */}
      <Badge badgeContent={items.length} color="error">
        <GradientButtonWithTooltip
          tooltipText={isExpanded ? 'Hide Details' : 'Show Details'}
          onClick={() => setIsExpanded(!isExpanded)}
          variant="contained"
          styles={{ marginTop: '10px' }}
          icon={<DirectionsCarFilledIcon />}
        />
      </Badge>

      {/* Conditionally Rendered Details */}
      {isExpanded && (
        <>
          <Box sx={{ marginRight: '15px' }}>
            <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
              Project Title
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {projectDetails?.title || 'Untitled Project'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                Total Price (excl. VAT)
              </Typography>
              <Typography variant="body2" color="secondary">
                ${totalPrice.toFixed(2)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" color="text.secondary">
                + VAT:
              </Typography>
              <Typography variant="body2" color="secondary">
                ${totalVAT.toFixed(2)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total incl. VAT:
              </Typography>
              <Typography variant="body2" color="secondary">
                ${totalWithVAT.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {/* Place Order Button */}
          <GradientButtonWithTooltip
            text="Place Order"
            tooltipText="Click to ship and finalize your order"
            onClick={handleOrderClick}
            variant="contained"
            icon={<LocalShippingIcon />}
            styles={{ marginTop: '10px' }}
          />
        </>
      )}

      {/* Alert component integration */}
      <CustomAlert
        open={alertOpen}
        message={alertMessage}
        severity={alertSeverity}
        onClose={handleAlertClose}
      />
    </Box>
    <SearchForProjectOnOdooDialog open={openFetch} onClose={handleCloseFetch} />
    </>
  );
};

export default PriceDisplay;


