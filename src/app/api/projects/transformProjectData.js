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
  console.log("Session Info:", sessionInfo);
  return {
    title: input.projectName || 'Untitled Project',
    project_number: Math.floor(Math.random() * 900000000 + 100000000).toString(),
    description: `Auto-generated for ${input.projectName} P.N => ${Math.floor(Math.random() * 900000000 + 100000000)}`,
    created_on: formatDate(input.created),
    changed_on: formatDate(input.lastModified),
    
    image_url: input.plan2DImage || 'https://cdn.andro4all.com/andro4all/2022/07/Planner-5D.jpg',
    managers: [
      {
        name: sessionInfo.name || `${input.author.firstName || 'fallback'} ${input.author.lastName || ''}`,
        avatar: 'https://i.pravatar.cc/150?img=3',
        email: sessionInfo.username || '',
        odoo_id: sessionInfo.uid,
        partner_id: sessionInfo.partner_id
      }
    ],
    status: input.status?.toLowerCase() || 'draft',
    doors: (input.versions?.[0]?.doors || []).map((door) => ({
      id: door.id || crypto.randomUUID(),
      type: 'door',
      position: door.position || { x: 0, y: 0, z: 0 },
      rotation: door.rotation || 0,
      width: door.width || 0.9,
      height: door.height || 2.1,
      version_id: door.version_id || null
    })),
    walls: (input.versions?.[0]?.lines || []).map((line) => ({
      startPointId: line.start || 'p1',
      endPointId: line.end || 'p2',
      length: line.length || 1,
      rotation: line.rotation || 0,
      thickness: line.thickness || 0.012,
      color: line.color || '#f5f5f5',
      texture: line.texture || 'default.avif',
      height: line.height || 3,
      angles: line.angles || []
    })),
    points: (input.versions?.[0]?.points || []).map((pt, idx) => ({
      tempId: pt.tempId || `p${idx + 1}`,
      position: pt.position || { x: 0, y: 0, z: 0 },
      rotation: pt.rotation || 0,
      snapAngle: pt.snapAngle || 0
    })),
    ...sessionInfo,
  };
}
