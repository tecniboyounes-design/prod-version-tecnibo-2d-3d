// /app/api/ifc-dxf/minimal-dxf-writer.js

/**
 * Build a minimal 3D DXF (3DFACE) from IFC-style elements.
 *
 * @param {Array<{
 *   uuid: string
 *   name?: string
 *   ifcType?: string
 *   props?: any
 *   worldPositions: number[]          // [x,y,z,...] in metres, IFC axes
 *   indices: number[]                 // triangle vertex indices
 * }>} elements
 * @param {Object} [opts]
 * @param {string} [opts.dxfVersion]   // e.g. 'AC1009'
 * @param {number} [opts.scale]        // units scale (m -> mm = 1000)
 * @param {number} [opts.insunits]     // DXF $INSUNITS, 4 = millimetres
 * @returns {string} DXF text
 */
export function buildDXFFromElements(elements, opts = {}) {
  const {
    // IMPORTANT: match the client DXF (R12 ASCII)
    dxfVersion = 'AC1009',
    scale = 1,
    insunits = 4, // 4 = millimetres
  } = opts;

  const safeElements = Array.isArray(elements) ? elements : [];

  // ------------------------------------------------------------
  // Compute EXTMIN / EXTMAX (in scaled units, e.g. mm)
  // ------------------------------------------------------------
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  let hasAny = false;

  for (const el of safeElements) {
    if (!el || !Array.isArray(el.worldPositions)) continue;
    const pos = el.worldPositions;

    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i] * scale;
      const y = pos[i + 1] * scale;
      const z = pos[i + 2] * scale;

      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        continue;
      }

      hasAny = true;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
  }

  if (!hasAny) {
    minX = minY = minZ = 0;
    maxX = maxY = maxZ = 0;
  }

  const out = [];

  /* ------------------------- HEADER SECTION ------------------------- */

  out.push(
    '0', 'SECTION',
    '2', 'HEADER',

    // DXF version (R12) – matches working client file
    '9', '$ACADVER',
    '1', dxfVersion,

    // Insertion units (match client: mm)
    '9', '$INSUNITS',
    '70', String(insunits),

    // Extents – VERY important for AutoCAD view + matches client DXF
    '9', '$EXTMIN',
    '10', String(minX),
    '20', String(minY),
    '30', String(minZ),

    '9', '$EXTMAX',
    '10', String(maxX),
    '20', String(maxY),
    '30', String(maxZ),

    '0', 'ENDSEC'
  );

  /* ------------------------- ENTITIES SECTION ----------------------- */

  out.push(
    '0', 'SECTION',
    '2', 'ENTITIES'
  );

  for (const el of safeElements) {
    if (!el) continue;
    const { worldPositions, indices, ifcType } = el;

    if (!Array.isArray(worldPositions) || !Array.isArray(indices)) continue;

    // Match client: layer name is the IFC type ('IfcWall', 'IfcDoor', ...)
    const layer =
      typeof ifcType === 'string' && ifcType.length > 0
        ? ifcType
        : '0';

    const pos = worldPositions;

    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i] * 3;
      const ib = indices[i + 1] * 3;
      const ic = indices[i + 2] * 3;

      if (
        ia + 2 >= pos.length ||
        ib + 2 >= pos.length ||
        ic + 2 >= pos.length
      ) {
        continue;
      }

      const x1 = pos[ia] * scale;
      const y1 = pos[ia + 1] * scale;
      const z1 = pos[ia + 2] * scale;

      const x2 = pos[ib] * scale;
      const y2 = pos[ib + 1] * scale;
      const z2 = pos[ib + 2] * scale;

      const x3 = pos[ic] * scale;
      const y3 = pos[ic + 1] * scale;
      const z3 = pos[ic + 2] * scale;

      // 4th vertex repeats the 3rd one – same as client DXF
      const x4 = x3;
      const y4 = y3;
      const z4 = z3;

      out.push(
        '0', '3DFACE',
        '8', layer,

        '10', String(x1),
        '20', String(y1),
        '30', String(z1),

        '11', String(x2),
        '21', String(y2),
        '31', String(z2),

        '12', String(x3),
        '22', String(y3),
        '32', String(z3),

        '13', String(x4),
        '23', String(y4),
        '33', String(z4),

        // Match client exactly: 3DFACE edge flags = 0
        '70', '0'
      );
    }
  }

  /* ------------------------- END ENTITIES --------------------------- */

  out.push(
    '0', 'ENDSEC',
    '0', 'EOF'
  );

  return out.join('\n');
}
