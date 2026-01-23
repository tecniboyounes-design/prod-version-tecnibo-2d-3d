export function buildFlatRows(sections = [], fields = [], parentId = null, depth = 0) {
  const rows = [];

  const sortedSections = [...sections || [] ].sort((a, b) => a.order_index - b.order_index);

  sortedSections.forEach(section => {
    const sectionRow = {
      id: String(section.id),
      parentId: parentId ? String(parentId) : null,
      depth,
      kind: "section",
      label: section.label,
      type: section.type,
      description: section.description,
      order_index: section.order_index,
      termnum: section.termnum,
      parentTermnum: section.parentTermnum,
      created_at: section.createdAt,
    };

    rows.push(sectionRow);

    // RECURSIVE: subsections first
    rows.push(...buildFlatRows(section.sections || [], [], section.id, depth + 1));

    // FIELDS: under their section, sorted locally
    const sortedFields = [...section.fields].sort((a, b) => a.order_index - b.order_index);

    sortedFields.forEach(field => {
      rows.push({
        id: `field-${String(field.id)}`,
        parentId: String(section.id),
        depth: depth + 1,
        kind: "field",
        label: field.label || field.name,
        field_type: field.type,
        input_type: null,
        description: field.info || "",
        order_index: field.order_index,
        termnum: field.termnum,
        parentTermnum: field.parentTermnum,
        created_at: field.createdAt,
        required: field.required,
        fieldData: field
      });
    });
  });
  
  // AT ROOT LEVEL: add root fields
  if (parentId === null && depth === 0) {
    const rootFieldRows = (fields || [])
      .filter(f => f.parentTermnum === null)
      .sort((a, b) => a.order_index - b.order_index)
      .map(field => ({
        id: `field-${String(field.id)}`,
        parentId: null,
        depth: 0,
        kind: "field",
        label: field.label || field.name,
        field_type: field.type,
        input_type: null,
        description: field.info || "",
        order_index: field.order_index,
        termnum: field.termnum,
        parentTermnum: field.parentTermnum,
        created_at: field.createdAt,
        required: field.required,
        fieldData: field
      }));

    // IMPORTANT: root fields go BEFORE sections!
    return [...rootFieldRows, ...rows];
  }

  return rows;
}



