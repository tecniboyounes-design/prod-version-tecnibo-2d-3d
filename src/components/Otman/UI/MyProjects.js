"use client";
import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";
import { styled, alpha } from "@mui/material/styles";
import CardActions from "@mui/material/CardActions";
import Collapse from "@mui/material/Collapse";
import { red } from "@mui/material/colors";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  DialogContent,
  ListItemIcon,
  Grid,
  Card,
  CardHeader,
  Avatar,
  IconButton,
  CardMedia,
  CardContent,
  Typography,
  Menu,
  MenuItem,
  Tooltip,
  Dialog,
  DialogActions,
  DialogTitle,
  FormControl,
  TextField,
  InputLabel,
  Select,
  Badge,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import Button from "@mui/material/Button";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import AvatarGroup from "@mui/material/AvatarGroup";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { Person, AccountBox, ExitToApp, Info, Edit } from "@mui/icons-material";
import {
  FileCopy,
  Delete,
  FileDownload,
  Description,
  ArrowDropDown,
  ArrowDropUp,
  ChangeHistory,
  Schedule,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import {
  addProject,
  deleteProject,
  pushProject,
  setCurrentStep,
  updateProjectStatus,
} from "../../../store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountCircle from "@mui/icons-material/AccountCircle";
import {
  ExpandMore,
  getGradientColor,
  NewProjectButton,
  Search,
  SearchIconWrapper,
  StatusChip,
  StyledInputBase,
} from "../../../app/styles/Themes";
import { v4 as uuidv4 } from "uuid";
import { generateUniqueProjectNumber } from "../../../data/models";
import axios from "axios";
import { Canvas } from "@react-three/fiber";
import CircularWithValueLabel from "./CircularWithValueLabel";
import { createProject } from "@/actions/createProjectActions";
const Points = lazy(() => import("../Points/Points"));

const Projects = () => {
  const [resultOfFilter, setResultOfFilter] = useState([]);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [open, setOpen] = useState(false);
  const [onClose, setOnClose] = useState(false);
  const projectsData = useSelector((state) => state.jsonData.projects);
  const navigate = useRouter();

  function SearchAppBar({ searchQuery, handleSearchChange, projectsData }) {
    const dispatch = useDispatch();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const isMenuOpen = Boolean(anchorEl);
    const navigate = useRouter();

    const handleProfileMenuOpen = (event) => {
      setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
      setAnchorEl(null);
    };

    const toggleFilterBar = () => {
      setFilterOpen((prev) => !prev);
    };

    const handleMenuItemClick = () => {
      handleMenuClose(); 
      navigate.push("/signin"); 
    };

    return (
      <Box sx={{ flexGrow: 1 }}>
        <AppBar
          position="static"
          sx={{
            backgroundColor: "#f8f9fa",
            color: "#000",
          }}
        >
          <Toolbar
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <img
                src="https://tecnibo.com/web/image/website/6/logo/Tecnibo?unique=4ee68e8"
                alt="Tecnibo Logo"
                style={{
                  maxHeight: "40px",
                  width: "auto",
                  cursor: "pointer",
                }}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <IconButton
                aria-label="Filter"
                color="inherit"
                onClick={toggleFilterBar}
              >
                <FilterAltIcon />
                {filterOpen ? <ArrowDropUp /> : <ArrowDropDown />}
              </IconButton>

              <Search
                sx={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#fff",
                  padding: "0 8px",
                  width: "250px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <SearchIconWrapper
                  sx={{
                    color: "#888",
                  }}
                >
                  <SearchIcon />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  inputProps={{ "aria-label": "search" }}
                  sx={{
                    color: "#333", // Darker text for better contrast
                    width: "100%",
                  }}
                />
              </Search>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <NewProjectButton
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpen}
                >
                  New Project
                </NewProjectButton>

                <MenuItem onClick={handleProfileMenuOpen}>
                  <IconButton
                    size="large"
                    aria-label="account of current user"
                    aria-controls="primary-search-account-menu"
                    aria-haspopup="true"
                    color="inherit"
                  >
                    <AccountCircle />
                  </IconButton>
                  <p>Profile</p>
                </MenuItem>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        <FilterBar
          open={filterOpen}
          projectsData={projectsData}
          realProjectData={projectsData}
        />

        <Menu
          anchorEl={anchorEl}
          open={isMenuOpen}
          onClose={handleMenuClose}
          MenuListProps={{
            "aria-labelledby": "primary-search-account-menu",
          }}
        >
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <AccountBox fontSize="small" />
            </ListItemIcon>
            My Account
          </MenuItem>
          <MenuItem onClick={handleMenuItemClick}>
            <ListItemIcon>
              <ExitToApp fontSize="small" />
            </ListItemIcon>
            Login
          </MenuItem>
        </Menu>
      </Box>
    );
  }

  function FilterBar({ open, projectsData, realProjectData }) {
    const handleSortChange = (event) => {
      setSortOption(event.target.value);
    };

    const handleFilterChange = (event, setState) => {
      setState(event.target.value);
    };

    const handleApplyFilters = () => {
      setFilterOpen(true);
    };

    if (!open) return null;

    return (
      <Box>
        <AppBar
          position="static"
          sx={{
            backgroundColor: "#ffffff",
            color: "#000",
            boxShadow: "none",
            borderTop: "1px solid #ddd",
            borderBottom: "1px solid #ddd",
            padding: "10px 16px",
          }}
        >
          <Toolbar
            sx={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel id="status-filter-label">Filter by status</InputLabel>
              <Select
                labelId="status-filter-label"
                id="status-filter"
                label="Filter by status"
                value={status}
                onChange={(e) => handleFilterChange(e, setStatus)}
              >
                {/* Temp Status */}
                <MenuItem value="temp" sx={{ position: "relative" }}>
                  Temp
                  <Badge
                    badgeContent={
                      projectsData.filter(
                        (project) => project.status === "temp"
                      ).length
                    }
                    color="secondary"
                    sx={{ position: "absolute", right: 35 }}
                  />
                </MenuItem>

                {/* Ordered Status */}
                <MenuItem value="ordered" sx={{ position: "relative" }}>
                  Ordered
                  <Badge
                    badgeContent={
                      projectsData.filter(
                        (project) => project.status === "ordered"
                      ).length
                    }
                    color="secondary"
                    sx={{ position: "absolute", right: 35 }}
                  />
                </MenuItem>

                {/* In Planning Status */}
                <MenuItem value="in planning" sx={{ position: "relative" }}>
                  In Planning
                  <Badge
                    badgeContent={
                      projectsData.filter(
                        (project) => project.status === "in planning"
                      ).length
                    }
                    color="secondary"
                    sx={{ position: "absolute", right: 35 }}
                  />
                </MenuItem>

                {/* In Working Status */}
                <MenuItem value="in working" sx={{ position: "relative" }}>
                  In Working
                  <Badge
                    badgeContent={
                      projectsData.filter(
                        (project) => project.status === "in working"
                      ).length
                    }
                    color="secondary"
                    sx={{ position: "absolute", right: 35 }}
                  />
                </MenuItem>

                {/* Finished Status */}
                <MenuItem value="finished" sx={{ position: "relative" }}>
                  Finished
                  <Badge
                    badgeContent={
                      projectsData.filter(
                        (project) => project.status === "finished"
                      ).length
                    }
                    color="secondary"
                    sx={{ position: "absolute", right: 35 }}
                  />
                </MenuItem>

                {/* All Status (always shows total count of projects) */}
                <MenuItem value="all" sx={{ position: "relative" }}>
                  All
                  <Badge
                    badgeContent={realProjectData.length}
                    color="secondary"
                    sx={{ position: "absolute", right: 35 }}
                  />
                </MenuItem>
              </Select>
            </FormControl>

            {/* Creation Date From */}
            <TextField
              id="creation-date-from"
              label="Creation date from"
              type="date"
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: 200 }}
              value={dateFrom}
              onChange={(e) => handleFilterChange(e, setDateFrom)}
            />

            {/* Creation Date To */}
            <TextField
              id="creation-date-to"
              label="Creation date to"
              type="date"
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: 200 }}
              value={dateTo}
              onChange={(e) => handleFilterChange(e, setDateTo)}
            />

            {/* Search for Customer Number */}
            <TextField
              id="customer-number"
              label="Search for customer number"
              variant="outlined"
              size="small"
              sx={{ minWidth: 200 }}
              value={customerNumber}
              onChange={(e) => handleFilterChange(e, setCustomerNumber)}
            />

            {/* Sort by */}
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel id="sort-by-label">Sort by</InputLabel>
              <Select
                labelId="sort-by-label"
                id="sort-by"
                value={sortOption}
                label="Sort by"
                onChange={handleSortChange}
              >
                <MenuItem value="creation-date-desc">
                  Creation date descending
                </MenuItem>
                <MenuItem value="creation-date-asc">
                  Creation date ascending
                </MenuItem>
                <MenuItem value="last-change-desc">
                  Last change descending
                </MenuItem>
                <MenuItem value="title-asc">Title ascending</MenuItem>
                <MenuItem value="project-number-asc">
                  Project number ascending
                </MenuItem>
                <MenuItem value="price-desc">Price descending</MenuItem>
                <MenuItem value="status-desc">Status descending</MenuItem>
                <MenuItem value="status-asc">Status ascending</MenuItem>
              </Select>
            </FormControl>

            {/* Apply Filters Button */}
            {/* <Button
          variant="contained"
          color="primary"
          sx={{ height: "40px", alignSelf: "center" }}
          onClick={handleApplyFilters}
                  >
          Apply Filters
        </Button> */}
          </Toolbar>
        </AppBar>
      </Box>
    );
  }

  function ResponsiveCardGrid() {
    const [expanded, setExpanded] = React.useState(null);
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [selectedProject, setSelectedProject] = React.useState({});
    const [searchQuery, setSearchQuery] = React.useState("");
    const [openDialog, setOpenDialog] = React.useState(false);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [dataToSearch, setDataToSearch] = useState([]);
    const dispatch = useDispatch();
    const router = useRouter();

    const [selectedProjectForDeletion, setSelectedProjectForDeletion] =
      useState(null);

    const handleMenuItemClick = (action, project) => {
      if (action === "Copy Project") {
        dispatch(addProject(project));
      } else if (action === "Delete Project") {
        setSelectedProjectForDeletion(project);
        setOpenDialog(true);
      } else if (action === "Increase status") {
        const statusWorkflow = [
          "ordered",
          "in planning",
          "in working",
          "finished",
        ];
        const currentIndex = statusWorkflow.indexOf(project.status);

        if (currentIndex !== -1 && currentIndex < statusWorkflow.length - 1) {
          const nextStatus = statusWorkflow[currentIndex + 1];

          dispatch(updateProjectStatus({ id: project.id, status: nextStatus }));
        }
      } else {
        handleFileDownload(action);
      }
      handleMenuClose();
    };

    const handleConfirmDelete = () => {
      if (selectedProjectForDeletion) {
        dispatch(deleteProject({ id: selectedProjectForDeletion.id }));
        dispatch(setCurrentStep(null));
        console.log("Project deleted:", selectedProjectForDeletion.id);
      }
      setOpenDialog(false);
      setSelectedProjectForDeletion(null);
    };

    const handleCloseDialog = () => {
      setOpenDialog(false);
      setSelectedProjectForDeletion(null);
    };

    const handleExpandClick = (id) => {
      setExpanded(expanded === id ? null : id);
    };

    const handleMenuClick = (event, project) => {
      setAnchorEl(event.currentTarget);
      setSelectedProject(project);
    };

    const handleMenuClose = () => {
      setAnchorEl(null);
      setSelectedProject(null);
    };

    const handleSearchChange = (event) => {
      setSearchQuery(event.target.value);
    };

    const handleFileDownload = (action) => {
      if (action === "Download Order (XML)") {
        const filePath = "/file.xml";
        const downloadLink = document.createElement("a");
        downloadLink.href = filePath;
        downloadLink.download = "order.xml";
        downloadLink.click();
      }
    };

    useMemo(() => {
      let filtered = [...projectsData];

      // Filter by status
      if (status) {
        filtered = filtered.filter((project) => project.status === status);
      }

      // Filter by creation date range
      if (dateFrom) {
        filtered = filtered.filter(
          (project) => new Date(project.createdOn) >= new Date(dateFrom)
        );
      }
      if (dateTo) {
        filtered = filtered.filter(
          (project) => new Date(project.createdOn) <= new Date(dateTo)
        );
      }
      // Filter by customer number
      if (customerNumber) {
        filtered = filtered.filter((project) =>
          project.projectNumber.includes(customerNumber)
        );
      }

      // Sort based on sortOption
      if (sortOption) {
        filtered = filtered.sort((a, b) => {
          switch (sortOption) {
            case "creation-date-desc":
              return new Date(b.createdOn) - new Date(a.createdOn);
            case "creation-date-asc":
              return new Date(a.createdOn) - new Date(b.createdOn);
            case "last-change-desc":
              return new Date(b.changedOn) - new Date(a.changedOn);
            case "title-asc":
              return a.title.localeCompare(b.title);
            case "project-number-asc":
              return a.projectNumber.localeCompare(b.projectNumber);
            case "price-desc":
              return b.price - a.price;
            case "status-desc":
              return b.status.localeCompare(a.status);
            case "status-asc":
              return a.status.localeCompare(b.status);
            default:
              return 0;
          }
        });
      }

      // Set filtered projects based on the applied filters
      setFilteredProjects(filtered);
    }, [projectsData, status, dateFrom, dateTo, customerNumber, sortOption]);

    useMemo(() => {
      setDataToSearch(
        filteredProjects.length > 0 ? filteredProjects : projectsData
      );
    }, [filteredProjects, projectsData]);

    const finalFilteredProjects = useMemo(() => {
      return dataToSearch.filter((project) => {
        const queryLowerCase = searchQuery.toLowerCase();
        return (
          project.title.toLowerCase().includes(queryLowerCase) ||
          project.managers.some((manager) =>
            manager.name.toLowerCase().includes(queryLowerCase)
          ) ||
          new Date(project.createdOn)
            .toLocaleDateString()
            .includes(searchQuery) ||
          project.status.toLowerCase().includes(queryLowerCase)
        );
      });
    }, [dataToSearch, searchQuery]);

    const truncateText = (text, maxLength) => {
      if (text.length > maxLength) {
        return `${text.slice(0, maxLength)}....`;
      }
      return text;
    };

    const handleStartEditig = (project) => {
      dispatch(pushProject(project));
      router.push("/Create-Project");
    };

    return (
      <>
        <SearchAppBar
          searchQuery={searchQuery}
          handleSearchChange={handleSearchChange}
          projectsData={filteredProjects}
        />

        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Grid
            container
            spacing={{ xs: 2, sm: 3, md: 4 }}
            padding={{ xs: 1, sm: 2 }}
          >
            {finalFilteredProjects.map((project) => (
              <Grid item xs={12} md={4} lg={3} key={project.id}>
                <Card sx={{ maxWidth: 345 }}>
                  <CardHeader
                    avatar={
                      project.managers.length === 1 ? (
                        <Tooltip title={project.managers[0].name} arrow>
                          <Avatar
                            sx={{ bgcolor: red[500], cursor: "pointer" }}
                            aria-label="recipe"
                            onClick={() =>
                              console.log(project.managers[0].name)
                            }
                            src={project.managers[0].avatar || undefined}
                          >
                            {!project.managers[0].avatar &&
                              project.managers[0].name.charAt(0)}
                          </Avatar>
                        </Tooltip>
                      ) : (
                        <AvatarGroup max={2}>
                          {project.managers.map((manager) => (
                            <Tooltip
                              key={manager.id}
                              title={manager.name}
                              arrow
                            >
                              <Avatar
                                alt={manager.name}
                                src={manager.avatar}
                                sx={{ cursor: "pointer" }}
                                onClick={() => console.log(manager.name)}
                              />
                            </Tooltip>
                          ))}
                        </AvatarGroup>
                      )
                    }
                    action={
                      <IconButton
                        aria-label="settings"
                        onClick={(event) => handleMenuClick(event, project)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    }
                    title={
                      <Tooltip title={project.title} arrow>
                        <div
                          style={{
                            display: "block",
                            width: "100%",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            cursor: "pointer",
                          }}
                        >
                          {truncateText(project.title, 16)}
                        </div>
                      </Tooltip>
                    }
                    subheader={
                      <Tooltip title={project.createdOn} arrow>
                        <div
                          style={{
                            display: "block",
                            width: "100%",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            cursor: "pointer",
                          }}
                        >
                          {truncateText(project.createdOn, 16)}
                        </div>
                      </Tooltip>
                    }
                  />
                  <CardMedia
                    component="img"
                    height="194"
                    image={project.image}
                    alt={project.title}
                  />

                  {/* <div style={{ height: 194, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <Suspense fallback={ <CardMedia
component="img"
height="194"
image={project.image}
alt={project.title}
/> }>
    <Points/>
  </Suspense>
</div> */}

                  <CardContent>
                    <StatusChip status={project.status} />

                    <div style={{ marginTop: 8 }}>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "text.secondary",
                        }}
                      >
                        <strong>Project Number:</strong> {project.projectNumber}
                      </div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "text.secondary",
                        }}
                      >
                        <strong>Created at:</strong> {project.createdOn}
                      </div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "text.secondary",
                        }}
                      >
                        <strong>Last Updated:</strong> {project.changedOn}
                      </div>
                    </div>
                  </CardContent>

                  <CardActions disableSpacing>
                    <Button
                      onClick={() => handleStartEditig(project)}
                      variant="contained"
                      sx={{
                        background: getGradientColor(project.status).background,
                        color: "white",
                        transition: "background 0.3s ease-in-out",
                        "&:hover": {
                          background: getGradientColor(project.status)
                            .hoverBackground,
                        },
                      }}
                      startIcon={<EditIcon />}
                    >
                      Continue Editing
                    </Button>

                    <ExpandMore
                      expand={expanded === project.id}
                      onClick={() => handleExpandClick(project.id)}
                      aria-expanded={expanded === project.id}
                      aria-label="show more"
                    >
                      <ExpandMoreIcon />
                    </ExpandMore>
                  </CardActions>
                  <Collapse
                    in={expanded === project.id}
                    timeout="auto"
                    unmountOnExit
                  >
                    <CardContent>
                      <div>
                        Here are additional details about the project...
                      </div>
                    </CardContent>
                  </Collapse>
                </Card>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl) && selectedProject?.status !== "temp"}
                  onClose={handleMenuClose}
                >
                  <MenuItem
                    onClick={() =>
                      handleMenuItemClick("Copy Project", selectedProject)
                    }
                  >
                    <ListItemIcon>
                      <FileCopy />
                    </ListItemIcon>
                    Copy Project
                  </MenuItem>

                  <MenuItem
                    onClick={() =>
                      handleMenuItemClick(
                        "Change Status to Temp",
                        selectedProject
                      )
                    }
                  >
                    <ListItemIcon>
                      <ChangeHistory />
                    </ListItemIcon>
                    Status: {selectedProject?.status}
                  </MenuItem>

                  <MenuItem
                    onClick={() =>
                      handleMenuItemClick("Increase status", selectedProject)
                    }
                  >
                    <ListItemIcon>
                      <Schedule />
                    </ListItemIcon>
                    Increase status
                  </MenuItem>

                  <MenuItem
                    onClick={() =>
                      handleMenuItemClick(
                        "Download Order (XML)",
                        selectedProject
                      )
                    }
                  >
                    <ListItemIcon>
                      <FileDownload />
                    </ListItemIcon>
                    Download Order (XML)
                  </MenuItem>

                  <MenuItem
                    onClick={() =>
                      handleMenuItemClick("Show Quote (PDF)", selectedProject)
                    }
                  >
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    Show Quote (PDF)
                  </MenuItem>

                  <MenuItem
                    onClick={() =>
                      handleMenuItemClick(
                        "View Order Confirmation (PDF)",
                        selectedProject
                      )
                    }
                  >
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    View Order Confirmation (PDF)
                  </MenuItem>
                </Menu>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl) && selectedProject?.status === "temp"}
                  onClose={handleMenuClose}
                >
                  <MenuItem
                    onClick={() =>
                      handleMenuItemClick("Copy Project", selectedProject)
                    }
                  >
                    <ListItemIcon>
                      <FileCopy />
                    </ListItemIcon>
                    Copy Project
                  </MenuItem>

                  <MenuItem
                    onClick={() =>
                      handleMenuItemClick("Delete Project", selectedProject)
                    }
                  >
                    <ListItemIcon>
                      <Delete />
                    </ListItemIcon>
                    Delete Project
                  </MenuItem>

                  <MenuItem
                    onClick={() =>
                      handleMenuItemClick(
                        "Download Order (XML)",
                        selectedProject
                      )
                    }
                  >
                    <ListItemIcon>
                      <FileDownload />
                    </ListItemIcon>
                    Download Order (XML)
                  </MenuItem>

                  <MenuItem
                    onClick={() =>
                      handleMenuItemClick("Show Quote (PDF)", selectedProject)
                    }
                  >
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    Show Quote (PDF)
                  </MenuItem>
                </Menu>
              </Grid>
            ))}
          </Grid>
        </Box>

        <ConfirmDeleteDialog
          openDialog={openDialog}
          handleCloseDialog={handleCloseDialog}
          selectedProject={selectedProjectForDeletion}
          handleConfirmDelete={handleConfirmDelete}
        />
      </>
    );
  }

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setOnClose(true);
  };

  return (
    <>
      <ProjectDialog
        open={open}
        onClose={handleClose}
        project={{
          title: "Sample Project",
          description: "Sample project description.",
        }}
      />

      <ResponsiveCardGrid />
    </>
  );
};

const ConfirmDeleteDialog = ({
  openDialog,
  handleCloseDialog,
  selectedProject,
  handleConfirmDelete,
}) => {
  return (
    <>
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          Are you sure you want to delete this project{" "}
          <strong>{selectedProject?.title}</strong>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this project? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="secondary">
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};







const ProjectDialog = ({ open, onClose }) => {
    const router = useRouter();
    const dispatch = useDispatch();
    const [projectTitle, setProjectTitle] = useState("");
    const [projectNumber, setProjectNumber] = useState("");
    const [description, setDescription] = useState("");
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");
    const user = useSelector((state) => state.jsonData.user);
    console.log('dialog user', user);

    useEffect(() => {
        if (open) {
            setProjectNumber(generateUniqueProjectNumber());
        }
    }, [open]);

    const handleCloseSnackbar = () => setSnackbarOpen(false);

    const handleSave = async () => {
        onClose();
        const now = new Date().toLocaleString("fr-FR");

        const newProject = {
            title: projectTitle || "New Project",
            projectNumber: generateUniqueProjectNumber(),
            description: description || "No description provided",
            createdOn: now,
            changedOn: now,
            managers: [{ id: uuidv4(), name: "Otman", avatar: "https://i.pravatar.cc/150?img=3" }],
            status: "temp", 
            ...user
        };

        dispatch(pushProject(newProject)); 

        try {
            const response = await createProject(newProject); 
            if (response) {
                setSnackbarMessage("Project saved successfully!");
                setSnackbarSeverity("success");
                router.push("/Create-Project"); 
            } else {
                throw new Error("Project creation failed.");
            }
        } catch (error) {
            setSnackbarMessage("Failed to save project. Please try again.");
            setSnackbarSeverity("error");
        } finally {
            setSnackbarOpen(true);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle>
                    <Grid container spacing={1} alignItems="center">
                        <Grid item><Info fontSize="large" /></Grid>
                        <Grid item><Typography variant="h6">Create New Project</Typography></Grid>
                    </Grid>
                </DialogTitle>

                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2}>
                        <Typography variant="body1">
                            <IconButton edge="start" color="primary"><Edit /></IconButton>
                            <strong>Project Title</strong>
                        </Typography>
                        <TextField
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                            label="Enter Project Title"
                            variant="outlined"
                            size="small"
                            fullWidth
                        />

                        <Typography variant="body1">
                            <IconButton edge="start" color="primary"><Description /></IconButton>
                            <strong>Project Number</strong>
                        </Typography>
                        <Box display="flex" alignItems="center">
                            <Typography variant="body1" style={{ color: "green", flexGrow: 1 }}>
                                {projectNumber}
                            </Typography>
                            <Tooltip title="Copy Project Number" arrow>
                                <IconButton onClick={() => navigator.clipboard.writeText(projectNumber)} color="primary">
                                    <FileCopy />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Typography variant="body1">
                            <IconButton edge="start" color="primary"><Edit /></IconButton>
                            <strong>Description</strong>
                        </Typography>
                        <TextField
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            label="Enter Project Description"
                            variant="outlined"
                            multiline
                            rows={3}
                            size="small"
                            fullWidth
                        />
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose} color="secondary">Cancel</Button>
                    <Button onClick={handleSave} color="primary" variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} variant="filled">
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </>
    );
};









export default Projects;
