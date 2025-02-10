import * as React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import { useSelector } from 'react-redux';

export default function LinearBuffer({ color }) {
  const globalState = useSelector((state) => state);
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [buffer, setBuffer] = React.useState(10);
  const prevGlobalStateRef = React.useRef(globalState);
  
  React.useEffect(() => {
    if (JSON.stringify(globalState) !== JSON.stringify(prevGlobalStateRef.current)) {
      setIsLoading(true);
      prevGlobalStateRef.current = globalState;

      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setBuffer(10);
            return 0;
          }
          return Math.min(prev + 5, 100);
        });

        setBuffer((prev) => Math.min(prev + 1 + Math.random() * 10, 100));
      }, 50);

      return () => clearInterval(timer);
    } else {
      setIsLoading(false);
      setProgress(0);
      setBuffer(10);
    }
  }, [globalState]);
  
  

  return (
    <>
      {isLoading && 
        <Box sx={{ width: '100%' }}>
          <LinearProgress variant="buffer" value={progress} valueBuffer={buffer} color={color || "warning"} />
        </Box>
      }
    </>
  );
}