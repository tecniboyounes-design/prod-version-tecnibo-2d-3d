// components/FieldEditor.jsx
"use client";
import { useEffect, useState } from "react";
import DependencyEditor from "./DependencyEditor";
import axios from "axios";
import { queriesServices } from "../lib/services/queries";

const FieldEditor = ({ field, onSave, onCancel, schema = [] }) => {
  const [editField, setEditField] = useState(JSON.parse(JSON.stringify(field)));
  const [availableDataSources, setAvailableDataSources] = useState({});

  // Load data sources on component mount and listen for changes
  useEffect(() => {
    const loadDataSources = () => {
      const saved = localStorage.getItem("formBuilder-dataSources");
      if (saved) {
        try {
          setAvailableDataSources(JSON.parse(saved));
        } catch (e) {
          console.error("Error loading data sources:", e);
        }
      }
    };

    // Load initial data
    loadDataSources();

    // Listen for storage changes (from other tabs/components)
    const handleStorageChange = (e) => {
      if (e.key === "formBuilder-dataSources") {
        loadDataSources();
      }
    };

    // Listen for custom events (from same tab)
    const handleCustomStorageChange = (e) => {
      if (e.detail.key === "formBuilder-dataSources") {
        loadDataSources();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "localStorageChange",
        handleCustomStorageChange
      );
    };
  }, []);

  const fieldTypeOptions = [
    { value: "INPUT", label: "Input Field" },
    { value: "COMBOBOX", label: "Combo Box" },
    { value: "LOCAL", label: "Local Component" },
    { value: "CHECKBOX", label: "Checkbox" },
  ];

  const inputTypeOptions = [
    { value: "SLIDER", label: "Slider" },
    { value: "TEXT", label: "Text Input" },
    { value: "NUMBER", label: "Number Input" },
    { value: "CHECKBOX", label: "Checkbox" },
  ];

  const comboTypeOptions = [
    { value: "SWITCH", label: "Switch Toggle" },
    { value: "BUTTON", label: "Button Selection" },
    { value: "BUTTONAVATAR", label: "Button with Avatar" },
    { value: "CIRCLE", label: "Circle Selection" },
    { value: "COLUMN", label: "Column Layout" },
    { value: "DROPDOWN", label: "Dropdown" },
  ];

  const handleSave = () => {
    // Clone the field
    const cleanField = JSON.parse(JSON.stringify(editField));

    // If it's a COMBOBOX, clean up the combo object
    if (cleanField.combo) {
      const allowedKeys = [
        "id",
        "type",
        "source",
        "dynamic",
        "defaultValue",
        "code",
        "content",
        "searchable",
      ];

      // Keep only allowed keys
      cleanField.combo = Object.keys(cleanField.combo)
        .filter((key) => allowedKeys.includes(key))
        .reduce((obj, key) => {
          obj[key] = cleanField.combo[key];
          return obj;
        }, {});
    }

    onSave(cleanField);
  };

  const updateField = (updates) => {
    setEditField((prev) => ({ ...prev, ...updates }));
  };

  const updateInput = (updates) => {
    setEditField((prev) => ({
      ...prev,
      input: { ...prev.input, ...updates },
    }));
  };

  const updateCombo = (updates) => {
    console.log("Updating combo with:", updates);
    setEditField((prev) => ({
      ...prev,
      combo: { ...prev.combo, ...updates },
    }));
  };

  // Utility function to extract all fields AND sections from schema
  const getAllFieldsFromSchema = (schema) => {
    const items = [];

    const extractItems = (elements) => {
      elements.forEach((element) => {
        if (element.render === "field" && element.name) {
          items.push({
            id: element.id,
            name: element.name,
            label: element.label || element.name,
            type: "field",
          });
        }
        // ADD: Extract sections as dependency targets
        if (element.render === "section" && element.name) {
          items.push({
            id: element.id,
            name: element.name,
            label: element.label || element.name,
            type: "section",
          });
        }
        if (element.children) {
          extractItems(element.children);
        }
      });
    };

    extractItems(schema);
    return items;
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="font-semibold">Edit Field</h3>
          <div className="flex gap-2">
            <button onClick={handleSave} className="button button-primary">
              Save
            </button>
            <button onClick={onCancel} className="button button-secondary">
              Cancel
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Basic Properties */}
          <div className="grid grid-2 mb-4">
            <div>
              <label
                className="text-sm font-medium mb-2"
                style={{ display: "block" }}
              >
                Field Name
              </label>
              <input
                type="text"
                value={editField.name || ""}
                onChange={(e) => updateField({ name: e.target.value })}
                className="input"
                placeholder="e.g., HEIGHT, WIDTH"
              />
            </div>
            <div>
              <label
                className="text-sm font-medium mb-2"
                style={{ display: "block" }}
              >
                Label
              </label>
              <input
                type="text"
                value={editField.label || ""}
                onChange={(e) => updateField({ label: e.target.value })}
                className="input"
                placeholder="e.g., Height, Width"
              />
            </div>
          </div>
          <div className="grid grid-2 mb-4">
            <div>
              <label
                className="text-sm font-medium mb-2"
                style={{ display: "block" }}
              >
                Field Type
              </label>
              <select
                value={editField.fieldType || "INPUT"}
                onChange={(e) => updateField({ fieldType: e.target.value })}
                className="select"
              >
                {fieldTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="text-sm font-medium mb-2"
                style={{ display: "block" }}
              >
                Grid Width (1-12)
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={editField.grid || 12}
                onChange={(e) =>
                  updateField({ grid: parseInt(e.target.value) })
                }
                className="input"
              />
            </div>
          </div>
          {/* INPUT Configuration */}
          {editField.fieldType === "INPUT" && (
            <div className="card mb-4">
              <div className="card-header">
                <h4 className="font-medium">Input Configuration</h4>
              </div>
              <div className="card-body">
                <div className="grid grid-2 mb-4">
                  <div>
                    <label
                      className="text-sm font-medium mb-2"
                      style={{ display: "block" }}
                    >
                      Input Type
                    </label>
                    <select
                      value={editField.input?.type || "SLIDER"}
                      onChange={(e) => updateInput({ type: e.target.value })}
                      className="select"
                    >
                      {inputTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {editField.input?.type === "SLIDER" && (
                    <div>
                      <label
                        className="text-sm font-medium mb-2"
                        style={{ display: "block" }}
                      >
                        Default Value
                      </label>
                      <input
                        type="number"
                        value={editField.input?.defaultValue || ""}
                        onChange={(e) =>
                          updateInput({
                            defaultValue: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                        className="input"
                      />
                    </div>
                  )}
                </div>

                {editField.input?.type === "SLIDER" && (
                  <div className="grid grid-2">
                    <div>
                      <label
                        className="text-sm font-medium mb-2"
                        style={{ display: "block" }}
                      >
                        Min Value
                      </label>
                      <input
                        type="number"
                        value={editField.input?.min || 0}
                        onChange={(e) =>
                          updateInput({ min: parseInt(e.target.value) })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label
                        className="text-sm font-medium mb-2"
                        style={{ display: "block" }}
                      >
                        Max Value
                      </label>
                      <input
                        type="number"
                        value={editField.input?.max || 100}
                        onChange={(e) =>
                          updateInput({ max: parseInt(e.target.value) })
                        }
                        className="input"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* COMBOBOX Configuration */}
          {editField.fieldType === "COMBOBOX" && (
            <div className="card mb-4">
              <div className="card-header">
                <h4 className="font-medium">Combo Configuration</h4>
              </div>
              <div className="card-body">
                <div className="grid grid-2 mb-4">
                  <div>
                    <label
                      className="text-sm font-medium mb-2"
                      style={{ display: "block" }}
                    >
                      Combo Type
                    </label>
                    <select
                      value={editField.combo?.type || "SWITCH"}
                      onChange={(e) => updateCombo({ type: e.target.value })}
                      className="select"
                    >
                      {comboTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="text-sm font-medium mb-2"
                      style={{ display: "block" }}
                    >
                      Data Source
                    </label>
                    <select
                      value={editField.combo?.source || ""}
                      onChange={(e) => updateCombo({ source: e.target.value })}
                      className="select"
                    >
                      <option value="">Select data source...</option>
                      {Object.keys(availableDataSources).map((sourceName) => (
                        <option key={sourceName} value={sourceName}>
                          {sourceName} (
                          {availableDataSources[sourceName]?.length || 0} items)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-2">
                  <div>
                    <label
                      className="text-sm font-medium mb-2"
                      style={{ display: "block" }}
                    >
                      Default Value
                    </label>
                    <select
                      value={editField.combo?.defaultValue || ""}
                      onChange={(e) =>
                        updateCombo({ defaultValue: e.target.value })
                      }
                      className="select"
                      disabled={!editField.combo?.source}
                    >
                      <option value="">No default</option>
                      {(
                        availableDataSources[editField.combo?.source] || []
                      ).map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-center" style={{ paddingTop: "20px" }}>
                    <label className="flex-center gap-2">
                      <input
                        type="checkbox"
                        checked={editField.combo?.dynamic || false}
                        onChange={(e) =>
                          updateCombo({ dynamic: e.target.checked })
                        }
                      />
                      <span className="text-sm">Dynamic</span>
                    </label>
                    <label className="flex-center gap-2">
                      <input
                        type="checkbox"
                        checked={editField.combo?.searchable || false}
                        onChange={(e) =>
                          updateCombo({ searchable: e.target.checked })
                        }
                      />
                      <span className="text-sm">Searchable</span>
                    </label>
                  </div>

                  {editField.combo?.dynamic && (
                    <div className="card mt-4">
                      <div className="card-header">
                        <h5 className="font-medium">Dynamic Data Source</h5>
                      </div>
                      <div className="card-body">
                        <div className="mb-4">
                          <label
                            className="text-sm font-medium mb-2"
                            style={{ display: "block" }}
                          >
                            Source Type
                          </label>
                          <select
                            value={editField.combo?.sourceType || "query"}
                            onChange={(e) =>
                              updateCombo({ sourceType: e.target.value })
                            }
                            className="select"
                          >
                            <option value="query">Generate from Query</option>
                            <option value="endpoint">External Endpoint</option>
                          </select>
                        </div>

                        {editField.combo?.sourceType === "query" ? (
                          <>
                            <div className="mb-4">
                              <label
                                className="text-sm font-medium mb-2"
                                style={{ display: "block" }}
                              >
                                Database
                              </label>
                              <input
                                type="text"
                                value={editField.combo?.tempDatabase || ""}
                                onChange={(e) =>
                                  updateCombo({ tempDatabase: e.target.value })
                                }
                                className="input"
                                placeholder="e.g., imos"
                              />
                            </div>
                            <div className="mb-4">
                              <label
                                className="text-sm font-medium mb-2"
                                style={{ display: "block" }}
                              >
                                SQL Query
                              </label>
                              <textarea
                                value={editField.combo?.tempQuery || ""}
                                onChange={(e) =>
                                  updateCombo({ tempQuery: e.target.value })
                                }
                                className="input"
                                rows="4"
                                placeholder='SELECT "NAME" FROM public."DESCRIPTOR" ORDER BY "NAME" LIMIT 10'
                              />
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  const response =
                                    await queriesServices.executeQuery({
                                      db: editField.combo?.tempDatabase,
                                      query: editField.combo?.tempQuery,
                                    });
                                  const code = response.code || response.id;

                                  // Fetch preview data
                                  const previewResponse =
                                    await queriesServices.getPreviewData(code);
                                  const previewData = previewResponse;

                                  // Show preview temporarily (not saved to field)
                                  updateCombo({
                                    source: `meta/q/${code}`,
                                    tempPreview: previewData, // Temporary, won't be saved
                                    tempDatabase: undefined,
                                    tempQuery: undefined,
                                  });

                                  alert(`Endpoint generated: meta/q/${code}`);
                                } catch (error) {
                                  console.error("Error:", error);
                                  alert("Error generating endpoint");
                                }
                              }}
                              className="button button-primary"
                              disabled={
                                !editField.combo?.tempDatabase ||
                                !editField.combo?.tempQuery
                              }
                            >
                              Generate Endpoint
                            </button>

                            {editField.combo?.tempPreview && (
                              <div className="mt-4">
                                <label
                                  className="text-sm font-medium mb-2"
                                  style={{ display: "block" }}
                                >
                                  Query Preview (
                                  {editField.combo.tempPreview.rowsCount || 0}{" "}
                                  rows)
                                </label>
                                <div
                                  className="input"
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    maxHeight: "200px",
                                    overflow: "auto",
                                  }}
                                >
                                  <pre style={{ margin: 0, fontSize: "12px" }}>
                                    {JSON.stringify(
                                      editField.combo.tempPreview,
                                      null,
                                      2
                                    )}
                                  </pre>
                                </div>
                                <button
                                  onClick={() =>
                                    updateCombo({ tempPreview: undefined })
                                  }
                                  className="button button-secondary mt-2"
                                  style={{
                                    fontSize: "12px",
                                    padding: "4px 8px",
                                  }}
                                >
                                  Clear Preview
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="mb-4">
                            <label
                              className="text-sm font-medium mb-2"
                              style={{ display: "block" }}
                            >
                              Endpoint URL
                            </label>
                            <input
                              type="text"
                              value={editField.combo?.source || ""}
                              onChange={(e) =>
                                updateCombo({ source: e.target.value })
                              }
                              className="input"
                              placeholder="https://api.example.com/data"
                            />
                          </div>
                        )}
                        {editField.combo?.source && (
                          <>
                            <div className="grid grid-2 mb-4">
                              <div>
                                <label
                                  className="text-sm font-medium mb-2"
                                  style={{ display: "block" }}
                                >
                                  Code (optional)
                                </label>
                                <input
                                  type="text"
                                  value={editField.combo?.code || ""}
                                  onChange={(e) =>
                                    updateCombo({ code: e.target.value })
                                  }
                                  className="input"
                                  placeholder="e.g., DESCRIPTOR"
                                />
                                <small className="text-gray-500">
                                  Path to data array in response
                                </small>
                              </div>
                              <div>
                                <label
                                  className="text-sm font-medium mb-2"
                                  style={{ display: "block" }}
                                >
                                  Content (optional)
                                </label>
                                <input
                                  type="text"
                                  value={editField.combo?.content || ""}
                                  onChange={(e) =>
                                    updateCombo({ content: e.target.value })
                                  }
                                  className="input"
                                  placeholder="e.g., NAME"
                                />
                                <small className="text-gray-500">
                                  Field to use for label/value
                                </small>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Dependencies */}
          <div className="card">
            <div className="card-header">
              <h4 className="font-medium">Dependencies</h4>
            </div>
            <div className="card-body">
              <DependencyEditor
                dependencies={editField.dependencies || []}
                availableFields={getAllFieldsFromSchema(schema).filter(
                  (f) => f.name !== editField.name
                )}
                onChange={(newDeps) => updateField({ dependencies: newDeps })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldEditor;