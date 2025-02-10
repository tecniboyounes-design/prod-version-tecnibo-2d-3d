"use client";

import React, { useState } from "react";
import { TextField, Button, Box, Typography, CircularProgress, Alert } from "@mui/material";

const OdooLogin = () => {
  const [isSending, setIsSending] = useState(false);
  const [requestResult, setRequestResult] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

  return (
    <Box
      sx={{
        maxWidth: 400,
        margin: "auto",
        mt: 8,
        p: 3,
        borderRadius: 2,
        boxShadow: 3,
        backgroundColor: "white",
      }}
    >
      <Typography variant="h5" sx={{ mb: 2, textAlign: "center" }}>
        Odoo Login
      </Typography>

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
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
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
  );
};

export default OdooLogin;
