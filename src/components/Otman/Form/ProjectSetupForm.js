import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, TextField, Stack, Typography, Button, Box } from '@mui/material';
import { styled } from '@mui/system';
import { saveProjectSetup, setCurrentStep } from '../../../store';
import ProjectIcon from '@mui/icons-material/Business';
import QuestionIcon from '@mui/icons-material/HelpOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import DateRangeIcon from '@mui/icons-material/DateRange';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import { debounce } from 'lodash';

const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 600,
  margin: 'auto',
  marginTop: theme.spacing(6),
  padding: theme.spacing(3),
  borderRadius: 16,
  backgroundColor: theme.palette.background.default,
  boxShadow: theme.shadows[3],
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: 20,
  textTransform: 'none',
  fontWeight: 600,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
  },
}));

const ProjectSetupForm = () => {
  const [localState, setLocalState] = useState({
    projectName: '',
    questions: '',
    description: '',
    startDate: '',
    clientName: '',
    clientEmail: '',
  });

  const dispatch = useDispatch();
  const currentStep = useSelector((state) => state.jsonData.currentStep);

  const debouncedSaveProjectSetup = useCallback(
    debounce((data) => {
      dispatch(saveProjectSetup(data));
    }, 500),
    [dispatch]
  );

  useEffect(() => {
    if (currentStep !== 0) {
      debouncedSaveProjectSetup(localState);
    }
  }, [currentStep, localState, debouncedSaveProjectSetup]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(saveProjectSetup(localState));
    dispatch(setCurrentStep(1));
  };

  return (
    <StyledCard>
      <CardContent>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontWeight: 700, marginBottom: 3, textAlign: 'center' }}
        >
          Create Floorplanner Project
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <StyledTextField
            label="Project Name"
            name="projectName"
            value={localState.projectName}
            onChange={handleChange}
            required
            InputProps={{
              startAdornment: <ProjectIcon color="action" sx={{ marginRight: 1 }} />,
            }}
          />
          <StyledTextField
            label="Questions"
            name="questions"
            value={localState.questions}
            onChange={handleChange}
            required
            InputProps={{
              startAdornment: <QuestionIcon color="action" sx={{ marginRight: 1 }} />,
            }}
          />
          <StyledTextField
            label="Description"
            name="description"
            value={localState.description}
            onChange={handleChange}
            InputProps={{
              startAdornment: <DescriptionIcon color="action" sx={{ marginRight: 1 }} />,
            }}
          />
          <StyledTextField
            label="Start Date"
            name="startDate"
            type="date"
            value={localState.startDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: <DateRangeIcon color="action" sx={{ marginRight: 1 }} />,
            }}
          />
          <StyledTextField
            label="Client Name"
            name="clientName"
            value={localState.clientName}
            onChange={handleChange}
            InputProps={{
              startAdornment: <PersonIcon color="action" sx={{ marginRight: 1 }} />,
            }}
          />
          <StyledTextField
            label="Client Email"
            name="clientEmail"
            type="email"
            value={localState.clientEmail}
            onChange={handleChange}
            InputProps={{
              startAdornment: <EmailIcon color="action" sx={{ marginRight: 1 }} />,
            }}
          />
          <StyledButton type="submit" variant="contained" color="primary">
            Save Project
          </StyledButton>
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default ProjectSetupForm;
