"use client"; 

import Projects from "@/components/Otman/UI/MyProjects";
import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { Box, createTheme, styled } from "@mui/material";
import CircularWithValueLabel from "@/components/Otman/Headers/Header";
import CustomizedSteppers from "@/components/Otman/Headers/Header";
import { useSelector } from "react-redux";
import  { RoomShape } from "@/components/Otman/RoomShape/roomShape";
import  WallsStep  from "@/components/Otman/UI/WallsStep";
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
          <CustomizedSteppers />
          <Suspense
            fallback={
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100vh",
                  width: "100%",
                  position: "absolute",
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                }}
              >
                <CircularWithValueLabel />
              </Box>
            }
          >
            {currentStep === 0 && <RoomShape />}
            {currentStep === 1 && <WallsStep />}
            {currentStep === 2 && <h2>Step 3</h2>}
            {currentStep === 3 && <h2>Step 4</h2>}
            {currentStep === 4 && <h2>Step 5</h2>}
            {currentStep === 6 && <h2>Step 7</h2>}

          </Suspense>
        </AppContainer>
      )}
 
    </>
  );
};

export default Page;
