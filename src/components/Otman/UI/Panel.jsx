"use client"
import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';


const resizeHandleStyle = {
    width: '10px',
    backgroundImage: 'linear-gradient(95deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
    cursor: 'ew-resize',
    transition: 'background 0.4s ease, transform 0.4s ease',
    animation: 'pulse 2s infinite',
};


const resizeHandleHoverStyle = {
    backgroundImage: 'linear-gradient(95deg, rgb(138,35,135) 0%, rgb(233,64,87) 50%, rgb(242,113,33) 100%)',
    transform: 'scaleX(1.5)',
};


export const CustomPanel = ({ isPanelVisible, children, panelContent }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isSwapping, setIsSwapping] = useState(false);
    
    const handleSwapStart = () => {
        setIsSwapping(true);
        setIsHovered(true);
    };

    const handleSwapEnd = () => {
        setIsSwapping(false);
        setIsHovered(false);
    };


    return (
        <div style={{ display: 'flex', height: '100%', width: '100%', overflow:'hidden'}}
            onMouseDown={handleSwapStart}
            onMouseUp={handleSwapEnd}
            onMouseLeave={handleSwapEnd}
        >
            <PanelGroup direction="horizontal">
                <Panel defaultSize={30}>
                    {children}
                </Panel>

                {isPanelVisible && (
                    <>

                        <PanelResizeHandle
                            style={{
                                ...resizeHandleStyle,
                                ...(isHovered || isSwapping ? resizeHandleHoverStyle : {}),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => !isSwapping && setIsHovered(false)}
                            onMouseDown={() => setIsSwapping(true)}
                            onMouseUp={() => setIsSwapping(false)}
                        >
                            <DragIndicatorIcon
                                style={{
                                    color: isHovered || isSwapping ? 'white' : 'white',
                                    fontSize: isHovered || isSwapping ? '25px' : '20px',
                                    transition: 'color 0.3s ease, font-size 0.3s ease',
                                }}
                            />
                        </PanelResizeHandle>

                        <Panel defaultSize={30}> {panelContent}</Panel>
                    </>
                )}
            </PanelGroup>
        </div>
    );
};





