import { useSelector } from "react-redux";

export function prepareDataForServer(globalState) {
    const globalState = useSelector((state) => state);

    const dataToSend = {
        currentConfig: {
            type: globalState.currentConfig.type,
            id: globalState.currentConfig.id,
        },
        floorplanner: {
            version: globalState.floorplanner.version,
            corners: globalState.floorplanner.corners,
            walls: globalState.floorplanner.walls,
            rooms: globalState.floorplanner.rooms,
            units: globalState.floorplanner.units,
        },
        viewStates: {
            is2DView: globalState.is2DView,
            isClose: globalState.isClose,
            isDragging: globalState.isDragging,
            isDrawing: globalState.isDrawing,
        },
        items: globalState.items.map(item => ({
            id: item.id,
            name: item.name,
            attributes: item.attributes,
            quantity: item.quantity,
            price: item.attributes.price || 0, 
        })),
        user: {
            id: globalState.user._id,
            name: globalState.user.name,
            email: globalState.user.email,
            role: globalState.user.role,
        },
        project: {
            id: globalState.project.id,
            image: globalState.project.image,
            title: globalState.project.title,
            createdOn: globalState.project.createdOn,
        },
        wallHeight: globalState.wallHeight,
    };
    
     
    console.log('data to send', dataToSend);
    return dataToSend;
}

