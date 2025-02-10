import React, { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, IconButton, Tooltip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import { useDispatch } from 'react-redux';

// Component for displaying and starring walls
const StarredWallsGrid = () => {
  const [starredWalls, setStarredWalls] = useState([]);
  const dispatch = useDispatch();
  

  useEffect(() => {
    // Load the starred wall from localStorage
    const savedStarredWall = JSON.parse(localStorage.getItem('starredWall'));
    console.log('savedStarredWall', savedStarredWall);
    if (savedStarredWall) {
      setStarredWalls((prevState) => [...prevState, savedStarredWall]);
    }
  }, []);



  const handleStarClick = (wallId) => {
    // dispatch(starWall({ wallId }));
    console.log(`⭐ You clicked to star wall with ID: ${wallId} ✨`);
  };

  return (
    <Grid container spacing={3} padding={3}>
      {starredWalls.map((wall) => (
        <Grid item xs={12} sm={6} md={4} key={wall.id}>
          <Card sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <CardContent>
              <Typography variant="h6">{wall.name}</Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Starred on: {new Date(wall.starredAt).toLocaleDateString()}
              </Typography>
            </CardContent>

            <Tooltip title="Click to unstar this wall">
              <IconButton onClick={() => handleStarClick(wall.id)} color="primary">
                {wall.starredAt ? <StarIcon /> : <StarOutlineIcon />}
              </IconButton>
            </Tooltip>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default StarredWallsGrid;
