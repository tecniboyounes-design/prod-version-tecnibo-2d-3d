/**
 * Safely parses a stringified color JSON or passes through objects.
 * @param {string|object|null} colorInput
 * @returns {any|null}
 */
export function parseColorField(colorInput) {
  if (colorInput == null) return null;
  if (typeof colorInput === 'object') return colorInput;
  if (typeof colorInput !== 'string') return null;
  try {
    return JSON.parse(colorInput);
  } catch {
    return colorInput;
  }
}

/**
 * Flatten a wall row into a single "line" object (no `extra` key left).
 */
export function wallToFlatLine(wall) {
  const base = {
    client_id: wall.client_id,
    id: wall.id,
    startPointId: wall.startpointid,
    endPointId: wall.endpointid,
    length: wall.length,
    rotation: wall.rotation || 0,
    thickness: wall.thickness || 0.01,
    color: parseColorField(wall.color),
    texture: wall.texture || 'default.avif',
    height: wall.height || 2.5,
    type: wall.type || 'simple',
    connections: wall.connections || { left: null, right: null },
    angles: wall.angles || [],
    quantity: wall.quantity ?? null,
    estimate: wall.estimate ?? null,
    acoustic_performance: wall.acoustic_performance ?? null,
    ceiling_type: wall.ceiling_type ?? null,
    floor_type: wall.floor_type ?? null,
    links: wall.links ?? null,
    material: wall.material ?? null,
    cp_Id: wall.cp_Id ?? null,
  };

  // parse `extra` (object or stringified JSON)
  let extra = null;
  if (wall && wall.extra != null) {
    extra =
      typeof wall.extra === 'string'
        ? (() => {
            try {
              return JSON.parse(wall.extra);
            } catch {
              return null;
            }
          })()
        : typeof wall.extra === 'object'
        ? wall.extra
        : null;
  }

  if (!extra) {
    if ('extra' in base) delete base.extra;
    return base;
  }

  const noisy = new Set(['lines', 'points', 'doors']);
  const duplicates = new Set(Object.keys(base));

  const filteredEntries = Object.entries(extra).filter(
    ([k]) => !noisy.has(k) && !duplicates.has(k),
  );
  const filteredExtra = Object.fromEntries(filteredEntries);

  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log('[wallToFlatLine]', {
        wallId: wall.id,
        keptFromExtra: Object.keys(filteredExtra),
        droppedFromExtra: Object.keys(extra).filter(
          (k) => noisy.has(k) || duplicates.has(k),
        ),
      });
    } catch {}
  }

  const flat = { ...base, ...filteredExtra };
  if ('extra' in flat) delete flat.extra;
  return flat;
}


// =============================
// Single-version transformer
// =============================

/**
 * Transform a single version row + its parent project into
 * the same shape used inside transformProjectsData().
 *
 * @param {Object} version - Row from "versions" with nested walls, articles, plan_parameters...
 * @param {Object} project - Parent project row (for created_on / changed_on / meta).
 * @returns {Object} transformed version object
 */
export function transformVersion(version, project = {}) {
  if (!version) return null;

  // 1) Walls -> lines
  const lines = Array.isArray(version.walls)
    ? version.walls
        .map(wallToFlatLine)
        .map(({ extra, ...rest }) => rest)
    : [];

  // 2) Unique points from walls
  const pointsMap = new Map();
  (version.walls || []).forEach((wall) => {
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

  // 3) Articles -> doors
  const doors = Array.isArray(version.articles)
    ? version.articles.map((article) => {
        if (process.env.NODE_ENV !== 'production') {
          try {
            console.log('cpId', article.data?.cp_Id);
          } catch {}
        }
        const data = article.data || {};
        return {
          id: article.id,
          client_id: article.client_id,
          position: data.position || { x: 0, y: 0, z: 0 },
          rotation: data.rotation || 0,
          article_id: data.article_id || null,
          name: data.name || 'Unknown',
          image: data.image || '',
          width: data.width || null,
          height: data.height || null,
          doorType: data.doorType || 'single',
          pivotDirection: data.pivotDirection || 'left',
          setDirection: data.setDirection || 'in',
          color: data.color || 'white',
          texture: data.texture || 'default.avif',
          type: data.type || 'simple',
          wallId: data.wallId || null,
          referencePointId: data.referencePointId || null,
          referenceDistance: data.referenceDistance || null,
          system: data.system || 'cloison fallback',
          framed: data.framed || false,
          glass: data.glass || false,
          cp_Id: data.cp_Id || 'fallback cp_id',
        };
      })
    : [];

  // 4) Floors (kept empty for now)
  const floors = [];

  // 5) Plan parameters
  const rawParams = Array.isArray(version.plan_parameters)
    ? version.plan_parameters[0] || {}
    : version.plan_parameters || {};
  const planParameters = {
    id: rawParams.id || null,
    scale: rawParams.scale_factor || 0,
    rotation: rawParams.rotation || 0,
    offsetX: rawParams.x_offset || 0,
    offsetY: rawParams.y_offset || 0,
    refLength: rawParams.ref_length || null,
  };

  // 6) Final version payload — matches the shape produced inside transformProjectsData()
  const createdFallback =
    version.created_on || project.created_on || new Date().toISOString();

  const lastModifiedFallback =
    version.lastModified ||
    version.changed_on || // legacy
    project.changed_on ||
    createdFallback;

  return {
    id: version.id,
    plan2DImage: version.plan2DImage || '',
    lines,
    points,
    doors,
    floors,
    errors:
      typeof version.errors === 'boolean' ? version.errors : false,
    version: version.version || '1.0',
    created: createdFallback,
    lastModified: lastModifiedFallback,
    planParameters,
  };
}






/**
 * Transforms raw project data into a structured format for frontend use.
 * This is the OLD/legacy shape: project + embedded `versions[]`.
 *
 * @param {Array|Object} projects - Single project object or array of projects.
 * @param {Object} userData - User info { id, firstName, lastName, role } (⚠ currently "viewer", not author).
 * @returns {Array} Array of transformed project objects.
 */

export const transformProjectsData = (projects, userData) => {
  if (!Array.isArray(projects)) {
    console.warn('⚠️ Wrapping single project object inside array.');
    if (typeof projects === 'object' && projects !== null) {
      projects = [projects];
    } else {
      console.error('❌ Invalid projects input, expected array or object.');
      return null;
    }
  }

  return projects.map((project) => {
    const transformedProject = {
      created: project.created_on || new Date().toISOString(),
      lastModified: project.changed_on || new Date().toISOString(),
      error:
        typeof project.errors === 'object'
          ? project.errors
          : { error: false, message: '' },
      author: {
        id: userData.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
      },
      status: project.status || 'draft',
      settings: {
        selectedTools: {},
      },
      cellingType: project.celling_type || 'default',
      floorType: project.floor_type || 'default',
      estimateUsage: project.project_estimate ?? false,
      colorProfile: project.colorProfile || {},
      id: project.id || 'FALLBACK_ID',
      projectName: project.title || 'Untitled',
      clientName: 'Untitled',
      projectType: 'residential',
      dimensions: {
        width: project.dimensions?.width || '3',
        length: project.dimensions?.length || '3',
        height: project.dimensions?.height || '3',
      },
      plan2DImage: '',
      notes: '',
      description: project.description || 'Initial version',
      versions: [],
    };

    if (Array.isArray(project.versions)) {
      transformedProject.versions = project.versions.map((version) =>
        transformVersion(version, project),
      );
    }

    return transformedProject;
  });
};
