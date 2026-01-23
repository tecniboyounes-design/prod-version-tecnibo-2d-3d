// hooks/useFormBuilder.js
"use client";
import { useState, useEffect } from "react";
import { replaceIdsWithSimpleIds } from "./useChangesIDs";


import {
  getAllArticles,
  addArticle,
  putDataSources,
  setCatalogSync,
  getLatestCatalog,
} from "../lib/articlesFsClient";


export const useFormBuilder = (articleId = null) => {
  const [catalog, setCatalog] = useState([]);
  const [rawJson, setRawJson] = useState("");
  const [isJsonMode, setIsJsonMode] = useState(false);
  

    const storageKey = articleId
    ? `formBuilder-catalog-${articleId}`
    : "formBuilder-catalog";
 
  
 useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const targetId = articleId || "default";
        // 1) Try server latest
        if (targetId !== "default") {
          const res = await getLatestCatalog(targetId); // { catalog } or other
          const serverCat = res?.catalog?.sections ?? res?.catalog ?? null;
          if (!cancelled && serverCat) {
            setCatalog(serverCat);
            setRawJson(JSON.stringify(serverCat, null, 2));
            localStorage.setItem(storageKey, JSON.stringify(serverCat));
            return;
          }
        }
        // 2) Try local cache
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!cancelled) {
            setCatalog(parsed);
            setRawJson(JSON.stringify(parsed, null, 2));
          }
          return;
        }
        // 3) Fallback
        if (!cancelled) initializeEmptyCatalog();
      } catch (e) {
        console.warn("load (server-first) failed; fallback to local/template:", e?.message || e);
        const saved = localStorage.getItem(storageKey);
        if (saved && !cancelled) {
          const parsed = JSON.parse(saved);
          setCatalog(parsed);
          setRawJson(JSON.stringify(parsed, null, 2));
        } else if (!cancelled) {
          initializeEmptyCatalog();
        }
      }
    })();
    return () => { cancelled = true; };
  // re-run when the selected article changes
  }, [articleId]);



  // Save to localStorage when catalog changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(catalog));
    if (!isJsonMode) {
      setRawJson(JSON.stringify(catalog, null, 2));
    }
  }, [catalog, isJsonMode, storageKey]);



  const initializeEmptyCatalog = () => {
    const empty = [
      {
        id: Date.now(),
        type: "TAB",
        render: "section",
        name: "configurator",
        children: [],
      },
    ];
    setCatalog(empty);
  };
  
  const generateId = () => Date.now() + Math.random();
  
  // Create new field template
  const createNewField = () => ({
    id: Math.floor(generateId()),
    render: "field",
    name: "",
    label: "",
    fieldType: "INPUT",
    input: {
      id: Math.floor(generateId()),
      min: 0,
      max: 100,
      type: "SLIDER",
      validation: null,
      defaultValue: null,
      attributes: null,
    },
    combo: {
      id: Math.floor(generateId()),
      type: "SWITCH",
      code: null,
      content: null,
      source: "",
      dynamic: false,
      defaultValue: null,
    },
    dependencies: [],
    variables: [],
    descriptions: [],
    grid: 12,
  });

  // Create new section template
  const createNewSection = () => ({
    id: Math.floor(generateId()),
    render: "section",
    type: "NONE",
    label: "",
    children: [],
  });
  
  // Find item by path in nested structure
  const getItemByPath = (data, path) => {
    let current = data;
    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      if (index === "children") continue;

      if (typeof index === "number") {
        if (Array.isArray(current)) {
          current = current[index];
        } else if (current.children && Array.isArray(current.children)) {
          current = current.children[index];
        } else {
          return null;
        }
      }
    }
    return current;
  };

  // Add item to catalog
  const addItem = (parentPath, type) => {
    const newItem = type === "field" ? createNewField() : createNewSection();

    setCatalog((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));

      if (parentPath.length === 0) {
        updated.push(newItem);
        return updated;
      }

      const parent = getItemByPath(updated, parentPath);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(newItem);
      }

      return updated;
    });
  };

  // Update item
  const updateItem = (path, updates) => {
    setCatalog((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const item = getItemByPath(updated, path);
      if (item) {
        Object.assign(item, updates);
      }
      return updated;
    });
  };

  // Delete item
  const deleteItem = (path) => {
    setCatalog((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const parentPath = path.slice(0, -1);
      const index = path[path.length - 1];

      if (parentPath.length === 0) {
        updated.splice(index, 1);
      } else {
        const parent = getItemByPath(updated, parentPath);
        if (parent && parent.children) {
          parent.children.splice(index, 1);
        }
      }
      return updated;
    });
  };

  // Duplicate item
  const duplicateItem = (path) => {
    setCatalog((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const item = getItemByPath(updated, path);
      if (item) {
        const duplicate = JSON.parse(JSON.stringify(item));
        duplicate.id = Math.floor(generateId());
        duplicate.name = duplicate.name + "_copy";

        const parentPath = path.slice(0, -1);
        const index = path[path.length - 1];

        if (parentPath.length === 0) {
          updated.splice(index + 1, 0, duplicate);
        } else {
          const parent = getItemByPath(updated, parentPath);
          if (parent && parent.children) {
            parent.children.splice(index + 1, 0, duplicate);
          }
        }
      }
      return updated;
    });
  };

  // JSON mode functions
  const toggleJsonMode = () => {
    if (isJsonMode) {
      // Switching from JSON to builder - parse JSON
      try {
        const parsed = JSON.parse(rawJson);
        setCatalog(parsed);
        setIsJsonMode(false);
      } catch (e) {
        alert("Invalid JSON format");
        return;
      }
    } else {
      // Switching from builder to JSON
      setRawJson(JSON.stringify(catalog, null, 2));
      setIsJsonMode(true);
    }
  };

  const updateRawJson = (value) => {
    setRawJson(value);
  };

  // Export functions
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "form-catalog.json";
    a.click();
    URL.revokeObjectURL(url);
  };



  // In useFormBuilder.js - update the importJSON function
  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let imported = JSON.parse(e.target.result);
        imported = replaceIdsWithSimpleIds(imported);
        const safe = Array.isArray(imported) ? imported : [];
        console.log("safe #####", safe);
        setCatalog(safe);
        setRawJson(JSON.stringify(safe, null, 2));
      } catch (error) {
        alert("Error importing JSON: " + error.message);
      }
    };
    reader.readAsText(file);
  };


  const clearAll = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data? This cannot be undone."
      )
    ) {
      initializeEmptyCatalog();
    }
  };
 




const syncToServer = async () => {
  try {
    // 1) Gather local state
    const localArticles = JSON.parse(localStorage.getItem("simple-articles") || "[]");
    const dataSources = JSON.parse(localStorage.getItem("formBuilder-dataSources") || "{}");

    // Build a map of articleId -> catalog (including default)
    const configs = {};
    for (const a of localArticles) {
      const raw = localStorage.getItem(`formBuilder-catalog-${a.id}`);
      if (raw) configs[a.id] = JSON.parse(raw);
    }
    const defaultRaw = localStorage.getItem("formBuilder-catalog-default");
    if (defaultRaw) configs["default"] = JSON.parse(defaultRaw);

    // 2) Get server articles
    const { items: serverItems = [] } = await getAllArticles();

    // Make quick lookup maps by id and by name
    const byId = new Map(serverItems.map(a => [a.id, a]));
    const byNameLower = new Map(serverItems.map(a => [String(a.name).toLowerCase(), a]));

    // 3) Ensure each local article exists on server; create if missing
    //    Also build a localId -> serverId map to use when pushing catalogs
    const idMap = new Map(); // localId -> serverId
    for (const a of localArticles) {
      const nameLower = String(a.name).toLowerCase();
      let serverArticle = byId.get(a.id) || byNameLower.get(nameLower);

      if (!serverArticle) {
        // create on server with same name
        const { item: created } = await addArticle(a.name);
        serverArticle = created;
        // keep lookup tables in sync in case multiple configs refer to it
        byId.set(created.id, created);
        byNameLower.set(String(created.name).toLowerCase(), created);
      }

      idMap.set(a.id, serverArticle.id);
    }

    // 4) Push dataSources (if your route exists)
    try {
      if (dataSources && Object.keys(dataSources).length > 0) {
        await putDataSources(dataSources);
      }
    } catch (e) {
      console.warn("putDataSources failed (route may not exist):", e?.message || e);
    }

    // 5) Push catalogs for each article using the mapped server id
    for (const [localId, catalog] of Object.entries(configs)) {
      let targetId = localId;

      // if it's a normal article id, map to server id; keep "default" as-is
      if (localId !== "default") {
        targetId = idMap.get(localId);
        if (!targetId) {
          console.warn(`Skip catalog for ${localId}: no server id found`);
          continue;
        }
      }

      try {
        await setCatalogSync(targetId, catalog);
      } catch (e) {
        console.warn(`setCatalog failed for ${targetId}:`, e?.message || e);
      }
    }

    alert("Data synced to server successfully!");
  } catch (error) {
    console.error("Sync error:", error);
    alert("Sync failed");
  }
};

  


  // Save ONLY the current article to server (precise save)
  const saveCurrentToServer = async () => {
    try {
      let targetId = articleId || "default";
      if (targetId !== "default") {
        const { items: serverItems = [] } = await getAllArticles();
        let serverArticle = serverItems.find(a => a.id === targetId);
        if (!serverArticle) {
          // derive a readable name from local memory if available
          const localArticles = JSON.parse(localStorage.getItem("simple-articles") || "[]");
          const localMeta = localArticles.find(a => String(a.id) === String(targetId));
          const desiredName = localMeta?.name || String(targetId);
          const { item: created } = await addArticle(desiredName);
          serverArticle = created;
        }
        targetId = serverArticle.id;
      }
      await setCatalogSync(targetId, catalog); // RAW body
      alert(`Saved catalog for "${targetId}" ✅`);
    } catch (e) {
      console.error("saveCurrentToServer error:", e);
      alert(`Save failed: ${e?.message || e}`);
    }
  };


  return {
    // State
    catalog,
    rawJson,
    isJsonMode,

    // Actions
    addItem,
    updateItem,
    deleteItem,
    duplicateItem,

    // Utilities
    getItemByPath,
    createNewField,
    createNewSection,
    generateId,

    // JSON mode
    toggleJsonMode,
    updateRawJson,

    // Import/Export
    exportJSON,
    importJSON,
    clearAll,
    saveCurrentToServer,
    syncToServer,

    // Add this new method:
    loadSchema: (schema) => {
      setCatalog(schema);
      setRawJson(JSON.stringify(schema, null, 2));
    },
  };



};
