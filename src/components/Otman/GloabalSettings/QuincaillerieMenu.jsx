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
import { useState } from "react";
import { InputWithLabel, MultiInputRow, TitleWithDivider } from "./DimensionsMenu";


export const QuincaillerieMenu = () => {
    const [someState, setSomeState] = useState(true);
    const [handleType, setHandleType] = useState("Tonic Line TL3106");
    const [color, setColor] = useState("INOX");
    const [lookType, setLookType] = useState("");
    const [cylinderType, setCylinderType] = useState("");

    const lookTypeOptions = [
        "Cylinder Euro double",
        "Blind Cylinder",
        "Cylinder + Key pass",
        "Electric Lock",
        "Blank",
        "Electric Strike",
        "Electric Strike + Blind Cylinder",
        "Magnetic",
        "Anti Panic B + Cylinder",
        "Anti Panic B + Blind Cylinder",
        "Anti Panic D + Cylinder",
        "Anti Panic D + Blind Cylinder",
        "Anti Panic E + Electric Strike + Cylinder",
        "Anti Panic E + Electric Strike + Blind Cylinder"
    ];

    const cylinderTypeOptions = [
        "Duo Standard",
        "Duo Thumbturn"
    ];



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
                    Quincaillerie
                </Typography>

                <TitleWithDivider text={"Door Closer Global"} />



                <MultiInputRow
                    labels={{
                        dimensionA: "Force de fermeture",
                        dimensionB: "Color",
                        dimensionC: "Stop unit",
                        dimensionD: "Filter",
                    }}
                    minMax={{
                        dimensionA: { min: 700, max: 1300 },
                        dimensionB: { min: 561.8, max: 1161.8 },
                    }}
                    inputTypes={{
                        dimensionA: "select",
                        dimensionB: "select",
                        dimensionC: "select",
                        dimensionD: "select",
                    }}
                    options={{
                        dimensionA: ["None"],
                        dimensionB: ["None"],
                        dimensionC: ["None"],
                        dimensionD: ["None"],
                    }}
                />

                <TitleWithDivider
                    text={"Connectors"}
                    DividerColor="green"
                    dividerHeight="2px"
                />

                <InputWithLabel
                    label="Bottom Gasket"
                    inputType="checkbox"
                    inputProps={{
                        checked: someState,
                        onChange: (e) => setSomeState(e.target.checked),
                    }}
                />

                <TitleWithDivider text={"Handles"} />





                <InputWithLabel
                    label="Handle Type"
                    inputType="select"
                    inputProps={{
                        value: handleType,
                        onChange: (e) => setHandleType(e.target.value),
                    }}
                    selectOptions={["Tonic Line TL3106", "Other Type"]}
                />

                <InputWithLabel
                    label="Color"
                    inputType="select"
                    inputProps={{
                        value: color,
                        onChange: (e) => setColor(e.target.value),
                    }}
                    selectOptions={["INOX", "Other Color"]}
                />

                <TitleWithDivider text={"Locks"} />

                <InputWithLabel
                    label="Look Type"
                    inputType="select"
                    inputProps={{
                        value: lookType,
                        onChange: (e) => setLookType(e.target.value),
                    }}
                    selectOptions={lookTypeOptions}
                />

                <InputWithLabel
                    label="Cylinder Type"
                    inputType="select"
                    inputProps={{
                        value: cylinderType,
                        onChange: (e) => setCylinderType(e.target.value),
                    }}
                    selectOptions={cylinderTypeOptions}
                />


<TitleWithDivider
                    text={""}
                    DividerColor="blue"
                    dividerHeight="2px"
                />

            </Box>
        </>
    )
}