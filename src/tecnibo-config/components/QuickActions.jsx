// components/QuickActions.jsx
"use client";
import { useState } from "react";

const QuickActions = ({ onImportSchema, onExportSchema }) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");

  const handleImportFromText = () => {
    try {
      const parsed = JSON.parse(importText);
      onImportSchema(parsed);
      setShowImportModal(false);
      setImportText("");
      alert("Schema imported successfully!");
    } catch (e) {
      alert("Invalid JSON format: " + e.message);
    }
  };

  const sampleSchemas = {
    basic: {
      name: "Basic Form",
      schema: [
        {
          id: 1,
          type: "TAB",
          render: "TAB",
          name: "configurator",
          children: [
            {
              id: 2,
              render: "section",
              type: "NONE",
              label: "Basic Fields",
              children: [
                {
                  id: 3,
                  render: "field",
                  name: "HEIGHT",
                  label: "Height",
                  fieldType: "INPUT",
                  grid: 6,
                  input: {
                    id: 4,
                    min: 100,
                    max: 300,
                    type: "SLIDER",
                    defaultValue: 200,
                  },
                  dependencies: [],
                  variables: [],
                  descriptions: [],
                },
              ],
            },
          ],
        },
      ],
    },
    withDependencies: {
      name: "Form with Dependencies",
      schema: [
        {
          id: 1,
          type: "TAB",
          render: "TAB",
          name: "configurator",
          children: [
            {
              id: 2,
              render: "section",
              type: "NONE",
              label: "Configuration",
              children: [
                {
                  id: 3,
                  render: "field",
                  name: "INSTALLATION_TYPE",
                  label: "Installation Type",
                  fieldType: "COMBOBOX",
                  grid: 12,
                  combo: {
                    id: 4,
                    type: "SWITCH",
                    source: "installationTypes",
                    defaultValue: "BUILT_IN",
                  },
                  dependencies: [],
                },
                {
                  id: 5,
                  render: "field",
                  name: "FILLER_LEFT",
                  label: "Left Filler",
                  fieldType: "INPUT",
                  grid: 6,
                  input: {
                    id: 6,
                    min: 50,
                    max: 1000,
                    type: "SLIDER",
                    defaultValue: 100,
                  },
                  dependencies: [
                    {
                      nod: 1,
                      action: "SHOW",
                      roles: [
                        {
                          operator: "OR",
                          roles: [
                            {
                              field: "INSTALLATION_TYPE",
                              comparisonType: "=",
                              value: "BUILT_IN",
                            },
                            {
                              field: "INSTALLATION_TYPE",
                              comparisonType: "=",
                              value: "BUILT_IN_LEFT",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowImportModal(true)}
          className="button button-primary"
        >
          Quick Import
        </button>
        <button
          onClick={() => {
            const schema = onExportSchema();
            navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
            alert("Schema copied to clipboard!");
          }}
          className="button button-secondary"
        >
          Copy Schema
        </button>
      </div>

      {showImportModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="font-semibold">Quick Import Schema</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="button button-secondary"
              >
                Close
              </button>
            </div>

            <div className="modal-body">
              <div className="mb-4">
                <h4 className="font-medium mb-2">Sample Schemas:</h4>
                <div className="flex gap-2 mb-4">
                  {Object.entries(sampleSchemas).map(([key, sample]) => (
                    <button
                      key={key}
                      onClick={() =>
                        setImportText(JSON.stringify(sample.schema, null, 2))
                      }
                      className="button button-success"
                      style={{ fontSize: "12px", padding: "4px 12px" }}
                    >
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  className="text-sm font-medium mb-2"
                  style={{ display: "block" }}
                >
                  Paste JSON Schema:
                </label>
                <textarea
                  className="textarea"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste your JSON schema here..."
                  style={{ minHeight: "300px", fontFamily: "monospace" }}
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleImportFromText}
                  className="button button-primary"
                  disabled={!importText.trim()}
                >
                  Import Schema
                </button>
                <button
                  onClick={() => {
                    try {
                      const formatted = JSON.stringify(
                        JSON.parse(importText),
                        null,
                        2
                      );
                      setImportText(formatted);
                    } catch (e) {
                      alert("Invalid JSON format");
                    }
                  }}
                  className="button button-secondary"
                  disabled={!importText.trim()}
                >
                  Format JSON
                </button>
                <button
                  onClick={() => setImportText("")}
                  className="button button-danger"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActions;
