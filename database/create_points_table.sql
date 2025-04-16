CREATE TABLE public.points (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  x_coordinate DOUBLE PRECISION NOT NULL,
  y_coordinate DOUBLE PRECISION NOT NULL,
  z_coordinate DOUBLE PRECISION NOT NULL,
  snapangle DOUBLE PRECISION NOT NULL,
  version_id UUID NULL,
  rotation INTEGER NULL,
  geom GEOMETRY NULL,
  CONSTRAINT points_pkey PRIMARY KEY (id),
  CONSTRAINT points_version_id_fkey FOREIGN KEY (version_id) REFERENCES versions (id) ON DELETE CASCADE
) TABLESPACE pg_default;
