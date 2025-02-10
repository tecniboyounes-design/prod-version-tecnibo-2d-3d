"use client"

import React, { Suspense, useState } from "react";
import HorizontalLinearStepper from "../Headers/GlobalSettingsAppBar";
import ProjectInfoBar from "../UI/ProjectInfoBar";
import LinearBuffer from "../UI/LinearBuffer";
import { CustomPanel } from "../UI/Panel";
import { Floor, PreviewArticle, PreviewImage } from "../UI/ItemList";
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
import { ralColors } from "../../../data/models";
import PriceDisplay from "../UI/Price";
import { GeneralMenu } from "./GeneralMenu";
import { DimensionsMenu } from "./DimensionsMenu";
import { MaterialMenu } from "./MaterialMenu";
import { QuincaillerieMenu } from "./QuincaillerieMenu";
import { MiscellaneousMenu } from "./MiscellaneousMenu";
import CircularWithValueLabel from "../UI/CircularWithValueLabel";
import { Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

const Menu = ({ menuType }) => {
  const renderMenu = () => {
    switch (menuType) {
      case "general":
        return <GeneralMenu />;
      case "dimensions":
        return <DimensionsMenu />;
      case "material":
        return <MaterialMenu />;
      case "quincaillerie":
        return <QuincaillerieMenu />;
      case "miscellaneous":
        return <MiscellaneousMenu />;
      default:
        return <GeneralMenu />;
    }
  };

  return (
    <div
      style={{
        background: "#e1e1e1",
        height: "100%",
      }}
    >
      {renderMenu()}
    </div>
  );
};

const GlobalSettings = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [menuType, setMenuType] = useState("general");

  React.useEffect(() => {
    const stepToMenuMap = [
      "general",
      "dimensions",
      "material",
      "quincaillerie",
      "miscellaneous",
    ];
    setMenuType(stepToMenuMap[activeStep]);
  }, [activeStep]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <ProjectInfoBar />
      <HorizontalLinearStepper
        activeStep={activeStep}
        setActiveStep={setActiveStep}
      />
      
      <LinearBuffer />

      <CustomPanel
        isPanelVisible={true}
        panelContent={<Menu menuType={menuType} />}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          performance={{ min: 0.1, max: 1 }} 
          gl={{ antialias: true }}
          frameloop="demand"
        >
          <Suspense
            fallback={
              <Html center>
                <CircularWithValueLabel />
              </Html>
            }
          >
            <PreviewArticle />
          </Suspense>
        </Canvas>
      </CustomPanel>

    </div>
  );
};

export default GlobalSettings;
