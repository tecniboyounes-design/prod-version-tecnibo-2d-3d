// components/JsonEditor.jsx
"use client";

const JsonEditor = ({ value, onChange }) => {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold">JSON Schema Editor</h2>
        <span className="text-sm text-gray-500">
          Edit the form schema directly
        </span>
      </div>
      <div className="card-body">
        <textarea
          className="textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your form schema JSON here..."
          style={{ minHeight: "500px", fontFamily: "monospace" }}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              try {
                const formatted = JSON.stringify(JSON.parse(value), null, 2);
                onChange(formatted);
              } catch (e) {
                alert("Invalid JSON format");
              }
            }}
            className="button button-primary"
          >
            Format JSON
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(value);
              alert("Copied to clipboard!");
            }}
            className="button button-secondary"
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default JsonEditor;
