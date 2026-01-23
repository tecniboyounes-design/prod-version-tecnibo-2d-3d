import { useState, useMemo, useCallback } from "react";
import { ConfigurationAPI, renderSelectOptions } from "../lib/configurator";
import { SmartDependencyMapper } from "../lib/smartMapping";

export default function Configurator({ articleType }) {
  const [config, setConfig] = useState({});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("configuration");

  const allFields = useMemo(() => {
    try {
      return ConfigurationAPI.getConfiguration(articleType);
    } catch (error) {
      console.error("Failed to load configuration:", error);
      return [];
    }
  }, [articleType]);

  const visibleFields = useMemo(() => {
    try {
      return ConfigurationAPI.getVisibleFields(allFields, config);
    } catch (error) {
      console.error("Failed to get visible fields:", error);
      return allFields;
    }
  }, [allFields, config]);

  // Enhanced grouping with section ordering
  const groupedFields = useMemo(() => {
    const groups = {};
    const sections = ConfigurationAPI.getSections();

    visibleFields.forEach((field) => {
      const sectionKey = field.section || "other";
      const sectionData =
        sections[sectionKey] || sections[sectionKey.toLowerCase()];

      if (!groups[sectionKey]) {
        groups[sectionKey] = {
          name:
            sectionData?.name ||
            sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
          order: sectionData?.order || 999,
          fields: [],
        };
      }
      groups[sectionKey].fields.push(field);
    });

    // Sort sections by order and sort fields within sections by order
    Object.values(groups).forEach((group) => {
      group.fields.sort((a, b) => (a.order || 999) - (b.order || 999));
    });

    return Object.fromEntries(
      Object.entries(groups).sort(([, a], [, b]) => a.order - b.order)
    );
  }, [visibleFields]);

  const handleFieldChange = useCallback(
    (field, value) => {
      setIsLoading(true);

      try {
        const newConfig = { ...config, [field.fieldKey]: value };

        // Get affected fields for smart dependency learning
        const affectedFields = ConfigurationAPI.getAffectedFields(
          field.fieldKey,
          allFields
        );

        // Learn from user selection for smart dependencies
        if (affectedFields.length > 0) {
          const mapper = new SmartDependencyMapper();
          affectedFields.forEach((affectedFieldKey) => {
            const affectedField = allFields.find(
              (f) => f.fieldKey === affectedFieldKey
            );
            if (affectedField?.dependencies?.values?.type === "smart") {
              mapper.learnFromUserSelection(
                value,
                newConfig[affectedFieldKey],
                {
                  fieldKey: field.fieldKey,
                  dependentField: affectedFieldKey,
                }
              );
            }
          });
        }

        // Clear values of fields that become invisible
        const newVisibleFields = ConfigurationAPI.getVisibleFields(
          allFields,
          newConfig
        );
        const newVisibleFieldKeys = new Set(
          newVisibleFields.map((f) => f.fieldKey)
        );

        Object.keys(config).forEach((fieldKey) => {
          if (
            !newVisibleFieldKeys.has(fieldKey) &&
            fieldKey !== field.fieldKey
          ) {
            newConfig[fieldKey] = "";
          }
        });

        // Clear errors for this field
        const newErrors = { ...errors };
        delete newErrors[field.fieldKey];
        setErrors(newErrors);

        setConfig(newConfig);
      } catch (error) {
        console.error("Error handling field change:", error);
        setErrors((prev) => ({
          ...prev,
          [field.fieldKey]: `Error updating field: ${error.message}`,
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [config, allFields, errors]
  );

  const validateField = useCallback((field, value) => {
    const fieldErrors = [];

    if (
      field.required &&
      (!value || (typeof value === "string" && value.trim() === ""))
    ) {
      fieldErrors.push(`${field.label} is required`);
    }

    if (field.type === "number" && value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        fieldErrors.push(`${field.label} must be a valid number`);
      } else {
        if (field.min !== undefined && numValue < field.min) {
          fieldErrors.push(`${field.label} must be at least ${field.min}`);
        }
        if (field.max !== undefined && numValue > field.max) {
          fieldErrors.push(`${field.label} must be at most ${field.max}`);
        }
      }
    }

    return fieldErrors;
  }, []);

  const renderField = useCallback(
    (field) => {
      const value = config[field.fieldKey] || "";
      const fieldErrors = errors[field.fieldKey];

      let fieldValues = [];
      let processedOptions = [];

      if (field.type === "select") {
        try {
          fieldValues = ConfigurationAPI.getFieldValues(
            field,
            config,
            allFields
          );
          processedOptions = renderSelectOptions(
            fieldValues,
            field.mappingConfig
          );
        } catch (error) {
          console.error(
            `Error getting values for field ${field.fieldKey}:`,
            error
          );
          processedOptions = [];
        }
      }

      const handleChange = (newValue) => {
        const validationErrors = validateField(field, newValue);

        if (validationErrors.length > 0) {
          setErrors((prev) => ({
            ...prev,
            [field.fieldKey]: validationErrors[0],
          }));
        } else {
          handleFieldChange(field, newValue);
        }
      };

      return (
        <div
          key={field.fieldKey}
          className={`field ${fieldErrors ? "field-error" : ""}`}
        >
          <label className="field-label">
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>

          {field.description && (
            <div className="field-description">{field.description}</div>
          )}

          <div className="field-input-wrapper">
            {field.type === "select" ? (
              <select
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                disabled={isLoading}
                className={fieldErrors ? "error" : ""}
              >
                <option value="">
                  {field.placeholder || `Select ${field.label}...`}
                </option>
                {processedOptions.map((option) => (
                  <option key={option.key} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={field.placeholder}
                disabled={isLoading}
                className={fieldErrors ? "error" : ""}
                rows={4}
              />
            ) : field.type === "checkbox" ? (
              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={value === true || value === "true"}
                  onChange={(e) => handleChange(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="checkmark"></span>
                {field.placeholder && (
                  <span className="checkbox-label">{field.placeholder}</span>
                )}
              </label>
            ) : (
              <input
                type={field.type}
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                step={field.step}
                disabled={isLoading}
                className={fieldErrors ? "error" : ""}
              />
            )}

            {fieldErrors && (
              <div className="field-error-message">{fieldErrors}</div>
            )}
          </div>

          {/* Show dependency info for debugging in development */}
          {process.env.NODE_ENV === "development" && field.dependencies && (
            <details className="debug-info">
              <summary>Debug: Dependencies</summary>
              <pre>{JSON.stringify(field.dependencies, null, 2)}</pre>
              {field.dependencies?.values?.type === "smart" && (
                <div>
                  <strong>Smart Dependency Active:</strong> This field uses
                  AI-powered value mapping
                </div>
              )}
            </details>
          )}
        </div>
      );
    },
    [config, errors, isLoading, allFields, handleFieldChange, validateField]
  );

  const exportConfiguration = useCallback(() => {
    const exportData = {
      articleType,
      configuration: config,
      fields: allFields,
      timestamp: new Date().toISOString(),
      completionPercentage: getCompletionPercentage(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${articleType}-configuration-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [articleType, config, allFields]);

  const resetConfiguration = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to reset all values? This action cannot be undone."
      )
    ) {
      setConfig({});
      setErrors({});
    }
  }, []);

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }, []);

  const getCompletionPercentage = useCallback(() => {
    const requiredFields = visibleFields.filter((f) => f.required);
    if (requiredFields.length === 0) return 100;

    const completedRequired = requiredFields.filter((f) => {
      const value = config[f.fieldKey];
      return value && (typeof value !== "string" || value.trim() !== "");
    });

    return Math.round((completedRequired.length / requiredFields.length) * 100);
  }, [visibleFields, config]);

  const getConfigurationSummary = useCallback(() => {
    const summary = {};

    Object.entries(groupedFields).forEach(([sectionKey, sectionData]) => {
      const sectionSummary = {};
      sectionData.fields.forEach((field) => {
        const value = config[field.fieldKey];
        if (value && (typeof value !== "string" || value.trim() !== "")) {
          // Use property path or fallback to fieldKey
          const key = field.property || field.fieldKey;
          sectionSummary[key] = value;
        }
      });
      if (Object.keys(sectionSummary).length > 0) {
        summary[sectionData.name] = sectionSummary;
      }
    });

    return summary;
  }, [groupedFields, config]);

  const hasErrors = Object.keys(errors).length > 0;
  const completionPercentage = getCompletionPercentage();
  const configSummary = getConfigurationSummary();
  const configStats = ConfigurationAPI.getConfigurationStats
    ? ConfigurationAPI.getConfigurationStats(articleType)
    : {};

  return (
    <div className="configurator">
      <div className="configurator-header">
        <div className="header-info">
          <h3>{articleType} Configuration</h3>
          <div className="stats">
            <span className="stat-item">
              <strong>Fields:</strong> {visibleFields.length}/{allFields.length}
            </span>
            <span className="stat-item">
              <strong>Sections:</strong> {Object.keys(groupedFields).length}
            </span>
            <span className="stat-item">
              <strong>Completion:</strong> {completionPercentage}%
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button onClick={resetConfiguration} className="reset-btn">
            Reset All
          </button>
          <button onClick={exportConfiguration} className="export-btn">
            Export Config
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {completionPercentage < 100 && (
        <div className="progress-section">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="progress-text">
            {completionPercentage}% Complete
          </span>
        </div>
      )}

      {/* Global Errors */}
      {hasErrors && (
        <div className="global-errors">
          <h4>⚠️ Please fix the following errors:</h4>
          <ul>
            {Object.entries(errors).map(([fieldKey, error]) => (
              <li key={fieldKey} className="global-error">
                <strong>
                  {allFields.find((f) => f.fieldKey === fieldKey)?.label ||
                    fieldKey}
                  :
                </strong>{" "}
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Updating configuration...</span>
          </div>
        </div>
      )}

      {/* Main Configuration Fields */}
      <div className="fields-container">
        {Object.entries(groupedFields).length > 0 ? (
          Object.entries(groupedFields).map(([sectionKey, sectionData]) => (
            <div key={sectionKey} className="section">
              <div className="section-header">
                <h4 className="section-title">{sectionData.name}</h4>
                <div className="section-stats">
                  <span className="field-count">
                    {sectionData.fields.length} field
                    {sectionData.fields.length !== 1 ? "s" : ""}
                  </span>
                  <span className="completion-indicator">
                    {
                      sectionData.fields.filter((f) => config[f.fieldKey])
                        .length
                    }
                    /{sectionData.fields.length}
                  </span>
                </div>
              </div>
              <div className="section-fields">
                {sectionData.fields.map(renderField)}
              </div>
            </div>
          ))
        ) : (
          <div className="no-fields">
            <h4>No fields configured</h4>
            <p>Use the Field Builder to add fields to this article type.</p>
          </div>
        )}
      </div>

      {/* Results Section with Tabs */}
      <div className="results-container">
        <div className="results-tabs">
          <button
            className={`tab-button ${
              activeTab === "configuration" ? "active" : ""
            }`}
            onClick={() => setActiveTab("configuration")}
          >
            Configuration
          </button>
          <button
            className={`tab-button ${activeTab === "summary" ? "active" : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            Summary
          </button>
          <button
            className={`tab-button ${activeTab === "schema" ? "active" : ""}`}
            onClick={() => setActiveTab("schema")}
          >
            Field Schema
          </button>
        </div>

        <div className="results-content">
          {activeTab === "configuration" && (
            <div className="result-panel">
              <div className="panel-header">
                <h4>Current Configuration</h4>
                <div className="panel-actions">
                  <button
                    onClick={() =>
                      copyToClipboard(JSON.stringify(config, null, 2))
                    }
                    className="copy-btn"
                  >
                    📋 Copy JSON
                  </button>
                </div>
              </div>
              <div className="json-container">
                <pre className="json-display">
                  {Object.keys(config).length > 0
                    ? JSON.stringify(config, null, 2)
                    : "{\n  // No configuration values set yet\n}"}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "summary" && (
            <div className="result-panel">
              <div className="panel-header">
                <h4>Configuration Summary</h4>
              </div>
              <div className="summary-display">
                {Object.keys(configSummary).length > 0 ? (
                  <div className="summary-sections">
                    {Object.entries(configSummary).map(
                      ([sectionName, sectionConfig]) => (
                        <div key={sectionName} className="summary-section">
                          <h5 className="summary-section-title">
                            {sectionName}
                          </h5>
                          <div className="summary-items">
                            {Object.entries(sectionConfig).map(
                              ([key, value]) => (
                                <div key={key} className="summary-item">
                                  <span className="summary-key">{key}:</span>
                                  <span className="summary-value">
                                    {String(value)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="no-config">
                    <p>📝 No configuration values set yet</p>
                    <p>
                      Start filling out the fields above to see a summary here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "schema" && (
            <div className="result-panel">
              <div className="panel-header">
                <h4>Field Schema</h4>
                <div className="panel-actions">
                  <button
                    onClick={() =>
                      copyToClipboard(JSON.stringify(allFields, null, 2))
                    }
                    className="copy-btn"
                  >
                    📋 Copy Schema
                  </button>
                </div>
              </div>
              <div className="json-container">
                <pre className="json-display">
                  {allFields.length > 0
                    ? JSON.stringify(allFields, null, 2)
                    : "[\n  // No fields defined yet\n]"}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Development Debug Panel */}
      {process.env.NODE_ENV === "development" && (
        <div className="debug-panel">
          <details>
            <summary>🔧 Debug Information</summary>
            <div className="debug-content">
              <div className="debug-section">
                <h5>Visible Fields:</h5>
                <ul>
                  {visibleFields.map((f) => (
                    <li key={f.fieldKey}>
                      <strong>{f.label}</strong> ({f.fieldKey}) - {f.type}
                      {f.dependencies?.values?.type && (
                        <span className="dep-type">
                          {" "}
                          - {f.dependencies.values.type} dependency
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {Object.keys(configStats).length > 0 && (
                <div className="debug-section">
                  <h5>Configuration Stats:</h5>
                  <pre>{JSON.stringify(configStats, null, 2)}</pre>
                </div>
              )}

              <div className="debug-section">
                <h5>Current Errors:</h5>
                {Object.keys(errors).length > 0 ? (
                  <pre>{JSON.stringify(errors, null, 2)}</pre>
                ) : (
                  <p>No errors</p>
                )}
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
