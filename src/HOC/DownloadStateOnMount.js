"use client"
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const DownloadStateOnMount = () => {
  const state = useSelector((state) => state.jsonData.floorplanner); 
  const dispatch = useDispatch();

  useEffect(() => {
    // dispatch(setLoading(true));

    const handleDownload = () => {
      
//       const stateJson = JSON.stringify(state, null, 2);  
//       // Create a Blob from the state JSON
//       const blob = new Blob([stateJson], { type: 'application/json' });
// 
//       // Create a temporary link element to trigger the download
//       const link = document.createElement('a');
//       link.href = URL.createObjectURL(blob);  // Create a URL for the Blob
//       link.download = 'state.json';  // Set the filename
//       link.click();  // Simulate a click to trigger the download
    };

  handleDownload();

  }, [state, dispatch]);

  return null; 
};

export default DownloadStateOnMount;
