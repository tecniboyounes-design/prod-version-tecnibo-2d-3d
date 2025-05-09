export function transformToFloorplanner(projectWithRelations) {
    // Extract the first version from the project data
    const version = projectWithRelations.versions[0];
  
    // Initialize an object to store unique corners
    const corners = {};
  
    // Assume all walls have the same height for elevation; take from first wall
    const wallHeight = version.walls[0].height;
  
    // Process each wall to extract points and build walls array
    const walls = version.walls.map(wall => {
      const startPoint = wall.points_start;
      const endPoint = wall.points_end;
  
      // Add start point to corners if not already present
      if (!corners[startPoint.id]) {
        corners[startPoint.id] = {
          x: startPoint.x_coordinate,
          y: startPoint.y_coordinate,
          z: startPoint.z_coordinate,
          elevation: wallHeight
        };
      }
  
      // Add end point to corners if not already present
      if (!corners[endPoint.id]) {
        corners[endPoint.id] = {
          x: endPoint.x_coordinate,
          y: endPoint.y_coordinate,
          z: endPoint.z_coordinate,
          elevation: wallHeight
        };
      }
  
      // Return wall object
      return {
        id: wall.id,
        corner1: wall.startpointid,
        corner2: wall.endpointid,
        thickness: wall.thickness,
        type: "STRAIGHT"
      };
    });
  
    // Detect the closed loop of corners to define the room
    const roomCorners = [];
    const visitedWalls = new Set();
    let currentWall = walls[0];
    let currentCorner = currentWall.corner1;
    roomCorners.push(currentCorner);
  
    // Traverse walls to find the sequence of corners forming a closed loop
    while (true) {
      const nextWall = walls.find(w => 
        !visitedWalls.has(w.id) && 
        (w.corner1 === currentCorner || w.corner2 === currentCorner)
      );
      if (!nextWall) break;
  
      visitedWalls.add(nextWall.id);
      const nextCorner = nextWall.corner1 === currentCorner ? nextWall.corner2 : nextWall.corner1;
      roomCorners.push(nextCorner);
      currentCorner = nextCorner;
  
      // Stop when we return to the starting corner
      if (nextCorner === roomCorners[0]) break;
    }
  
    // Create the room key as a comma-separated string of corner IDs
    const roomKey = roomCorners.join(',');
    const rooms = {
      [roomKey]: { name: "Square Room" }
    };
  
    // Construct the final floorplanner object
    const floorplanner = {
      version: "2.0.1a",
      corners: corners,
      walls: walls,
      rooms: rooms,
      items: [],
      units: "m"
    };
  
    return floorplanner;
  }