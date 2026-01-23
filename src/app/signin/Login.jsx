"use client";

import React, { useEffect, useState } from "react";
import { TextField, Button, Box, Typography, CircularProgress, Alert, IconButton } from "@mui/material";
import { styled } from '@mui/system';
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "@/store";
import { ArrowBack } from "@mui/icons-material";
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import axios from "axios";


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
    const dispatch = useDispatch();
    

    const validateEmail = (email) => email.includes("tecnibo");

    const sendRequest = async () => {
        if (isSending) return;

        if (!validateEmail(email)) {
            setErrorMessage("Invalid email. It should contain 'tecnibo'.");
            return;
        }
        if (!password) {
            setErrorMessage("Password is required.");
            return;
        }

        setIsSending(true);
        setRequestResult(null);
        setErrorMessage("");

        try {
            const response = await axios.post(
                "/api/authenticate",
                { email, password },
                {
                    headers: { "Content-Type": "application/json" },
                    withCredentials: true,
                }
            );

            const data = response.data;
            console.log("Response Data:", data);

            if (data?.result) {
                if (data.response?.result) {
                    dispatch(setUser(data.response.result));
                }

                setRequestResult("Login Successful. Reloading...");

                // ✅ Hard reload the current page
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                setRequestResult("Login Failed");
            }
        } catch (error) {
            console.error("Error:", error);
            setRequestResult("Request failed. Check console for details.");
        } finally {
            setIsSending(false);
        }
    };

   



    const canSubmit = (validateEmail(email) && !!password && !isSending); 

    const handleSubmit = (e) => {
        e.preventDefault();
        if (canSubmit) sendRequest();
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

                <IconButton sx={{ position: 'absolute', left: 16, top: 16 }}>
                    <Link href="/">
                        <ArrowBack color="secondary" />
                    </Link>
                </IconButton>

                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: '50px',
                    }}
                >
                    <img src="https://tecnibo-2d-3d.vercel.app/odoo.png" alt="Odoo Logo" style={{ width: '100px', marginBottom: '16px' }} />
                    <img
                        src="https://tecnibo.com/web/image/website/6/logo/Tecnibo?unique=4ee68e8"
                        alt="Tecnibo Logo" style={{ width: '100px', marginBottom: '16px' }} />
                </Box>

                {requestResult && (
                    <Alert severity={requestResult.includes("Successful") ? "success" : "error"} sx={{ mb: 2 }}>
                        {requestResult}
                    </Alert>
                )}
                <Box component="form" onSubmit={handleSubmit} noValidate>
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
                        InputLabelProps={{ shrink: true }}
                        autoFocus
                    />

                    <TextField
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                        InputLabelProps={{ shrink: true }}
                    />

                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        type="submit"
                        disabled={!canSubmit}
                        sx={{ mt: 2 }}
                    >
                        {isSending ? <CircularProgress size={24} /> : "Login"}
                    </Button>
                </Box>
            </Box>
        </Background>
    );
};

export default OdooLogin;
