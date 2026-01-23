// components/FieldItem.jsx
"use client";

const FieldItem = ({ item, path, onEdit, onDuplicate, onDelete }) => {
  const getFieldTypeInfo = () => {
    if (item.fieldType === "INPUT") {
      return {
        type: "INPUT",
        subType: item.input?.type || "TEXT",
        color: "badge-blue",
      };
    }
    if (item.fieldType === "COMBOBOX") {
      return {
        type: "COMBO",
        subType: item.combo?.type || "SWITCH",
        color: "badge-purple",
      };
    }
    return {
      type: item.fieldType || "LOCAL",
      subType: "",
      color: "badge-green",
    };
  };

  const fieldInfo = getFieldTypeInfo();

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex-between">
          <div className="flex-1">
            <div className="flex-center gap-2 mb-2">
              <span className="font-medium">
                {item.label || "Untitled Field"}
              </span>
              <span className={`badge ${fieldInfo.color}`}>
                {fieldInfo.type}
              </span>
              {fieldInfo.subType && (
                <span className="badge badge-green">{fieldInfo.subType}</span>
              )}
            </div>

            <div className="text-sm text-gray-600">
              <div>
                Name:{" "}
                <span className="font-medium">{item.name || "No name"}</span>
              </div>
              <div>
                Grid: <span className="font-medium">{item.grid || 12}</span>
              </div>
              {item.dependencies?.length > 0 && (
                <div className="text-orange-600">
                  Has {item.dependencies.length} dependencies
                </div>
              )}
            </div>

            {/* Field specific info */}
            {item.fieldType === "INPUT" && item.input && (
              <div className="text-sm text-gray-500 mt-2">
                {item.input.type === "SLIDER" && (
                  <span>
                    Range: {item.input.min || 0} - {item.input.max || 100}
                  </span>
                )}
              </div>
            )}

            {item.fieldType === "COMBOBOX" && item.combo && (
              <div className="text-sm text-gray-500 mt-2">
                Source: {item.combo.source || "None"}
                {item.combo.defaultValue && (
                  <span className="ml-2">
                    Default: {item.combo.defaultValue}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onEdit(item, path)}
              className="button button-primary"
              style={{ padding: "4px 8px", fontSize: "12px" }}
            >
              Edit
            </button>
            <button
              onClick={() => onDuplicate(path)}
              className="button button-success"
              style={{ padding: "4px 8px", fontSize: "12px" }}
            >
              Copy
            </button>
            <button
              onClick={() => onDelete(path)}
              className="button button-danger"
              style={{ padding: "4px 8px", fontSize: "12px" }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldItem;
