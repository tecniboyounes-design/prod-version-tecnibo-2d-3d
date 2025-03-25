"use client"

import React, { useState } from 'react';
import axios from 'axios';
import { Button, Typography, Box, CircularProgress } from '@mui/material';
import App from './App';

const GetRecordButton = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const handleClick = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/getRecord');  
            setData(response.data);
        } catch (err) {
            setError('Error fetching data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
//         <Box 
//             display="flex" 
//             flexDirection="column" 
//             alignItems="center" 
//             justifyContent="center" 
//             height="100vh"
//         >
//             <Button 
//                 variant="contained" 
//                 color="primary" 
//                 onClick={handleClick} 
//                 disabled={loading} 
//                 sx={{ marginBottom: 2 }}
//             >
//                 {loading ? <CircularProgress size={24} /> : 'Get Record'}
//             </Button>
//             
//             {error && (
//                 <Typography color="error">{error}</Typography>
//             )}
// 
//             {data && (
//                 <Box mt={5} sx={{
//                     height:'100vh'
//                 }} >
//                     <Typography variant="h6" gutterBottom>
//                         Response Data:
//                     </Typography>
//                     <Typography variant="body1" component="pre" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
//                         {JSON.stringify(data, null, 2)}
//                     </Typography>
//                 </Box>
//             )}
//         </Box>
<>
<App />
</>
    );
};

export default GetRecordButton;
