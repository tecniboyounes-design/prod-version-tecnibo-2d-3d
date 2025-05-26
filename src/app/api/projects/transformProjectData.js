import { generateProjectNumber } from "@/lib/genProNum";

export function transformProjectData(input) {


  const formatDate = (isoDate) => {
    const d = new Date(isoDate);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(',', '');
  };


  const sessionInfo = input.user?.session_info || {};
  const version = input.versions?.[0] || {};

  return {
    title: input.projectName || 'Untitled Project',
    project_number: generateProjectNumber(),
    description: `Auto-generated for ${input.projectName} P.N => ${Math.floor(Math.random() * 900000000 + 100000000)}`,
    created_on: formatDate(input.created),
    changed_on: formatDate(input.lastModified),
    image_url: input.plan2DImage || 'https://cdn.andro4all.com/andro4all/2022/07/Planner-5D.jpg',
    managers: [
      {
        name: sessionInfo.name || `${input.author?.firstName || 'fallback'} ${input.author?.lastName || ''}`,
        avatar: 'https://i.pravatar.cc/150?img=3',
        email: sessionInfo.username || '',
        odoo_id: sessionInfo.uid,
        partner_id: sessionInfo.partner_id
      }
    ],
    celling_type: input.cellingType || 'default',  // Matches SQL field name
    floor_type: input.floorType || 'default',
    project_estimate: input.estimateUsage ? true : false,  // Convert to boolean
    "RAL": input.RAL || {},
    colorProfile: input.colorProfile || {},
    status: input.status?.toLowerCase() || 'draft',

    // ─── doors (→ articles) ────────────────────────────────────────────────
    doors: (version.doors || []).map((door, idx) => {
      if (!door.id) throw new Error(`Missing door.id at index ${idx}`);
      return {
        id: door.id,         // ← front-end ID
        type: 'door',
        position: door.position || { x: 0, y: 0, z: 0 },
        rotation: door.rotation || 0,
        width: door.width || 0.9,
        height: door.height || 2.1,
        version_id: door.version_id || null
      };
    }),

    // ─── walls ───────────────────────────────────────────────────────────────
    walls: (version.lines || []).map((line, idx) => {
      if (!line.id) throw new Error(`Missing wall.id at index ${idx}`);
      const start = line.start || line.startPointId;
      const end = line.end || line.endPointId;
      if (!start || !end) throw new Error(`Missing start/end in wall at index ${idx}`);
      return {
        id: line.id,     // ← front-end ID
        startPointId: start,
        endPointId: end,
        length: line.length || 1,
        name: line.name || 'Wall',
        rotation: line.rotation || 0,
        thickness: line.thickness || 0.012,
        color: line.color || '#f5f5f5',
        texture: line.texture || 'default.avif',
        height: line.height || 3,
        angles: line.angles || [],
        material: line.material || {}
      };
    }),

    // ─── points ──────────────────────────────────────────────────────────────
    points: (version.points || []).map((pt, idx) => {
      if (!pt.id) throw new Error(`Missing point.id at index ${idx}`);
      return {
        id: pt.id,              // ← front-end ID
        position: pt.position || { x: 0, y: 0, z: 0 },
        rotation: pt.rotation || 0,
        snapAngle: pt.snapAngle || 0
      };
    }),

    ...sessionInfo
  };

}


