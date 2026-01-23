// /app/ifc_test/hooks/exportDxf.js
// 3D DXF writer producing R12-style 3DFACE entities that AutoCAD and CAM tools
// (including imos) can read reliably.

/**
 * Build a DXF string from 3D elements.
 *
 * Each element is expected to look like this (minimal):
 *
 *   {
 *     worldPositions: Float32Array | number[],  // [x0,y0,z0, x1,y1,z1, ...] in metres
 *     indices: Uint16Array | Uint32Array | number[], // triangle indices into worldPositions/3
 *     ifcType?: string,                          // e.g. 'IfcWall', 'IfcDoor'
 *     layer?: string                             // overrides layer derived from ifcType
 *   }
 *
 * Options:
 *   - scale: numeric factor applied to x,y,z (e.g. 1000 to convert m -> mm).
 *   - includeHeader: whether to include a HEADER section (default true).
 *   - acadVersion: DXF $ACADVER string, default 'AC1009' (R12).
 *   - insunits: optional $INSUNITS value; 4 = mm, 6 = m, etc.
 *   - zDefault: fallback Z if a vertex Z is missing or NaN (default 0).
 */
export function buildDxfFromElements3D(elements, userOptions = {}) {
  const options = {
    scale: 1,
    includeHeader: true,
    acadVersion: 'AC1009',
    insunits: 4, // default to millimetres when scale is usually 1000 (m -> mm)
    zDefault: 0,
    ...userOptions,
  };

  const lines = [];
  const push = (code, value) => {
    lines.push(String(code), String(value));
  };

  const faces = [];

  if (Array.isArray(elements)) {
    for (const el of elements) {
      if (!el || !el.worldPositions || !el.indices) continue;

      const positions = Array.from(el.worldPositions);
      const indices = Array.from(el.indices);

      const baseLayer =
        (typeof el.layer === 'string' && el.layer.trim()) ||
        (typeof el.ifcType === 'string' && el.ifcType.trim()) ||
        '0';
      const layerName = sanitizeLayerName(baseLayer);

      for (let i = 0; i + 2 < indices.length; i += 3) {
        const ia = indices[i] * 3;
        const ib = indices[i + 1] * 3;
        const ic = indices[i + 2] * 3;

        const v1 = readVertex(positions, ia, options.scale, options.zDefault);
        const v2 = readVertex(positions, ib, options.scale, options.zDefault);
        const v3 = readVertex(positions, ic, options.scale, options.zDefault);

        faces.push({ layerName, v1, v2, v3 });
      }
    }
  }

  // HEADER (optional but recommended so AutoCAD and others know units & extents)
  if (options.includeHeader) {
    writeHeaderForFaces(lines, faces, options);
  }

  // ENTITIES section (R12-style, only 3DFACE entities)
  push(0, 'SECTION');
  push(2, 'ENTITIES');

  for (const face of faces) {
    write3DFace(lines, face.layerName, face.v1, face.v2, face.v3);
  }

  push(0, 'ENDSEC');
  push(0, 'EOF');

  return lines.join('\n');
}

function readVertex(positions, baseIndex, scale, zDefault) {
  const x = Number(positions[baseIndex] ?? 0) * scale;
  const y = Number(positions[baseIndex + 1] ?? 0) * scale;
  const zRaw = positions[baseIndex + 2];
  const z = Number.isFinite(zRaw) ? Number(zRaw) * scale : zDefault;
  return { x, y, z };
}

function sanitizeLayerName(name) {
  const invalid = /[<>\/\\":;*|=`,]/g;
  const cleaned = String(name ?? '0').replace(invalid, '_').trim();
  if (!cleaned) return '0';
  // Older DXF consumers are happy with <= 31 chars, so we play safe.
  return cleaned.slice(0, 31);
}

function writeHeaderForFaces(lines, faces, options) {
  const push = (code, value) => {
    lines.push(String(code), String(value));
  };

  push(0, 'SECTION');
  push(2, 'HEADER');

  // DXF version
  push(9, '$ACADVER');
  push(1, options.acadVersion || 'AC1009');

  // Units (INSUNITS) – if provided. 4 = mm, 6 = m, etc.
  if (typeof options.insunits === 'number') {
    push(9, '$INSUNITS');
    push(70, Math.trunc(options.insunits));
  }

  // Extents from all vertices so AutoCAD zooms to the correct area.
  if (faces.length > 0) {
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const { v1, v2, v3 } of faces) {
      for (const v of [v1, v2, v3]) {
        if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) continue;
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
        if (v.z < minZ) minZ = v.z;
        if (v.z > maxZ) maxZ = v.z;
      }
    }

    if (isFinite(minX) && isFinite(maxX)) {
      push(9, '$EXTMIN');
      push(10, minX);
      push(20, minY);
      push(30, minZ);

      push(9, '$EXTMAX');
      push(10, maxX);
      push(20, maxY);
      push(30, maxZ);
    }
  }

  push(0, 'ENDSEC');
}

function write3DFace(lines, layerName, v1, v2, v3) {
  const push = (code, value) => {
    lines.push(String(code), String(value));
  };

  // 3DFACE entity – R12 format:
  //  0  3DFACE
  //  8  <layer>
  // 10  x1   20  y1   30  z1
  // 11  x2   21  y2   31  z2
  // 12  x3   22  y3   32  z3
  // 13  x4   23  y4   33  z4  (for triangles, x4,y4,z4 == x3,y3,z3)
  // 70  invisible edge flags (optional; 0 = all visible)
  push(0, '3DFACE');
  push(8, layerName);

  // First corner
  push(10, v1.x);
  push(20, v1.y);
  push(30, v1.z);

  // Second corner
  push(11, v2.x);
  push(21, v2.y);
  push(31, v2.z);

  // Third corner
  push(12, v3.x);
  push(22, v3.y);
  push(32, v3.z);

  // Fourth corner = third for triangular faces
  push(13, v3.x);
  push(23, v3.y);
  push(33, v3.z);

  // Invisible edge flags – keep all edges visible.
  push(70, 0);
}