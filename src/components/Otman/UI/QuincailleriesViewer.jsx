import React, { useEffect, useState } from 'react';
import XMLParser from 'react-xml-parser';
import {
  Card,
  CardContent,
  Typography,
  CardMedia,
  CardActionArea,
  Box,
  Paper,
  Badge,
  IconButton,
  Tooltip,
} from '@mui/material';
import { GradientButtonWithTooltip } from './Button';
import { AddCircle, ArrowBack, BuildCircle } from '@mui/icons-material';
import { gridContainerStyle } from '@/app/styles/Themes';
import { useDispatch, useSelector } from 'react-redux';
import { getRandomPrice, pushArticles, updatePreview } from '@/store';
import CircularWithValueLabel from './CircularWithValueLabel';
import withDraggable from '@/HOC/Draggable';
import { v4 as uuidv4 } from "uuid";
import { manageFloorplanInDatabase } from '@/supabaseClient';


const CatalogParser = ({ xmlPath, imagesDir }) => {
  const [catalogData, setCatalogData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [nestedCategories, setNestedCategories] = useState(null);
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState({ name: '', label: '' });
  const dispatch = useDispatch();
  const { floorplan_id } = useSelector((state) => state.jsonData.project);
  useEffect(() => {
    console.log('selected', floorplan_id);

    const fetchXMLData = async () => {
      try {
        const response = await fetch(xmlPath);
        const xmlText = await response.text();
        const xml = new XMLParser().parseFromString(xmlText);
        console.log('xml data:', xml);
        setCatalogData(xml);
      } catch (error) {
        console.error('Error fetching or parsing XML:', error);
      }
    };

    fetchXMLData();
  }, []);


  if (!catalogData) {
    return <CircularWithValueLabel /> ;
  }


  const handleCategoryClick = (objects, categoryInfo) => {
    console.log('category info:', categoryInfo);
    setSelectedCategory(objects);
    setSelectedObject(null);
    setNestedCategories(null);
    setSelectedCategoryInfo(categoryInfo);
  };
  
const handleObjectClick = (obj) => {
    // console.log('object', obj);
    setSelectedObject(obj);
    setNestedCategories(obj);
  };


  const handleNestedObjectClick = (child) => {
    // console.log('child selected:', child);
    setNestedCategories(child);
  };


  const handleBack = () => {
    if (selectedObject) {
      setSelectedObject(null);
      setNestedCategories(null);
    } else {
      setSelectedCategory(null);
    }
  };


  const handleAdd = async (item) => {
      try {
        dispatch(pushArticles(item));
      await manageFloorplanInDatabase('add', floorplan_id, 'items', item);
    } catch (error) {
      console.error("Failed to add item to the database:", error);
    }
  };
  
  

  
  const handleBuild = (item) => {
    // updatePreview()
    console.log('Building item:', item);
  };






  const renderCategories = (categories) =>
  
    categories.map((category, idx) => {
      // console.log('image attribute:',category.attributes.image);
      const categoryName = category.attributes?.label || 'Unknown';
      const categoryLabel = category.attributes?.label || 'Unknown';
      
      const categoryImage = category.attributes?.image
      ? `${imagesDir}${category.attributes.image}`
      : '/QUINCAILLERIES/BITMAPS/D_DC_SQ_SET_GSR_BG_64470001.jpg';

      const objects = category.children || [];
      const objectCount = objects.length;
  
      return (
        <Box key={idx} sx={{ position: 'relative', maxWidth: 280 }}>
          <Badge
            badgeContent={objectCount}
            color="primary"
            sx={{ position: 'absolute', top: 15, left: 15 }}
          />
          <Card sx={{ boxShadow: 3, transition: '0.3s', '&:hover': { transform: 'scale(1.05)' } }}>
            <CardActionArea onClick={() => handleCategoryClick(objects, { name: categoryName, label: categoryLabel })}>
              <CardMedia
                component="img"
                height="140"
                image={categoryImage}
                alt={categoryName}
                onError={(e) => (e.target.src = '/QUINCAILLERIES/BITMAPS/D_DC_SQ_SET_GSR_BG_64470001.jpg')}
              />
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight="bold">**First Layer**</Typography>
                <Typography gutterBottom variant="h6">{categoryName}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>
      );
    });
  


  const renderNestedCategories = (objects) => 
    objects.map((obj, idx) => {

      const objectImage = obj.attributes?.image
      ? `${imagesDir}${obj.attributes.image}`
      : '/QUINCAILLERIES/BITMAPS/D_DC_SQ_SET_GSR_BG_64470001.jpg';
    
      const objectLabel = obj.attributes?.label || 'Unknown';
      const objectName = obj.attributes?.name || 'N/A';

      return (
        <Box key={idx} sx={{ position: 'relative', maxWidth: 280 }}>
          <Badge
            badgeContent={obj.children?.length || 0}
            color="secondary"
            sx={{ position: 'absolute', top: 15, left: 15 }}
          />

          <Card sx={{ boxShadow: 3, transition: '0.3s', '&:hover': { transform: 'scale(1.05)' } }}>
            <CardActionArea onClick={() => handleObjectClick(obj)}>
              <CardMedia
                component="img"
                image={objectImage}
                alt={objectLabel}
                onError={(e) => (e.target.src = '/QUINCAILLERIES/BITMAPS/D_DC_SQ_SET_GSR_BG_64470001.jpg')}
                // sx={{  width:'100%',height: '140px', objectFit: 'contain' }}
              />


<Box 
  sx={{
    position: 'absolute', 
    top: 5, 
    right: 5, 
    display: 'flex', 
    flexDirection: 'column', 
    gap: 1,
    zIndex: 2 
  }}
>
<Tooltip title="Configure Article" arrow placement="left">
    <IconButton 
    onClick={() => handleBuild(obj)}
      >
      <BuildCircle color="secondary" />
    </IconButton>
  </Tooltip>
  
  <Tooltip title="Insert Article" arrow placement="left">
    <IconButton 
    onClick={() => handleAdd(obj)}
    >
      <AddCircle color="primary" />
    </IconButton>
  </Tooltip>
</Box>



              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight="bold">**Second Layer**</Typography>
                <Typography gutterBottom variant="h6">{objectLabel}</Typography>
                <Typography variant="body2" color="textSecondary">Name: {objectName}</Typography>
                <Typography variant="body2" color="textSecondary">Label: {objectLabel}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>
      );
    });



    const renderNestedCategoriesChildren = () => {
      if (!nestedCategories?.children || nestedCategories.children.length === 0) {
        return <Typography variant="body1" align="center">No items available.</Typography>;
      }
    
      return (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 3,
            marginTop: 3,
            marginBottom:'80px',
            padding: 1
          }}
        >
          {nestedCategories.children.map((child, idx) => {
            const childLabel = child.attributes?.label || 'Unknown';
            const childImage = child.attributes?.image
            ? `${imagesDir}${child.attributes.image}`
            : '/QUINCAILLERIES/BITMAPS/D_DC_SQ_SET_GSR_BG_64470001.jpg';
    
            return (
              <Card
                key={idx}
                sx={{
                  maxWidth: 280,
                  boxShadow: 3,
                  transition: '0.3s',
                  '&:hover': { transform: 'scale(1.05)' },
                  position: 'relative' 
                }}
              >

<Box 
  sx={{
    position: 'absolute', 
    top: 5, 
    right: 5, 
    display: 'flex', 
    flexDirection: 'column', 
    gap: 1,
    zIndex: 2 
  }}
>
<Tooltip title="Configure Article" arrow placement="left">
    <IconButton onClick={() => handleBuild(child)}>
      <BuildCircle color="secondary" />
    </IconButton>
  </Tooltip>

  <Tooltip title="Insert Article" arrow placement="left">
    <IconButton onClick={() => handleAdd(child)}>
      <AddCircle color="primary" />
    </IconButton>
  </Tooltip>
  
 
</Box>



                <CardActionArea onClick={() => handleNestedObjectClick(child)}>
                  <CardMedia
                    component="img"
                    height="160"
                    image={childImage}
                    alt={childLabel}
                    onError={(e) => (e.target.src = '/QUINCAILLERIES/BITMAPS/D_DC_SQ_SET_GSR_BG_64470001.jpg')}
                  />
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle1" fontWeight="bold">{childLabel}</Typography>
                    <Typography variant="body2" color="text.secondary">**Third Layer**</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      );
    };
    




  const renderSelectedObject = () => {
    if (!selectedObject) return null;  
    return (
      <>
        {/* Sticky Header */}
<Box
  sx={{
    position: 'sticky',
    top: 0,
    backgroundColor: '#fff',
    zIndex: 10,
    p: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: 2,
    borderBottom: '1px solid #ddd'
  }}
>
  <GradientButtonWithTooltip
    text="Back"
    tooltipText="Return to the category list"
    onClick={handleBack}
    icon={<ArrowBack />}
    styles={{ mb: 2 }}
  />

  {/* Selected Category Info */}
  <Box sx={{ textAlign: 'center' }}>
    <Typography variant="h6" fontWeight="bold">{selectedCategoryInfo.name}</Typography>
    <Typography variant="body2" color="textSecondary">{selectedCategoryInfo.label}</Typography>
  </Box>
</Box>

  
        {/* Render Nested Categories */}
        {renderNestedCategoriesChildren()}
      </>
    );
  };
  

  
  const categories = catalogData.getElementsByTagName('category');

  return (
    
    <Box sx={{ width: '100%', height: '100%', overflowY: 'auto', maxHeight: '80vh', padding: 2 }}>
{!selectedObject ? (
  <>
    {!selectedCategory ? (
      <div name="First Layer - Categories" style={gridContainerStyle}>
        {renderCategories(categories)}
      </div>
    ) : (
      <>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            backgroundColor: '#fff',
            zIndex: 10,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 2,
            borderBottom: '1px solid #ddd'
          }}
        >
         
          <GradientButtonWithTooltip
          text="Back to Categories"
          tooltipText="Return to the category list"
          onClick={handleBack}
          icon={<ArrowBack />}
          styles={{ mb: 2 }}
        />
  
          {/* Selected Object Info */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight="bold">{selectedCategoryInfo.name}</Typography>
            <Typography variant="body2" color="textSecondary">{selectedCategoryInfo.label}</Typography>
          </Box>
        </Box>
        <div name="Second Layer - Nested Categories" style={gridContainerStyle}>
          {renderNestedCategories(selectedCategory)}
        </div>
      </>
    )}
  </>
) : (

  <div name="Third/Fourth Layer - Selected Object" >
    {renderSelectedObject()}
  </div>
)}

    </Box>
  );
};


export default CatalogParser;
