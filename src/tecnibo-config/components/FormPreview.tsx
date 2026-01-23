// components/FormPreview.jsx
"use client";
import { useState } from "react";

const FormPreview = ({ schema, onClose }) => {
  const [formValues, setFormValues] = useState({});

  const handleFieldChange = (fieldName, value) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const renderField = (field) => {
    const { fieldType, name, label, grid = 12, input, combo } = field;
    const value = formValues[name] || "";

    const gridClass =
      grid === 12 ? "full-width" : grid === 6 ? "half-width" : "auto-width";

    if (fieldType === "INPUT") {
      if (input?.type === "SLIDER") {
        return (
          <div key={field.id} className={`form-field ${gridClass}`}>
            <label className="field-label">{label || name}</label>
            <div className="slider-container">
              <input
                type="range"
                min={input.min || 0}
                max={input.max || 100}
                value={value || input.defaultValue || input.min || 0}
                onChange={(e) => handleFieldChange(name, e.target.value)}
                className="slider"
              />
              <span className="slider-value">
                {value || input.defaultValue || input.min || 0}
              </span>
            </div>
          </div>
        );
      }

      return (
        <div key={field.id} className={`form-field ${gridClass}`}>
          <label className="field-label">{label || name}</label>
          <input
            type={input?.type === "NUMBER" ? "number" : "text"}
            value={value}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            className="field-input"
            min={input?.min}
            max={input?.max}
          />
        </div>
      );
    }

    if (fieldType === "COMBOBOX") {
      // Mock data for preview
      const mockOptions = [
        { label: "Option 1", value: "opt1" },
        { label: "Option 2", value: "opt2" },
        { label: "Option 3", value: "opt3" },
      ];

      if (combo?.type === "SWITCH") {
        return (
          <div key={field.id} className={`form-field ${gridClass}`}>
            <label className="field-label">{label || name}</label>
            <div className="switch-container">
              {mockOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`switch-option ${
                    value === opt.value ? "active" : ""
                  }`}
                  onClick={() => handleFieldChange(name, opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      }

      if (combo?.type === "BUTTON") {
        return (
          <div key={field.id} className={`form-field ${gridClass}`}>
            <label className="field-label">{label || name}</label>
            <div className="button-container">
              {mockOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`button-option ${
                    value === opt.value ? "active" : ""
                  }`}
                  onClick={() => handleFieldChange(name, opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      }

      // Default dropdown
      return (
        <div key={field.id} className={`form-field ${gridClass}`}>
          <label className="field-label">{label || name}</label>
          <select
            value={value}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            className="field-select"
          >
            <option value="">Select option...</option>
            {mockOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div key={field.id} className={`form-field ${gridClass}`}>
        <label className="field-label">{label || name}</label>
        <div className="placeholder-field">{fieldType} component (preview)</div>
      </div>
    );
  };

  const renderSection = (section) => {
    const { type, label, children } = section;

    if (type === "ACCORDION") {
      return (
        <details key={section.id} className="accordion-section" open>
          <summary className="accordion-header">{label}</summary>
          <div className="accordion-content">
            <div className="form-grid">{children?.map(renderElement)}</div>
          </div>
        </details>
      );
    }

    return (
      <div key={section.id} className="form-section">
        {label && <h3 className="section-title">{label}</h3>}
        <div className="form-grid">{children?.map(renderElement)}</div>
      </div>
    );
  };

  const renderTab = (tab) => {
    return (
      <div key={tab.id} className="tab-container">
        <h2 className="tab-title">{tab.name || tab.label}</h2>
        <div className="tab-content">{tab.children?.map(renderElement)}</div>
      </div>
    );
  };

  const renderElement = (element) => {
    switch (element.render) {
      case "field":
        return renderField(element);
      case "section":
        return renderSection(element);
      case "TAB":
        return renderTab(element);
      default:
        return null;
    }
  };

  return (
    <div className="modal" style={{ zIndex: 1001 }}>
      <div className="modal-content" style={{ maxWidth: "1000px" }}>
        <div className="modal-header">
          <h3 className="font-semibold">Form Preview</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  JSON.stringify(formValues, null, 2)
                );
                alert("Form values copied to clipboard!");
              }}
              className="button button-success"
            >
              Copy Values
            </button>
            <button onClick={onClose} className="button button-secondary">
              Close
            </button>
          </div>
        </div>

        <div className="modal-body">
          <div className="form-preview">{schema?.map(renderElement)}</div>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Current Form Values:</h4>
            <pre
              className="text-sm bg-gray-100 p-4 rounded"
              style={{ maxHeight: "200px", overflow: "auto" }}
            >
              {JSON.stringify(formValues, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <style jsx>{`
        .form-preview {
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .form-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .full-width {
          flex: 1 1 100%;
        }
        .half-width {
          flex: 1 1 calc(50% - 8px);
        }
        .auto-width {
          flex: 1 1 auto;
          min-width: 200px;
        }

        .field-label {
          font-weight: 500;
          font-size: 14px;
          color: #374151;
        }

        .field-input,
        .field-select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
        }

        .slider-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .slider {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: #e5e7eb;
          outline: none;
        }

        .slider-value {
          min-width: 40px;
          text-align: center;
          font-weight: 500;
          padding: 4px 8px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 12px;
        }

        .switch-container,
        .button-container {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .switch-option,
        .button-option {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .switch-option:hover,
        .button-option:hover {
          border-color: #3b82f6;
        }

        .switch-option.active,
        .button-option.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 8px;
        }

        .tab-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 20px;
          padding: 16px;
          background: #f3f4f6;
          border-radius: 8px;
        }

        .accordion-section {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          margin-bottom: 16px;
          overflow: hidden;
        }

        .accordion-header {
          padding: 12px 16px;
          background: #f9fafb;
          cursor: pointer;
          font-weight: 500;
          border-bottom: 1px solid #e5e7eb;
        }

        .accordion-content {
          padding: 16px;
        }

        .placeholder-field {
          padding: 12px;
          background: #fef3c7;
          border: 1px dashed #f59e0b;
          border-radius: 4px;
          text-align: center;
          color: #92400e;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default FormPreview;
