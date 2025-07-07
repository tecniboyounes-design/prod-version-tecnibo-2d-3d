

export function parseColorField(colorString) {
  try {
    // Make sure the input is a string
    if (typeof colorString !== "string") {
      console.warn("Expected a string for color field, got:", typeof colorString);
      return null;
    }

    // Parse the stringified JSON
    return JSON.parse(colorString);
  } catch (error) {
    // console.error("❌ Failed to parse color string:", colorString, error);
    return null;
  }
}



export const transformProjectsData = (projects, userData) => {
  console.log("Transforming projects data...", projects[0]);
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
      cellingType: project.celling_type || "default",
      floorType: project.floor_type || "default",
      estimateUsage: project.project_estimate ?? false,
      // RAL: project.RAL || {},
      colorProfile: project.colorProfile || {},
      id: project?.id || "FALLBACK_ID",
      projectName: project.title || "Untitled",
      clientName: "Untitled",
      projectType: "residential",
      dimensions: {
        width: project.dimensions?.width || "3",
        length: project.dimensions?.length || "3",
        height: project.dimensions?.height || "3",
      },
      plan2DImage: "",
      notes: "",
      projectImage: project.image_url || "fall back image url",
      description: project.description || "Initial version",
      managers: Array.isArray(project.managers) ? project.managers : [],
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
          color:   parseColorField(wall.color), 
          texture: wall.texture || "default.avif",
          height: wall.height || 2.5,
          type: wall.type || "simple",
          connections: wall.connections || { left: null, right: null },
          angles: wall.angles || [],
          quantity: wall.quantity || null,
          estimate: wall.estimate || null,
          acoustic_performance: wall.acoustic_performance || null,
          ceiling_type: wall.ceiling_type || null,
          floor_type: wall.floor_type || null,
          links: wall.links || null,
          material: wall.material || null,
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
          // console.log("articleData 12345", articleData);
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
            wallId: articleData.wallId || null,
            referencePointId: articleData.referencePointId || null,
            referenceDistance: articleData.referenceDistance || null,
            system: articleData.system || "cloison fallback",
            framed: articleData.framed || false,
            glass: articleData.glass || false,
          };
        });

        // Floors (not provided in input, default to empty array or minimal example)
        const floors = [];

   
   // Transform plan_parameters into a single object
        const planParams = version.plan_parameters;
        const planParametersRaw = Array.isArray(planParams)
          ? planParams[0] || {}
          : planParams || {};
        const planParameters = {
          id: planParametersRaw.id || null,
          scale: planParametersRaw.scale_factor || 0,
          rotation: planParametersRaw.rotation || 0,
          offsetX: planParametersRaw.x_offset || 0,
          offsetY: planParametersRaw.y_offset || 0,
          refLength: planParametersRaw.ref_length || null,
        };

//         {
// "scale": 1,
// "rotation": 0,
// "offsetX": 0,
// "offsetY": 0
// }
     
        return {
          id: version.id,
          plan2DImage: version?.plan2DImage || "",
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