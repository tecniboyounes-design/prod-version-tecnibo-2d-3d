CREATE OR REPLACE FUNCTION sync_point_geom()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the geom column with the 3D point geometry
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.x_coordinate, NEW.y_coordinate, NEW.z_coordinate), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
