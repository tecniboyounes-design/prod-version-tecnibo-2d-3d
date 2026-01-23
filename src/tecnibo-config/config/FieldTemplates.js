// config/FieldTemplates.js

export const FIELD_TEMPLATES = [
  // INPUT field templates
  {
    id: "input-slider",
    label: "Slider Input",
    fieldType: "INPUT",
    icon: "slider-icon",
    category: "inputs",
    description: "Range slider with min/max values",
    defaultConfig: {
      render: "field",
      fieldType: "INPUT",
      grid: 6,
      input: {
        id: null,
        type: "SLIDER",
        min: 0,
        max: 100,
        defaultValue: 50,
        validation: null,
        attributes: null,
      },
      variables: [],
      descriptions: [],
      dependencies: [],
    },
  },
  {
    id: "input-number",
    label: "Number Input",
    fieldType: "INPUT",
    icon: "number-icon",
    category: "inputs",
    description: "Numeric input field",
    defaultConfig: {
      render: "field",
      fieldType: "INPUT",
      grid: 6,
      input: {
        id: null,
        type: "NUMBER",
        min: undefined,
        max: undefined,
        defaultValue: 0,
        validation: null,
        attributes: null,
      },
      variables: [],
      descriptions: [],
      dependencies: [],
    },
  },
  {
    id: "input-text",
    label: "Text Input",
    fieldType: "INPUT",
    icon: "text-icon",
    category: "inputs",
    description: "Basic text input field",
    defaultConfig: {
      render: "field",
      fieldType: "INPUT",
      grid: 12,
      input: {
        id: null,
        type: "TEXT",
        validation: null,
        defaultValue: "",
        attributes: null,
      },
      variables: [],
      descriptions: [],
      dependencies: [],
    },
  },
];

export const COMBO_TEMPLATES = [
  {
    id: "combo-switch",
    label: "Switch Toggle",
    fieldType: "COMBOBOX",
    icon: "switch-icon",
    category: "combos",
    description: "Toggle between options",
    defaultConfig: {
      render: "field",
      fieldType: "COMBOBOX",
      grid: 12,
      combo: {
        id: null,
        type: "SWITCH",
        source: "",
        dynamic: false,
        defaultValue: null,
        code: null,
        content: null,
      },
      variables: [],
      descriptions: [],
      dependencies: [],
    },
  },
  {
    id: "combo-button",
    label: "Button Select",
    fieldType: "COMBOBOX",
    icon: "button-icon",
    category: "combos",
    description: "Multiple button selection",
    defaultConfig: {
      render: "field",
      fieldType: "COMBOBOX",
      grid: 12,
      combo: {
        id: null,
        type: "BUTTON",
        source: "",
        dynamic: false,
        defaultValue: null,
        code: null,
        content: null,
      },
      variables: [],
      descriptions: [],
      dependencies: [],
    },
  },
  {
    id: "combo-buttonavatar",
    label: "Button with Image",
    fieldType: "COMBOBOX",
    icon: "avatar-icon",
    category: "combos",
    description: "Buttons with images",
    defaultConfig: {
      render: "field",
      fieldType: "COMBOBOX",
      grid: 12,
      combo: {
        id: null,
        type: "BUTTONAVATAR",
        source: "",
        dynamic: false,
        defaultValue: null,
        code: null,
        content: null,
      },
      variables: [],
      descriptions: [],
      dependencies: [],
    },
  },
  {
    id: "combo-circle",
    label: "Color Circles",
    fieldType: "COMBOBOX",
    icon: "circle-icon",
    category: "combos",
    description: "Circular color picker",
    defaultConfig: {
      render: "field",
      fieldType: "COMBOBOX",
      grid: 12,
      combo: {
        id: null,
        type: "CIRCLE",
        source: "",
        dynamic: false,
        defaultValue: null,
        code: null,
        content: null,
      },
      variables: [],
      descriptions: [],
      dependencies: [],
    },
  },
  {
    id: "combo-column",
    label: "Column Layout",
    fieldType: "COMBOBOX",
    icon: "column-icon",
    category: "combos",
    description: "Grid selection with icons",
    defaultConfig: {
      render: "field",
      fieldType: "COMBOBOX",
      grid: 12,
      combo: {
        id: null,
        type: "COLUMN",
        source: "",
        dynamic: false,
        defaultValue: null,
        code: null,
        content: null,
      },
      variables: [],
      descriptions: [],
      dependencies: [],
    },
  },
  {
    id: "combo-dropdown",
    label: "Searchable Dropdown",
    fieldType: "COMBOBOX",
    icon: "dropdown-icon",
    category: "combos",
    description: "Dropdown with search",
    defaultConfig: {
      render: "field",
      fieldType: "COMBOBOX",
      grid: 12,
      combo: {
        id: null,
        type: "DROPDOWN",
        source: "",
        dynamic: false,
        defaultValue: null,
        code: null,
        content: null,
      },
      variables: [],
      descriptions: [],
      dependencies: [],
    },
  },
];

export const SECTION_TEMPLATES = [
  {
    id: "section-basic",
    label: "Basic Section",
    type: "NONE",
    icon: "section-icon",
    category: "containers",
    description: "Simple container section",
    defaultConfig: {
      render: "section",
      type: "NONE",
      children: [],
    },
  },
  {
    id: "section-accordion",
    label: "Accordion Section",
    type: "ACCORDION",
    icon: "accordion-icon",
    category: "containers",
    description: "Collapsible section",
    defaultConfig: {
      render: "section",
      type: "ACCORDION",
      children: [],
    },
  },
  {
    id: "section-tab",
    label: "Tab Container",
    type: "TAB",
    icon: "tab-icon",
    category: "containers",
    description: "Tab container",
    defaultConfig: {
      render: "TAB",
      type: "TAB",
      children: [],
    },
  },
];

// Template categories for UI organization
export const TEMPLATE_CATEGORIES = {
  inputs: {
    label: "Input Fields",
    icon: "inputs-icon",
    templates: FIELD_TEMPLATES,
  },
  combos: {
    label: "Selection Fields",
    icon: "combos-icon",
    templates: COMBO_TEMPLATES,
  },
  containers: {
    label: "Containers",
    icon: "containers-icon",
    templates: SECTION_TEMPLATES,
  },
};

// Helper functions
export const getTemplateById = (id) => {
  const allTemplates = [
    ...FIELD_TEMPLATES,
    ...COMBO_TEMPLATES,
    ...SECTION_TEMPLATES,
  ];
  return allTemplates.find((template) => template.id === id);
};

export const getTemplatesByCategory = (category) => {
  const allTemplates = [
    ...FIELD_TEMPLATES,
    ...COMBO_TEMPLATES,
    ...SECTION_TEMPLATES,
  ];
  return allTemplates.filter((template) => template.category === category);
};

export const createElementFromTemplate = (templateId, customProps = {}) => {
  const template = getTemplateById(templateId);
  if (!template) return null;

  const uniqueId = Date.now() + Math.random();

  return {
    id: Math.floor(uniqueId),
    name: `FIELD_${Math.floor(uniqueId)}`,
    label: "New Field",
    ...template.defaultConfig,
    ...customProps,
    // Update nested IDs
    input: template.defaultConfig.input
      ? {
          ...template.defaultConfig.input,
          id: Math.floor(uniqueId) + 1,
        }
      : undefined,
    combo: template.defaultConfig.combo
      ? {
          ...template.defaultConfig.combo,
          id: Math.floor(uniqueId) + 2,
        }
      : undefined,
  };
};
