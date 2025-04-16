'use client'; // Explicitly mark this as a Client Component

import React, { useState } from 'react';
import axios from 'axios';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';


  
const FetchOdooButton = () => {
  // State to hold the response data
  const [responseData, setResponseData] = useState(null);

  
  // Function to fetch data from Odoo API
const fetchOdooData = async () => {
    try {

      const sessionId = '4df991ca5e9041c58510381ef0f87fc74f73870e';
      // Send request to the backend

      const response = await axios.post('/api/createPurchase', { session_id: sessionId } );
      setResponseData(response.data);

      console.log('Odoo Response:', response.data);

    } catch (error) {
      console.error('Error fetching Odoo data:', error);
    }
};


  return (
    <div>
      <Button
        variant="contained"
        color="primary"
        onClick={fetchOdooData} 
      >
        Fetch Odoo Data
      </Button>
    
      {/* Display the response data */}
      {responseData && (
        <div>
          <Typography variant="h6" gutterBottom>
            Odoo Response Data:
          </Typography>
          <Typography variant="body1">
            {JSON.stringify(responseData, null, 2)} 
          </Typography>
        </div>
      )}
    </div>
  );
};

export default FetchOdooButton;
