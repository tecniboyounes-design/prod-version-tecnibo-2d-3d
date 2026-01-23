// /app/ifc_test/hooks/useDxfExportPayload.js
'use client';

import { useCallback } from 'react';
import * as THREE from 'three';

// Three.js Y-up -> IFC / CAD coords:
//   IFC X = x
//   IFC Y = z (depth)
//   IFC Z = y (height)



/**
 * Convert a Three.js Vector3 (X, Y, Z) into IFC / CAD-style coordinates (X, Z, Y).
 *
 * In Three.js:
 *   - X = horizontal
 *   - Y = up
 *   - Z = depth
 *
 * In IFC / CAD for this project:
 *   - X = X
 *   - Y = Z (depth)
 *   - Z = Y (height)
 *
 * @param {THREE.Vector3} vec3 - Original Three.js vector.
 * @returns {{ x: number, y: number, z: number }} - Re-mapped IFC-style coordinates.
 */


function threeToIfcCoords(vec3) {
  return {
    x: vec3.x,
    y: vec3.z,
    z: vec3.y,
  };
}



/**
 * Trigger a file download in the browser from a Blob.
 *
 * @param {Blob} blob - File data as a Blob.
 * @param {string} name - File name shown to the user (e.g. "project_123.dxf").
*/




function downloadBlob(blob, name) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function base64ToBlob(base64, mimeType = 'application/octet-stream') {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}



/**
 * useDxfExportPayload
 *
 * High-level hook to:
 *  - Walk a Three.js group (rootGroupRef) and extract all exportable meshes.
 *  - Convert their geometry into IFC-style coordinates (X, Z, Y).
 *  - Build a JSON payload of "elements" (positions + indices + IFC type).
 *  - Optionally call the `/api/ifc-dxf` endpoint and download the resulting DXF.
 *
 * You typically:
 *  1. Wrap all exportable meshes in a single `<group ref={exportGroupRef}>`.
 *  2. Call `useDxfExportPayload({ rootGroupRef, getPropsForMesh })`.
 *  3. Use:
 *     - `collectElementsFromGroup()` if you just want the raw payload.
 *     - `exportDxfFromServer()` if you want to call the API + download DXF.
 *
 * @param {Object} params
 * @param {React.RefObject<THREE.Group>} params.rootGroupRef
 *   Parent group containing all exportable meshes (walls, doors, etc.).
 * @param {(mesh: THREE.Mesh) => { ifcType?: string, props?: any }} [params.getPropsForMesh]
 *   Optional mapper to attach IFC metadata (ifcType + props) to each mesh.
 *   If omitted, the hook falls back to `mesh.userData` heuristics.
 * @param {string|number} [params.projectNumber='1987348']
 *   Optional project identifier used only for naming in DXF export (e.g. "1987348").
 * @param {string} [params.version='V0.1']
 *   Optional version label used only for naming in DXF export (e.g. "V0.1").
 *
 * @returns {{
 *   collectElementsFromGroup: () => {
 *     elements: Array<{
 *       uuid: string,
 *       name: string,
 *       ifcType: string,
 *       props: any,
 *       worldPositions: number[],
 *       localPositions: number[],
 *       matrixWorld: number[],
 *       indices: number[]
 *     }>,
 *     stats: {
 *       meshCount: number,
 *       elementCount: number,
 *       vertexCount: number,
 *       triangleCount: number
 *     },
 *     countsByType: Record<string, number>
 *   },
 *   exportDxfFromServer: (options?: {
 *     projectName?: string,
 *     schema?: string,
 *     format?: string,
 *     bakeWorld?: boolean,
 *     compat?: any,
 *     fileName?: string
 *   }) => Promise<void>
 * }}
 */



export function useDxfExportPayload({
  rootGroupRef,
  getPropsForMesh,
  projectNumber = '1987348',
  version = 'V1.0',
  format = 'dxf', // default export format requested from the API (dxf | dwg)
} = {}) {
  const defaultExportFormat =
    typeof format === 'string' && format.toLowerCase() === 'dwg'
      ? 'dwg'
      : 'dxf';

  const collectElementsFromGroup = useCallback(() => {
    const root = rootGroupRef?.current;
    if (!root) {
      console.warn(
        '[DXF-PAYLOAD] rootGroupRef.current is null, nothing to export'
      );
      return {
        elements: [],
        stats: {
          meshCount: 0,
          elementCount: 0,
          vertexCount: 0,
          triangleCount: 0,
        },
        countsByType: {},
      };
    }

    // Make sure transforms are up to date for the whole subtree
    root.updateWorldMatrix(true, true);

    const elements = [];
    let meshCount = 0;
    let vertexCount = 0;
    let triangleCount = 0;

    const tmpLocal = new THREE.Vector3();
    const tmpWorld = new THREE.Vector3();

    root.traverse((obj) => {
      const mesh = obj;
      if (!mesh.isMesh) return;

      // Skip helper meshes (like invisible selection boxes)
      const mat = mesh.material;
      if (mat && mat.transparent && mat.opacity === 0) return;

      const geometry = mesh.geometry;
      if (!geometry || !geometry.attributes || !geometry.attributes.position) {
        return;
      }

      const positionAttr = geometry.getAttribute('position');
      const vCount = positionAttr.count;
      if (vCount < 3) return;

      meshCount += 1;
      vertexCount += vCount;

      const localPositions = new Array(vCount * 3);
      const worldPositions = new Array(vCount * 3);

      const worldMatrix = mesh.matrixWorld;

      // Build local + world positions (already in IFC axes)
      for (let i = 0; i < vCount; i++) {
        tmpLocal.fromBufferAttribute(positionAttr, i);

        // Local IFC coords (no world matrix): x, z, y
        const li = threeToIfcCoords(tmpLocal);
        localPositions[3 * i + 0] = li.x;
        localPositions[3 * i + 1] = li.y;
        localPositions[3 * i + 2] = li.z;

        // World IFC coords
        tmpWorld.copy(tmpLocal).applyMatrix4(worldMatrix);
        const wi = threeToIfcCoords(tmpWorld);
        worldPositions[3 * i + 0] = wi.x;
        worldPositions[3 * i + 1] = wi.y;
        worldPositions[3 * i + 2] = wi.z;
      }

      // Indices (triangles)
      let indices;
      if (geometry.index) {
        indices = Array.from(geometry.index.array);
      } else {
        // Assume non-indexed geometry is already triangulated (3 vertices per tri)
        const triCount = Math.floor(vCount / 3);
        const indexCount = triCount * 3;
        indices = new Array(indexCount);
        for (let i = 0; i < indexCount; i++) {
          indices[i] = i;
        }
      }

      // Optional flip: mimic current buildElementsForIfcAndDxf behaviour
      try {
        if (worldMatrix.determinant() >= 0) {
          for (let i = 0; i < indices.length; i += 3) {
            const tmp = indices[i + 1];
            indices[i + 1] = indices[i + 2];
            indices[i + 2] = tmp;
          }
        }
      } catch {
        // ignore
      }

      triangleCount += indices.length / 3;

      // IFC type + props
      let ifcType = 'IfcBuildingElementProxy';
      let props = {};

      if (typeof getPropsForMesh === 'function') {
        const extra = getPropsForMesh(mesh) || {};
        ifcType = extra.ifcType || ifcType;
        props = extra.props || props;
      } else {
        // Fallback: derive from userData / type (not used in your current setup)
        ifcType =
          mesh.userData?.ifcType ||
          (mesh.userData?.type === 'door'
            ? 'IfcDoor'
            : mesh.userData?.type === 'wall'
            ? 'IfcWall'
            : 'IfcBuildingElementProxy');

        const color =
          mesh.material &&
          mesh.material.color &&
          typeof mesh.material.color.getHexString === 'function'
            ? `#${mesh.material.color.getHexString()}`
            : undefined;

        props = {
          ...mesh.userData,
          materialName: mesh.material?.name,
          colorHex: color,
        };
      }

      const element = {
        uuid: mesh.uuid,
        name: mesh.name || mesh.userData?.name || '',
        ifcType,
        props,
        worldPositions,
        localPositions,
        matrixWorld: Array.from(worldMatrix.elements),
        indices,
      };

      elements.push(element);
    });

    const stats = {
      meshCount,
      elementCount: elements.length,
      vertexCount,
      triangleCount,
    };

    // Extra: count elements per IFC type (walls / doors / others)
    const countsByType = elements.reduce((acc, el) => {
      const key = el.ifcType || 'UNKNOWN';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log('[DXF-PAYLOAD] collectElementsFromGroup() summary:', stats);
    console.log('[DXF-PAYLOAD] countsByType:', countsByType);

    if (elements[0]) {
      const e0 = elements[0];
      console.log('[DXF-PAYLOAD] First element preview:', {
        uuid: e0.uuid,
        name: e0.name,
        ifcType: e0.ifcType,
        worldPositionsLength: e0.worldPositions.length,
        indicesLength: e0.indices.length,
      });
    }

    return { elements, stats, countsByType };
  }, [rootGroupRef, getPropsForMesh]);
  
  /**
   * Call the `/api/ifc-dxf` endpoint using the current scene geometry and
   * immediately download the resulting DXF.
   *
   * The geometry is collected from `rootGroupRef` via `collectElementsFromGroup()`,
   * then POSTed as `{ projectName, schema, format, bakeWorld, compat, elements }`.
   *
   * @async
   * @function exportDxfFromServer
   * @param {Object} [options]
   * @param {string} [options.projectName=`Roometry Project ${projectNumber}`]
   *   Project label forwarded to the backend. If omitted, a dynamic default is
   *   used that includes the `projectNumber` (e.g. "Roometry Project 1987348").
   * @param {string} [options.schema='IFC4']
   *   IFC schema hint forwarded to the backend (currently "IFC4" or "IFC2X3").
   * @param {string} [options.format='tfs']
   *   Internal IFC body format flag forwarded to the backend.
   * @param {boolean} [options.bakeWorld=false]
   *   Whether the backend should bake world transforms into IFC geometry.
   * @param {any} [options.compat={ useRootContextForBody: true }]
   *   Extra compatibility flags passed through to the IFC builder.
   * @param {string} [options.exportFormat=defaultExportFormat]
   *   Requested export format. If 'dwg', the backend will convert DXF through CloudConvert.
   * @param {string} [options.fileName]
   *   Downloaded file name. Defaults to `<projectNumber>_v<version>_.<format>`.
   *
   * @returns {Promise<void>}
   */
  const exportDxfFromServer = useCallback(
    async ({
      projectName = `Roometry Project ${projectNumber}`, // dynamic default using projectNumber
      schema = 'IFC4',
      format = 'tfs',
      bakeWorld = false,
      compat = { useRootContextForBody: true },
      exportFormat = defaultExportFormat,
      fileName,
    } = {}) => {
      const targetFormat =
        typeof exportFormat === 'string' &&
        exportFormat.toLowerCase() === 'dwg'
          ? 'dwg'
          : 'dxf';
      const resolvedFileName =
        fileName || `${projectNumber}_v${version}_.${targetFormat}`;

      const { elements, stats, countsByType } = collectElementsFromGroup();

      if (!elements.length) {
        console.warn('[DXF] No elements to export');
        alert('DXF export failed: no geometry to export');
        return;
      }

      console.log('[DXF] Payload for /api/ifc-dxf:', {
        ...stats,
        countsByType,
        firstElement:
          elements[0] && {
            uuid: elements[0].uuid,
            name: elements[0].name,
            ifcType: elements[0].ifcType,
            worldPositionsLength: elements[0].worldPositions.length,
            indicesLength: elements[0].indices.length,
          },
      });

      try {
        const res = await fetch('/api/ifc-dxf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName,
            schema,
            format, // 'tfs'
            bakeWorld,
            compat,
            exportFormat: targetFormat,
            fileName: resolvedFileName,
            elements,
          }),
        });

        if (!res.ok) {
          const txt = await res.text();
          console.error('[DXF] Server error:', txt);
          alert('DXF export failed: ' + txt);
          return;
        }

        const payload = await res.json();

        console.log('[DXF] Server stats:', payload.stats);
        // You can compare payload.stats.triangleCount with stats.triangleCount here if you want

        const serverFormat =
          typeof payload.exportFormat === 'string'
            ? payload.exportFormat.toLowerCase()
            : targetFormat;

        if (serverFormat === 'dwg') {
          const dwgPayload = payload.dwg || payload.converted;
          const dwgName =
            (typeof dwgPayload?.fileName === 'string' &&
              dwgPayload.fileName) ||
            resolvedFileName.replace(/\.dxf$/i, '.dwg');

          try {
            if (dwgPayload?.base64) {
              const dwgBlob = base64ToBlob(
                dwgPayload.base64,
                'application/acad'
              );
              downloadBlob(dwgBlob, dwgName);
              return;
            }

            if (dwgPayload?.url) {
              const dwgRes = await fetch(dwgPayload.url);
              if (!dwgRes.ok) {
                throw new Error(
                  `Failed to download DWG from CloudConvert URL (${dwgRes.status})`
                );
              }
              const dwgBuffer = await dwgRes.arrayBuffer();
              const dwgBlob = new Blob([dwgBuffer], {
                type: 'application/acad',
              });
              downloadBlob(dwgBlob, dwgName);
              return;
            }

            console.warn(
              '[DXF] DWG conversion response missing expected data, falling back to DXF',
              dwgPayload
            );
          } catch (err) {
            console.error('[DXF] Failed to handle DWG payload:', err);
            alert(
              'DWG export failed, falling back to DXF download in console logs'
            );
          }
        }

        const dxfText = payload.dxf;
        if (typeof dxfText !== 'string') {
          console.error('[DXF] Invalid DXF in response:', payload);
          alert('DXF export failed: invalid DXF payload from server');
          return;
        }

        const dxfBlob = new Blob([dxfText], {
          type: 'image/vnd.dxf',
        });

        downloadBlob(dxfBlob, resolvedFileName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[DXF] Network error:', err);
        alert('DXF export failed (network): ' + msg);
      }
    },
    [collectElementsFromGroup, defaultExportFormat, projectNumber, version]
  );


  return { collectElementsFromGroup, exportDxfFromServer };
}
