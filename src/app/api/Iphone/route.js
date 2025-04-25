// Predefined user data
const predefinedUser = {
    id: "39a18b31-b21a-4c52-b745-abb16a141e6d",
    name: "Rabie El Mansouri",
    avatar: "",
    email: "r.elmansouri@tecnibo.com",
    odoo_id: "446",
    role: "TM-Développeur Front-end React JS"
};

// Transformation function
function multiplyMatrixVectorOrchestrator(data) {
    // console.log('Starting transformation with data:', JSON.stringify(data, null, 2));
    const user = data.user || { odoo_id: "default_user" };
    const room = data.room;

    if (!room) {
        console.warn('⚠️ Room data is missing or undefined');
    }
    // console.log('User data:', user);
    // console.log('Room data:', JSON.stringify(room, null, 2));
    // 
    // Helper to multiply 4x4 matrix by vector
    function multiplyMatrixVector(matrix, vector) {
        console.log('Multiplying matrix:', matrix, 'with vector:', vector);
        const result = [];
        for (let i = 0; i < 4; i++) {
            result[i] = matrix[i] * vector[0] + matrix[i + 4] * vector[1] + 
                        matrix[i + 8] * vector[2] + matrix[i + 12] * vector[3];
        }
        console.log('Matrix multiplication result:', result);
        return result;
    }
    
    // Extract walls and calculate points
    console.log('Processing walls...');
    const walls = room.walls.map((wall, index) => {
        console.log(`Processing wall ${index}:`, JSON.stringify(wall, null, 2));
        const transform = wall.transform;
        const length = wall.dimensions[0];
        const height = wall.dimensions[1];
        const thickness = wall.dimensions[2] || 0.1;

        if (!transform || transform.length !== 16) {
            console.warn(`⚠️ Wall ${index} has invalid transform matrix`);
        }
        if (!wall.dimensions || wall.dimensions.length < 2) {
            console.warn(`⚠️ Wall ${index} has invalid dimensions`);
        }
     
        // Local points: start at (0,0,0), end at (length,0,0)
        const startLocal = [0, 0, 0, 1];
        const endLocal = [length, 0, 0, 1];
        console.log(`Wall ${index} local start point:`, startLocal);
        console.log(`Wall ${index} local end point:`, endLocal);
  
        // World coordinates
        const startWorld = multiplyMatrixVector(transform, startLocal);
        const endWorld = multiplyMatrixVector(transform, endLocal);
        console.log(`Wall ${index} world start point:`, startWorld);
        console.log(`Wall ${index} world end point:`, endWorld);
  
        // Rotation (around y-axis in xz-plane)
        const m11 = transform[0], m31 = transform[8];
        const rotation = Math.atan2(-m31, m11) * (180 / Math.PI); // Degrees
        console.log(`Wall ${index} rotation (degrees):`, rotation);
  
        const wallData = {
            startPoint: { x: startWorld[0], y: startWorld[1], z: startWorld[2] },
            endPoint: { x: endWorld[0], y: endWorld[1], z: endWorld[2] },
            length,
            rotation,
            thickness,
            color: "#f5f5f5",
            texture: "default.avif",
            height
        };
        console.log(`Transformed wall ${index}:`, JSON.stringify(wallData, null, 2));
        return wallData;
    });
    console.log('All walls processed:', JSON.stringify(walls, null, 2));
  
    // Collect unique points
    console.log('Collecting unique points...');
    const points = [];
    const pointMap = new Map();
    let tempIdCounter = 0;
  
    walls.forEach((wall, index) => {
        console.log(`Mapping points for wall ${index}:`, JSON.stringify(wall, null, 2));
        const startKey = `${wall.startPoint.x.toFixed(3)},${wall.startPoint.y.toFixed(3)},${wall.startPoint.z.toFixed(3)}`;
        const endKey = `${wall.endPoint.x.toFixed(3)},${wall.endPoint.y.toFixed(3)},${wall.endPoint.z.toFixed(3)}`;
        console.log(`Wall ${index} start key:`, startKey);
        console.log(`Wall ${index} end key:`, endKey);
  
        if (!pointMap.has(startKey)) {
            pointMap.set(startKey, tempIdCounter);
            points.push({ position: wall.startPoint, tempId: tempIdCounter++, snapAngle: 0, rotation: 0 });
            console.log(`Added new start point with tempId ${pointMap.get(startKey)}:`, wall.startPoint);
        }
        if (!pointMap.has(endKey)) {
            pointMap.set(endKey, tempIdCounter);
            points.push({ position: wall.endPoint, tempId: tempIdCounter++, snapAngle: 0, rotation: 0 });
            console.log(`Added new end point with tempId ${pointMap.get(endKey)}:`, wall.endPoint);
        }
  
        wall.startPointId = pointMap.get(startKey);
        wall.endPointId = pointMap.get(endKey);
        console.log(`Wall ${index} assigned startPointId: ${wall.startPointId}, endPointId: ${wall.endPointId}`);
    });
    console.log('All points collected:', JSON.stringify(points, null, 2));
  
    // Extract doors
    console.log('Processing doors...');
    const doors = room.doors.map((door, index) => {
        console.log(`Processing door ${index}:`, JSON.stringify(door, null, 2));
        if (!door.transform || door.transform.length !== 16) {
            console.warn(`⚠️ Door ${index} has invalid transform matrix`);
        }
        if (!door.dimensions || door.dimensions.length < 2) {
            console.warn(`⚠️ Door ${index} has invalid dimensions`);
        }
        const doorData = {
            id: door.identifier,
            position: { x: door.transform[12], y: door.transform[13], z: door.transform[14] },
            width: door.dimensions[0],
            height: door.dimensions[1],
            rotation: 0 // Could calculate if needed
        };
        console.log(`Transformed door ${index}:`, JSON.stringify(doorData, null, 2));
        return doorData;
    });
    console.log('All doors processed:', JSON.stringify(doors, null, 2));
  
    // Return transformed data
    const transformedData = {
        uid: user.odoo_id,
        title: "Room Scan Project",
        description: "Generated from iPhone 15 room scanner",
        walls,
        points,
        doors,
        version: room.version.toString(),
        units: "m" // Default
    };
    console.log('Final transformed data:', JSON.stringify(transformedData, null, 2));
    return transformedData;
}

// POST route to handle the request
export async function POST(req) {
    try {
        console.log('Received POST request');
        const room = await req.json(); // Payload is room.json
        console.log('Received room data:', JSON.stringify(room, null, 2));
        if (!room || typeof room !== 'object') {
            console.warn('⚠️ Invalid or missing room data in request');
        }
        const data = {
            user: predefinedUser,
            room: room
        };
        console.log('Prepared data for transformation:', JSON.stringify(data, null, 2));
        const transformedData = multiplyMatrixVectorOrchestrator(data);
        console.log('Transformation completed, returning response:', JSON.stringify(transformedData, null, 2));
        return new Response(JSON.stringify(transformedData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('Error during transformation:', err.message);
        return new Response(
            JSON.stringify({ success: false, error: `Transformation failed: ${err.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}


























//   look at the output please : {
//     "uid": "446",
//     "title": "Room Scan Project",
//     "description": "Generated from iPhone 15 room scanner",
//     "walls": [
//         {
//             "startPoint": {
//                 "x": 0.8885037,
//                 "y": -0.07852627,
//                 "z": -4.3377104
//             },
//             "endPoint": {
//                 "x": 5.03327975656681,
//                 "y": -0.07852627,
//                 "z": -4.334198370744127
//             },
//             "length": 4.1447773,
//             "rotation": 0.04854923450343889,
//             "thickness": 0.1,
//             "color": "#f5f5f5",
//             "texture": "default.avif",
//             "height": 2.6932406,
//             "startPointId": 0,
//             "endPointId": 1
//         },
//         {
//             "startPoint": {
//                 "x": 2.952843,
//                 "y": -0.07852627,
//                 "z": -1.6479679
//             },
//             "endPoint": {
//                 "x": 2.9367459958316036,
//                 "y": -0.07852627,
//                 "z": 3.7280045080152995
//             },
//             "length": 5.3759966,
//             "rotation": 90.17155736731226,
//             "thickness": 0.1,
//             "color": "#f5f5f5",
//             "texture": "default.avif",
//             "height": 2.6932406,
//             "startPointId": 2,
//             "endPointId": 3
//         },
//         {
//             "startPoint": {
//                 "x": 0.8731535,
//                 "y": -0.07852627,
//                 "z": 1.0390168
//             },
//             "endPoint": {
//                 "x": -3.2701284856717603,
//                 "y": -0.07852627,
//                 "z": 1.0370134724944204
//             },
//             "length": 4.1432824,
//             "rotation": -179.9722966156604,
//             "thickness": 0.1,
//             "color": "#f5f5f5",
//             "texture": "default.avif",
//             "height": 2.6932406,
//             "startPointId": 4,
//             "endPointId": 5
//         },
//         {
//             "startPoint": {
//                 "x": -1.1911858,
//                 "y": -0.07852627,
//                 "z": -1.6507256
//             },
//             "endPoint": {
//                 "x": -1.1765825432058785,
//                 "y": -0.07852627,
//                 "z": -7.028206703246299
//             },
//             "length": 5.377501,
//             "rotation": -89.8444061618088,
//             "thickness": 0.1,
//             "color": "#f5f5f5",
//             "texture": "default.avif",
//             "height": 2.6932406,
//             "startPointId": 6,
//             "endPointId": 7
//         }
//     ],
//     "points": [
//         {
//             "position": {
//                 "x": 0.8885037,
//                 "y": -0.07852627,
//                 "z": -4.3377104
//             },
//             "tempId": 0,
//             "snapAngle": 0,
//             "rotation": 0
//         },
//         {
//             "position": {
//                 "x": 5.03327975656681,
//                 "y": -0.07852627,
//                 "z": -4.334198370744127
//             },
//             "tempId": 1,
//             "snapAngle": 0,
//             "rotation": 0
//         },
//         {
//             "position": {
//                 "x": 2.952843,
//                 "y": -0.07852627,
//                 "z": -1.6479679
//             },
//             "tempId": 2,
//             "snapAngle": 0,
//             "rotation": 0
//         },
//         {
//             "position": {
//                 "x": 2.9367459958316036,
//                 "y": -0.07852627,
//                 "z": 3.7280045080152995
//             },
//             "tempId": 3,
//             "snapAngle": 0,
//             "rotation": 0
//         },
//         {
//             "position": {
//                 "x": 0.8731535,
//                 "y": -0.07852627,
//                 "z": 1.0390168
//             },
//             "tempId": 4,
//             "snapAngle": 0,
//             "rotation": 0
//         },
//         {
//             "position": {
//                 "x": -3.2701284856717603,
//                 "y": -0.07852627,
//                 "z": 1.0370134724944204
//             },
//             "tempId": 5,
//             "snapAngle": 0,
//             "rotation": 0
//         },
//         {
//             "position": {
//                 "x": -1.1911858,
//                 "y": -0.07852627,
//                 "z": -1.6507256
//             },
//             "tempId": 6,
//             "snapAngle": 0,
//             "rotation": 0
//         },
//         {
//             "position": {
//                 "x": -1.1765825432058785,
//                 "y": -0.07852627,
//                 "z": -7.028206703246299
//             },
//             "tempId": 7,
//             "snapAngle": 0,
//             "rotation": 0
//         }
//     ],
//     "doors": [
//         {
//             "id": "F65BFD79-D37E-454A-B1FE-35B80E671614",
//             "position": {
//                 "x": -1.1968231,
//                 "y": -0.1868961,
//                 "z": 0.4251135
//             },
//             "width": 0.9913884,
//             "height": 2.4733696,
//             "rotation": 0
//         }
//     ],
//     "version": "2",
//     "units": "m"
// }   let's do an deep analayse to it as well 