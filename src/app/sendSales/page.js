"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux"; // Assuming Redux is used to store the user data
import {
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  Button,
} from "@mui/material";
import axios from "axios"; // You can use axios or another method to send the data
import { generateUniqueProjectNumber } from "@/data/models";

const UserDetailsComponent = () => {
  // Get the user object from the global state using Redux
  const user = useSelector((state) => state.jsonData.user); 
  // console.log('user', user);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  

  const projectData = {
    ...user,
    title: "New Office Design",
    project_number: generateUniqueProjectNumber(),
    description: "Interior design project for a new office space.",
    db: user?.db,
    managers: [
        {
            oddo_id:230,
            name: "Otman",
            email: "o.abidlmerabetine@tecnibo.eu",
            partner_id: null,
            company_id: 11,
        }
    ],
    user_id: user.uid || 447
};

  // Function to send project data
  const sendProjectData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("/api/projects", projectData);
      console.log("Project data sent successfully", response.data);
    } catch (error) {
      console.error("Error sending project data", error);
      setError("Error sending project data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      sendProjectData();
    }
  }, [user]);

  
  // If user data isn't available yet
  if (!user) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      marginTop={4}
    >
      <Card sx={{ width: 300 }}>
        <CardContent>
          <Typography variant="h5" component="div" gutterBottom>
            User Details
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Name:</strong> {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Email:</strong> {user.username}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Company ID:</strong>{" "}
            {user.user_companies?.current_company || "N/A"}
          </Typography>
        
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={sendProjectData}
            disabled={loading}
          >
            {loading ? "Sending Data..." : "Send Project Data"}
          </Button>

          {error && (
            <Typography color="error" variant="body2" marginTop={2}>
              {error}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserDetailsComponent;
