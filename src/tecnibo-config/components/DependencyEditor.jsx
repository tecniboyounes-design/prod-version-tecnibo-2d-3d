// components/DependencyEditor.jsx
"use client";
import { useState, useEffect } from "react";

const DependencyEditor = ({
  dependencies = [],
  availableFields = [],
  onChange,
}) => {
  const [deps, setDeps] = useState(dependencies);

  console.log("Rendering DependencyEditor with deps:", availableFields);

  // Sync with parent when dependencies prop changes
  useEffect(() => {
    setDeps(dependencies);
  }, [dependencies]);

  const dependencyActionOptions = [
    { value: "SHOW", label: "Show Field" },
    { value: "HIDE", label: "Hide Field" },
    { value: "FILTER", label: "Filter Options" },
    { value: "ENABLE", label: "Enable Field" },
    { value: "DISABLE", label: "Disable Field" },
  ];

  const comparisonTypeOptions = [
    { value: "=", label: "Equals" },
    { value: "!=", label: "Not Equals" },
    { value: ">", label: "Greater Than" },
    { value: "<", label: "Less Than" },
    { value: ">=", label: "Greater or Equal" },
    { value: "<=", label: "Less or Equal" },
    { value: "contains", label: "Contains" },
    { value: "notContains", label: "Not Contains" },
    { value: "containsExact", label: "Contains Exact (comma-separated)" },
    {
      value: "notContainsExact",
      label: "Not Contains Exact (comma-separated)",
    },
    { value: "startsWith", label: "Starts With" },
    { value: "endsWith", label: "Ends With" },
  ];

  const operatorOptions = [
    { value: "AND", label: "AND" },
    { value: "OR", label: "OR" },
  ];

  const ruleTypeOptions = [
    { value: "simple", label: "Simple Field Check" },
    { value: "advanced", label: "Dynamic Value Check" },
  ];

  const createNewDependency = () => ({
    nod: 1,
    action: "SHOW",
    roles: [
      {
        operator: "OR",
        roles: [
          {
            field: "",
            comparisonType: "=",
            value: "",
            ruleType: "simple",
          },
        ],
      },
    ],
  });

  const addDependency = () => {
    const newDeps = [...deps, createNewDependency()];
    setDeps(newDeps);
    onChange(newDeps);
  };

  const removeDependency = (depIndex) => {
    const newDeps = deps.filter((_, i) => i !== depIndex);
    setDeps(newDeps);
    onChange(newDeps);
  };

  const updateDependency = (depIndex, updates) => {
    const newDeps = deps.map((dep, i) =>
      i === depIndex ? { ...dep, ...updates } : dep
    );
    setDeps(newDeps);
    onChange(newDeps);
  };

  const addRoleGroup = (depIndex) => {
    const newDeps = [...deps];
    newDeps[depIndex].roles.push({
      operator: "AND",
      roles: [
        {
          field: "",
          comparisonType: "=",
          value: "",
          ruleType: "simple",
        },
      ],
    });
    setDeps(newDeps);
    onChange(newDeps);
  };

  const removeRoleGroup = (depIndex, roleGroupIndex) => {
    const newDeps = [...deps];
    newDeps[depIndex].roles = newDeps[depIndex].roles.filter(
      (_, i) => i !== roleGroupIndex
    );
    setDeps(newDeps);
    onChange(newDeps);
  };

  const updateRoleGroup = (depIndex, roleGroupIndex, updates) => {
    const newDeps = [...deps];
    newDeps[depIndex].roles[roleGroupIndex] = {
      ...newDeps[depIndex].roles[roleGroupIndex],
      ...updates,
    };
    setDeps(newDeps);
    onChange(newDeps);
  };

  const addRole = (depIndex, roleGroupIndex) => {
    const newDeps = [...deps];
    newDeps[depIndex].roles[roleGroupIndex].roles.push({
      field: "",
      comparisonType: "=",
      value: "",
      ruleType: "simple",
    });
    setDeps(newDeps);
    onChange(newDeps);
  };

  const removeRole = (depIndex, roleGroupIndex, roleIndex) => {
    const newDeps = [...deps];
    newDeps[depIndex].roles[roleGroupIndex].roles = newDeps[depIndex].roles[
      roleGroupIndex
    ].roles.filter((_, i) => i !== roleIndex);
    setDeps(newDeps);
    onChange(newDeps);
  };

  const updateRole = (depIndex, roleGroupIndex, roleIndex, updates) => {
    const newDeps = [...deps];
    const currentRule =
      newDeps[depIndex].roles[roleGroupIndex].roles[roleIndex];

    // Handle rule type changes
    if (updates.ruleType && updates.ruleType !== getRuleType(currentRule)) {
      if (updates.ruleType === "simple") {
        // Convert advanced to simple
        newDeps[depIndex].roles[roleGroupIndex].roles[roleIndex] = {
          field: "",
          comparisonType: currentRule.comparisonType || "=",
          value: "",
          ruleType: "simple",
        };
      } else {
        // Convert simple to advanced
        newDeps[depIndex].roles[roleGroupIndex].roles[roleIndex] = {
          leftValue: "",
          comparisonType: currentRule.comparisonType || "=",
          rightValue: "",
          ruleType: "advanced",
        };
      }
    } else {
      // Regular update
      newDeps[depIndex].roles[roleGroupIndex].roles[roleIndex] = {
        ...currentRule,
        ...updates,
      };
    }

    setDeps(newDeps);
    onChange(newDeps);
  };

  // Detect rule type from structure
  const getRuleType = (rule) => {
    if (rule.leftValue !== undefined || rule.rightValue !== undefined) {
      return "advanced";
    }
    return rule.ruleType || "simple";
  };

  // Normalize rule for display
  const normalizeRule = (rule) => {
    const type = getRuleType(rule);
    if (type === "advanced") {
      return {
        ...rule,
        leftValue: rule.leftValue || "",
        rightValue: rule.rightValue || "",
        ruleType: "advanced",
      };
    }
    return {
      ...rule,
      field: rule.field || "",
      value: rule.value || "",
      ruleType: "simple",
    };
  };

  // Render rule input based on type
  const renderRuleInput = (rule, depIndex, roleGroupIndex, roleIndex) => {
    const normalizedRule = normalizeRule(rule);
    const ruleType = getRuleType(normalizedRule);

    return (
      <div key={roleIndex} className="p-3 bg-gray-50 rounded mb-2">
        {/* Rule Type Selector */}
        <div className="grid grid-4 gap-2 mb-2">
          <div>
            <select
              value={ruleType}
              onChange={(e) =>
                updateRole(depIndex, roleGroupIndex, roleIndex, {
                  ruleType: e.target.value,
                })
              }
              className="select"
              style={{ fontSize: "11px" }}
            >
              {ruleTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={normalizedRule.comparisonType || "="}
              onChange={(e) =>
                updateRole(depIndex, roleGroupIndex, roleIndex, {
                  comparisonType: e.target.value,
                })
              }
              className="select"
              style={{ fontSize: "11px" }}
            >
              {comparisonTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div></div>

          <div className="flex justify-end">
            <button
              onClick={() => removeRole(depIndex, roleGroupIndex, roleIndex)}
              className="button button-danger"
              style={{
                padding: "2px 6px",
                fontSize: "10px",
                minWidth: "auto",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Rule Fields */}
        {ruleType === "simple" ? (
          <div className="grid grid-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">Field</label>
              <select
                value={normalizedRule.field || ""}
                onChange={(e) =>
                  updateRole(depIndex, roleGroupIndex, roleIndex, {
                    field: e.target.value,
                  })
                }
                className="select"
                style={{ fontSize: "12px" }}
              >
                <option value="">Select field...</option>
                {availableFields.map((field) => (
                  <option key={field.id} value={field.name}>
                    {field.type === "section" ? "📁 " : "🔧 "}
                    {field.label || field.name}
                    {field.type === "section" ? " (Section)" : " (Field)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600">Value</label>
              <input
                type="text"
                value={normalizedRule.value || ""}
                onChange={(e) =>
                  updateRole(depIndex, roleGroupIndex, roleIndex, {
                    value: e.target.value,
                  })
                }
                className="input"
                style={{ fontSize: "12px" }}
                placeholder="Value..."
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">
                Left Value (Dynamic)
              </label>
              <input
                type="text"
                value={normalizedRule.leftValue || ""}
                onChange={(e) =>
                  updateRole(depIndex, roleGroupIndex, roleIndex, {
                    leftValue: e.target.value,
                  })
                }
                className="input"
                style={{ fontSize: "12px" }}
                placeholder="e.g., $FIELD_NAME.value"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">
                Right Value (Dynamic)
              </label>
              <input
                type="text"
                value={normalizedRule.rightValue || ""}
                onChange={(e) =>
                  updateRole(depIndex, roleGroupIndex, roleIndex, {
                    rightValue: e.target.value,
                  })
                }
                className="input"
                style={{ fontSize: "12px" }}
                placeholder="e.g., $attributes.front_type"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <h4 className="font-medium">Dependencies ({deps.length})</h4>
        <button
          onClick={addDependency}
          className="button button-success"
          style={{ padding: "4px 12px", fontSize: "12px" }}
        >
          + Add Dependency
        </button>
      </div>

      {deps.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <p className="mb-4">No dependencies configured</p>
          <p className="text-sm">
            Add dependencies to show/hide this field based on other field values
          </p>
        </div>
      )}

      {deps.map((dep, depIndex) => (
        <div key={depIndex} className="card mb-4">
          <div className="card-header" style={{ background: "#fef3c7" }}>
            <div className="flex-between">
              <span className="font-medium">Dependency {depIndex + 1}</span>
              <button
                onClick={() => removeDependency(depIndex)}
                className="button button-danger"
                style={{ padding: "2px 8px", fontSize: "10px" }}
              >
                Remove
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* Dependency Action */}
            <div className="grid grid-2 mb-4">
              <div>
                <label
                  className="text-sm font-medium mb-2"
                  style={{ display: "block" }}
                >
                  Action
                </label>
                <select
                  value={dep.action}
                  onChange={(e) =>
                    updateDependency(depIndex, { action: e.target.value })
                  }
                  className="select"
                >
                  {dependencyActionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-center">
                <button
                  onClick={() => addRoleGroup(depIndex)}
                  className="button button-primary"
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                >
                  + Add Rule Group
                </button>
              </div>
            </div>

            {/* Role Groups */}
            {dep.roles?.map((roleGroup, roleGroupIndex) => (
              <div key={roleGroupIndex} className="card mb-3">
                <div
                  className="card-header"
                  style={{ background: "#e0f2fe", padding: "8px 12px" }}
                >
                  <div className="flex-between">
                    <div className="flex-center gap-2">
                      <span className="text-sm font-medium">
                        Rule Group {roleGroupIndex + 1}
                      </span>
                      <select
                        value={roleGroup.operator || "OR"}
                        onChange={(e) =>
                          updateRoleGroup(depIndex, roleGroupIndex, {
                            operator: e.target.value,
                          })
                        }
                        className="select"
                        style={{
                          padding: "2px 8px",
                          fontSize: "11px",
                          width: "auto",
                        }}
                      >
                        {operatorOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => addRole(depIndex, roleGroupIndex)}
                        className="button button-success"
                        style={{ padding: "2px 8px", fontSize: "10px" }}
                      >
                        + Rule
                      </button>
                      <button
                        onClick={() =>
                          removeRoleGroup(depIndex, roleGroupIndex)
                        }
                        className="button button-danger"
                        style={{ padding: "2px 8px", fontSize: "10px" }}
                      >
                        Remove Group
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card-body" style={{ padding: "8px" }}>
                  {/* Individual Rules */}
                  {roleGroup.roles?.map((role, roleIndex) =>
                    renderRuleInput(role, depIndex, roleGroupIndex, roleIndex)
                  )}

                  {roleGroup.roles?.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      <button
                        onClick={() => addRole(depIndex, roleGroupIndex)}
                        className="button button-primary text-sm"
                      >
                        Add First Rule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Dependency Preview */}
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <h5 className="text-sm font-medium mb-2">Logic Preview:</h5>
              <div className="text-sm text-gray-700 font-mono">
                {dep.action} field when:
                {dep.roles?.map((roleGroup, rgIndex) => (
                  <div key={rgIndex} className="ml-2">
                    {rgIndex > 0 && (
                      <span className="text-purple-600"> AND </span>
                    )}
                    <span className="text-blue-600">
                      ({roleGroup.operator} group:{" "}
                    </span>
                    {roleGroup.roles?.map((rule, rIndex) => {
                      const normalizedRule = normalizeRule(rule);
                      const ruleType = getRuleType(normalizedRule);

                      return (
                        <span key={rIndex}>
                          {rIndex > 0 && (
                            <span className="text-green-600">
                              {" "}
                              {roleGroup.operator}{" "}
                            </span>
                          )}
                          <span className="text-gray-800">
                            {ruleType === "simple"
                              ? `${normalizedRule.field || "FIELD"} ${
                                  normalizedRule.comparisonType || "="
                                } "${normalizedRule.value || "VALUE"}"`
                              : `${normalizedRule.leftValue || "LEFT"} ${
                                  normalizedRule.comparisonType || "="
                                } ${normalizedRule.rightValue || "RIGHT"}`}
                          </span>
                        </span>
                      );
                    })}
                    <span className="text-blue-600">)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {deps.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <h5 className="text-sm font-medium mb-2">Dependency Types:</h5>
          <ul className="text-sm text-gray-700" style={{ marginLeft: "16px" }}>
            <li>
              • <strong>Simple:</strong> field = value (basic field comparison)
            </li>
            <li>
              • <strong>Advanced:</strong> $leftValue = $rightValue (dynamic
              value resolution)
            </li>
            <li>
              • <strong>SHOW/HIDE:</strong> Controls field visibility
            </li>
            <li>
              • <strong>FILTER:</strong> Filters combo options based on
              conditions
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default DependencyEditor;