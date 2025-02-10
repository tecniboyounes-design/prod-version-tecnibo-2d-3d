import React, { useEffect, useState } from 'react';
import StarIcon from '@mui/icons-material/Star';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import Tooltip from '@mui/material/Tooltip';
import { starWall } from '../../../store';
import { useDispatch, useSelector } from 'react-redux';

const Star = ({ wallId }) => {
  const walls = useSelector((state) => state.jsonData.floorplanner.walls);
  const dispatch = useDispatch();
  const [isStarred, setIsStarred] = useState(false);

  // Update isStarred whenever walls state changes
  useEffect(() => {
    const wall = walls.find((wall) => wall.id === wallId);
    setIsStarred(wall?.isStarred || false);
  }, [walls, wallId]);

  const handleClick = () => {
    setIsStarred(true); 
    dispatch(starWall({ wallId }));
    console.log(`⭐ Wall ${wallId} is now ${!isStarred ? 'starred' : 'unstarred'} ✨`);
  };

  return (
    <Tooltip title={isStarred ? 'Unstar this wall' : 'Star this wall'} arrow>
      <div
        onClick={handleClick}
        style={{
          cursor: 'pointer',
          transition: 'transform 0.2s ease-in-out',
          transform: isStarred ? 'scale(1.2)' : 'scale(1)',
        }}
      >
        {isStarred ? (
          <StarIcon
            style={{
              color: '#FFD700',
              transition: 'color 0.2s ease-in-out, transform 0.2s ease-in-out',
            }}
            fontSize="large"
          />
        ) : (
          <StarOutlineIcon
            style={{
              color: '#FFD700',
              transition: 'color 0.2s ease-in-out, transform 0.2s ease-in-out',
            }}
            fontSize="large"
          />
        )}
      </div>
    </Tooltip>
  );
};

export default Star;
