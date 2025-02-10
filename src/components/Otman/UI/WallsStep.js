import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Save as SaveIcon, FilterNone as FilterNoneIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { CustomPanel } from './Panel';
import Points from '../Points/Points';
import ConfigurationMenu from './Menu';
import { setIs2DView } from '../../../store';
import { FloatingSpeedDial } from '../RoomShape/roomShape';
import { Html } from '@react-three/drei';

const WallsStep = () => {
  const is2DView = useSelector((state) => state.jsonData.is2DView);
  const [isPanelVisible, setIsPanelVisible] = React.useState(false);
  const dispatch = useDispatch();

  const toggleView = () => {
    dispatch(setIs2DView(!is2DView));
  };

  const actions = [
    { icon: <SaveIcon style={{ color: 'white' }} />, name: 'Save' },
    { icon: <FilterNoneIcon style={{ color: 'white' }} />, name: 'Start Wall View' },
    {
      icon: is2DView ? <VisibilityOffIcon style={{ color: 'white' }} /> : <VisibilityIcon style={{ color: 'white' }} />,
      name: is2DView ? '3D View' : '2D View',
      action: toggleView,
    },
    {
      icon: <SettingsIcon style={{ color: 'white' }} />,
      name: 'Settings',
      action: () => setIsPanelVisible(!isPanelVisible),
    },
  ];
  
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow:'hidden' }}>
      <div
        style={{ width: '100px', position: 'relative', zIndex: 1000 }}
      >
        <FloatingSpeedDial
          actions={actions}
        />
      </div>

      <CustomPanel
        isPanelVisible={true}
        panelContent={<ConfigurationMenu /> }
      >
        <Points />
      </CustomPanel>

    </div>
  );
};

export default WallsStep;
