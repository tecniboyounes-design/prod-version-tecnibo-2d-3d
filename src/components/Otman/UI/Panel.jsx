"use client";
import React, { useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

const resizeHandleStyle = {
  width: "10px",
  backgroundImage:
    "linear-gradient(95deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)",
  cursor: "ew-resize",
  transition: "background 0.4s ease, transform 0.4s ease",
  animation: "pulse 2s infinite",
};

const resizeHandleHoverStyle = {
  backgroundImage:
    "linear-gradient(95deg, rgb(138,35,135) 0%, rgb(233,64,87) 50%, rgb(242,113,33) 100%)",
  transform: "scaleX(1.5)",
};

export const CustomPanel = ({ isPanelVisible, children, panelContent }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [leftPanelSize, setLeftPanelSize] = useState(30);
// 
  const handleResize = (sizes) => {
//     console.log("Panel sizes 1 :", sizes[1]);
    // if (sizes[1] < 30) {
    //   sizes[1] = 0;
    // } else if (sizes[1] === 60) {
    //   sizes[1] = 99.5;
    // }
  };

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
      <PanelGroup direction="horizontal" onLayout={handleResize}>
        <Panel 
        // defaultSize={leftPanelSize}
        >{children}</Panel>

        {isPanelVisible && (
          <>
            <PanelResizeHandle
              style={{
                ...resizeHandleStyle,
                ...(isHovered || isSwapping ? resizeHandleHoverStyle : {}),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => !isSwapping && setIsHovered(false)}
              onMouseDown={() => setIsSwapping(true)}
              onMouseUp={() => setIsSwapping(false)}
            >
              <DragIndicatorIcon
                style={{
                  color: isHovered || isSwapping ? "white" : "white",
                  fontSize: isHovered || isSwapping ? "25px" : "20px",
                  transition: "color 0.3s ease, font-size 0.3s ease",
                }}
              />
            </PanelResizeHandle>

            <Panel defaultSize={leftPanelSize}>{panelContent}</Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
};
