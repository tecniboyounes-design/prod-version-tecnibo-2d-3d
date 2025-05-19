export const transformProjectsData = (projects, userData) => {
  // Validate input
  if (!Array.isArray(projects)) {
    console.warn(
      "⚠️ No valid project data array provided, wrapping the object in an array accessible via projects[0]."
    );

    // If it's an object, wrap it inside an array
    if (typeof projects === "object" && projects !== null) {
      projects = [projects];
    } else {
      return null; // Return null if it's neither an array nor an object
    }
  }

  // Loop through each project and transform it
  return projects.map((project) => {
    // Top-level project structure
    const transformedProject = {
      created: project.created_on || new Date().toISOString(),
      lastModified:
        project.versions?.[0]?.lastModified || new Date().toISOString(),
      author: {
        id: userData.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
      },
      status: project.status || "draft",
      settings: {
        selectedTools: {},
      },
      id: project?.id || "FALLBACK_ID",
      projectName: project.title || "Untitled",
      clientName: "Untitled",
      projectType: "residential",
      dimensions: {
        width: "1.2",
        length: "0.2",
        height: "3",
      },
      plan2DImage: "",
      notes: "",
      versionDescription: project.description || "Initial version",
      versions: [],
    };

    // Transform versions array
    if (project.versions && Array.isArray(project.versions)) {
      transformedProject.versions = project.versions.map((version) => {
        // Transform walls into lines
        const lines = version.walls.map((wall) => ({
          client_id: wall.client_id,
          id: wall.id,
          startPointId: wall.startpointid,
          endPointId: wall.endpointid,
          length: wall.length,
          rotation: wall.rotation || 0,
          thickness: wall.thickness || 0.01,
          color: wall.color || "#f5f5f5",
          texture: wall.texture || "default.avif",
          height: wall.height || 2.5,
          type: "WALL",
          connections: {
            left: null,
            right: null,
          },
          angles: [],
        }));

        // Collect unique points from walls
        const pointsMap = new Map();
        version.walls.forEach((wall) => {
          if (wall.points_start) {
            pointsMap.set(wall.points_start.id, {
              id: wall.points_start.id,
              client_id: wall.points_start.client_id,
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
              client_id: wall.points_end.client_id,
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
          // console.log("articleData", articleData);
          return {
            id: article.id,
            client_id: article.client_id,
            position: articleData.position || { x: 0, y: 0, z: 0 },
            rotation: articleData.rotation || 0,
            article_id: articleData.article_id || null,
            name: articleData.name || "Unknown",
            image: articleData.image || "",
            width: articleData.width || null,
            height: articleData.height || null,
            doorType: articleData.doorType || "single",
            pivotDirection: articleData.pivotDirection || "left",
            setDirection: articleData.setDirection || "in",
            color: articleData.color || "white",
            texture: articleData.texture || "default.avif",
            type: articleData.type || "simple",
            wallId: articleData.wallId || null, // Corrected line
            referencePointId: articleData.referencePointId || null,
            referenceDistance: articleData.referenceDistance || null,
            system: articleData.system || "cloison fallback",
            framed: articleData.framed ||false,
            glass: articleData.glass || false,

          };
        });

        // Floors (not provided in input, default to empty array or minimal example)
        const floors = [];
        
        const planParameters = (version.plan_parameters || []).map((param) => ({
          id: param.id,
          scaleFactor: param.scale_factor,
          rotation: param.rotation,
          xOffset: param.x_offset,
          yOffset: param.y_offset,
          refLength: param.ref_length,
        }));

        return {
          id: version.id,
          lines,
          points,
          doors,
          floors,
          version: version.version || "1.0",
          created:
            version.created_on ||
            project.created_on ||
            new Date().toISOString(),
          lastModified: project.changed_on || new Date().toISOString(),
          planParameters,
        };
        
      });
    }

    return transformedProject;
  });
};
