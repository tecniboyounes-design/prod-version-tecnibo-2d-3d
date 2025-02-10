import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { InputWithLabel, MultiInputRow, TitleWithDivider } from "./DimensionsMenu";

export const MiscellaneousMenu = () => {
    const [topType, setTopType] = useState("None");
    const [bottomType, setBottomType] = useState("None");

    return (
        <Box
            sx={{
                padding: 5,
                width: "100%",
                margin: "0 auto",
                height: "100%",
                overflowY: "auto",
            }}
        >
            <Typography
                variant="h6"
                gutterBottom
                fontWeight="bold"
                sx={{ fontSize: "1rem" }}
            >
                Miscellaneous
            </Typography>
            <TitleWithDivider text={"Ventilation"} />

            {/* Top Type Selection */}
            {topType !== "None" ? (
    <MultiInputRow
        labels={{
            dimensionA: "Type",
            dimensionB: "Color",
            dimensionC: "Top distance", // Keep this as 'Top distance'
        }}
        minMax={{
            dimensionA: { min: 700, max: 1300 },
            dimensionB: { min: 561.8, max: 1161.8 },
        }}
        inputTypes={{
            dimensionA: "select",
            dimensionB: "select",
            dimensionC: "number",
        }}
        options={{
            dimensionA: ["None", "Renson 461AK Silendo"],
            dimensionB: ["alu anodisé", "RAL 8019", "RAL 9010"],
            dimensionC: [300], // Default value for Top distance
        }}
    />
) : (
    <InputWithLabel
        label="Top"
        inputType="select"
        inputProps={{
            value: topType,
            onChange: (e) => setTopType(e.target.value),
        }}
        selectOptions={["None", "Renson 461AK Silendo"]}
    />
)}

{bottomType !== "None" ? (
    <MultiInputRow
        labels={{
            dimensionA: "Type",
            dimensionB: "Color",
            dimensionC: "Bottom distance", 
        }}
        minMax={{
            dimensionA: { min: 700, max: 1300 },
            dimensionB: { min: 561.8, max: 1161.8 },
        }}
        inputTypes={{
            dimensionA: "select",
            dimensionB: "select",
            dimensionC: "number",
        }}
        options={{
            dimensionA: ["None", "Renson 461AK Silendo"],
            dimensionB: ["alu anodisé", "RAL 8019", "RAL 9010"],
            dimensionC: [300], 
        }}
    />
) : (
    <InputWithLabel
        label="Bottom"
        inputType="select"
        inputProps={{
            value: bottomType,
            onChange: (e) => setBottomType(e.target.value),
        }}
        selectOptions={["None", "Renson 461AK Silendo"]}
    />
)}


            <TitleWithDivider />
        </Box>
    );
};
