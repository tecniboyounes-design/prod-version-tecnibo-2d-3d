import * as React from 'react';
import PropTypes from 'prop-types';
import { styled } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Check from '@mui/icons-material/Check';
import PlanIcon from '@mui/icons-material/Map'; // Icon for Room Details
import EditIcon from '@mui/icons-material/Edit'; // Icon for Interior Design
import ContiguousPartsIcon from '@mui/icons-material/Build'; // Icon for Contiguous Parts
import DecorationsIcon from '@mui/icons-material/Style'; // Icon for Decorations
import PresentationIcon from '@mui/icons-material/Slideshow'; // Icon for Presentation
import StepConnector, { stepConnectorClasses } from '@mui/material/StepConnector';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '../../../store';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FormatShapesIcon from '@mui/icons-material/FormatShapes';
import LinearBuffer from '../UI/LinearBuffer';


const QontoStepIconRoot = styled('div')(({ theme }) => ({
  color: '#eaeaf0',
  display: 'flex',
  height: 22,
  alignItems: 'center',
  '& .QontoStepIcon-completedIcon': {
    color: '#784af4',
    zIndex: 1,
    fontSize: 18,
  },
  '& .QontoStepIcon-circle': {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: 'currentColor',
  },
}));


function QontoStepIcon(props) {
  const { active, completed, className } = props;
  return (
    <QontoStepIconRoot ownerState={{ active }} className={className}>
      {completed ? (
        <Check className="QontoStepIcon-completedIcon" />
      ) : (
        <div className="QontoStepIcon-circle" />
      )}
    </QontoStepIconRoot>
  );
}

QontoStepIcon.propTypes = {
  active: PropTypes.bool,
  className: PropTypes.string,
  completed: PropTypes.bool,
};


const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage:
       'linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 
      'linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: '#eaeaf0',
    borderRadius: 1,
  },
}));


const ColorlibStepIconRoot = styled('div')(({ theme }) => ({
  backgroundColor: '#ccc',
  cursor: 'pointer',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  variants: [
    {
      props: ({ ownerState }) => ownerState.active,
      style: {
        backgroundImage:
          'linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
        boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
      },
    },
    {
      props: ({ ownerState }) => ownerState.completed,
      style: {
        backgroundImage:
          'linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
      },
    },
  ],
}));


function ColorlibStepIcon(props) {
  const { active, completed, className } = props;
  const icons = {
    1: <CropSquareIcon />, // Room Shape
    2: <FormatShapesIcon />,  // Walls (second step)
    3: <PlanIcon />,  // Room Details
    4: <EditIcon />,  // Interior Design
    5: <ContiguousPartsIcon />, // Contiguous Parts
    6: <DecorationsIcon />,  // Decorations
    7: <PresentationIcon />  // Presentation
  };

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(props.icon)]}
    </ColorlibStepIconRoot>
  );
}


ColorlibStepIcon.propTypes = {
  active: PropTypes.bool,
  className: PropTypes.string,
  completed: PropTypes.bool,
  icon: PropTypes.node,
};

const steps = [
  'Room Shape',         // 1st step
  'Walls',              // 2nd step (now Walls is second)
  'Room Details',       // 3rd step
  'Interior Design',    // 4th step
  'Contiguous Parts',   // 5th step
  'Decorations',        // 6th step
  'Presentation'        // 7th step
];

export default function CustomizedSteppers() {
  const dispatch = useDispatch();
  const currentStep = useSelector((state) => state.jsonData.currentStep);
  const loading = useSelector((state) => state.jsonData.loading);

  const handleStepClick = (step) => {
    dispatch(setCurrentStep(step));
  };



  return (
    <>
    <Stack sx={{ width: '100%' , marginTop:'10px'}} spacing={4}> 
      <Stepper  alternativeLabel activeStep={currentStep} connector={<ColorlibConnector />}>
        {steps.map((label, index) => (
          <Step key={label} onClick={() => handleStepClick(index)}>
            <StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Stack>

     <LinearBuffer/> 
    </>
  );
}
