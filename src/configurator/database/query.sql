SELECT jsonb_build_object(
  'id', c.id,
  'cpId', c.cp_id,
  'description', c.description,
  'createdAt', c.created_at,
  'updatedAt', c.updated_at,
  'sections', (
    SELECT jsonb_agg(section_obj ORDER BY s.order_index)
    FROM (
      SELECT jsonb_build_object(
        'id', s.id,
        'label', s.label,
        'type', s.type,
        'description', s.description,
        'order', s.order_index,
        'fields', (
          SELECT jsonb_agg(field_obj ORDER BY f.order_index)
          FROM (
            SELECT jsonb_build_object(
              'id', f.id,
              'name', f.name,
              'type', f.type,
              'label', f.label,
              'info', f.info,
              'required', f.required,
              'order', f.order_index,
              'details', COALESCE(inf.input_json, cbf.combo_json, '{}'),
              'impactedVariables', (
                SELECT jsonb_agg(name) FROM impacted_variables iv WHERE iv.field_id = f.id
              ),
              'dependencies', (
                SELECT jsonb_agg(dep_json) FROM (
                  SELECT jsonb_build_object(
                    'id', d.id,
                    'action', d.action,
                    'values', (
                      SELECT jsonb_agg(jsonb_build_object('id', dv.id, 'result', dv.result))
                      FROM dependency_values dv WHERE dv.dependency_id = d.id
                    )
                  ) dep_json
                  FROM dependencies d WHERE d.field_id = f.id
                ) dep_sub
              )
            ) AS field_obj
            FROM fields f
            LEFT JOIN (
              SELECT field_id, jsonb_build_object('min', min, 'max', max, 'type', type, 'validation', validation, 'default', default_value, 'attributes', attributes) input_json
              FROM input_fields
            ) inf ON inf.field_id = f.id
            LEFT JOIN (
              SELECT field_id, jsonb_build_object('type', type, 'code', code, 'content', content, 'source', source, 'dynamic', dynamic, 'default', default_value) combo_json
              FROM combobox_fields
            ) cbf ON cbf.field_id = f.id
            WHERE f.section_id = s.id
          ) field_sub
        )
      ) AS section_obj
      FROM sections s
      WHERE s.configurator_id = c.id AND s.parent_section_id IS NULL
    ) section_sub
  )
) AS configurator_json
FROM configurators c
WHERE c.id = $1;