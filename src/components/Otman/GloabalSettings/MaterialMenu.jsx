import React, { useState } from "react";
import HorizontalLinearStepper from "../Headers/GlobalSettingsAppBar";
import ProjectInfoBar from "../UI/ProjectInfoBar";
import LinearBuffer from "../UI/LinearBuffer";
import { CustomPanel } from "../UI/Panel";
import { PreviewArticle } from "../UI/ItemList";
import {
    Grid,
    TextField,
    FormControl,
    Typography,
    Divider,
    Box,
    FormControlLabel,
    Checkbox,
    Select,
    MenuItem,
} from "@mui/material";
import { InputWithLabel, TitleWithDivider } from "./DimensionsMenu";





export const MaterialMenu = () => {
    const [someState, setSomeState] = useState(false);

    return (
        <>

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
                    Material
                </Typography>

                <TitleWithDivider text={"Frame Surface"} />

                <InputWithLabel
                    label="Producer"
                    inputType="select"
                    selectOptions={["Door Width", "Door Freeway"]}
                />

                <InputWithLabel
                    label="Category"
                    inputType="select"
                    selectOptions={["Door Width", "Door Freeway"]}
                />
                <InputWithLabel
                    label="Group"
                    inputType="select"
                    selectOptions={["Door Width", "Door Freeway"]}
                />
                <InputWithLabel
                    label="Surface property"
                    inputType="select"
                    selectOptions={["Door Width", "Door Freeway"]}
                />

                <InputWithLabel
                    label="Surface"
                    inputType="select"
                    selectOptions={["Door Width", "Door Freeway"]}
                />

                <InputWithLabel
                    label="Profile"
                    inputType="select"
                    selectOptions={["Kaindl U60.029 BS 1mm", "Kaindl U60.029 BS 0.3mm", "Kaindl U60.029 BS 0.3mm PE"]}
                    
                />
                <InputWithLabel
                    label="Sides don't have the same surface"
                    inputType="checkbox"
                    inputProps={{
                        checked: someState, // Handle state externally
                        onChange: (e) => setSomeState(e.target.checked),
                    }}
                />

                <InputWithLabel
                    label="Body Doesn't have the same Material"
                    inputType="checkbox"
                    inputProps={{
                        checked: someState, // Handle state externally
                        onChange: (e) => setSomeState(e.target.checked),
                    }}
                />








            </Box>

        </>
    )
}