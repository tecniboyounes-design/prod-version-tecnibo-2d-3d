import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useGLTF } from "@react-three/drei";
import { articles3D } from "@/data/models";

const PreloadGLTF = () => {
  const previewArticle = useSelector((state) => state.jsonData.previewArticle?.modelURL);

  useEffect(() => {
    if (previewArticle) {
      useGLTF.preload(previewArticle); 
    } else {
      console.log("No preview article modelURL found");
    }

    if (articles3D.length > 0) {
      articles3D.forEach((item) => {
        if (item.modelURL) {
          useGLTF.preload(item.modelURL);
        } else {
          console.log("Item has no modelURL");
        }
      });
    } else {
      console.log("No items to preload");
    }
  }, [articles3D]); 

  return null; 
};

export default PreloadGLTF;
