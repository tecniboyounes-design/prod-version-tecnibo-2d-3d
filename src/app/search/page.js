"use client";

import { useState } from "react";
import { Button, CircularProgress, TextField, Typography, Paper } from "@mui/material";
import axios from "axios";

export default function FetchProjectsButton() {
    const [loading, setLoading] = useState(false);
    const [projectName, setProjectName] = useState(""); // State for the project name
    const [reference, setReference] = useState(""); // State for the reference
    const [responseData, setResponseData] = useState(null); // State to store the API response

    // Handle input change for project name
    const handleProjectNameChange = (e) => {
        setProjectName(e.target.value);
    };

    // Handle input change for reference
    const handleReferenceChange = (e) => {
        setReference(e.target.value);
    };

    // Function to fetch projects based on project name and reference
    async function fetchProjects() {
        setLoading(true);
        try {
            // Send both projectName and reference to the API
            const response = await axios.post('/api/searchProject', { projectName, reference });

            const data = response.data; 
            console.log("Fetched Projects:", data);
            
            // Set the response data to the state
            setResponseData(data);
        } catch (error) {
            console.error("Error fetching projects:", error);
            setResponseData({ error: "Error fetching projects" }); // Optional: Add a friendly error message
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {/* Input field for project name */}
            <TextField
                label="Project Name"
                variant="outlined"
                value={projectName}
                onChange={handleProjectNameChange}
                fullWidth
                margin="normal"
            />

            {/* Input field for reference */}
            <TextField
                label="Reference"
                variant="outlined"
                value={reference}
                onChange={handleReferenceChange}
                fullWidth
                margin="normal"
            />

            <Button 
                variant="contained" 
                color="primary" 
                onClick={fetchProjects} 
                disabled={loading || !projectName || !reference} // Disable if no project name or reference is entered or if loading
            >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Fetch Projects"}
            </Button>

            {/* Display response data or an error message */}
            {responseData && (
                <Paper elevation={3} style={{ marginTop: "20px", padding: "20px" }}>
                    <Typography variant="h6">Project Data</Typography>
                    {responseData.error ? (
                        <Typography color="error">{responseData.error}</Typography>
                    ) : (
                        <pre>{JSON.stringify(responseData, null, 2)}</pre>
                    )}
                </Paper>
            )}
        </div>
    );
}
