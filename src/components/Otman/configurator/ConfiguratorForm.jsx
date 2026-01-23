// ConfiguratorForm & FieldRenderer (v3)
// -------------------------------------
// ‣ Robust to BOTH payload shapes: {id, sections…} OR {configurator:{…}}
// ‣ Improved section‑matching: works with labels like “General Info” → section‑general
// ‣ Smarter fieldDetails lookup (camelCase / slug)
// ‣ Memoised maps for performance
'use client';
// helpers.js (inline for brevity)
const toSlug = (str) => str
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ') // keep alphanumerics
  .trim()
  .split(' ')[0]; // first word → "general" from "General Info"

const toCamel = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, ch) => ch.toUpperCase());
};

// ---------------- ConfiguratorForm.jsx ----------------

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateField } from '@/store';
import { Box, Typography, Paper } from '@mui/material';
import FieldRenderer from './FieldRenderer';

export const ConfiguratorForm = () => {
  const dispatch = useDispatch();

  // Accept *any* of the following shapes in the slice:
  //   A) state.jsonData.mockConfigurator (legacy dev fixture)
  //   B) state.jsonData.configurator (bare configurator object)
  //   C) state.jsonData.configurator.configurator (wrapped)
  const raw = useSelector((s) =>
    s.jsonData.mockConfigurator ?? s.jsonData.configurator ?? null
  );
  const configurator = React.useMemo(() => {
    if (!raw) return null;
    // unwrap if needed
    if (raw.sections && Array.isArray(raw.sections)) return raw;
    if (raw.configurator) return raw.configurator;
    return null;
  }, [raw]);

  const formData = useSelector((s) => s.jsonData.formData || {});

  const handleChange = React.useCallback(
    (fieldId, value) => dispatch(updateField({ fieldId, value })),
    [dispatch]
  );

  /* ---------------- Early‑out ---------------- */
  if (!configurator?.sections?.length) {
    return <Typography variant="body1">No configurator loaded.</Typography>;
  }

  /* ---------------- Build map section → fields ---------------- */
  const fieldsBySection = React.useMemo(() => {
    const map = Object.fromEntries(configurator.sections.map((s) => [s.id, []]));

    configurator.fields?.forEach((f) => {
      const section = configurator.sections.find(
        (s) => s.id === f.section_id || f.section_id === `section-${toSlug(s.label)}`
      );
      if (section) map[section.id].push(f);
    });

    // Sort
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.order_index - b.order_index));
    return map;
  }, [configurator]);

  /* ---------------- Render ---------------- */
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {configurator.sections
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((section) => (
          <Paper key={section.id} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {section.label}
            </Typography>

            {(fieldsBySection[section.id] || []).map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                detail={
                  configurator.fieldDetails?.[field.id] ||
                  configurator.fieldDetails?.[toCamel(field.label)] ||
                  configurator.fieldDetails?.[toSlug(field.label)] ||
                  {}
                }
                value={formData[field.id]}
                onChange={(v) => handleChange(field.id, v)}
              />
            ))}
          </Paper>
        ))}
    </Box>
  );
};

