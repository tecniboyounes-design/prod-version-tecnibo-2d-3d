// components/FormBuilderHeader.jsx
"use client";
import { useState } from "react";
import DataSourceManager from "./DataSourceManager";

const FormBuilderHeader = ({
  isJsonMode,
  onToggleJsonMode,
  onExport,
  onImport,
  onClearAll,
  onSync,
}) => {
  const [showDataSourceManager, setShowDataSourceManager] = useState(false);

  const handleImportChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImport(file);
    }
    // Clear input so same file can be selected again
    e.target.value = "";
  };

  return (
    <>
      <div className="header">
        <div className="flex-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Form Builder
            </h1>
            <p className="text-sm text-gray-600">
              Create dynamic forms with dependencies
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDataSourceManager(true)}
              className="button button-purple"
            >
              Data Sources
            </button>
            <button
              onClick={onToggleJsonMode}
              className={`button ${
                isJsonMode ? "button-secondary" : "button-purple"
              }`}
            >
              {isJsonMode ? "Visual Builder" : "JSON Editor"}
            </button>
            <button onClick={onExport} className="button button-success">
              Export
            </button>
            <label className="button button-primary cursor-pointer">
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportChange}
                className="hidden"
                style={{ display: "none" }}
              />
            </label>
            <button onClick={onClearAll} className="button button-danger">
              Clear All
            </button>
            <button onClick={onSync} className="button button-info">
              Sync
            </button>
          </div>
        </div>
      </div>

      {showDataSourceManager && (
        <DataSourceManager
          onClose={() => setShowDataSourceManager(false)}
          onSave={() => setShowDataSourceManager(false)}
        />
      )}
    </>
  );
};

export default FormBuilderHeader;
