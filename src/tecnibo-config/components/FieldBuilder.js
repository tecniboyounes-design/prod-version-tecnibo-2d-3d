import { useState, useEffect } from "react";
import { ConfigurationAPI } from "../lib/configurator";
import { SmartDependencyMapper } from "../lib/smartMapping";

export default function EnhancedFieldBuilder({ articleType, onSave }) {
  const [fields, setFields] = useState([]);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [newField, setNewField] = useState(getEmptyField());
  const [errors, setErrors] = useState([]);

  // State for manual mapping builder
  const [manualMappingMode, setManualMappingMode] = useState(false);
  const [currentMapping, setCurrentMapping] = useState({});
  const [smartPreview, setSmartPreview] = useState({});

  // State for data input methods
  const [dataInputMethod, setDataInputMethod] = useState("visual");
  const [dataFormat, setDataFormat] = useState("object");
  const [jsonInput, setJsonInput] = useState("[]");
  const [jsonErrors, setJsonErrors] = useState([]);

  const sections = ConfigurationAPI.getSections();
  const sampleData = ConfigurationAPI.getSampleData();
  const dependencyConditions = ConfigurationAPI.getDependencyConditions();

  function getEmptyField() {
    return {
      fieldKey: "",
      label: "",
      property: "",
      type: "select",
      section: "general",
      order: 1,
      values: [],
      required: false,
      dependencies: {},
      description: "",
      placeholder: "",
    };
  }

  useEffect(() => {
    loadConfiguration();
  }, [articleType]);

  // Update JSON input when values change from visual editor
  useEffect(() => {
    if (dataInputMethod === "json" && newField.values) {
      setJsonInput(JSON.stringify(newField.values, null, 2));
    }
  }, [newField.values, dataInputMethod]);

  const loadConfiguration = () => {
    try {
      const existing = ConfigurationAPI.getConfiguration(articleType);
      setFields(existing);
      setErrors([]);
    } catch (error) {
      setErrors([`Failed to load configuration: ${error.message}`]);
    }
  };

  const validateAndSave = (fieldsToSave) => {
    const validationErrors =
      ConfigurationAPI.validateConfiguration(fieldsToSave);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return false;
    }

    const success = ConfigurationAPI.saveConfiguration(
      articleType,
      fieldsToSave
    );
    if (success) {
      setFields(fieldsToSave);
      onSave?.(fieldsToSave);
      setErrors([]);
      return true;
    } else {
      setErrors(["Failed to save configuration"]);
      return false;
    }
  };

  const addOrUpdateField = () => {
    if (!newField.fieldKey || !newField.label) {
      setErrors(["Field key and label are required"]);
      return;
    }

    const sanitizedField = {
      ...newField,
      fieldKey: newField.fieldKey.replace(/[^a-zA-Z0-9_]/g, ""),
      order: newField.order || fields.length + 1,
    };

    let updatedFields;

    if (editingIndex >= 0) {
      // Update existing field
      updatedFields = [...fields];
      updatedFields[editingIndex] = sanitizedField;
    } else {
      // Add new field
      updatedFields = [...fields, sanitizedField];
    }

    if (validateAndSave(updatedFields)) {
      resetForm();
    }
  };

  const removeField = (index) => {
    const updated = fields.filter((_, i) => i !== index);
    validateAndSave(updated);

    // Reset edit mode if we're editing the deleted field
    if (editingIndex === index) {
      resetForm();
    }
  };

  const editField = (index) => {
    const fieldToEdit = { ...fields[index] };
    setNewField(fieldToEdit);
    setEditingIndex(index);

    // Set up data input state
    setJsonInput(JSON.stringify(fieldToEdit.values || [], null, 2));
    setDataFormat(
      fieldToEdit.values &&
        fieldToEdit.values.length > 0 &&
        typeof fieldToEdit.values[0] === "object"
        ? "object"
        : "simple"
    );

    // Set up mapping mode if field has manual mapping
    if (
      fieldToEdit.dependencies?.values?.type === "manual" &&
      fieldToEdit.dependencies.values.mapping
    ) {
      setManualMappingMode(true);
      setCurrentMapping(fieldToEdit.dependencies.values.mapping);
    } else {
      setManualMappingMode(false);
      setCurrentMapping({});
    }

    setSmartPreview({});
    setJsonErrors([]);
  };

  const resetForm = () => {
    setNewField(getEmptyField());
    setEditingIndex(-1);
    setCurrentMapping({});
    setManualMappingMode(false);
    setSmartPreview({});
    setErrors([]);
    setJsonInput("[]");
    setJsonErrors([]);
    setDataInputMethod("visual");
    setDataFormat("object");
  };

  const duplicateField = (index) => {
    const fieldToDuplicate = { ...fields[index] };
    fieldToDuplicate.fieldKey = `${fieldToDuplicate.fieldKey}_copy`;
    fieldToDuplicate.label = `${fieldToDuplicate.label} (Copy)`;
    fieldToDuplicate.order = fields.length + 1;

    setNewField(fieldToDuplicate);
    setEditingIndex(-1);
    setJsonInput(JSON.stringify(fieldToDuplicate.values || [], null, 2));

    if (fieldToDuplicate.dependencies?.values?.mapping) {
      setManualMappingMode(true);
      setCurrentMapping(fieldToDuplicate.dependencies.values.mapping);
    }
  };

  // Enhanced dependency management
  const addValueDependency = (type) => {
    if (type === "manual") {
      setNewField({
        ...newField,
        dependencies: {
          ...newField.dependencies,
          values: {
            field: "",
            mapping: {},
            defaultValues: [],
            type: "manual",
          },
        },
      });
      setManualMappingMode(true);
    } else if (type === "smart") {
      setNewField({
        ...newField,
        dependencies: {
          ...newField.dependencies,
          values: {
            field: "",
            defaultValues: [],
            type: "smart",
          },
        },
      });
      setManualMappingMode(false);
      setSmartPreview({});
    }
  };

  const removeDependency = (type) => {
    const newDeps = { ...newField.dependencies };
    if (type === "visibility") {
      delete newDeps.visibility;
    } else if (type === "values") {
      delete newDeps.values;
      setManualMappingMode(false);
      setCurrentMapping({});
      setSmartPreview({});
    }

    setNewField({ ...newField, dependencies: newDeps });
  };

  // Manual mapping builder functions
  const addMappingEntry = () => {
    const dependentField = fields.find(
      (f) => f.fieldKey === newField.dependencies.values?.field
    );
    if (!dependentField || !dependentField.values) return;

    const dependentValues = dependentField.values;
    const firstValue =
      Array.isArray(dependentValues) && dependentValues.length > 0
        ? typeof dependentValues[0] === "object"
          ? dependentValues[0].value ||
            dependentValues[0].code ||
            dependentValues[0].id ||
            dependentValues[0].name
          : dependentValues[0]
        : "";

    if (firstValue && !currentMapping[firstValue]) {
      setCurrentMapping({
        ...currentMapping,
        [firstValue]: [],
      });
    }
  };

  const updateMappingEntry = (key, values) => {
    setCurrentMapping({
      ...currentMapping,
      [key]: values
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v),
    });
  };

  const removeMappingEntry = (key) => {
    const newMapping = { ...currentMapping };
    delete newMapping[key];
    setCurrentMapping(newMapping);
  };

  const applyManualMapping = () => {
    setNewField({
      ...newField,
      dependencies: {
        ...newField.dependencies,
        values: {
          ...newField.dependencies.values,
          mapping: currentMapping,
        },
      },
    });
  };

  // Smart mapping preview
  const showSmartPreview = async () => {
    const dependentField = fields.find(
      (f) => f.fieldKey === newField.dependencies.values?.field
    );
    if (!dependentField || !newField.values) return;

    try {
      const mapper = new SmartDependencyMapper();
      const preview = mapper.generateSmartMapping(
        dependentField.values || [],
        newField.values || [],
        { maxOptionsPerValue: 5, allowFallback: true }
      );
      setSmartPreview(preview || {});
    } catch (error) {
      setErrors([`Smart mapping preview failed: ${error.message}`]);
    }
  };

  // Data input helper functions
  const addNewDataEntry = () => {
    const currentValues = newField.values || [];
    const newEntry =
      dataFormat === "simple" ? "" : { value: "", label: "", category: "" };

    setNewField({
      ...newField,
      values: [...currentValues, newEntry],
    });
  };

  const updateDataEntry = (index, property, value) => {
    const currentValues = [...(newField.values || [])];
    if (currentValues[index] && typeof currentValues[index] === "object") {
      currentValues[index] = {
        ...currentValues[index],
        [property]: value,
      };
      setNewField({ ...newField, values: currentValues });
    }
  };

  const updateSimpleDataEntry = (index, value) => {
    const currentValues = [...(newField.values || [])];
    currentValues[index] = value;
    setNewField({ ...newField, values: currentValues });
  };

  const removeDataEntry = (index) => {
    const currentValues = [...(newField.values || [])];
    currentValues.splice(index, 1);
    setNewField({ ...newField, values: currentValues });
  };

  const handleJSONInput = (e) => {
    const value = e.target.value;
    setJsonInput(value);

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        setNewField({ ...newField, values: parsed });
        setJsonErrors([]);
      } else {
        setJsonErrors(["Input must be a JSON array"]);
      }
    } catch (error) {
      setJsonErrors([`Invalid JSON: ${error.message}`]);
    }
  };

  const validateJSON = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const errors = [];

      if (!Array.isArray(parsed)) {
        errors.push("Root element must be an array");
        setJsonErrors(errors);
        return;
      }

      // Validate array elements
      parsed.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          if (!item.value && !item.code && !item.id && !item.name) {
            errors.push(
              `Item ${
                index + 1
              }: Missing value property (value, code, id, or name)`
            );
          }
        } else if (typeof item !== "string" && typeof item !== "number") {
          errors.push(`Item ${index + 1}: Must be string, number, or object`);
        }
      });

      setJsonErrors(errors);

      if (errors.length === 0) {
        setNewField({ ...newField, values: parsed });
      }
    } catch (error) {
      setJsonErrors([`Invalid JSON: ${error.message}`]);
    }
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonInput(formatted);
      setJsonErrors([]);
    } catch (error) {
      setJsonErrors([`Cannot format invalid JSON: ${error.message}`]);
    }
  };

  const setJSONExample = (type) => {
    let example = [];

    switch (type) {
      case "simple":
        example = ["Option 1", "Option 2", "Option 3"];
        break;
      case "objects":
        example = [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
          { value: "opt3", label: "Option 3" },
        ];
        break;
      case "complex":
        example = [
          {
            id: 1,
            name: "Premium Option",
            value: "premium",
            category: "high-end",
            properties: { price: 100, quality: "excellent" },
          },
          {
            id: 2,
            name: "Standard Option",
            value: "standard",
            category: "mid-range",
            properties: { price: 50, quality: "good" },
          },
        ];
        break;
    }

    const formatted = JSON.stringify(example, null, 2);
    setJsonInput(formatted);
    setNewField({ ...newField, values: example });
    setJsonErrors([]);
  };

  // Convert data format when switching
  const handleDataFormatChange = (newFormat) => {
    setDataFormat(newFormat);

    if (!newField.values || newField.values.length === 0) return;

    if (newFormat === "simple") {
      // Convert objects to simple values
      const simpleValues = newField.values.map((item) => {
        if (typeof item === "object" && item !== null) {
          return (
            item.value || item.code || item.id || item.name || String(item)
          );
        }
        return String(item);
      });
      setNewField({ ...newField, values: simpleValues });
    } else if (newFormat === "object") {
      // Convert simple values to objects
      const objectValues = newField.values.map((item) => {
        if (typeof item === "object" && item !== null) {
          return item;
        }
        return { value: String(item), label: String(item) };
      });
      setNewField({ ...newField, values: objectValues });
    }
  };

  const getAvailableValuesForMapping = (dependentFieldKey) => {
    const dependentField = fields.find((f) => f.fieldKey === dependentFieldKey);
    if (!dependentField || !dependentField.values) return [];

    return dependentField.values.map((item) =>
      typeof item === "object"
        ? item.value || item.code || item.id || item.name || String(item)
        : String(item)
    );
  };

  return (
    <div className="enhanced-field-builder">
      <div className="builder-header">
        <h3>
          {editingIndex >= 0 ? "Edit" : "Add"} Field - {articleType}
        </h3>
        {editingIndex >= 0 && (
          <button onClick={resetForm} className="cancel-edit-btn">
            Cancel Edit
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="errors">
          {errors.map((error, i) => (
            <div key={i} className="error">
              {error}
            </div>
          ))}
        </div>
      )}

      <div className="builder-form">
        {/* Basic field information */}
        <div className="form-section">
          <h4>Basic Information</h4>
          <div className="form-row">
            <input
              placeholder="Field Key (e.g., glassTypes)"
              value={newField.fieldKey}
              onChange={(e) =>
                setNewField({ ...newField, fieldKey: e.target.value })
              }
            />
            <input
              placeholder="Label (e.g., Glass Types)"
              value={newField.label}
              onChange={(e) =>
                setNewField({ ...newField, label: e.target.value })
              }
            />
          </div>

          <div className="form-row">
            <input
              placeholder="Property path (e.g., glass.types)"
              value={newField.property}
              onChange={(e) =>
                setNewField({ ...newField, property: e.target.value })
              }
            />
            <select
              value={newField.type}
              onChange={(e) =>
                setNewField({ ...newField, type: e.target.value })
              }
            >
              <option value="select">Select</option>
              <option value="number">Number</option>
              <option value="text">Text</option>
              <option value="textarea">Textarea</option>
              <option value="checkbox">Checkbox</option>
            </select>
          </div>

          <div className="form-row">
            <select
              value={newField.section}
              onChange={(e) =>
                setNewField({ ...newField, section: e.target.value })
              }
            >
              {Object.entries(sections).map(([key, section]) => (
                <option key={key} value={key}>
                  {section.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Order"
              value={newField.order}
              onChange={(e) =>
                setNewField({
                  ...newField,
                  order: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>

          <div className="form-row">
            <input
              placeholder="Description (optional)"
              value={newField.description}
              onChange={(e) =>
                setNewField({ ...newField, description: e.target.value })
              }
            />
            <input
              placeholder="Placeholder (optional)"
              value={newField.placeholder}
              onChange={(e) =>
                setNewField({ ...newField, placeholder: e.target.value })
              }
            />
          </div>
        </div>

        {/* Enhanced Values section for select fields */}
        {newField.type === "select" && (
          <div className="form-section values-section">
            <h4>Values</h4>

            {/* Sample Data Buttons */}
            <div className="sample-data-buttons">
              {Object.entries(sampleData).map(([key, data]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setNewField({ ...newField, values: data });
                    setJsonInput(JSON.stringify(data, null, 2));
                    setJsonErrors([]);
                  }}
                  className="sample-data-btn"
                >
                  Use {key.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {/* Data Input Methods Toggle */}
            <div className="input-method-tabs">
              <button
                type="button"
                className={`tab-btn ${
                  dataInputMethod === "visual" ? "active" : ""
                }`}
                onClick={() => setDataInputMethod("visual")}
              >
                Visual Editor
              </button>
              <button
                type="button"
                className={`tab-btn ${
                  dataInputMethod === "json" ? "active" : ""
                }`}
                onClick={() => setDataInputMethod("json")}
              >
                JSON Editor
              </button>
            </div>

            {/* Visual Data Input */}
            {dataInputMethod === "visual" && (
              <div className="visual-data-editor">
                <div className="data-entry-header">
                  <h5>Add Values</h5>
                  <button
                    type="button"
                    onClick={addNewDataEntry}
                    className="add-entry-btn"
                  >
                    + Add Entry
                  </button>
                </div>

                <div className="data-entries">
                  {(newField.values || []).map((item, index) => (
                    <div key={index} className="data-entry">
                      <div className="entry-fields">
                        {typeof item === "object" && item !== null ? (
                          <div className="object-fields">
                            <input
                              type="text"
                              placeholder="Value/Code"
                              value={item.value || item.code || item.id || ""}
                              onChange={(e) =>
                                updateDataEntry(index, "value", e.target.value)
                              }
                            />
                            <input
                              type="text"
                              placeholder="Label/Name"
                              value={item.label || item.name || ""}
                              onChange={(e) =>
                                updateDataEntry(index, "label", e.target.value)
                              }
                            />
                            <input
                              type="text"
                              placeholder="Category (optional)"
                              value={item.category || ""}
                              onChange={(e) =>
                                updateDataEntry(
                                  index,
                                  "category",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Value"
                            value={String(item)}
                            onChange={(e) =>
                              updateSimpleDataEntry(index, e.target.value)
                            }
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDataEntry(index)}
                        className="remove-entry-btn"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {(!newField.values || newField.values.length === 0) && (
                    <div className="empty-data">
                      <p>No values added yet. Click "Add Entry" to start.</p>
                    </div>
                  )}
                </div>

                {/* Data Format Toggle */}
                <div className="data-format-toggle">
                  <label>
                    <input
                      type="radio"
                      name="dataFormat"
                      value="simple"
                      checked={dataFormat === "simple"}
                      onChange={(e) => handleDataFormatChange(e.target.value)}
                    />
                    Simple Values (strings)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="dataFormat"
                      value="object"
                      checked={dataFormat === "object"}
                      onChange={(e) => handleDataFormatChange(e.target.value)}
                    />
                    Object Values (with properties)
                  </label>
                </div>
              </div>
            )}

            {/* JSON Data Input */}
            {dataInputMethod === "json" && (
              <div className="json-data-editor">
                <div className="json-header">
                  <h5>JSON Data Editor</h5>
                  <div className="json-actions">
                    <button
                      type="button"
                      onClick={formatJSON}
                      className="format-btn"
                    >
                      Format JSON
                    </button>
                    <button
                      type="button"
                      onClick={validateJSON}
                      className="validate-btn"
                    >
                      Validate
                    </button>
                  </div>
                </div>

                <textarea
                  placeholder="Enter JSON array for values"
                  value={jsonInput}
                  onChange={handleJSONInput}
                  rows={8}
                  className={`json-textarea ${
                    jsonErrors.length > 0 ? "error" : ""
                  }`}
                />

                {jsonErrors.length > 0 && (
                  <div className="json-errors">
                    <h6>JSON Validation Errors:</h6>
                    <ul>
                      {jsonErrors.map((error, i) => (
                        <li key={i} className="json-error">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="json-examples">
                  <h6>Examples:</h6>
                  <div className="example-buttons">
                    <button
                      type="button"
                      onClick={() => setJSONExample("simple")}
                      className="example-btn"
                    >
                      Simple Array
                    </button>
                    <button
                      type="button"
                      onClick={() => setJSONExample("objects")}
                      className="example-btn"
                    >
                      Object Array
                    </button>
                    <button
                      type="button"
                      onClick={() => setJSONExample("complex")}
                      className="example-btn"
                    >
                      Complex Objects
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Data Preview */}
            {newField.values && newField.values.length > 0 && (
              <div className="data-preview">
                <h5>Data Preview ({newField.values.length} items)</h5>
                <div className="preview-items">
                  {newField.values.slice(0, 5).map((item, index) => (
                    <div key={index} className="preview-item">
                      {typeof item === "object" && item !== null ? (
                        <div>
                          <strong>
                            {item.value ||
                              item.code ||
                              item.id ||
                              `Item ${index + 1}`}
                          </strong>
                          {(item.label || item.name) && (
                            <span> - {item.label || item.name}</span>
                          )}
                          {item.category && (
                            <span className="category"> ({item.category})</span>
                          )}
                        </div>
                      ) : (
                        <span>{String(item)}</span>
                      )}
                    </div>
                  ))}
                  {newField.values.length > 5 && (
                    <div className="preview-more">
                      ... and {newField.values.length - 5} more items
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Dependencies Section */}
        <div className="form-section dependencies-section">
          <h4>Dependencies</h4>

          {/* Visibility Dependency */}
          <div className="dependency-group">
            <div className="dependency-header">
              <h5>Visibility Dependency</h5>
              {!newField.dependencies?.visibility ? (
                <button
                  type="button"
                  onClick={() =>
                    setNewField({
                      ...newField,
                      dependencies: {
                        ...newField.dependencies,
                        visibility: {
                          field: "",
                          condition: "equals",
                          value: "",
                        },
                      },
                    })
                  }
                  className="add-dependency-btn"
                >
                  Add Visibility Dependency
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => removeDependency("visibility")}
                  className="remove-dependency-btn"
                >
                  Remove
                </button>
              )}
            </div>

            {newField.dependencies?.visibility && (
              <div className="dependency-form">
                <div className="form-row">
                  <select
                    value={newField.dependencies.visibility.field}
                    onChange={(e) =>
                      setNewField({
                        ...newField,
                        dependencies: {
                          ...newField.dependencies,
                          visibility: {
                            ...newField.dependencies.visibility,
                            field: e.target.value,
                          },
                        },
                      })
                    }
                  >
                    <option value="">Select field...</option>
                    {fields.map((f) => (
                      <option key={f.fieldKey} value={f.fieldKey}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newField.dependencies.visibility.condition}
                    onChange={(e) =>
                      setNewField({
                        ...newField,
                        dependencies: {
                          ...newField.dependencies,
                          visibility: {
                            ...newField.dependencies.visibility,
                            condition: e.target.value,
                          },
                        },
                      })
                    }
                  >
                    {dependencyConditions.map((condition) => (
                      <option key={condition} value={condition}>
                        {condition.charAt(0).toUpperCase() + condition.slice(1)}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Value"
                    value={newField.dependencies.visibility.value}
                    onChange={(e) =>
                      setNewField({
                        ...newField,
                        dependencies: {
                          ...newField.dependencies,
                          visibility: {
                            ...newField.dependencies.visibility,
                            value: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Value Dependencies */}
          <div className="dependency-group">
            <div className="dependency-header">
              <h5>Value Dependencies</h5>
              {!newField.dependencies?.values ? (
                <div className="dependency-buttons">
                  <button
                    type="button"
                    onClick={() => addValueDependency("manual")}
                  >
                    Manual Mapping
                  </button>
                  <button
                    type="button"
                    onClick={() => addValueDependency("smart")}
                  >
                    Smart Mapping
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => removeDependency("values")}
                  className="remove-dependency-btn"
                >
                  Remove
                </button>
              )}
            </div>

            {newField.dependencies?.values && (
              <div className="dependency-form">
                <div className="dependency-type-indicator">
                  {newField.dependencies.values.type === "manual"
                    ? "Manual Mapping"
                    : "Smart Mapping"}
                </div>

                <div className="form-row">
                  <select
                    value={newField.dependencies.values.field}
                    onChange={(e) =>
                      setNewField({
                        ...newField,
                        dependencies: {
                          ...newField.dependencies,
                          values: {
                            ...newField.dependencies.values,
                            field: e.target.value,
                          },
                        },
                      })
                    }
                  >
                    <option value="">Select dependent field...</option>
                    {fields.map((f) => (
                      <option key={f.fieldKey} value={f.fieldKey}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Default values (comma separated)"
                    value={
                      newField.dependencies.values.defaultValues?.join(", ") ||
                      ""
                    }
                    onChange={(e) =>
                      setNewField({
                        ...newField,
                        dependencies: {
                          ...newField.dependencies,
                          values: {
                            ...newField.dependencies.values,
                            defaultValues: e.target.value
                              .split(",")
                              .map((v) => v.trim())
                              .filter((v) => v),
                          },
                        },
                      })
                    }
                  />
                </div>

                {/* Manual Mapping Builder */}
                {newField.dependencies.values.type === "manual" && (
                  <div className="manual-mapping-builder">
                    <div className="mapping-controls">
                      <button type="button" onClick={addMappingEntry}>
                        Add Mapping Entry
                      </button>
                      <button type="button" onClick={applyManualMapping}>
                        Apply Mapping
                      </button>
                    </div>

                    <div className="mapping-entries">
                      {Object.entries(currentMapping).map(([key, values]) => (
                        <div key={key} className="mapping-entry">
                          <label>When "{key}" is selected, show:</label>
                          <input
                            placeholder="Comma-separated options"
                            value={
                              Array.isArray(values) ? values.join(", ") : ""
                            }
                            onChange={(e) =>
                              updateMappingEntry(key, e.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => removeMappingEntry(key)}
                            className="remove-btn"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    {Object.keys(currentMapping).length > 0 && (
                      <details className="mapping-preview">
                        <summary>Current Mapping Preview</summary>
                        <pre>{JSON.stringify(currentMapping, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                )}

                {/* Smart Mapping Preview */}
                {newField.dependencies.values.type === "smart" && (
                  <div className="smart-mapping-preview">
                    <div className="smart-controls">
                      <button type="button" onClick={showSmartPreview}>
                        Preview Smart Mapping
                      </button>
                    </div>

                    {Object.keys(smartPreview).length > 0 && (
                      <div className="smart-preview-result">
                        <h6>Generated Smart Mapping:</h6>
                        {Object.entries(smartPreview).map(([key, values]) => (
                          <div key={key} className="smart-mapping-entry">
                            <strong>{key}</strong> → [
                            {Array.isArray(values) ? values.join(", ") : values}
                            ]
                          </div>
                        ))}
                        <details>
                          <summary>JSON Preview</summary>
                          <pre>{JSON.stringify(smartPreview, null, 2)}</pre>
                        </details>
                      </div>
                    )}

                    <details className="smart-mapping-explanation">
                      <summary>How Smart Mapping Works</summary>
                      <ul>
                        <li>
                          <strong>Pattern Recognition:</strong> Finds
                          relationships between field values automatically
                        </li>
                        <li>
                          <strong>ID Matching:</strong> Matches based on
                          producerId, categoryId, etc.
                        </li>
                        <li>
                          <strong>Name/Category Matching:</strong> Matches
                          similar names, categories, or codes
                        </li>
                        <li>
                          <strong>Fallback Logic:</strong> When no patterns
                          found, uses intelligent fallback strategies
                        </li>
                        <li>
                          <strong>Learning System:</strong> Gets smarter based
                          on user selections over time
                        </li>
                      </ul>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={newField.required}
              onChange={(e) =>
                setNewField({ ...newField, required: e.target.checked })
              }
            />
            Required
          </label>
          <button onClick={addOrUpdateField} className="primary-btn">
            {editingIndex >= 0 ? "Update Field" : "Add Field"}
          </button>
          {editingIndex >= 0 && (
            <button onClick={resetForm} className="secondary-btn">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Fields List */}
      <div className="fields-list">
        <div className="list-header">
          <h4>Current Fields ({fields.length})</h4>
          <div className="list-stats">
            {ConfigurationAPI.getConfigurationStats && (
              <span>
                Stats:{" "}
                {JSON.stringify(
                  ConfigurationAPI.getConfigurationStats(articleType),
                  null,
                  2
                )}
              </span>
            )}
          </div>
        </div>

        {fields.map((field, index) => (
          <div
            key={field.fieldKey}
            className={`field-item ${editingIndex === index ? "editing" : ""}`}
          >
            <div className="field-info">
              <div className="field-main">
                <strong>{field.label}</strong>
                <span className="field-key">({field.fieldKey})</span>
              </div>
              <div className="field-details">
                <span>{field.type}</span>
                <span>{field.section}</span>
                <span>Order: {field.order}</span>
                {field.required && (
                  <span className="required-indicator">Required</span>
                )}
                {field.dependencies?.values && (
                  <span className="dependency-indicator">
                    {field.dependencies.values.type === "manual"
                      ? "Manual Dep"
                      : "Smart Dep"}
                  </span>
                )}
                {field.dependencies?.visibility && (
                  <span className="dependency-indicator">Visibility Dep</span>
                )}
              </div>
              {field.description && (
                <div className="field-description">{field.description}</div>
              )}
            </div>
            <div className="field-actions">
              <button onClick={() => editField(index)} className="edit-btn">
                Edit
              </button>
              <button
                onClick={() => duplicateField(index)}
                className="duplicate-btn"
              >
                Duplicate
              </button>
              <button onClick={() => removeField(index)} className="remove-btn">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
