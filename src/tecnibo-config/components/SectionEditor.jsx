// components/SectionEditor.jsx
"use client";
import { useState } from "react";
import DependencyEditor from "./DependencyEditor";

const SectionEditor = ({ section, onSave, onCancel, schema }) => {
  const [editSection, setEditSection] = useState(
    JSON.parse(JSON.stringify(section))
  );

  const sectionTypeOptions = [
    { value: "NONE", label: "Regular Section" },
    { value: "ACCORDION", label: "Accordion Section" },
    { value: "TAB", label: "Tab Section" },
  ];

  const handleSave = () => {
    onSave(editSection);
  };

  const updateSection = (updates) => {
    setEditSection((prev) => ({ ...prev, ...updates }));
  };

  // Add this function to SectionEditor.jsx
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
          <h3 className="font-semibold">Edit Section</h3>
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
          <div className="mb-4">
            <label
              className="text-sm font-medium mb-2"
              style={{ display: "block" }}
            >
              Section Label
            </label>
            <input
              type="text"
              value={editSection.label || ""}
              onChange={(e) => updateSection({ label: e.target.value })}
              className="input"
              placeholder="e.g., Form, Styler, Function"
            />
          </div>
          <div className="mb-4">
            <label
              className="text-sm font-medium mb-2"
              style={{ display: "block" }}
            >
              Section Type
            </label>
            <select
              value={editSection.type || "NONE"}
              onChange={(e) => updateSection({ type: e.target.value })}
              className="select"
            >
              {sectionTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {editSection.type === "TAB" && (
            <div className="mb-4">
              <label
                className="text-sm font-medium mb-2"
                style={{ display: "block" }}
              >
                Tab Name
              </label>
              <input
                type="text"
                value={editSection.name || ""}
                onChange={(e) => updateSection({ name: e.target.value })}
                className="input"
                placeholder="e.g., configurator"
              />
            </div>
          )}
          {/* Dependencies */}
          <div className="card">
            <div className="card-header">
              <h4 className="font-medium">Dependencies</h4>
            </div>
            <div className="card-body">
              <DependencyEditor
                dependencies={editSection.dependencies || []}
                availableFields={getAllFieldsFromSchema(schema).filter(
                  (f) => f.name !== editSection.name
                )}
                onChange={(newDeps) => updateSection({ dependencies: newDeps })}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h4 className="font-medium">Section Info</h4>
            </div>
            <div className="card-body">
              <div className="text-sm text-gray-600">
                <div>Children: {editSection.children?.length || 0} items</div>
                <div>Render: {editSection.render || "section"}</div>
                <div className="mt-2 text-xs text-gray-500">
                  Section types:
                  <ul style={{ marginLeft: "16px", marginTop: "4px" }}>
                    <li>• NONE: Regular container</li>
                    <li>• ACCORDION: Collapsible section</li>
                    <li>• TAB: Top-level tab container</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionEditor;
