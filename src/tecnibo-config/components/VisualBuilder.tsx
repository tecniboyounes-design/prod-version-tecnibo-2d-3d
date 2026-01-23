// components/VisualBuilder.jsx
"use client";
import { useState } from "react";
import SectionItem from "./SectionItem";
import FieldItem from "./FieldItem";
import FieldEditor from "./FieldEditor";
import SectionEditor from "./SectionEditor";
import FormPreview from "./FormPreview";
import LiveFormPreview from "./LiveFormPreview";

const VisualBuilder = ({
  catalog,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
}) => {
  const [editingItem, setEditingItem] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  const handleEditField = (item, path) => {
    setEditingItem({ item, path, type: "field" });
  };

  const handleEditSection = (item, path) => {
    setEditingItem({ item, path, type: "section" });
  };

  const renderCatalog = () => {
    if (!catalog || catalog.length === 0) {
      return (
        <div className="text-center" style={{ padding: "64px 20px" }}>
          <p className="text-gray-500 mb-4">No sections created yet</p>
          <button
            onClick={() => onAddItem([], "section")}
            className="button button-primary"
          >
            Create First Section
          </button>
        </div>
      );
    }

    return catalog.map((item, index) => {
      const path = [index];

      if (item.render === "field") {
        return (
          <FieldItem
            key={item.id}
            item={item}
            path={path}
            onEdit={handleEditField}
            onDuplicate={onDuplicateItem}
            onDelete={onDeleteItem}
          />
        );
      }

      return (
        <SectionItem
          key={item.id}
          item={item}
          path={path}
          level={0}
          onEdit={handleEditSection}
          onDuplicate={onDuplicateItem}
          onDelete={onDeleteItem}
          onAddField={(parentPath) => onAddItem(parentPath, "field")}
          onAddSection={(parentPath) => onAddItem(parentPath, "section")}
          onEditField={handleEditField}
          onDuplicateField={onDuplicateItem}
          onDeleteField={onDeleteItem}
        />
      );
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex-between">
          <div>
            <h2 className="font-semibold">Visual Builder</h2>
            <span className="text-sm text-gray-500">
              {catalog?.length || 0} root sections
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="button button-purple"
            >
              Preview Form
            </button>
            <button
              onClick={() => setShowLivePreview(true)}
              className="button button-purple"
            >
              Live Preview
            </button>
            <button
              onClick={() => onAddItem([], "field")}
              className="button button-primary"
            >
              + Field
            </button>
            <button
              onClick={() => onAddItem([], "section")}
              className="button button-success"
            >
              + Section
            </button>
          </div>
        </div>
      </div>

      <div className="card-body">{renderCatalog()}</div>

      {/* Editors */}
      {editingItem && editingItem.type === "field" && (
        <FieldEditor
          field={editingItem.item}
          schema={catalog} // Add this line
          onSave={(updatedField) => {
            onUpdateItem(editingItem.path, updatedField);
            setEditingItem(null);
          }}
          onCancel={() => setEditingItem(null)}
        />
      )}

      {/* {editingItem && editingItem.type === "section" && (
        <SectionEditor
          section={editingItem.item}
          onSave={(updatedSection) => {
            onUpdateItem(editingItem.path, updatedSection);
            setEditingItem(null);
          }}
          onCancel={() => setEditingItem(null)}
        />
      )} */}

      {editingItem && editingItem.type === "section" && (
        <SectionEditor
          section={editingItem.item}
          schema={catalog} // ADD this line
          onSave={(updatedSection) => {
            onUpdateItem(editingItem.path, updatedSection);
            setEditingItem(null);
          }}
          onCancel={() => setEditingItem(null)}
        />
      )}

      {/* Form Preview */}
      {showPreview && (
        <FormPreview schema={catalog} onClose={() => setShowPreview(false)} />
      )}
      {/* Live Form Preview */}
      {showLivePreview && (
        <LiveFormPreview
          schema={catalog}
          onClose={() => setShowLivePreview(false)}
        />
      )}
    </div>
  );
};

export default VisualBuilder;
