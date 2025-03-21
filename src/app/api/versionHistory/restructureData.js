// Function to transform an array of Supabase project data into the specified custom format
export const transformProjectsData = (projects) => {
    // Validate input
    if (!Array.isArray(projects)) {
      console.warn('⚠️ No valid project data array provided');
      return null;
    }
  
    // Loop through each project and transform it
    return projects.map((project) => {
      // Top-level project structure
      const transformedProject = {
        created: project.created_on || new Date().toISOString(),
        lastModified: project.changed_on || new Date().toISOString(),
        settings: {
          selectedTools: {}, 
        },
        projectName: project.project_number || 'Untitled', 
        clientName: 'Untitled', 
        projectType: 'residential', 
        dimensions: {
          width: '1.2', 
          length: '0.2',
          height: '3',
        },
        plan2DImage: '',
        notes: '', 
        versionDescription: project.description || 'Initial version', // Use description if available
        versions: [],
      };
  
      // Transform versions array
      if (project.versions && Array.isArray(project.versions)) {
        transformedProject.versions = project.versions.map((version) => {
          // Transform walls into lines
          const lines = version.walls.map((wall) => ({
            id: wall.id,
            startPointId: wall.startpointid,
            endPointId: wall.endpointid,
            length: wall.length,
            rotation: wall.rotation || 0,
            thickness: wall.thickness || 0.01, // Default thickness if not provided
            color: wall.color || '#f5f5f5', // Default color as per desired output
            texture: wall.texture || 'default.avif', // Default texture as per desired output
            height: wall.height || 2.5, // Use provided height or default
            type: 'WALL', // Fixed type as per desired output
            connections: {
              left: null, // Default null, no connection data in input
              right: null, // Default null, no connection data in input
            },
            angles: [], // Default empty array, no angle data in input
          }));
  
          // Collect unique points from walls
          const pointsMap = new Map();
          version.walls.forEach((wall) => {
            if (wall.points_start) {
              pointsMap.set(wall.points_start.id, {
                id: wall.points_start.id,
                position: {
                  x: wall.points_start.x_coordinate || 0,
                  y: wall.points_start.y_coordinate || 0,
                  z: wall.points_start.z_coordinate || 0,
                },
                rotation: wall.points_start.rotation || 0,
                snapAngle: wall.points_start.snapangle || 0,
              });
            }
            if (wall.points_end) {
              pointsMap.set(wall.points_end.id, {
                id: wall.points_end.id,
                position: {
                  x: wall.points_end.x_coordinate || 0,
                  y: wall.points_end.y_coordinate || 0,
                  z: wall.points_end.z_coordinate || 0,
                },
                rotation: wall.points_end.rotation || 0,
                snapAngle: wall.points_end.snapangle || 0,
              });
            }
          });
          const points = Array.from(pointsMap.values());
  
          // Transform articles into doors
          const doors = (version.articles || []).map((article) => {
            const articleData = article.data || {};
            return {
              id: article.id,
              position: articleData.position || { x: 0, y: 0, z: 0 }, // Default position if not provided
              rotation: articleData.rotation || 0,
              article_id: articleData.article_id || null,
              name: articleData.name || 'Unknown', // Default name if not provided
              image: articleData.image || '', // Default empty string if not provided
              width: articleData.width || null,
              height: articleData.height || null,
              doorType: articleData.doorType || 'single', // Default as per desired output
              pivotDirection: articleData.pivotDirection || 'left', // Default as per desired output
              setDirection: articleData.setDirection || 'in', // Default as per desired output
              color: articleData.color || 'white', // Default as per desired output
              texture: articleData.texture || 'default.avif', // Default as per desired output
              type: articleData.type || 'simple', // Default as per desired output
              wallId: article.wall_id || null,
              referencePointId: articleData.referencePointId || null,
              referenceDistance: articleData.referenceDistance || null,
            };
          });
  
          // Floors (not provided in input, default to empty array or minimal example)
          const floors = []; // Default empty array, extend if floor data is added later
  
          return {
            lines,
            points,
            doors,
            floors,
            version: version.version || '1.0', // Use version number or default
            created: version.created_on || project.created_on || new Date().toISOString(),
            lastModified: project.changed_on || new Date().toISOString(),
          };
        });
      }

      console.log('Transformed project:', transformedProject);
  
      return transformedProject;
    });
  };
  