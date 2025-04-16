CREATE OR REPLACE FUNCTION get_distance_between_points(point_id_1 UUID, point_id_2 UUID)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  geom1 GEOMETRY;
  geom2 GEOMETRY;
BEGIN
  -- Fetch the geometry of the first point
  SELECT geom INTO geom1 FROM points WHERE id = point_id_1;

  -- Fetch the geometry of the second point
  SELECT geom INTO geom2 FROM points WHERE id = point_id_2;

  -- Calculate and return the 3D distance if both geometries are not null
  IF geom1 IS NOT NULL AND geom2 IS NOT NULL THEN
    RETURN ST_3DDistance(geom1, geom2);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;
