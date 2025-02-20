"use client";

import Projects from "@/components/Otman/UI/MyProjects";
import { useState } from "react";
import { Box, createTheme, styled } from "@mui/material";
import CircularWithValueLabel from "@/components/Otman/Headers/Header";
import CustomizedSteppers from "@/components/Otman/Headers/Header";
import { useSelector } from "react-redux";
import { RoomShape } from "@/components/Otman/RoomShape/roomShape";
import WallsStep from "@/components/Otman/UI/WallsStep";
import PreloadGLTF from "@/HOC/PreloadGLTF";
import ProtectedRoute from "@/HOC/ProtectedRoute";

const AppContainer = styled("div")({
  display: "flex",
  height: "100vh",
  flexDirection: "column",
  position: "relative",
});

const Page = () => {
  const currentStep = useSelector((state) => state.jsonData.currentStep);
  const user = useSelector((state) => state.jsonData.user);
  console.log('user:', user);
  
  return (
    <>
      <PreloadGLTF />
      {currentStep === null ? (
        <Projects />
      ) : (
        <AppContainer>
          {currentStep === 0 && (
            <>
              <CustomizedSteppers />
              <RoomShape />
            </>
          )}
          {currentStep === 1 && 
          <>
          <CustomizedSteppers />
          <WallsStep />
          </>          
          }

          {currentStep === 2 && <h2>Step 3</h2>}
          {currentStep === 3 && <h2>Step 4</h2>}
          {currentStep === 4 && <h2>Step 5</h2>}
          {currentStep === 6 && <h2>Step 7</h2>}
        </AppContainer>
      )}
    </>
  );
};

export default Page;
