"use client";

import React, { useState } from "react";
import { TextField, Button, Box, Typography, CircularProgress, Alert, IconButton } from "@mui/material";
import { styled } from '@mui/system';
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "@/store";
import { ArrowBack } from "@mui/icons-material";
import { useRouter } from 'next/navigation'; 
import Link from 'next/link';
import Cookies from "js-cookie";


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
    const user = useSelector((state) => state.jsonData.user);
    const router = useRouter();  
    
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
        console.log("data", data);

        if (data.result) {
            // Store session_id in cookies
            Cookies.set("session_id", data.session_id, { expires: 7, secure: true, sameSite: "Strict" });

            // Dispatch user data to Redux
            dispatch(setUser(data.response.result));

            // Redirect after login
            router.push("/");
            setRequestResult("Login Successful");
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
                    InputLabelProps={{ shrink: true }}  // Force label behavior
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
                    InputLabelProps={{ shrink: true }}  // Fix label issue
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
