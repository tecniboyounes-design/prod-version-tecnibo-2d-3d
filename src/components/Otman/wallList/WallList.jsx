import { useSelector } from "react-redux";

export const WallList = () => {
  const walls = useSelector((state) => state.jsonData.floorplanner.walls);
   
  return (
    <div>
      {walls.map((wall) => (
        <div key={wall.id}>
          Wall {wall.id}:{" "}
          {wall.total_price !== undefined ? (
            `${wall.total_price} €`
          ) : (
            "Calculating..."
          )}
        </div>
      ))}
    </div>
  );
}; 