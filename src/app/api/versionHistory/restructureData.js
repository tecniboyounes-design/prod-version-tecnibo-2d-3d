// Restructure the Supabase project data into a custom format
export const restructureProjectData = (projectsArray) => {
    if (!projectsArray || !Array.isArray(projectsArray)) {
      console.warn('⚠️ No valid projects array provided');
      return [];
    }
  
    const restructuredData = projectsArray.flatMap((project) => {
      return project.versions.map((version) => {
        // Walls
        const walls = version.walls.map((wall) => ({
          id: wall.id,
          startPointId: wall.startpointid,
          endPointId: wall.endpointid,
          length: wall.length,
          rotation: wall.rotation,
          thickness: wall.thickness,
          color: wall.color || '#f5f5f5',
          texture: wall.texture || 'default.avif',
          height: wall.height,
          angles: [], // Placeholder for future schema enhancement
          name: null, // Could derive from project or version if needed
        }));
  
        // Points (deduplicated)
        const pointsMap = new Map();
        version.walls.forEach((wall) => {
          if (wall.points_start) {
            pointsMap.set(wall.points_start.id, {
              id: wall.points_start.id,
              position: {
                x: wall.points_start.x_coordinate,
                y: wall.points_start.y_coordinate,
                z: wall.points_start.z_coordinate,
              },
              rotation: wall.points_start.rotation || 0,
              snapAngle: wall.points_start.snapangle || 0,
            });
          }
          if (wall.points_end) {
            pointsMap.set(wall.points_end.id, {
              id: wall.points_end.id,
              position: {
                x: wall.points_end.x_coordinate,
                y: wall.points_end.y_coordinate,
                z: wall.points_end.z_coordinate,
              },
              rotation: wall.points_end.rotation || 0,
              snapAngle: wall.points_end.snapangle || 0,
            });
          }
        });
        const points = Array.from(pointsMap.values());
  
        // Articles as doors (assuming future schema update with wall_id)
        const doors = version.articles.map((article) => {
          const articleData = article.data || {};
          return {
            id: article.id,
            position: articleData.position || { x: 0, y: 0, z: 0 },
            rotation: articleData.rotation || 0,
            article_id: articleData.article_id || null,
            name: articleData.name || 'Unknown',
            width: articleData.width || null,
            height: articleData.height || null,
            wallId: article.wall_id || null, // Requires schema update
            referencePointId: articleData.referencePointId || null,
            referenceDistance: articleData.referenceDistance || null,
          };
        });
  
        return {
          walls,
          points,
          doors,
          floors: [], // Placeholder for future floors table
          version: version.version,
          created: version.created_on || project.created_on || new Date().toISOString(),
          lastModified: project.changed_on || new Date().toISOString(),
          versionDescription: project.description || `Version ${version.version} of ${project.title}`,
          projectId: project.id, // Retain project context
          projectTitle: project.title,
          managers: project.managers, // Include managers at version level if needed
        };
      });
    });
  
    console.log('✅ Restructured data:', restructuredData);
    return restructuredData;
  };