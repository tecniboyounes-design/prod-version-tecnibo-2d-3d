import { useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import axios from 'axios';
import { Html } from '@react-three/drei';

export function useScreenshotUpload(projectId) {
  const [isUploading, setIsUploading] = useState(false);
  const { gl } = useThree();

  const takeScreenshotAndUpload = useCallback(async () => {
    setIsUploading(true);
    try {
      // Capture the screenshot from the R3F canvas
      const screenshot = gl.domElement.toDataURL('image/png');

      // Send the screenshot to the Next.js API route using Axios
      const response = await axios.post('/api/upload-screenshot', {
        projectId,
        screenshot,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Axios automatically parses the JSON response, so we can directly access data
      const { url } = response.data;
      return url; 
    } catch (error) {
      console.error('Error uploading screenshot:', error.message);
      throw error; 
    } finally {
      setIsUploading(false);
    }
  }, [projectId, gl]);

  return { takeScreenshotAndUpload, isUploading };
}




export const ScreenshotHandler = ({ projectId }) => {
    const { takeScreenshotAndUpload, isUploading } = useScreenshotUpload(projectId);
  
    const handleScreenshot = async () => {
      try {
        const url = await takeScreenshotAndUpload();
        console.log("Screenshot URL:", url);
        // Optionally, display the URL or a success message to the user
      } catch (error) {
        console.error("Failed to upload screenshot:", error);
        // Optionally, show an error message
      }
    };
  
    return (
      <Html style={{ position: "absolute", top: "10px", left: "10px" }}>
        <button
          onClick={handleScreenshot}
          disabled={isUploading}
          style={{
            padding: "8px 16px",
            backgroundColor: isUploading ? "#cccccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isUploading ? "not-allowed" : "pointer",
          }}
        >
          {isUploading ? "Uploading..." : "Take Screenshot"}
        </button>
      </Html>
    );
  };