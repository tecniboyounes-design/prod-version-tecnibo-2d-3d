import * as React from "react";
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { GradientButtonWithTooltip } from "../UI/Button";
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  SkipNext as SkipNextIcon,
  Save as SaveIcon,
  Replay as ReplayIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCurrentStep } from "../../../store";
import { useRouter } from "next/navigation";

const steps = [
  "General",
  "Dimensions",
  "Material",
  "Quincaillerie",
  "Miscellaneous",
];

export default function HorizontalLinearStepper({ activeStep, setActiveStep }) {
  const [skipped, setSkipped] = React.useState(new Set());
  const router  = useRouter();
  const dispatch = useDispatch();

  const isStepOptional = (step) => {
    return step === 1;
  };

  const isStepSkipped = (step) => {
    return skipped.has(step);
  };

  const handleNext = () => {
    let newSkipped = skipped;
    if (isStepSkipped(activeStep)) {
      newSkipped = new Set(newSkipped.values());
      newSkipped.delete(activeStep);
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkipped(newSkipped);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSkip = () => {
    if (!isStepOptional(activeStep)) {
      // You probably want to guard against something like this,
      // it should never occur unless someone's actively trying to break something.
      throw new Error("You can't skip a step that isn't optional.");
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkipped((prevSkipped) => {
      const newSkipped = new Set(prevSkipped.values());
      newSkipped.add(activeStep);
      return newSkipped;
    });
  };

  const handleReset = () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset and go back to the first step?"
    );
    if (confirmReset) {
      setActiveStep(0);
    }
  };

  const handleSave = () => {
    console.log('oki got it save:');
    router.push('/');
    dispatch(setCurrentStep(0));
    // collect data from global state
    //send the data to server 
    // apply changes to the specific Articles

  };



  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgb(240, 240, 240)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          width: "70%",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <Stepper
          activeStep={activeStep}
          sx={{
            width: "100%",
            "& .MuiStep-root": {
              flexGrow: 1,
            },
            "& .MuiStepLabel-label": {
              textAlign: "center",
            },
          }}
        >
          {steps.map((label, index) => {
            const stepProps = {};
            const labelProps = {};

            if (isStepSkipped(index)) {
              stepProps.completed = false;
            }

            return (
              <Step key={label} {...stepProps}>
                <StepLabel
                  sx={{
                    "& .MuiStepLabel-iconContainer svg circle": {
                      fill: activeStep === index ? "rgb(250, 13, 13)" : "",
                    },
                    "& .MuiStepLabel-iconContainer svg .MuiStepIcon-text": {
                      fill: "white",
                    },
                  }}
                  {...labelProps}
                >
                  {label}
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>
      </Box>

      {activeStep === steps.length ? (
        <React.Fragment>
          <Typography sx={{ mt: 2, mb: 1 }}>
            All steps completed - you&apos;re finished
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              pt: 2,
              justifyContent: "center",
              gap: 3,
              marginRight: "8px",
            }}
          >
            <GradientButtonWithTooltip
              text="Reset"
              tooltipText="Reset the steps and start over"
              onClick={handleReset}
              icon={<ReplayIcon />}
            />
          </Box>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              pt: 2,
              gap: isStepOptional(activeStep) ? 2 : 3,
              justifyContent: "center",
              alignItems: "center",
              marginRight: "1%",
            }}
          >
            <GradientButtonWithTooltip
              text="Back"
              onClick={handleBack}
              tooltipText="Go to the previous step"
              icon={<ArrowBackIcon />}
              styles={{
                visibility: activeStep === 0 ? "hidden" : "visible",
              }}
            />
            {isStepOptional(activeStep) && (
              <GradientButtonWithTooltip
                text="Skip"
                tooltipText="Skip this step"
                onClick={handleSkip}
                icon={<SkipNextIcon />}
              />
            )}
            <GradientButtonWithTooltip
              text={activeStep === steps.length - 1 ? "Save" : "Next"}
              tooltipText={
                activeStep === steps.length - 1
                  ? "Save your progress"
                  : "Go to the next step"
              }
              onClick={
                activeStep === steps.length - 1 ? handleSave : handleNext
              }
              icon={
                activeStep === steps.length - 1 ? (
                  <SaveIcon />
                ) : (
                  <ArrowForwardIcon />
                )
              }
            />
          </Box>
        </React.Fragment>
      )}
    </Box>
  );


}
