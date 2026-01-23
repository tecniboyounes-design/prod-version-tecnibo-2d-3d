// Simple field utilities
export const generateFieldKey = (label) => {
  return label.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
};

export const createEmptyField = (order = 1) => ({
  fieldKey: "",
  label: "",
  property: "",
  type: "select",
  section: "General",
  order,
  values: [],
  required: false,
  dependencies: {},
});

export const validateField = (field) => {
  const errors = [];
  if (!field.fieldKey) errors.push("Field key is required");
  if (!field.label) errors.push("Label is required");
  if (!field.property) errors.push("Property path is required");
  return errors;
};
