"use client";

const IconConfigEditor = ({ config = {}, onChange }) => {
  const updateConfig = (updates) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h4 className="font-medium">Icon/Image (Optional)</h4>
      </div>
      <div className="card-body">
        <div className="mb-4">
          <label
            className="text-sm font-medium mb-2"
            style={{ display: "block" }}
          >
            Icon/Image Source
          </label>
          <select
            value={config.iconSource || "none"}
            onChange={(e) => updateConfig({ iconSource: e.target.value })}
            className="select"
          >
            <option value="none">No Icon</option>
            <option value="library">Icon Library (Lucide)</option>
            <option value="url">Image URL</option>
            <option value="upload">Upload Image</option>
          </select>
        </div>

        {config.iconSource === "library" && (
          <div className="mb-4">
            <label
              className="text-sm font-medium mb-2"
              style={{ display: "block" }}
            >
              Icon Name
            </label>
            <input
              type="text"
              value={config.iconName || ""}
              onChange={(e) => updateConfig({ iconName: e.target.value })}
              className="input"
              placeholder="e.g., Settings, Home, User, Package"
            />
            <small className="text-gray-500">
              Browse icons at{" "}
              <a
                href="https://lucide.dev/icons"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#007bff" }}
              >
                lucide.dev
              </a>
            </small>
          </div>
        )}

        {config.iconSource === "url" && (
          <div className="mb-4">
            <label
              className="text-sm font-medium mb-2"
              style={{ display: "block" }}
            >
              Image URL
            </label>
            <input
              type="text"
              value={config.iconUrl || ""}
              onChange={(e) => updateConfig({ iconUrl: e.target.value })}
              className="input"
              placeholder="https://example.com/icon.png"
            />
            {config.iconUrl && (
              <img
                src={config.iconUrl}
                alt="Preview"
                style={{
                  marginTop: "8px",
                  maxWidth: "100px",
                  maxHeight: "100px",
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
          </div>
        )}

        {config.iconSource === "upload" && (
          <div className="mb-4">
            <label
              className="text-sm font-medium mb-2"
              style={{ display: "block" }}
            >
              Upload Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    updateConfig({ iconUpload: reader.result });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="input"
            />
            {config.iconUpload && (
              <div style={{ marginTop: "8px" }}>
                <img
                  src={config.iconUpload}
                  alt="Preview"
                  style={{ maxWidth: "100px", maxHeight: "100px" }}
                />
                <button
                  onClick={() => updateConfig({ iconUpload: null })}
                  className="button button-secondary"
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    padding: "4px 8px",
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}

        {config.iconSource !== "none" && (
          <div className="grid grid-2">
            <div>
              <label
                className="text-sm font-medium mb-2"
                style={{ display: "block" }}
              >
                Icon Position
              </label>
              <select
                value={config.iconPosition || "left"}
                onChange={(e) => updateConfig({ iconPosition: e.target.value })}
                className="select"
              >
                <option value="left">Left of Label</option>
                <option value="right">Right of Label</option>
                <option value="top">Above Label</option>
              </select>
            </div>
            <div>
              <label
                className="text-sm font-medium mb-2"
                style={{ display: "block" }}
              >
                Icon Size (px)
              </label>
              <input
                type="number"
                value={config.iconSize || 20}
                onChange={(e) =>
                  updateConfig({ iconSize: parseInt(e.target.value) })
                }
                className="input"
                min="12"
                max="48"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IconConfigEditor;
