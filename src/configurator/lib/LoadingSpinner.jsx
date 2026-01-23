"use client";

import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

export default function LoadingSpinner() {
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <CircularProgress size={60} thickness={5} />
      <Typography variant="body2" color="text.secondary">
        Loading, please wait...
      </Typography>
    </Box>
  );
}
