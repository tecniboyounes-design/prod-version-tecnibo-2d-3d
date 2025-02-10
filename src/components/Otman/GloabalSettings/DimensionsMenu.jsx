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
    FormHelperText,
    InputLabel,
} from "@mui/material";
import { useState } from "react";



export const TitleWithDivider = ({ text, textStyles = {}, dividerStyles = {}, DividerColor = "red", dividerHeight = "1px" }) => {
    return (
        <>
            <Divider
                sx={{
                    borderColor: DividerColor,
                    borderWidth: dividerHeight,
                    marginTop: "12px",
                    marginBottom: "12px",
                    ...dividerStyles,
                }}
            />
            <Typography
                variant="strong"
                sx={{ fontSize: "0.8rem", fontWeight: "bold", ...textStyles }}
            >
                {text}
            </Typography>
        </>
    );
};





export const InputWithLabel = ({
    label,
    inputType = "text",
    inputProps = {},
    labelStyles = {},
    containerStyles = {},
    textFieldStyles = {},
    selectOptions = [],
}) => {
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: inputType === "checkbox" ? "flex-start" : "space-between",
                gap: 2,
                mt: 2,
                ...containerStyles,
            }}
        >
            {inputType === "checkbox" ? (
                <FormControlLabel
                    control={
                        <Checkbox
                            {...inputProps}
                            sx={{
                                "& .MuiSvgIcon-root": { fontSize: 20 },
                            }}
                        />
                    }
                    label={label}
                    sx={{
                        fontSize: "0.85rem",
                        ...labelStyles,
                    }}
                />
            ) : (
                <>
                    <Typography sx={{ flex: 1, fontSize: "0.85rem", ...labelStyles }}>
                        {label}
                    </Typography>
                    <FormControl fullWidth sx={{ flex: 3 }}>
                        {inputType === "select" ? (
                            <Select
                                variant="outlined"
                                fullWidth
                                sx={{
                                    height: "35px",
                                    fontSize: "0.85rem",
                                    ...textFieldStyles,
                                }}
                                {...inputProps}
                            >
                                {selectOptions.map((option, index) => (
                                    <MenuItem key={index} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </Select>
                        ) : (
                            <TextField
                                type={inputType}
                                variant="outlined"
                                fullWidth
                                sx={{
                                    "& .MuiInputBase-root": {
                                        height: "35px",
                                        fontSize: "0.85rem",
                                        ...textFieldStyles,
                                    },
                                }}
                                {...inputProps}
                            />
                        )}
                    </FormControl>
                </>
            )}
        </Box>
    );
};








export const MultiInputRow = ({
    labels = {},
    minMax = {},
    initialValues = {},
    inputTypes = {},
    options = {},
}) => {
    const [values, setValues] = useState(
        Object.keys(labels).reduce((acc, key) => ({
            ...acc,
            [key]: initialValues[key] || "",
        }), {})
    );

    const handleChange = (field) => (event) => {
        const inputValue = event.target.value;
        setValues((prev) => ({
            ...prev,
            [field]: inputValue === "" ? "" : Number(inputValue),
        }));
    };

    return (
        <Box
            sx={{
                display: "flex",
                alignItems:'center',
                justifyContent: "space-between",
                gap: 2,
                width: "100%",
                mt: 2,
            }}
        >
            {Object.keys(labels).map((field) => {
                const inputType = inputTypes[field] || "number"; // Default to number if no type specified
                const value = values[field];

                const labelText = labels[field] || field;
                const labelFontSize = labelText.length > 10 ? "0.65rem" : "0.85rem"; 

                return (
                    <Box key={field} sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: labelFontSize, mb: 1 }}>
                            {labelText}
                        </Typography>

                        {inputType === "select" ? (
                            <FormControl fullWidth error={value !== "" && (value < (minMax[field]?.min || 0) || value > (minMax[field]?.max || Infinity))}>
                                {/* <InputLabel>{labelText}</InputLabel> */}
                                <Select
                                    value={value}
                                    onChange={handleChange(field)}
                                    label={labelText}
                                    sx={{
                                        height: "30px",
                                        "& .MuiSelect-select": {
                                            paddingTop: "6px", 
                                            paddingBottom: "6px",
                                        },
                                    }}
                                >
                                    {options[field]?.map((option, index) => (
                                        <MenuItem key={index} value={option}>
                                            {option}
                                        </MenuItem>
                                    ))}
                                </Select>

                                <FormHelperText>
                                    {value === ""
                                        ? "Please select a value"
                                        : value < (minMax[field]?.min || 0)
                                            ? `Value must be at least ${minMax[field]?.min}mm`
                                            : value > (minMax[field]?.max || Infinity)
                                                ? `Value must be less than ${minMax[field]?.max}mm`
                                                : ""}
                                </FormHelperText>
                            </FormControl>
                        ) : (
                            <TextField
                                type={inputType}
                                value={value}
                                onChange={handleChange(field)}
                                variant="outlined"
                                fullWidth
                                error={value !== "" && (value < (minMax[field]?.min || 0) || value > (minMax[field]?.max || Infinity))}
                                helperText={
                                    value === ""
                                        ? "Please enter a value"
                                        : value < (minMax[field]?.min || 0)
                                            ? `Value must be at least ${minMax[field]?.min}mm`
                                            : value > (minMax[field]?.max || Infinity)
                                                ? `Value must be less than ${minMax[field]?.max}mm`
                                                : ""
                                }
                                sx={{
                                    "& .MuiInputBase-root": {
                                        height: "35px",
                                        fontSize: "0.85rem",
                                    },
                                }}
                            />
                        )}
                    </Box>
                );
            })}
        </Box>
    );
};












export const DimensionsMenu = () => {

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
                    Dimensions
                </Typography>


                <TitleWithDivider text={"HSP/FreeWay Height"} />








                <MultiInputRow
                    labels={{
                        dimensionA: "Floor-Ceiling Height",
                        dimensionB: "FreeWay Height",
                    }}
                    minMax={{
                        dimensionA: { min: 700, max: 1300 },
                        dimensionB: { min: 561.8, max: 1161.8 },
                    }}
                />




                <TitleWithDivider text={"Door FreeWay/Width"} />

                <InputWithLabel
                    label="Dimension type"
                    inputType="select"
                    selectOptions={["Door Width", "Door Freeway"]}
                />

                <MultiInputRow
                    labels={{
                        dimensionA: "Door Width (Dimension Frame Exterior)",
                        dimensionB: "Door FreeWay",
                    }}
                    minMax={{
                        dimensionA: { min: 700, max: 1300 },
                        dimensionB: { min: 561.8, max: 1161.8 },
                    }}
                />

                <TitleWithDivider text={"Gap"} />

                <InputWithLabel
                    label="Top gap"
                    inputType="select"
                    selectOptions={[30, 20, 50]}
                />

                <InputWithLabel
                    label="Right gap"
                    inputType="select"
                    selectOptions={[0, 1, 3, 2]}
                />

                <InputWithLabel
                    label="Left gap"
                    inputType="select"
                    selectOptions={[0, 1, 3, 2]}
                />




            </Box>

        </>
    )
}