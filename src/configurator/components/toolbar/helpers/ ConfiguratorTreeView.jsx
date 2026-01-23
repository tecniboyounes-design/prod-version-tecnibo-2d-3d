"use client";

import React from "react";
import { useSelector } from "react-redux";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import { v4 as uuidv4 } from "uuid";

export default function ConfiguratorTreeView() {
  const configurator = useSelector((state) => state.jsonData.configurator);
  const [selectedItemId, setSelectedItemId] = React.useState(null);
  const [selectedItemLabel, setSelectedItemLabel] = React.useState(null);

  const treeData = React.useMemo(() => {
    if (!configurator) return [];

    const buildSectionTree = (sections) =>
      sections.map((section) => ({
        id: `section-${section.id}-${uuidv4()}`,
        label: `Section: ${section.label || "(no label)"}`,
        children: [
          ...(section.fields || []).map((field) => ({
            id: `section-${section.id}-field-${field.id}-${uuidv4()}`,
            label: `Field: ${field.label} [${field.type}]`,
            children: [
              ...(field.impacted_variables || []).map((iv) => ({
                id: `field-${field.id}-impactedVar-${iv.id}-${uuidv4()}`,
                label: `Impacted Variable: ${iv.name} (${iv.type})`,
                children: [],
              })),
              ...(field.field_descriptions || []).map((desc) => ({
                id: `field-${field.id}-description-${desc.id}-${uuidv4()}`,
                label: `Description (${desc.lang}): ${desc.description}`,
                children: [],
              })),
              ...(field.dependencies || []).map((dep) => ({
                id: `field-${field.id}-dependency-${dep.id}-${uuidv4()}`,
                label: `Dependency Action: ${dep.action}`,
                children: [],
              })),
              ...(field.comparisons || []).map((comp, idx) => ({
                id: `field-${field.id}-comparison-${idx + 1}-${uuidv4()}`,
                label: `Comparison: ${comp.left_value} ${comp.comparison_type} ${comp.right_value}`,
                children: [],
              })),
            ],
          })),
          ...(section.sections ? buildSectionTree(section.sections) : []),
        ],
      }));

    const topFields = (configurator.fields || []).map((field) => ({
      id: `topfield-${field.id}-${uuidv4()}`,
      label: `Top Field: ${field.label} [${field.type}]`,
      children: [],
    }));

    const conditions = (configurator.conditions || []).map((cond) => ({
      id: `condition-${cond.id}-${uuidv4()}`,
      label: `Condition: ${cond.comment}`,
      children: (cond.comparisons || []).map((comp, idx) => ({
        id: `condition-${cond.id}-comparison-${idx + 1}-${uuidv4()}`,
        label: `Comparison: ${comp.left_value} ${comp.comparison_type} ${comp.right_value}`,
        children: [],
      })),
    }));

    return [
      {
        id: `configurator-root-${uuidv4()}`,
        label: `Configurator Tree`,
        children: [
          ...buildSectionTree(configurator.sections || []),
          ...topFields,
          ...conditions,
        ],
      },
    ];
  }, [configurator]);

  // 🔍 Find label by ID inside the tree (recursive search)
  const findLabelById = (items, id) => {
    for (const item of items) {
      if (item.id === id) return item.label;
      if (item.children?.length) {
        const found = findLabelById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleItemClick = (event, itemId) => {
    setSelectedItemId(itemId);
    const label = findLabelById(treeData, itemId);
    setSelectedItemLabel(label);
  };

  if (!configurator) return <div>No configurator data found.</div>;

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {selectedItemId == null
          ? "No item selected"
          : `Selected: ${selectedItemLabel}`}
      </Typography>

      <Box sx={{ minHeight: 352, minWidth: 250 }}>
        <RichTreeView
          items={treeData}
          selectedItems={selectedItemId ? [selectedItemId] : []}
          onItemClick={handleItemClick}
          sx={{
            "& .Mui-selected": {
              backgroundColor: "primary.light",
              color: "primary.main",
              fontWeight: "bold",
            },
            "& .Mui-selected:hover": {
              backgroundColor: "primary.main",
            },
          }}
        />
      </Box>
    </Stack>
  );
}
