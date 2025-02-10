"use client"

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { pushArticles, setDragging } from "@/store";


export const Droppable = ({ onDrop, children }) => {
  const [isOver, setIsOver] = useState(false);
  const isDragging = useSelector((state) => state.jsonData.isDragging);
  const dispatch = useDispatch();
  
  const handleDragEnter = (e) => {
    e.preventDefault();
    // console.log("DragEnter : Item is entering the drop zone.");
    setIsOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // console.log("Drag Leave: Item is leaving the drop zone.");
    setIsOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    // console.log("Drag Over: Item is over the drop zone.");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    
    // console.log("Drop Event Triggered!");

    const draggedItemData = e.dataTransfer.getData("application/item");
    
    if (!draggedItemData) {
      console.error("No data received in drop event!");
      return;
    }
 
    const draggedItem = JSON.parse(draggedItemData);
    // console.log("Dropped Item Data:", draggedItem);

    // Ensure Redux Dispatch is actually called
    dispatch(pushArticles(draggedItem));
    dispatch(setDragging(false));
    // console.log("Dispatch Called: Item sent to Redux Store.");

    if (onDrop) onDrop(e, draggedItem);
  };

  // Style changes when dragging
  const dragStyle = isDragging
    ? {
        backgroundColor: "#d1e7fd",
        transform: "scale(1.05)", 
        border: "2px dashed #007bff",
        transition: "all 0.2s ease",
      }
    : {};

  // Style when hovering over the drop zone
  const hoverStyle = isOver
    ? {
        backgroundColor: "#e0e0e0", 
        transition: "background-color 0.2s ease",
      }
    : {};

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        flexDirection:'column',
        // background:'red',
        border: "2px dashed #888", 
        ...dragStyle, 
        ...hoverStyle,
      }}
    >
      {children}
    </div>
  );
};

