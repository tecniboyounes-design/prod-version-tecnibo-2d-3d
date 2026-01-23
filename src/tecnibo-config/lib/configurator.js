import { SmartDependencyMapper } from "./smartMapping";

const MAPPING_CONFIGS = {
  colors: {
    valueKeys: ["code", "value", "id"],
    labelKeys: ["name", "label", "title"],
    fallbackToValue: true,
  },
  performance: {
    valueKeys: ["value", "code"],
    labelKeys: ["label", "name"],
    fallbackToValue: true,
  },
  default: {
    valueKeys: ["value", "code", "id", "key"],
    labelKeys: ["label", "name", "title", "text"],
    fallbackToValue: true,
  },
};

const SECTIONS = {
  general: { name: "General", order: 1 },
  dimensions: { name: "Dimensions", order: 2 },
  glass: { name: "Glass", order: 3 },
  accessories: { name: "Accessories", order: 4 },
  advanced: { name: "Advanced", order: 5 },
};

const DEPENDENCY_CONDITIONS = {
  equals: (fieldValue, targetValue) => fieldValue === targetValue,
  notEquals: (fieldValue, targetValue) => fieldValue !== targetValue,
  includes: (fieldValue, targetValue) =>
    Array.isArray(targetValue) ? targetValue.includes(fieldValue) : false,
  notIncludes: (fieldValue, targetValue) =>
    Array.isArray(targetValue) ? !targetValue.includes(fieldValue) : true,
  greaterThan: (fieldValue, targetValue) =>
    parseFloat(fieldValue) > parseFloat(targetValue),
  lessThan: (fieldValue, targetValue) =>
    parseFloat(fieldValue) < parseFloat(targetValue),
};

// Enhanced data processing with better error handling
export const renderSelectOptions = (
  values,
  config = MAPPING_CONFIGS.default
) => {
  if (!Array.isArray(values)) {
    console.warn("renderSelectOptions: values is not an array", values);
    return [];
  }

  return values
    .map((item, index) => {
      if (typeof item !== "object" || item === null) {
        return {
          key: `simple_${index}`,
          value: String(item),
          label: String(item),
          original: item,
        };
      }

      let value = null,
        label = null;

      // Find value using config keys
      for (const key of config.valueKeys) {
        if (item[key] != null) {
          value = item[key];
          break;
        }
      }

      // Find label using config keys
      for (const key of config.labelKeys) {
        if (item[key] != null) {
          label = item[key];
          break;
        }
      }

      // Fallbacks
      value = value ?? Object.values(item)[0] ?? `value_${index}`;
      label = label ?? (config.fallbackToValue ? value : `Option ${index + 1}`);

      // Enhanced label formatting for common patterns
      if (item.code && item.name) {
        label = `${item.code} - ${item.name}`;
      } else if (item.id && item.name && typeof item.id !== "string") {
        label = `#${item.id} ${item.name}`;
      }

      return {
        key: `object_${index}`,
        value: String(value),
        label: String(label),
        original: item,
      };
    })
    .filter((option) => option.value); // Remove empty values
};

class DependencyEngine {
  static evaluateVisibility(field, formValues) {
    if (!field.dependencies?.visibility) return true;

    try {
      const {
        field: dependencyField,
        condition,
        value,
      } = field.dependencies.visibility;
      const fieldValue = formValues[dependencyField];
      const conditionFn = DEPENDENCY_CONDITIONS[condition];

      if (!conditionFn) {
        console.warn(`Unknown condition: ${condition}`);
        return true;
      }

      return conditionFn(fieldValue, value);
    } catch (error) {
      console.error("Error evaluating visibility:", error);
      return true;
    }
  }

  static resolveValues(field, formValues, allFields = []) {
    if (!field.dependencies?.values) return field.values;

    try {
      const {
        field: dependencyField,
        mapping,
        defaultValues,
        type,
      } = field.dependencies.values;
      const fieldValue = formValues[dependencyField];

      // Handle smart mapping
      if (type === "smart") {
        return this.resolveSmartValues(field, formValues, allFields);
      }

      // Handle manual mapping
      if (mapping && fieldValue && mapping[fieldValue]) {
        return mapping[fieldValue];
      }

      // Return default values or field values
      return defaultValues || field.values;
    } catch (error) {
      console.error("Error resolving values:", error);
      return field.values;
    }
  }

  static resolveSmartValues(field, formValues, allFields) {
    try {
      const dependencyConfig = field.dependencies.values;
      const dependentField = allFields.find(
        (f) => f.fieldKey === dependencyConfig.field
      );

      if (!dependentField || !formValues[dependencyConfig.field]) {
        return dependencyConfig.defaultValues || field.values;
      }

      const mapper = new SmartDependencyMapper();
      const smartMapping = mapper.generateSmartMapping(
        dependentField.values || [],
        field.values || [],
        {
          maxOptionsPerValue: 8,
          allowFallback: true,
          enableLearning: true,
        }
      );

      const selectedValue = formValues[dependencyConfig.field];
      const mappedValues = smartMapping[selectedValue];

      if (mappedValues && mappedValues.length > 0) {
        // Convert back to objects if needed
        return field.values.filter((item) => {
          const itemValue =
            typeof item === "object"
              ? item.value || item.code || item.id || item.name
              : item;
          return mappedValues.includes(String(itemValue));
        });
      }

      return dependencyConfig.defaultValues || field.values;
    } catch (error) {
      console.error("Error resolving smart values:", error);
      return field.values;
    }
  }

  static buildDependencyGraph(fields) {
    const graph = {};

    if (!Array.isArray(fields)) return graph;

    fields.forEach((field) => {
      const deps = [];

      if (field.dependencies?.visibility?.field) {
        deps.push(field.dependencies.visibility.field);
      }

      if (field.dependencies?.values?.field) {
        deps.push(field.dependencies.values.field);
      }

      if (deps.length > 0) {
        graph[field.fieldKey] = [...new Set(deps)];
      }
    });

    return graph;
  }

  static getAffectedFields(changedFieldKey, fields) {
    if (!Array.isArray(fields)) return [];

    const graph = this.buildDependencyGraph(fields);
    const affected = [];

    Object.entries(graph).forEach(([fieldKey, dependencies]) => {
      if (dependencies.includes(changedFieldKey)) {
        affected.push(fieldKey);
      }
    });

    return affected;
  }
}

// Enhanced sample data with relationships
const SAMPLE_DATA = {
  RAL_COLORS: [
    { code: "RAL 9016", name: "Traffic White", category: "white" },
    { code: "RAL 9010", name: "Pure White", category: "white" },
    { code: "RAL 9005", name: "Jet Black", category: "black" },
    { code: "RAL 7016", name: "Anthracite Grey", category: "grey" },
    { code: "RAL 6018", name: "Yellow Green", category: "green" },
  ],

  PRODUCERS: [
    { id: 1, name: "Wood Master", category: "wood", specialty: "hardwood" },
    { id: 2, name: "Metal Works", category: "metal", specialty: "aluminum" },
    { id: 3, name: "Poly Tech", category: "plastic", specialty: "pvc" },
    { id: 4, name: "Glass Pro", category: "glass", specialty: "tempered" },
  ],

  MATERIALS: [
    {
      value: "Oak",
      label: "Oak Wood",
      producerId: 1,
      category: "wood",
      type: "hardwood",
    },
    {
      value: "Pine",
      label: "Pine Wood",
      producerId: 1,
      category: "wood",
      type: "softwood",
    },
    {
      value: "Aluminum",
      label: "Aluminum Alloy",
      producerId: 2,
      category: "metal",
      type: "lightweight",
    },
    {
      value: "Steel",
      label: "Stainless Steel",
      producerId: 2,
      category: "metal",
      type: "heavy",
    },
    {
      value: "PVC",
      label: "PVC Plastic",
      producerId: 3,
      category: "plastic",
      type: "rigid",
    },
    {
      value: "Polyethylene",
      label: "PE Plastic",
      producerId: 3,
      category: "plastic",
      type: "flexible",
    },
    {
      value: "Tempered",
      label: "Tempered Glass",
      producerId: 4,
      category: "glass",
      type: "safety",
    },
    {
      value: "Laminated",
      label: "Laminated Glass",
      producerId: 4,
      category: "glass",
      type: "security",
    },
  ],

  V100_GLASS_TYPES: [
    {
      value: "Clear",
      label: "Clear Glass",
      thickness: "4mm",
      category: "standard",
    },
    {
      value: "Extra Clear",
      label: "Extra Clear Glass",
      thickness: "6mm",
      category: "premium",
    },
    {
      value: "Tempered",
      label: "Tempered Glass",
      thickness: "8mm",
      category: "safety",
    },
    {
      value: "Laminated",
      label: "Laminated Glass",
      thickness: "10mm",
      category: "security",
    },
  ],

  V100_STEP_MODULATION: [
    { value: "750", label: "750mm", range: [700, 800] },
    { value: "800", label: "800mm", range: [750, 850] },
    { value: "850", label: "850mm", range: [800, 900] },
    { value: "900", label: "900mm", range: [850, 950] },
  ],

  V100_STORES: [
    { value: "None", label: "No Store", compatibility: ["all"] },
    {
      value: "Venetian25",
      label: "Venetian Blind Alu 25",
      compatibility: ["750", "800"],
    },
    {
      value: "Electric",
      label: "Electric Blind",
      compatibility: ["800", "850", "900"],
    },
    {
      value: "Manual",
      label: "Manual Blind",
      compatibility: ["800", "850", "900"],
    },
  ],

  FINISHES: [
    {
      value: "Mat",
      label: "Matte Finish",
      durability: "medium",
      category: "standard",
    },
    {
      value: "Glossy",
      label: "Glossy Finish",
      durability: "high",
      category: "premium",
    },
    {
      value: "Textured",
      label: "Textured Finish",
      durability: "high",
      category: "special",
    },
    {
      value: "Satin",
      label: "Satin Finish",
      durability: "medium",
      category: "premium",
    },
  ],
};

// Safe localStorage operations
const loadConfigurations = () => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem("articleConfigurations");
      return saved ? JSON.parse(saved) : {};
    }
  } catch (error) {
    console.warn("Failed to load configurations:", error);
  }
  return {};
};

const saveConfigurations = (configs) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("articleConfigurations", JSON.stringify(configs));
    }
  } catch (error) {
    console.warn("Failed to save configurations:", error);
  }
};

// Enhanced default configurations
const DEFAULT_CONFIGURATIONS = {
  V100: [
    {
      fieldKey: "producer",
      label: "Producer",
      property: "general.producer",
      type: "select",
      section: "general",
      order: 1,
      values: SAMPLE_DATA.PRODUCERS,
      mappingConfig: MAPPING_CONFIGS.default,
      required: true,
    },
    {
      fieldKey: "material",
      label: "Material",
      property: "general.material",
      type: "select",
      section: "general",
      order: 2,
      values: SAMPLE_DATA.MATERIALS,
      dependencies: {
        values: {
          field: "producer",
          type: "smart",
          defaultValues: [],
        },
      },
    },
    {
      fieldKey: "glassTypes",
      label: "Glass Types",
      property: "glass.types",
      type: "select",
      section: "glass",
      order: 3,
      values: SAMPLE_DATA.V100_GLASS_TYPES,
      mappingConfig: MAPPING_CONFIGS.default,
      required: true,
    },
    {
      fieldKey: "stepsModulation",
      label: "Steps Modulation",
      property: "glass.steps",
      type: "select",
      section: "glass",
      order: 4,
      values: SAMPLE_DATA.V100_STEP_MODULATION,
      dependencies: {
        visibility: {
          field: "glassTypes",
          condition: "notEquals",
          value: "Clear",
        },
      },
    },
    {
      fieldKey: "stores",
      label: "Stores",
      property: "accessories.stores",
      type: "select",
      section: "accessories",
      order: 5,
      values: SAMPLE_DATA.V100_STORES,
      dependencies: {
        values: {
          field: "stepsModulation",
          type: "smart",
          defaultValues: ["None"],
        },
      },
    },
  ],
};

export class ConfigurationAPI {
  static getConfiguration(articleType) {
    try {
      const customConfigs = loadConfigurations();
      const config =
        customConfigs[articleType] || DEFAULT_CONFIGURATIONS[articleType] || [];

      // Sort by section order first, then by field order
      return config.sort((a, b) => {
        const sectionA = SECTIONS[a.section?.toLowerCase()]?.order || 999;
        const sectionB = SECTIONS[b.section?.toLowerCase()]?.order || 999;
        if (sectionA !== sectionB) return sectionA - sectionB;
        return (a.order || 999) - (b.order || 999);
      });
    } catch (error) {
      console.error("Error getting configuration:", error);
      return [];
    }
  }

  static saveConfiguration(articleType, fields) {
    try {
      const customConfigs = loadConfigurations();
      customConfigs[articleType] = fields;
      saveConfigurations(customConfigs);
      return true;
    } catch (error) {
      console.error("Error saving configuration:", error);
      return false;
    }
  }

  static getVisibleFields(fields, formValues) {
    if (!Array.isArray(fields)) return [];

    return fields.filter((field) => {
      try {
        return DependencyEngine.evaluateVisibility(field, formValues);
      } catch (error) {
        console.error(
          `Error evaluating visibility for field ${field.fieldKey}:`,
          error
        );
        return true;
      }
    });
  }

  static getFieldValues(field, formValues, allFields = []) {
    try {
      return DependencyEngine.resolveValues(field, formValues, allFields);
    } catch (error) {
      console.error(`Error getting field values for ${field.fieldKey}:`, error);
      return field.values || [];
    }
  }

  // Keep the old method for backward compatibility but fix the constructor issue
  static getFieldValuesWithSmart(field, formValues, allFields = []) {
    return this.getFieldValues(field, formValues, allFields);
  }

  static getAffectedFields(changedFieldKey, fields) {
    try {
      return DependencyEngine.getAffectedFields(changedFieldKey, fields);
    } catch (error) {
      console.error("Error getting affected fields:", error);
      return [];
    }
  }

  static getSampleData() {
    return SAMPLE_DATA;
  }

  static getSections() {
    return SECTIONS;
  }

  static getMappingConfigs() {
    return MAPPING_CONFIGS;
  }

  static getDependencyConditions() {
    return Object.keys(DEPENDENCY_CONDITIONS);
  }

  // Validation methods
  static validateField(field) {
    const errors = [];

    if (!field.fieldKey) errors.push("Field key is required");
    if (!field.label) errors.push("Label is required");
    if (!field.type) errors.push("Type is required");

    if (field.dependencies?.visibility) {
      const vis = field.dependencies.visibility;
      if (!vis.field) errors.push("Visibility dependency field is required");
      if (!vis.condition)
        errors.push("Visibility dependency condition is required");
    }

    if (field.dependencies?.values) {
      const vals = field.dependencies.values;
      if (!vals.field) errors.push("Value dependency field is required");
    }

    return errors;
  }

  static validateConfiguration(fields) {
    if (!Array.isArray(fields)) return ["Configuration must be an array"];

    const errors = [];
    const fieldKeys = new Set();

    fields.forEach((field, index) => {
      if (fieldKeys.has(field.fieldKey)) {
        errors.push(`Duplicate field key: ${field.fieldKey}`);
      }
      fieldKeys.add(field.fieldKey);

      const fieldErrors = this.validateField(field);
      if (fieldErrors.length > 0) {
        errors.push(
          `Field ${index + 1} (${
            field.fieldKey || "unnamed"
          }): ${fieldErrors.join(", ")}`
        );
      }
    });

    return errors;
  }

  // Analytics and debugging
  static getConfigurationStats(articleType) {
    const config = this.getConfiguration(articleType);
    const stats = {
      totalFields: config.length,
      fieldsBySection: {},
      fieldsByType: {},
      fieldsWithDependencies: 0,
      smartDependencies: 0,
      manualDependencies: 0,
    };

    config.forEach((field) => {
      // Count by section
      const section = field.section || "other";
      stats.fieldsBySection[section] =
        (stats.fieldsBySection[section] || 0) + 1;

      // Count by type
      stats.fieldsByType[field.type] =
        (stats.fieldsByType[field.type] || 0) + 1;

      // Count dependencies
      if (field.dependencies) {
        stats.fieldsWithDependencies++;

        if (field.dependencies.values) {
          if (field.dependencies.values.type === "smart") {
            stats.smartDependencies++;
          } else {
            stats.manualDependencies++;
          }
        }
      }
    });

    return stats;
  }
}
