// components/SectionItem.jsx
"use client";
import { useState } from "react";
import FieldItem from "./FieldItem";

const SectionItem = ({
  item,
  path,
  level = 0,
  onEdit,
  onDuplicate,
  onDelete,
  onAddField,
  onAddSection,
  onEditField,
  onDuplicateField,
  onDeleteField,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  console.log("Rendering SectionItem:", item, "at path:", path);

  const getSectionTypeColor = () => {
    switch (item.type) {
      case "ACCORDION":
        return "badge-purple";
      case "TAB":
        return "badge-blue";
      default:
        return "badge-green";
    }
  };

  const renderChildren = () => {
    if (!item.children || item.children.length === 0) {
      return (
        <div
          className="text-center text-gray-500"
          style={{ padding: "32px 16px" }}
        >
          No items in this section
          <div className="flex-center gap-2 mt-2">
            <button
              onClick={() => onAddField([...path, "children"])}
              className="button button-primary text-sm"
            >
              + Field
            </button>
            <button
              onClick={() => onAddSection([...path, "children"])}
              className="button button-success text-sm"
            >
              + Section
            </button>
          </div>
        </div>
      );
    }

    return item.children.map((child, index) => {
      const childPath = [...path, "children", index];

      if (child.render === "field") {
        return (
          <div
            key={child.name}
            style={{ marginLeft: level > 0 ? "16px" : "0" }}
          >
            <FieldItem
              item={child}
              path={childPath}
              onEdit={onEditField}
              onDuplicate={onDuplicateField}
              onDelete={onDeleteField}
            />
          </div>
        );
      }

      return (
        <div key={child.label} style={{ marginLeft: level > 0 ? "16px" : "0" }}>
          <SectionItem
            item={child}
            path={childPath}
            level={level + 1}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onAddField={onAddField}
            onAddSection={onAddSection}
            onEditField={onEditField}
            onDuplicateField={onDuplicateField}
            onDeleteField={onDeleteField}
          />
        </div>
      );
    });
  };

  return (
    <div className="card" style={{ marginBottom: "16px" }}>
      <div className="card-header" style={{ background: "#f9fafb" }}>
        <div className="flex-between">
          <div className="flex-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="button button-secondary"
              style={{ padding: "2px 6px", fontSize: "12px" }}
            >
              {isExpanded ? "▼" : "▶"}
            </button>
            <span className="font-medium">
              {item.label || "Untitled Section"}
            </span>
            <span className={`badge ${getSectionTypeColor()}`}>
              {item.type || "NONE"}
            </span>
            <span className="text-sm text-gray-500">
              ({item.children?.length || 0} items)
            </span>
            <span className="text-sm text-gray-500">
              {item.dependencies?.length > 0 && (
                <div className="text-orange-600">
                  Has {item.dependencies.length} dependencies
                </div>
              )}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onAddField([...path, "children"])}
              className="button button-primary text-sm"
            >
              + Field
            </button>
            <button
              onClick={() => onAddSection([...path, "children"])}
              className="button button-success text-sm"
            >
              + Section
            </button>
            <button
              onClick={() => onEdit(item, path)}
              className="button button-secondary text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => onDuplicate(path)}
              className="button button-success text-sm"
            >
              Copy
            </button>
            <button
              onClick={() => onDelete(path)}
              className="button button-danger text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {isExpanded && <div className="card-body">{renderChildren()}</div>}
    </div>
  );
};

export default SectionItem;
