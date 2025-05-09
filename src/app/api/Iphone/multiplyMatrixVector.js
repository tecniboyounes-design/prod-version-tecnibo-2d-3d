// Updated multiplyMatrixVectorOrchestrator function
export function multiplyMatrixVectorOrchestrator(data) {
  const user = data.user || { odoo_id: 446 };
  const room = data.room;

  // Helper to multiply 4x4 matrix by vector
  function multiplyMatrixVector(matrix, vector) {
    const result = [];
    for (let i = 0; i < 4; i++) {
      result[i] = matrix[i] * vector[0] + matrix[i + 4] * vector[1] + 
                  matrix[i + 8] * vector[2] + matrix[i + 12] * vector[3];
    }
    return result;
  }

  // Extract walls and calculate points
  const walls = room.walls.map((wall, index) => {
    const transform = wall.transform;
    const length = wall.dimensions[0];
    const height = wall.dimensions[1];
    const thickness = wall.dimensions[2] || 0.1;

    // Local points: start at (0,0,0), end at (length,0,0)
    const startLocal = [0, 0, 0, 1];
    const endLocal = [length, 0, 0, 1];

    // World coordinates
    const startWorld = multiplyMatrixVector(transform, startLocal);
    const endWorld = multiplyMatrixVector(transform, endLocal);

    // Rotation (around y-axis in xz-plane)
    const m11 = transform[0], m31 = transform[8];
    const rotation = Math.atan2(-m31, m11) * (180 / Math.PI);

    return {
      startPoint: { x: startWorld[0], y: startWorld[1], z: startWorld[2] },
      endPoint: { x: endWorld[0], y: endWorld[1], z: endWorld[2] },
      length,
      rotation,
      thickness,
      color: "#f5f5f5",
      texture: "default.avif",
      height
    };
  });

  // Collect unique points
  const points = [];
  const pointMap = new Map();
  let tempIdCounter = 0;

  walls.forEach(wall => {
    const startKey = `${wall.startPoint.x.toFixed(3)},${wall.startPoint.y.toFixed(3)},${wall.startPoint.z.toFixed(3)}`;
    const endKey = `${wall.endPoint.x.toFixed(3)},${wall.endPoint.y.toFixed(3)},${wall.endPoint.z.toFixed(3)}`;

    if (!pointMap.has(startKey)) {
      pointMap.set(startKey, tempIdCounter);
      points.push({ position: wall.startPoint, tempId: tempIdCounter++, snapAngle: 0, rotation: 0 });
    }
    if (!pointMap.has(endKey)) {
      pointMap.set(endKey, tempIdCounter);
      points.push({ position: wall.endPoint, tempId: tempIdCounter++, snapAngle: 0, rotation: 0 });
    }

    wall.startPointId = pointMap.get(startKey);
    wall.endPointId = pointMap.get(endKey);
  });

  // Extract doors
  const doors = room.doors.map(door => ({
    id: door.identifier,
    position: { x: door.transform[12], y: door.transform[13], z: door.transform[14] },
    width: door.dimensions[0],
    height: door.dimensions[1],
    rotation: 0,
    type: "door"
  }));

  // Extract windows
  const windows = room.windows.map(window => ({
    id: window.identifier,
    position: { x: window.transform[12], y: window.transform[13], z: window.transform[14] },
    width: window.dimensions[0],
    height: window.dimensions[1],
    rotation: 0,
    type: "window"
  }));

  // Extract floors
  const floors = room.floors.map(floor => ({
    id: floor.identifier,
    position: { x: floor.transform[12], y: floor.transform[13], z: floor.transform[14] },
    width: floor.dimensions[0],
    length: floor.dimensions[1],
    type: "floor"
  }));

  // Extract objects
  const objects = room.objects.map(obj => {
    const category = Object.keys(obj.category)[0]; // e.g., "table", "chair", "storage"
    return {
      id: obj.identifier,
      category,
      position: { x: obj.transform[12], y: obj.transform[13], z: obj.transform[14] },
      width: obj.dimensions[0],
      height: obj.dimensions[1],
      depth: obj.dimensions[2],
      type: "object"
    };
  });

  // Combine all articles
  const articles = [...doors, ...windows, ...floors, ...objects];

  // Return transformed data
  return {
    uid: user.odoo_id,
    title: "Room Scan Project",
    description: "Generated from iPhone 15 room scanner",
    walls,
    points,
    articles,
    version: room.version.toString(),
    units: "m"
  };
}

