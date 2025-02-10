import React from 'react';
import { Card, CardMedia, CardContent, Typography, Grid, Container } from '@mui/material';
import { styled } from '@mui/system';
import { useDispatch, useSelector } from 'react-redux';
import { setHouse, clearFloorplan, setCurrentStep, setIsDrawing, setIs2DView } from '../../../store'; 
import { houses } from '../../../data/models'; 
import { Home } from '@mui/icons-material';

const floorplans = [
  {
    id: 0,
    name: 'Empty Room',
    description: 'A blank space ready for your design.',
    icon: <Home sx={{ fontSize: 100 }} />, 
  },
  {
    id: 2,
    name: 'Cozy Retreat',
    description: 'A warm and inviting house featuring a charming living room, sleek kitchen, tranquil bedroom, and elegant bathroom.',
    image: '/rooms/model2.png',
  },
  {
    id: 3,
    name: 'Urban Oasis',
    description: 'A modern and sleek house with an open living room, designer kitchen, serene bedroom, and chic bathroom.',
    image: '/rooms/model3.png',
  },
  {
    id: 4,
    name: 'Stylish Nest',
    description: 'A house blending contemporary design with comfort: a welcoming living room, functional kitchen, snug bedroom, and sophisticated bathroom.',
    image: '/rooms/model4.png',
  },
  {
    id: 5,
    name: 'Harmony Abode',
    description: 'A balanced house with a cozy living room, practical kitchen, peaceful bedroom, and minimalist bathroom.',
    image: '/rooms/model5.png',
  },
  {
    id: 6,
    name: 'The Dining Haven',
    description: 'A house built for gatherings: a spacious living room, state-of-the-art kitchen, restful bedroom, inviting bathroom, and a dining room to share meals.',
    image: '/rooms/model6.png',
  },
];



const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 345,
  margin: 'auto',
  transition: 'transform 0.5s, box-shadow 0.5s',
  cursor: 'pointer',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow:
      '0 4px 20px rgba(0,0,0,0.1), 0 6px 20px rgba(0,0,0,0.15), 0 0 20px rgba(242,113,33,0.3), 0 0 20px rgba(233,64,87,0.3), 0 0 20px rgba(138,35,135,0.3)',
  },
}));



const ZoomedOutCardMedia = styled(CardMedia)(({ theme }) => ({
  width: '100%',
  height: 200,
  objectFit: 'cover',
  transform: 'scale(0.95)',
  transition: 'transform 0.3s',
  '&:hover': {
    transform: 'scale(1)',
  },
}));



const FloorplanCatalog = () => {
  const dispatch = useDispatch();  
  const handleClick = (index) => {
    if (index === 0) {
      console.log('Empty Room selected', index);
      const emptyRoom = {corners:{}, walls:[], rooms:{},}
      dispatch(setHouse(emptyRoom));
      dispatch(setCurrentStep(2));
      dispatch(setIsDrawing(true));
      dispatch(setIs2DView(true));
      return;
    }
    
    const selectedHouse = houses[index];
    dispatch(setHouse(selectedHouse));
    dispatch(setCurrentStep(2));
    dispatch(setIsDrawing(false));
    dispatch(setIs2DView(false));

  };


  return (
    <Container>
      <Typography 
        variant="h4" 
        align="center" 
        gutterBottom 
        style={{ marginBottom: '20px' }} 
      >
        Choose Your Dream Home
      </Typography>
      <Grid container justifyContent="center" spacing={3} style={{ marginTop: '20px' }}>
      {floorplans.map((floorplan, index) => (
  <Grid item xs={12} sm={6} md={4} key={floorplan.id}>
    <StyledCard onClick={() => handleClick(index)}>
      {/* Render icon if available; otherwise, render image */}
      {floorplan.icon ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          {floorplan.icon}
        </div>
      ) : (
        <ZoomedOutCardMedia
          component="img"
          image={floorplan?.image}
          alt={floorplan?.name}
        />
      )}
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          {floorplan.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {floorplan.description}
        </Typography>
      </CardContent>
    </StyledCard>
  </Grid>
))}

      </Grid>
    </Container>
  );
};



export default FloorplanCatalog;
