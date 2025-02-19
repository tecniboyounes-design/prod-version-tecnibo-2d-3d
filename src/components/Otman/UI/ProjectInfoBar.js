"use client"
import {
  AppBar,
  Toolbar,
  Typography,
  Chip,
  Box,
  Grid,
  Paper,
  Button,
  Stack,
  Menu,
  MenuItem,
  IconButton,
  Avatar, AvatarGroup, 
  Tooltip
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import React, { useEffect, useState } from "react";
import ArrowDropUp from "@mui/icons-material/ArrowDropUp";
import ArrowDropDown from "@mui/icons-material/ArrowDropDown";
import { useDispatch, useSelector } from "react-redux";
import { deleteProject, setProjectInfo } from "../../../store";
import { Delete, FileDownload, PictureAsPdf } from "@mui/icons-material";
import LinearBuffer from "./LinearBuffer";
import { PeopleAlt } from "@mui/icons-material";
import { StatusChip } from "@/app/styles/Themes";
import { useRouter } from 'next/router';
import { handleDownloadXML } from "@/actions/filesActions";

const ProjectInfoBar = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const dispatch = useDispatch();
  const selectedProject = useSelector((state) => state.jsonData.project);
  const [anchorEl, setAnchorEl] = useState(null);
  const router = useRouter;
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname); 
    }
  }, []); 


  const handleToggle = (event) => {
    setFilterOpen((prevState) => !prevState);
    setAnchorEl(event.currentTarget);
  };


  const handleStackClick = (e) => {
    dispatch(setProjectInfo(e));
  };

  
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setFilterOpen(false);
  };

  const handleDeleteProject = () => {
    if (selectedProject && selectedProject.id) {
      console.log("Delete Project clicked");

      dispatch(deleteProject({ id: selectedProject.id, type: 'active' }));

      router.push('/');

      handleCloseMenu();
      setFilterOpen(false);
    } else {
      console.error("No selected project to delete");
    }
  };


const handleXML = () => {
  handleDownloadXML()
}
  
  
  

  return (
    <>
      <AppBar
        position="static"
        sx={{
          backgroundColor: "rgb(240, 240, 240)",
          color: "#000",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Toolbar
          sx={{ display: "flex", justifyContent: "space-between", padding: 1 }}
        >
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", flexDirection: "row", alignItems:'center' }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", marginRight: 1 }}
              >
                {selectedProject?.title || selectedProject?.display_name}
              </Typography>
              <StatusChip status={selectedProject?.status || selectedProject?.rating_status  } />
            </Box>



            <Box
              sx={{ display: "flex", flexDirection: "row", marginTop: "2px" }}
            >

<Paper
  sx={{
    padding: 1,
    marginRight: 1,
    backgroundColor: "#f5f5f5", 
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  }}
>
  {/* Icon for better clarity */}
  <PeopleAlt sx={{ fontSize: 18, color: "gray", marginRight: 1 }} />

  <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
    <Typography variant="body2" sx={{ fontSize: "0.75rem", fontWeight: "bold" }}>
      DM Manager{selectedProject?.managers?.length > 1 ? "(s)" : "" }:
    </Typography>

    {/* Display first 3 Avatars, show count if more */}
    <AvatarGroup max={3} sx={{ marginLeft: 1, "& .MuiAvatar-root": { width: 24, height: 24, fontSize: "0.7rem" } }}>
     
    {selectedProject?.managers?.length > 0 ? (
  selectedProject.managers.slice(0, 3).map((manager, index) => (
    <Tooltip key={index} title={manager?.name}>
      <Avatar sx={{ bgcolor: "#1976d2" }}>
        {manager?.name?.charAt(0)}
      </Avatar>
    </Tooltip>
  ))
) : (
  <Tooltip title={selectedProject?.user_id?.display_name}>
    <Avatar sx={{ bgcolor: "#1976d2" }}>
      {selectedProject?.user_id?.display_name?.charAt(0)}
    </Avatar>
  </Tooltip>
)}


    </AvatarGroup>

    {/* Show "+X more" if there are more managers */}
    {selectedProject?.managers?.length > 3 && (
      <Tooltip
        title={selectedProject?.managers?.map((m) => m.name).join(", ")}
        arrow
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: "0.7rem",
            marginLeft: 1,
            color: "gray",
            cursor: "pointer",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          +{selectedProject.managers?.length - 3} more
        </Typography>
      </Tooltip>
    )}
  </Box>


</Paper>


              {/* Project Number */}
              <Paper 
              sx={{ 
                padding: 1, 
                marginRight: 1,
                backgroundColor: "#f5f5f5", 
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                
              }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-end",
                  }}
                >
                 <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
  <strong>Project Number:</strong>{" "}
  {selectedProject?.projectNumber || selectedProject?.display_name?.match(/\[(\d+)\]/)?.[1]}
  </Typography>

                </Box>
              </Paper>

              {/* Created On */}
              <Paper sx={{ 
                padding: 1, 
                marginRight: 1,
                backgroundColor: "#f5f5f5", 
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-end",
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                    <strong>Created On: </strong> 
                    {selectedProject?.date || selectedProject?.createdOn  }
                    </Typography>
                </Box>
              </Paper>

              
            </Box>







          </Box>

          <Stack
            direction="row"
            spacing={0.5}
            justifyContent="flex-end"
            sx={{ marginTop: 1 }}
          >
            <Button
              onClick={() => handleStackClick("project info")}
              sx={{ display: "flex", alignItems: "center", color: "black" }}
            >
              <Typography variant="body2">Project Info</Typography>
            </Button>

            {/* Prices button */}
            <Button
              onClick={() => handleStackClick("prices")}
              sx={{ display: "flex", alignItems: "center", color: "black" }}
            >
              <Typography variant="body2">Prices</Typography>
            </Button>

            {/* Documents button */}
            <Button
              onClick={() => handleStackClick("document")}
              sx={{ display: "flex", alignItems: "center", color: "black" }}
            >
              <Typography variant="body2">Documents</Typography>
            </Button>

            <div>
              {/* Button that triggers the menu */}
              <Button
                onClick={handleToggle}
                sx={{ display: "flex", alignItems: "center", color: "black" }}
              >
                {filterOpen ? <ArrowDropUp /> : <ArrowDropDown />}
                <Typography variant="body2" sx={{ marginLeft: 1 }}>
                  More
                </Typography>
              </Button>

              {/* Menu for "More" options */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "left",
                }}
              >
           <Box sx={{ width: 250, p: 1 }}>  
      {/* Delete Project */}

      <MenuItem onClick={handleDeleteProject}>
        <Typography variant="body2" sx={{ flexGrow: 1 }}>
          Delete Project
        </Typography>
        <IconButton edge="end" color="error">
          <Delete />
        </IconButton>
      </MenuItem>

      {/* Download Order (XML) */}
      <MenuItem 
      onClick={handleXML}
      >
        <Typography variant="body2" sx={{ flexGrow: 1 }}>
          Download Order (XML)
        </Typography>
        <IconButton edge="end" color="primary">
          <FileDownload />
        </IconButton>
      </MenuItem>

      {/* Show Quotes (PDF) */}
      <MenuItem 
      // onClick={handleShowPDF}
      >
        <Typography variant="body2" sx={{ flexGrow: 1 }}>
          Show Quotes (PDF)
        </Typography>
        <IconButton edge="end" color="success">
          <PictureAsPdf />
        </IconButton>
      </MenuItem>
    </Box>


              </Menu>
            </div>
          </Stack>
        </Toolbar>
      </AppBar> 
      {typeof window !== "undefined" && !pathname.includes("/configurator") && <LinearBuffer />}
      
      </>
  );
};

export default ProjectInfoBar;
