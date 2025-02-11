"use client";

import React, { useState } from "react";
import { TextField, Button, Box, Typography, CircularProgress, Alert } from "@mui/material";
import { styled } from '@mui/system';


const Background = styled(Box)({
    // background: 'linear-gradient(to right, #f0f0f0, #ffffff)',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
});

const OdooLogin = () => {
    const [isSending, setIsSending] = useState(false);
    const [requestResult, setRequestResult] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const validateEmail = (email) => email.includes("tecnibo");

    const sendRequest = async () => {
        if (isSending) return;

        if (!validateEmail(email)) {
            setErrorMessage("Invalid email. It should contain 'tecnibo'.");
            return;
        }

        setIsSending(true);
        setRequestResult(null);
        setErrorMessage("");

        try {
            const response = await fetch("/api/authenticate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            setRequestResult(data.result ? "Login Successful" : "Login Failed");
        } catch (error) {
            console.error("Error:", error);
            setRequestResult("Request failed. Check console for details.");
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            sendRequest();
        }
    };

    return (
        <Background>
            <Box
                sx={{
                    maxWidth: 400,
                    p: 3,
                    borderRadius: 2,
                    boxShadow: 3,
                    backgroundColor: "white",
                    textAlign: "center",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height:'50px'
                    }}
                >
                    <img src="/odoo.png" alt="Odoo Logo" style={{ width: '100px', marginBottom: '16px' }} />
                    <img
                        src="https://tecnibo.com/web/image/website/6/logo/Tecnibo?unique=4ee68e8"
                        alt="Tecnibo Logo" style={{ width: '100px', marginBottom: '16px' }} />
                </Box>


                {requestResult && (
                    <Alert severity={requestResult.includes("Successful") ? "success" : "error"} sx={{ mb: 2 }}>
                        {requestResult}
                    </Alert>
                )}

                <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    error={Boolean(errorMessage)}
                    helperText={errorMessage}
                />

                <TextField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowPassword(true)}
                    onBlur={() => setShowPassword(false)}
                    onKeyPress={handleKeyPress}
                    fullWidth
                    margin="normal"
                    required
                />

                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={sendRequest}
                    disabled={isSending}
                    sx={{ mt: 2 }}
                >
                    {isSending ? <CircularProgress size={24} /> : "Login"}
                </Button>
            </Box>
        </Background>
    );
};

export default OdooLogin;