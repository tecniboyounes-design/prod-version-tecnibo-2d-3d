// components/DataSourceManager.jsx
"use client";
import { useEffect, useState } from "react";
import {
  deleteDataSource,
  getDataSources,
  putDataSources,
} from "../lib/articlesFsClient";

const STORAGE_KEY = "formBuilder-dataSources";

const DataSourceManager = ({ onClose, onSave }) => {
  const [dataSources, setDataSources] = useState({});
  const [activeSource, setActiveSource] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  const [sourceItems, setSourceItems] = useState([]);
  const [newItem, setNewItem] = useState({
    label: "",
    value: "",
    attributes: {},
  });
  const [showAddItem, setShowAddItem] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const { dataSources: remote } = await getDataSources();
        if (cancelled) return;
        setDataSources(remote || {});
      } catch (error) {
        console.error("Error fetching data sources from server:", error);
        if (cancelled) return;

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            setDataSources(JSON.parse(saved));
          } catch (parseError) {
            console.error("Error parsing cached data sources:", parseError);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const dataString = JSON.stringify(dataSources);
    localStorage.setItem(STORAGE_KEY, dataString);
    window.dispatchEvent(
      new CustomEvent("localStorageChange", {
        detail: { key: STORAGE_KEY, newValue: dataString },
      })
    );
  }, [dataSources, isLoaded]);

  const persistSource = async (sourceName, items) => {
    if (!sourceName) return dataSources;

    let nextState = dataSources;
    try {
      setIsSaving(true);
      await putDataSources(
        { [sourceName]: items },
        { replaceKeys: [sourceName] }
      );
      setDataSources((prev) => {
        nextState = { ...prev, [sourceName]: items };
        return nextState;
      });
      return nextState;
    } catch (error) {
      console.error(`Failed to save data source "${sourceName}":`, error);
      alert(
        `Failed to save data source "${sourceName}". Please try again.`
      );
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSource = () => {
    if (!newSourceName.trim()) return;

    const sourceName = newSourceName.trim();
    setDataSources((prev) => ({
      ...prev,
      [sourceName]: [],
    }));
    setActiveSource(sourceName);
    setSourceItems([]);
    setShowAddItem(false);
    setNewSourceName("");
  };

  const handleSelectSource = (sourceName) => {
    setActiveSource(sourceName);
    setSourceItems([...(dataSources[sourceName] || [])]);
    setShowAddItem(false);
  };

  const handleAddItem = () => {
    if (!newItem.label || !newItem.value) return;

    const item = {
      label: newItem.label,
      value: newItem.value,
      ...(Object.keys(newItem.attributes).length > 0 && {
        attributes: newItem.attributes,
      }),
    };

    setSourceItems((prev) => [...prev, item]);
    setNewItem({ label: "", value: "", attributes: {} });
    setShowAddItem(false);
  };

  const handleDeleteItem = (index) => {
    setSourceItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, updates) => {
    setSourceItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleSaveSource = async () => {
    if (!activeSource) return;

    try {
      await persistSource(activeSource, sourceItems);
    } catch {
      // persistSource already reports the error
    }
  };

  const handleDeleteSource = async (sourceName) => {
    if (!window.confirm(`Delete data source "${sourceName}"?`)) {
      return;
    }

    try {
      setIsSaving(true);
      await deleteDataSource(sourceName);
      setDataSources((prev) => {
        const next = { ...prev };
        delete next[sourceName];
        return next;
      });
      if (activeSource === sourceName) {
        setActiveSource("");
        setSourceItems([]);
      }
      alert(`Deleted data source "${sourceName}".`);
    } catch (error) {
      console.error(`Failed to delete data source "${sourceName}":`, error);
      alert(`Failed to delete data source "${sourceName}". Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const addAttributeField = () => {
    const key = prompt("Attribute name (e.g., color, description):");
    if (key && !newItem.attributes[key]) {
      setNewItem((prev) => ({
        ...prev,
        attributes: { ...prev.attributes, [key]: "" },
      }));
    }
  };

  const removeAttributeField = (key) => {
    setNewItem((prev) => {
      const attrs = { ...prev.attributes };
      delete attrs[key];
      return { ...prev, attributes: attrs };
    });
  };


  const handleJsonImport = async (jsonText) => {
    if (!jsonText.trim()) return;

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      alert("Invalid JSON format: " + error.message);
      return;
    }

    const newSources = {};
    Object.entries(parsed).forEach(([sourceName, value]) => {
      if (Array.isArray(value)) {
        newSources[sourceName] = value;
      }
    });

    if (Object.keys(newSources).length === 0) {
      alert("No valid data sources found in JSON input.");
      return;
    }

    try {
      setIsSaving(true);
      // ✅ MERGE instead of replaceKeys
      await putDataSources(newSources);

      const next = { ...dataSources, ...newSources };
      setDataSources(next);
      if (activeSource && newSources[activeSource]) {
        setSourceItems([...(newSources[activeSource] || [])]);
      }

      const textarea = document.querySelector(".textarea");
      if (textarea) {
        textarea.value = "";
      }

      alert(
        `Imported ${Object.keys(newSources).length} data sources successfully!`
      );
    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import data sources. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };


  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const fileExtension = file.name.split(".").pop().toLowerCase();

      if (fileExtension === "json") {
        await handleJsonImport(text);
      } else if (fileExtension === "csv") {
        await handleCsvImport(text, file.name);
      } else if (fileExtension === "txt") {
        try {
          await handleJsonImport(text);
        } catch {
          await handleTextImport(text, file.name);
        }
      } else {
        alert("Unsupported file type. Please use JSON, CSV, or TXT files.");
      }
    } catch (error) {
      alert("Error reading file: " + error.message);
    }

    e.target.value = "";
  };

  const handleCsvImport = async (csvText, fileName) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      alert("CSV file must have at least a header row and one data row.");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const dataRows = lines.slice(1);
    const sourceName = fileName.replace(/\.csv$/i, "");

    const items = dataRows.map((row, index) => {
      const values = row.split(",").map((v) => v.trim().replace(/"/g, ""));

      const item = {
        label: values[0] || `Item ${index + 1}`,
        value: values[1] || values[0] || `item_${index + 1}`,
      };

      if (values.length > 2) {
        item.attributes = {};
        for (let i = 2; i < values.length && i < headers.length; i++) {
          if (values[i]) {
            item.attributes[headers[i]] = values[i];
          }
        }
      }

      return item;
    });

    try {
      setIsSaving(true);
      await putDataSources(
        { [sourceName]: items },
        { replaceKeys: [sourceName] }
      );
      const next = { ...dataSources, [sourceName]: items };
      setDataSources(next);
      if (activeSource === sourceName) {
        setSourceItems([...items]);
      }

      alert(`Imported CSV as "${sourceName}" with ${items.length} items!`);
    } catch (error) {
      console.error("CSV import failed:", error);
      alert("Failed to import CSV file. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTextImport = async (text, fileName) => {
    const lines = text
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    if (lines.length === 0) {
      alert("Text file appears to be empty.");
      return;
    }

    const sourceName = fileName.replace(/\.txt$/i, "");

    const items = lines.map((line, index) => {
      const trimmed = line.trim();
      return {
        label: trimmed,
        value:
          trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_") ||
          `item_${index + 1}`,
      };
    });

    try {
      setIsSaving(true);
      // ✅ MERGE instead of replaceKeys
      await putDataSources({ [sourceName]: items });

      const next = { ...dataSources, [sourceName]: items };
      setDataSources(next);
      if (activeSource === sourceName) {
        setSourceItems([...items]);
      }

      alert(`Imported text as "${sourceName}" with ${items.length} items!`);
    } catch (error) {
      console.error("Text import failed:", error);
      alert("Failed to import text file. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };


  const handleExportAll = () => {
    if (Object.keys(dataSources).length === 0) {
      alert("No data sources to export.");
      return;
    }

    const dataStr = JSON.stringify(dataSources, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = `data-sources-${new Date().toISOString().split("T")[0]
      }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(
      `Exported ${Object.keys(dataSources).length} data sources successfully!`
    );
  };

  const handleSaveAndClose = async () => {
    try {
      let next = dataSources;
      if (activeSource) {
        next = await persistSource(activeSource, sourceItems);
      }
      onSave?.(next);
      onClose?.();
    } catch {
      // keep dialog open when save fails
    }
  };



  return (
    <div className="modal">
      <div
        className="modal-content"
        style={{ maxWidth: "1000px", height: "90vh" }}
      >
        <div className="modal-header">
          <h3 className="font-semibold">Data Source Manager</h3>
          <div className="flex gap-2">
            <button
              onClick={handleExportAll}
              className="button button-success"
              disabled={Object.keys(dataSources).length === 0 || isSaving}
            >
              Export All
            </button>
            <button
              onClick={handleSaveAndClose}
              className="button button-primary"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save & Close"}
            </button>
            <button onClick={onClose} className="button button-secondary">
              Cancel
            </button>
          </div>
        </div>

        <div
          className="modal-body"
          style={{ display: "flex", height: "calc(100% - 80px)" }}
        >
          {/* Left Panel - Source List */}
          <div
            style={{
              width: "300px",
              borderRight: "1px solid #e5e7eb",
              paddingRight: "20px",
            }}
          >
            {/* Import Options */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Import Data Sources</h4>

              {/* File Import */}
              <div className="mb-3">
                <label className="button button-info cursor-pointer w-full text-center">
                  📁 Import from File
                  <input
                    type="file"
                    accept=".json,.csv,.txt"
                    onChange={handleFileImport}
                    className="hidden"
                    style={{ display: "none" }}
                    disabled={isSaving}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Support: JSON, CSV, or TXT files
                </p>
              </div>

              {/* JSON Paste */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Or paste JSON:
                </label>
                <textarea
                  className="textarea"
                  placeholder="Paste JSON data here..."
                  style={{ minHeight: "100px", fontSize: "12px" }}
                  onBlur={(e) => handleJsonImport(e.target.value)}
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste JSON and sources will be auto-created
                </p>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">Create New Source</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="Source name..."
                  className="input"
                  style={{ flex: 1 }}
                  disabled={isSaving}
                />
                <button
                  onClick={handleCreateSource}
                  className="button button-success"
                  disabled={!newSourceName.trim() || isSaving}
                >
                  Create
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">
                Existing Sources ({Object.keys(dataSources).length})
              </h4>
              <div
                className="space-y-2"
                style={{ maxHeight: "400px", overflow: "auto" }}
              >
                {Object.keys(dataSources).map((sourceName) => (
                  <div
                    key={sourceName}
                    className="flex-between p-2 border rounded"
                  >
                    <button
                      onClick={() => handleSelectSource(sourceName)}
                      className={`flex-1 text-left ${activeSource === sourceName
                        ? "font-semibold text-blue-600"
                        : ""
                        }`}
                      disabled={isSaving}
                    >
                      {sourceName} ({dataSources[sourceName].length})
                    </button>
                    <button
                      onClick={() => handleDeleteSource(sourceName)}
                      className="button button-danger"
                      style={{ padding: "2px 6px", fontSize: "10px" }}
                      disabled={isSaving}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Source Editor */}
          <div style={{ flex: 1, paddingLeft: "20px" }}>
            {!activeSource ? (
              <div
                className="text-center text-gray-500"
                style={{ paddingTop: "100px" }}
              >
                <p>Select a data source to edit</p>
                <p className="text-sm">or create a new one</p>
              </div>
            ) : (
              <div>
                <div className="flex-between mb-4">
                  <h4 className="font-medium">
                    Editing: {activeSource} ({sourceItems.length} items)
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveSource}
                      className="button button-primary"
                      disabled={!activeSource || isSaving}
                    >
                      Save Source
                    </button>
                    <button
                      onClick={() => setShowAddItem(true)}
                      className="button button-success"
                      disabled={isSaving}
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                {/* Add Item Form */}
                {showAddItem && (
                  <div className="card mb-4">
                    <div className="card-header">
                      <h5 className="font-medium">Add New Item</h5>
                    </div>
                    <div className="card-body">
                      <div className="grid grid-2 gap-4 mb-4">
                        <div>
                          <label
                            className="text-sm font-medium mb-2"
                            style={{ display: "block" }}
                          >
                            Label
                          </label>
                          <input
                            type="text"
                            value={newItem.label}
                            onChange={(e) =>
                              setNewItem((prev) => ({
                                ...prev,
                                label: e.target.value,
                              }))
                            }
                            placeholder="Display label"
                            className="input"
                          />
                        </div>
                        <div>
                          <label
                            className="text-sm font-medium mb-2"
                            style={{ display: "block" }}
                          >
                            Value
                          </label>
                          <input
                            type="text"
                            value={newItem.value}
                            onChange={(e) =>
                              setNewItem((prev) => ({
                                ...prev,
                                value: e.target.value,
                              }))
                            }
                            placeholder="Internal value"
                            className="input"
                          />
                        </div>
                      </div>

                      {/* Attributes */}
                      <div className="mb-4">
                        <div className="flex-between mb-2">
                          <label className="text-sm font-medium">
                            Attributes (optional)
                          </label>
                          <button
                            onClick={addAttributeField}
                            className="button button-secondary"
                            style={{ padding: "2px 8px", fontSize: "10px" }}
                          >
                            + Add Attribute
                          </button>
                        </div>
                        {Object.entries(newItem.attributes).map(
                          ([key, value]) => (
                            <div key={key} className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={key}
                                disabled
                                className="input"
                                style={{ width: "120px" }}
                              />
                              <input
                                type="text"
                                value={value}
                                onChange={(e) =>
                                  setNewItem((prev) => ({
                                    ...prev,
                                    attributes: {
                                      ...prev.attributes,
                                      [key]: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Attribute value"
                                className="input"
                                style={{ flex: 1 }}
                              />
                              <button
                                onClick={() => removeAttributeField(key)}
                                className="button button-danger"
                                style={{ padding: "4px 8px", fontSize: "10px" }}
                              >
                                ×
                              </button>
                            </div>
                          )
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleAddItem}
                          className="button button-primary"
                        >
                          Add Item
                        </button>
                        <button
                          onClick={() => setShowAddItem(false)}
                          className="button button-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items List */}
                <div
                  className="space-y-2"
                  style={{ maxHeight: "400px", overflow: "auto" }}
                >
                  {sourceItems.map((item, index) => (
                    <div key={index} className="card">
                      <div className="card-body" style={{ padding: "12px" }}>
                        <div className="flex-between">
                          <div className="flex-1">
                            <div className="font-medium">{item.label}</div>
                            <div className="text-sm text-gray-500">
                              Value: {item.value}
                            </div>
                            {item.attributes &&
                              Object.keys(item.attributes).length > 0 && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {Object.entries(item.attributes).map(
                                    ([k, v]) => (
                                      <span key={k} className="mr-2">
                                        {k}: {v}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                          </div>
                          <button
                            onClick={() => handleDeleteItem(index)}
                            className="button button-danger"
                            style={{ padding: "4px 8px", fontSize: "10px" }}
                            disabled={isSaving}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {sourceItems.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No items in this data source
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSourceManager;
