"use client";
import { useState, useEffect } from "react";
import FormBuilderHeader from "./FormBuilderHeader";
import JsonEditor from "./JsonEditor";
import VisualBuilder from "./VisualBuilder";
import QuickActions from "./QuickActions";
import ConfArticleManager from "./ConfArticleManager";
import { useFormBuilder } from "../hooks/useFormBuilder";

const FormBuilderContainer = () => {
  const [activeArticleId, setActiveArticleId] = useState("default");

  const {
    catalog,
    rawJson,
    isJsonMode,
    toggleJsonMode,
    updateRawJson,
    exportJSON,
    importJSON,
    clearAll,
    addItem,
    updateItem,
    deleteItem,
    duplicateItem,
    loadSchema,
    syncToServer,
    saveCurrentToServer
  } = useFormBuilder(activeArticleId);

  const activeArticleName =
    activeArticleId === "default"
      ? "Default Form"
      : JSON.parse(localStorage.getItem("simple-articles") || "[]").find(
          (a) => a.id === activeArticleId
        )?.name || "Unknown Article";

  return (
    <>
      {/* Sidebar */}
      <ConfArticleManager
        activeArticleId={activeArticleId}
        onArticleChange={setActiveArticleId}
      />

      {/* Main Content */}
      <div>
        <div className="header">
          <h1 className="text-lg font-semibold">
            Form Builder - {activeArticleName}
          </h1>
        </div>

        <div className="container">
          <FormBuilderHeader
            isJsonMode={isJsonMode}
            onToggleJsonMode={toggleJsonMode}
            onExport={exportJSON}
            onImport={importJSON}
            onClearAll={clearAll}
            // onSync={syncToServer}
            onSync={saveCurrentToServer}
          />

          {isJsonMode ? (
            <JsonEditor value={rawJson} onChange={updateRawJson} />
          ) : (
            <>


              <QuickActions
                onImportSchema={(schema) => loadSchema(schema)}
                onExportSchema={() => catalog}
              />


              <VisualBuilder
                catalog={catalog}
                onAddItem={addItem}
                onUpdateItem={updateItem}
                onDeleteItem={deleteItem}
                onDuplicateItem={duplicateItem}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default FormBuilderContainer;
