// components/LiveFormPreview.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import { getDataSources, putDataSources } from "../lib/articlesFsClient";
import { queriesServices } from "../lib/services/queries";
import IconRenderer from "./IconRenderer";

const LiveFormPreview = ({ schema, onClose }) => {
  const [formValues, setFormValues] = useState({});
  const [dataSources, setDataSources] = useState({});
  const [showDataEditor, setShowDataEditor] = useState(false);
  const [dataSourcesText, setDataSourcesText] = useState("{}");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dynamicDataCache, setDynamicDataCache] = useState({});
  const [loadingDynamic, setLoadingDynamic] = useState({});
  const [searchTerms, setSearchTerms] = useState({});
  const [localSearchTerms, setLocalSearchTerms] = useState({});
  const searchTimeoutRef = useRef({});
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [visibleItemsCount, setVisibleItemsCount] = useState({});
  const ITEMS_PER_PAGE = 10;

  const debouncedSearch = (fieldName, searchValue) => {
    // Clear existing timeout
    if (searchTimeoutRef.current[fieldName]) {
      clearTimeout(searchTimeoutRef.current[fieldName]);
    }

    // Set local search immediately for UI responsiveness
    setLocalSearchTerms((prev) => ({ ...prev, [fieldName]: searchValue }));

    // Debounce the API call
    searchTimeoutRef.current[fieldName] = setTimeout(() => {
      setSearchTerms((prev) => ({ ...prev, [fieldName]: searchValue }));
    }, 500); // 500ms delay
  };

  // Add this useEffect near other useEffects
  useEffect(() => {
    const handleClickOutside = () => {
      // Close all dropdowns - you'll need to track which are open
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---- Load from server + subscribe to updates ----
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { dataSources: remote } = await getDataSources();
        if (cancelled) return;
        const next = remote || {};
        setDataSources(next);
        setDataSourcesText(JSON.stringify(next, null, 2));
      } catch (error) {
        console.error("Error loading data sources from API:", error);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    };

    load();

    const onUpdated = () => load();
    window.addEventListener("dataSourcesUpdated", onUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("dataSourcesUpdated", onUpdated);
    };
  }, []);

  // // Load dynamic data sources
  // useEffect(() => {
  //   const loadDynamicData = async (field, searchTerm = '') => {
  //     const fieldsNeedingData = [];

  //     const extractFields = (elements) => {
  //       elements?.forEach((element) => {
  //         if (
  //           element.render === "field" &&
  //           element.fieldType === "COMBOBOX" &&
  //           element.combo?.dynamic &&
  //           element.combo?.source
  //         ) {
  //           fieldsNeedingData.push(element);
  //         }
  //         if (element.children) {
  //           extractFields(element.children);
  //         }
  //       });
  //     };

  //     extractFields(schema);

  //     for (const field of fieldsNeedingData) {
  //       const cacheKey = field.combo.source;

  //       if (dynamicDataCache[cacheKey] || loadingDynamic[cacheKey]) {
  //         continue;
  //       }

  //       setLoadingDynamic((prev) => ({ ...prev, [cacheKey]: true }));

  //       try {
  //         const baseUrl = field.combo.source.startsWith("http")
  //           ? field.combo.source
  //           : queriesServices.showOptionsData(field.combo.source);

  //         const response = await baseUrl;
  //         const data = await response.data;

  //         console.log(`Loaded dynamic data for`, data);

  //         // Transform data based on code/content fields
  //         let options = data;
  //         if (field.combo.code && data[field.combo.code]) {
  //           options = data[field.combo.code];
  //         }

  //         // Map to {label, value} format
  //         if (Array.isArray(options)) {
  //           if (field.combo.content) {
  //             options = options.map((item) => ({
  //               label: item[field.combo.content] || item,
  //               value: item[field.combo.content] || item,
  //               attributes: item,
  //             }));
  //           } else if (typeof options[0] === "object" && !options[0].label) {
  //             // Auto-detect first string property
  //             const firstKey = Object.keys(options[0])[0];
  //             options = options.map((item) => ({
  //               label: item[firstKey],
  //               value: item[firstKey],
  //               attributes: item,
  //             }));
  //           }
  //         }

  //         setDynamicDataCache((prev) => ({ ...prev, [cacheKey]: options }));
  //       } catch (error) {
  //         console.error(`Error loading dynamic data for ${cacheKey}:`, error);
  //       } finally {
  //         setLoadingDynamic((prev) => ({ ...prev, [cacheKey]: false }));
  //       }
  //     }
  //   };

  //   if (isLoaded) {
  //     loadDynamicData();
  //   }
  // }, [schema, isLoaded]);

  // Load dynamic data sources with search support
  useEffect(() => {
    const loadDynamicData = async (field, searchTerm = "") => {
      const cacheKey = `${field.combo.source}${
        searchTerm ? `_${searchTerm}` : ""
      }`;

      if (dynamicDataCache[cacheKey] || loadingDynamic[cacheKey]) {
        return;
      }

      setLoadingDynamic((prev) => ({ ...prev, [cacheKey]: true }));

      try {
        let baseUrl = field.combo.source.startsWith("http")
          ? field.combo.source
          : field.combo.source;

        // Add search parameter if searchable and searchTerm exists
        if (field.combo.searchable && searchTerm) {
          baseUrl = `${baseUrl}?search=${encodeURIComponent(searchTerm)}`;
        }

        const response = await queriesServices.showOptionsData(baseUrl);
        const data = await response.data;

        console.log(`Loaded dynamic data for ${field.name}`, data);

        // Transform data based on code/content fields
        let options = data;
        if (field.combo.code && data[field.combo.code]) {
          options = data[field.combo.code];
        }

        // Validate it's an array
        if (!Array.isArray(options)) {
          console.error(`Data is not an array for ${field.name}:`, options);
          options = [];
        }

        setDynamicDataCache((prev) => ({ ...prev, [cacheKey]: options }));
      } catch (error) {
        console.error(`Error loading dynamic data for ${field.name}:`, error);
      } finally {
        setLoadingDynamic((prev) => ({ ...prev, [cacheKey]: false }));
      }
    };

    const loadAllDynamicFields = async () => {
      const fieldsNeedingData = [];

      const extractFields = (elements) => {
        elements?.forEach((element) => {
          if (
            element.render === "field" &&
            element.fieldType === "COMBOBOX" &&
            element.combo?.dynamic &&
            element.combo?.source
          ) {
            fieldsNeedingData.push(element);
          }
          if (element.children) {
            extractFields(element.children);
          }
        });
      };

      extractFields(schema);

      for (const field of fieldsNeedingData) {
        const searchTerm = searchTerms[field.name] || "";
        await loadDynamicData(field, searchTerm);
      }
    };

    if (isLoaded) {
      loadAllDynamicFields();
    }
  }, [schema, isLoaded, searchTerms]);

  // Parse data sources from text
  const getParsedDataSources = () => {
    try {
      return JSON.parse(dataSourcesText);
    } catch {
      return {};
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // Save full JSON to server (mode=replace)
  const updateDataSources = async () => {
    try {
      setIsSaving(true);
      const parsed = JSON.parse(dataSourcesText);
      await putDataSources(parsed, { mode: "replace" }); // overwrite entire file
      setDataSources(parsed);
      setShowDataEditor(false);
      // notify other clients (e.g., DataSourceManager list)
      window.dispatchEvent(new CustomEvent("dataSourcesUpdated"));
    } catch (e) {
      alert("Invalid JSON or failed to save: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ----- Dependency logic (unchanged) -----
  const evaluateDependency = (dependency, formValues, dataSources) => {
    if (!dependency.roles || dependency.roles.length === 0) {
      return true;
    }
    return dependency.roles.every((roleGroup) =>
      evaluateRoleGroup(roleGroup, formValues, dataSources)
    );
  };

  const evaluateRoleGroup = (roleGroup, formValues, dataSources) => {
    if (!roleGroup.roles || roleGroup.roles.length === 0) {
      return true;
    }
    const operator = roleGroup.operator || "OR";
    if (operator === "OR") {
      return roleGroup.roles.some((rule) =>
        evaluateRule(rule, formValues, dataSources)
      );
    } else {
      return roleGroup.roles.every((rule) =>
        evaluateRule(rule, formValues, dataSources)
      );
    }
  };

  const evaluateRule = (rule, formValues, dataSources) => {
    if (rule.leftValue !== undefined || rule.rightValue !== undefined) {
      return evaluateAdvancedRule(rule, formValues, dataSources);
    }
    return evaluateSimpleRule(rule, formValues);
  };

  const evaluateSimpleRule = (rule, formValues) => {
    const fieldValue = formValues[rule.field];
    const compareValue = rule.value;
    const comparisonType = rule.comparisonType || "=";
    return compareValues(fieldValue, compareValue, comparisonType);
  };

  const evaluateAdvancedRule = (rule, formValues, dataSources) => {
    const leftValue = resolveDynamicValue(
      rule.leftValue,
      formValues,
      dataSources
    );
    const rightValue = resolveDynamicValue(
      rule.rightValue,
      formValues,
      dataSources
    );
    const comparisonType = rule.comparisonType || "=";
    return compareValues(leftValue, rightValue, comparisonType);
  };

  // const compareValues = (leftValue, rightValue, comparisonType) => {
  //   if (leftValue == null && rightValue == null)
  //     return comparisonType === "=" || comparisonType === "==";
  //   if (leftValue == null || rightValue == null)
  //     return comparisonType === "!=" || comparisonType === "!=";

  //   switch (comparisonType) {
  //     case "=":
  //     case "==":
  //       return String(leftValue) === String(rightValue);
  //     case "!=":
  //       return String(leftValue) !== String(rightValue);
  //     case ">":
  //       return Number(leftValue) > Number(rightValue);
  //     case "<":
  //       return Number(leftValue) < Number(rightValue);
  //     case ">=":
  //       return Number(leftValue) >= Number(rightValue);
  //     case "<=":
  //       return Number(leftValue) <= Number(rightValue);
  //     case "contains":
  //       return String(leftValue).includes(String(rightValue));
  //     case "notContains":
  //       return !String(leftValue).includes(String(rightValue));
  //     case "startsWith":
  //       return String(leftValue).startsWith(String(rightValue));
  //     case "endsWith":
  //       return String(leftValue).endsWith(String(rightValue));
  //     default:
  //       console.warn(`Unknown comparison type: ${comparisonType}`);
  //       return false;
  //   }
  // };

  const compareValues = (leftValue, rightValue, comparisonType) => {
    if (leftValue == null && rightValue == null)
      return comparisonType === "=" || comparisonType === "==";
    if (leftValue == null || rightValue == null)
      return comparisonType === "!=" || comparisonType === "!=";

    switch (comparisonType) {
      case "=":
      case "==":
        return String(leftValue) === String(rightValue);
      case "!=":
        return String(leftValue) !== String(rightValue);
      case ">":
        return Number(leftValue) > Number(rightValue);
      case "<":
        return Number(leftValue) < Number(rightValue);
      case ">=":
        return Number(leftValue) >= Number(rightValue);
      case "<=":
        return Number(leftValue) <= Number(rightValue);
      case "contains":
        return String(leftValue).includes(String(rightValue));
      case "notContains":
        return !String(leftValue).includes(String(rightValue));
      case "containsExact":
        // Split by comma and check if exact value exists
        const containsArray = String(leftValue)
          .split(",")
          .map((v) => v.trim());
        return containsArray.includes(String(rightValue));
      case "notContainsExact":
        const notContainsArray = String(leftValue)
          .split(",")
          .map((v) => v.trim());
        return !notContainsArray.includes(String(rightValue));
      case "startsWith":
        return String(leftValue).startsWith(String(rightValue));
      case "endsWith":
        return String(leftValue).endsWith(String(rightValue));
      default:
        console.warn(`Unknown comparison type: ${comparisonType}`);
        return false;
    }
  };

  const isFieldVisible = (field, formValues, dataSources) => {
    if (!field.dependencies || field.dependencies.length === 0) {
      return true;
    }

    let hasShowDependencies = false;
    let showResult = false;

    for (const dependency of field.dependencies) {
      if (dependency.action === "SHOW") {
        hasShowDependencies = true;
        if (evaluateDependency(dependency, formValues, dataSources)) {
          showResult = true;
        }
      } else if (dependency.action === "HIDE") {
        if (evaluateDependency(dependency, formValues, dataSources)) {
          return false;
        }
      }
    }
    return hasShowDependencies ? showResult : true;
  };

  const isFieldEnabled = (field, formValues, dataSources) => {
    if (!field.dependencies || field.dependencies.length === 0) {
      return true;
    }
    for (const dependency of field.dependencies) {
      if (dependency.action === "DISABLE") {
        if (evaluateDependency(dependency, formValues, dataSources)) {
          return false;
        }
      } else if (dependency.action === "ENABLE") {
        if (evaluateDependency(dependency, formValues, dataSources)) {
          return true;
        }
      }
    }
    return true;
  };

  const isSectionVisible = (section, formValues, dataSources) => {
    if (!section.name) return true;

    const allFieldsWithDependencies = [];
    const extractFields = (elements) => {
      elements.forEach((element) => {
        if (
          element.render === "field" &&
          element.dependencies &&
          element.dependencies.length > 0
        ) {
          allFieldsWithDependencies.push(element);
        }
        if (element.children) {
          extractFields(element.children);
        }
      });
    };
    extractFields(schema);

    let hasShowDependencies = false;
    let showResult = false;

    for (const field of allFieldsWithDependencies) {
      for (const dependency of field.dependencies) {
        const targetsSectionName = dependency.roles?.some((roleGroup) =>
          roleGroup.roles?.some((rule) => rule.field === section.name)
        );
        if (targetsSectionName) {
          if (dependency.action === "SHOW") {
            hasShowDependencies = true;
            if (evaluateDependency(dependency, formValues, dataSources)) {
              showResult = true;
            }
          } else if (dependency.action === "HIDE") {
            if (evaluateDependency(dependency, formValues, dataSources)) {
              return false;
            }
          }
        }
      }
    }
    return hasShowDependencies ? showResult : true;
  };

  const getFilteredOptions = (field, sourceData, formValues, dataSources) => {
    if (!field.dependencies || field.dependencies.length === 0) {
      return sourceData;
    }
    const filterDependencies = field.dependencies.filter(
      (dep) => dep.action === "FILTER"
    );
    if (filterDependencies.length === 0) {
      return sourceData;
    }
    return sourceData.filter((option) => {
      return filterDependencies.every((dependency) => {
        return evaluateFilterDependency(
          dependency,
          formValues,
          dataSources,
          option
        );
      });
    });
  };

  const evaluateFilterDependency = (
    dependency,
    formValues,
    dataSources,
    option
  ) => {
    if (!dependency.roles || dependency.roles.length === 0) {
      return true;
    }
    return dependency.roles.every((roleGroup) => {
      const operator = roleGroup.operator || "OR";
      if (operator === "OR") {
        return roleGroup.roles.some((rule) =>
          evaluateFilterRule(rule, formValues, dataSources, option)
        );
      } else {
        return roleGroup.roles.every((rule) =>
          evaluateFilterRule(rule, formValues, dataSources, option)
        );
      }
    });
  };

  // const evaluateFilterRule = (rule, formValues, dataSources, option) => {
  //   if (rule.leftValue !== undefined || rule.rightValue !== undefined) {
  //     const leftValue = resolveFilterValue(
  //       rule.leftValue,
  //       formValues,
  //       dataSources,
  //       option
  //     );
  //     const rightValue = resolveFilterValue(
  //       rule.rightValue,
  //       formValues,
  //       dataSources,
  //       option
  //     );

  //     // For "contains" and "notContains" in filter context, swap the check
  //     if (rule.comparisonType === "contains") {
  //       return String(rightValue).includes(String(leftValue));
  //     }
  //     if (rule.comparisonType === "notContains") {
  //       return !String(rightValue).includes(String(leftValue));
  //     }

  //     return compareValues(leftValue, rightValue, rule.comparisonType || "=");
  //   }

  //   const fieldValue = formValues[rule.field];
  //   return compareValues(fieldValue, rule.value, rule.comparisonType || "=");
  // };

  const evaluateFilterRule = (rule, formValues, dataSources, option) => {
    if (rule.leftValue !== undefined || rule.rightValue !== undefined) {
      const leftValue = resolveFilterValue(
        rule.leftValue,
        formValues,
        dataSources,
        option
      );
      const rightValue = resolveFilterValue(
        rule.rightValue,
        formValues,
        dataSources,
        option
      );

      // Handle contains/not contains (swap for filter context)
      if (rule.comparisonType === "contains") {
        return String(rightValue).includes(String(leftValue));
      }
      if (rule.comparisonType === "notContains") {
        return !String(rightValue).includes(String(leftValue));
      }

      // Handle exact match in comma-separated values (swap for filter context)
      if (rule.comparisonType === "containsExact") {
        const values = String(rightValue)
          .split(",")
          .map((v) => v.trim());
        return values.includes(String(leftValue));
      }
      if (rule.comparisonType === "notContainsExact") {
        const values = String(rightValue)
          .split(",")
          .map((v) => v.trim());
        return !values.includes(String(leftValue));
      }

      return compareValues(leftValue, rightValue, rule.comparisonType || "=");
    }

    const fieldValue = formValues[rule.field];
    return compareValues(fieldValue, rule.value, rule.comparisonType || "=");
  };

  const resolveDynamicValue = (dynamicValue, formValues, dataSources) => {
    if (!dynamicValue || typeof dynamicValue !== "string") {
      return dynamicValue;
    }

    // Match $FIELD_NAME.value pattern
    const fieldValueMatch = dynamicValue.match(/^\$([A-Za-z_0-9]+)\.value$/i);
    if (fieldValueMatch) {
      const fieldName = fieldValueMatch[1];
      return formValues[fieldName];
    }

    // Match $attributes.ATTR_NAME pattern
    const attributeMatch = dynamicValue.match(/^\$attributes\.(.+)$/);
    if (attributeMatch) {
      return dynamicValue;
    }

    // Match simple $FIELD_NAME pattern
    if (dynamicValue.startsWith("$")) {
      const fieldName = dynamicValue.substring(1);
      return formValues[fieldName];
    }

    return dynamicValue;
  };

  const resolveFilterValue = (
    dynamicValue,
    formValues,
    dataSources,
    option
  ) => {
    if (!dynamicValue || typeof dynamicValue !== "string") {
      return dynamicValue;
    }

    // Match $FIELD_NAME.value pattern
    const fieldValueMatch = dynamicValue.match(/^\$([A-Za-z_0-9]+)\.value$/i);
    if (fieldValueMatch) {
      const fieldName = fieldValueMatch[1];
      return formValues[fieldName];
    }

    // Match $attributes.ATTR_NAME pattern
    const attributeMatch = dynamicValue.match(/^\$attributes\.(.+)$/);
    if (attributeMatch) {
      const attributeName = attributeMatch[1];
      return option?.attributes?.[attributeName];
    }

    // Match simple $FIELD_NAME pattern (without .value)
    if (dynamicValue.startsWith("$")) {
      const fieldName = dynamicValue.substring(1);
      return formValues[fieldName];
    }

    return dynamicValue;
  };

  const renderField = (field) => {
    const parsedDataSources = getParsedDataSources();

    if (!isFieldVisible(field, formValues, parsedDataSources)) {
      return null;
    }

    const { fieldType, name, label, grid = 12, input, combo } = field;
    const value = formValues[name] || "";
    const isEnabled = isFieldEnabled(field, formValues, parsedDataSources);

    const gridClass =
      grid === 12 ? "full-width" : grid === 6 ? "half-width" : "auto-width";

    if (fieldType === "INPUT") {
      if (input?.type === "SLIDER") {
        return (
          <div key={field.name} className={`form-field ${gridClass}`}>
            <label
              className="field-label"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexDirection: field.iconPosition === "top" ? "column" : "row",
              }}
            >
              {field.iconPosition !== "right" && (
                <IconRenderer
                  iconSource={field.iconSource}
                  iconName={field.iconName}
                  iconUrl={field.iconUrl}
                  iconUpload={field.iconUpload}
                  size={field.iconSize || 20}
                />
              )}
              <span>{label || name}</span>
              {field.iconPosition === "right" && (
                <IconRenderer
                  iconSource={field.iconSource}
                  iconName={field.iconName}
                  iconUrl={field.iconUrl}
                  iconUpload={field.iconUpload}
                  size={field.iconSize || 20}
                />
              )}
            </label>
            <div className="slider-container">
              <input
                type="range"
                min={input.min || 0}
                max={input.max || 100}
                value={value || input.defaultValue || input.min || 0}
                onChange={(e) => handleFieldChange(name, e.target.value)}
                className="slider"
                disabled={!isEnabled}
              />
              <span className="slider-value">
                {value || input.defaultValue || input.min || 0}
              </span>
            </div>
          </div>
        );
      }

      return (
        <div key={field.name} className={`form-field ${gridClass}`}>
          <label
            className="field-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexDirection: field.iconPosition === "top" ? "column" : "row",
            }}
          >
            {field.iconPosition !== "right" && (
              <IconRenderer
                iconSource={field.iconSource}
                iconName={field.iconName}
                iconUrl={field.iconUrl}
                iconUpload={field.iconUpload}
                size={field.iconSize || 20}
              />
            )}
            <span>{label || name}</span>
            {field.iconPosition === "right" && (
              <IconRenderer
                iconSource={field.iconSource}
                iconName={field.iconName}
                iconUrl={field.iconUrl}
                iconUpload={field.iconUpload}
                size={field.iconSize || 20}
              />
            )}
          </label>
          <input
            type={input?.type === "NUMBER" ? "number" : "text"}
            value={value}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            className="field-input"
            min={input?.min}
            max={input?.max}
            placeholder={`Enter ${label || name}`}
            disabled={!isEnabled}
          />
        </div>
      );
    }

    if (fieldType === "CHECKBOX") {
      return (
        <div key={field.name} className={`form-field ${gridClass}`}>
          {/* <label className="field-label">
            <input
              type="checkbox"
              checked={value || field.defaultValue || false}
              onChange={(e) => handleFieldChange(name, e.target.checked)}
              disabled={!isEnabled}
            />
            {label || name}
          </label> */}
          <label
            className="field-label"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <input
              type="checkbox"
              checked={value || field.defaultValue || false}
              onChange={(e) => handleFieldChange(name, e.target.checked)}
              disabled={!isEnabled}
            />
            {field.iconPosition !== "right" && (
              <IconRenderer
                iconSource={field.iconSource}
                iconName={field.iconName}
                iconUrl={field.iconUrl}
                iconUpload={field.iconUpload}
                size={field.iconSize || 20}
              />
            )}
            <span>{label || name}</span>
            {field.iconPosition === "right" && (
              <IconRenderer
                iconSource={field.iconSource}
                iconName={field.iconName}
                iconUrl={field.iconUrl}
                iconUpload={field.iconUpload}
                size={field.iconSize || 20}
              />
            )}
          </label>
        </div>
      );
    }

    if (fieldType === "COMBOBOX") {
      // Check if dynamic data source
      let sourceData = [];
      if (combo?.dynamic && combo?.source) {
        const searchTerm = searchTerms[name] || "";
        const cacheKey = `${combo.source}${searchTerm ? `_${searchTerm}` : ""}`;
        sourceData = dynamicDataCache[cacheKey] || [];
      } else {
        sourceData = parsedDataSources[combo?.source] || [];
      }

      // Ensure sourceData is always an array
      if (!Array.isArray(sourceData)) {
        console.warn(`Source data for ${name} is not an array:`, sourceData);
        sourceData = [];
      }

      // Show loading state for dynamic data
      if (combo?.dynamic && loadingDynamic[combo.source]) {
        return (
          <div key={field.name} className={`form-field ${gridClass}`}>
            <label className="field-label">{label || name}</label>
            <div
              className="field-input"
              style={{ padding: "8px", color: "#666" }}
            >
              Loading options...
            </div>
          </div>
        );
      }

      const filteredOptions = getFilteredOptions(
        field,
        sourceData,
        formValues,
        parsedDataSources
      );

      if (combo?.type === "SWITCH") {
        return (
          <div key={field.name} className={`form-field ${gridClass}`}>
            <label
              className="field-label"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexDirection: field.iconPosition === "top" ? "column" : "row",
              }}
            >
              {field.iconPosition !== "right" && (
                <IconRenderer
                  iconSource={field.iconSource}
                  iconName={field.iconName}
                  iconUrl={field.iconUrl}
                  iconUpload={field.iconUpload}
                  size={field.iconSize || 20}
                />
              )}
              <span>{label || name}</span>
              {field.iconPosition === "right" && (
                <IconRenderer
                  iconSource={field.iconSource}
                  iconName={field.iconName}
                  iconUrl={field.iconUrl}
                  iconUpload={field.iconUpload}
                  size={field.iconSize || 20}
                />
              )}
            </label>
            <div className="switch-container">
              {filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`switch-option ${
                    value === opt.value ? "active" : ""
                  } ${!isEnabled ? "disabled" : ""}`}
                  onClick={() =>
                    isEnabled && handleFieldChange(name, opt.value)
                  }
                  disabled={!isEnabled}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      }

      if (combo?.type === "BUTTON" || combo?.type === "BUTTONAVATAR") {
        return (
          <div key={field.name} className={`form-field ${gridClass}`}>
            <label className="field-label">{label || name}</label>
            <div className="button-container">
              {filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`button-option ${
                    value === opt.value ? "active" : ""
                  } ${!isEnabled ? "disabled" : ""}`}
                  onClick={() =>
                    isEnabled && handleFieldChange(name, opt.value)
                  }
                  disabled={!isEnabled}
                  title={opt.attributes?.description}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      }

      if (combo?.type === "CIRCLE") {
        return (
          <div key={field.name} className={`form-field ${gridClass}`}>
            <label className="field-label">{label || name}</label>
            <div className="circle-container">
              {filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`circle-option ${
                    value === opt.value ? "active" : ""
                  } ${!isEnabled ? "disabled" : ""}`}
                  onClick={() =>
                    isEnabled && handleFieldChange(name, opt.value)
                  }
                  disabled={!isEnabled}
                  style={{ backgroundColor: opt.attributes?.color || "#ccc" }}
                  title={opt.label}
                >
                  {value === opt.value && "✓"}
                </button>
              ))}
            </div>
          </div>
        );
      }

      // Default dropdown
      // if (combo?.searchable) {
      //   const localSearch = localSearchTerms[name] || "";
      //   const isOpen = dropdownOpen[name] || false;
      //   const currentOptions = localSearch
      //     ? filteredOptions.filter((opt) =>
      //         opt.label.toLowerCase().includes(localSearch.toLowerCase())
      //       )
      //     : filteredOptions;

      //   const selectedOption = filteredOptions.find(
      //     (opt) => opt.value === value
      //   );

      //   return (
      //     <div key={field.name} className={`form-field ${gridClass}`}>
      //       <label className="field-label">{label || name}</label>
      //       <div style={{ position: "relative" }}>
      //         <div
      //           className="field-select"
      //           style={{
      //             display: "flex",
      //             alignItems: "center",
      //             cursor: "pointer",
      //             position: "relative",
      //           }}
      //           onClick={() =>
      //             !isEnabled
      //               ? null
      //               : setDropdownOpen((prev) => ({ ...prev, [name]: !isOpen }))
      //           }
      //         >
      //           <span style={{ flex: 1, opacity: selectedOption ? 1 : 0.5 }}>
      //             {selectedOption?.label || `Select ${label || name}...`}
      //           </span>
      //           <span style={{ marginLeft: "8px" }}>▼</span>
      //         </div>

      //         {isOpen && isEnabled && (
      //           <div
      //             style={{
      //               position: "absolute",
      //               top: "100%",
      //               left: 0,
      //               right: 0,
      //               background: "white",
      //               border: "1px solid #ddd",
      //               borderRadius: "4px",
      //               marginTop: "4px",
      //               maxHeight: "300px",
      //               overflow: "hidden",
      //               zIndex: 1000,
      //               boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      //             }}
      //           >
      //             <input
      //               type="text"
      //               className="field-input"
      //               placeholder={`Search ${label || name}...`}
      //               value={localSearch}
      //               onChange={(e) => debouncedSearch(name, e.target.value)}
      //               onClick={(e) => e.stopPropagation()}
      //               autoFocus
      //               style={{
      //                 margin: "8px",
      //                 width: "calc(100% - 16px)",
      //                 border: "1px solid #ddd",
      //               }}
      //             />

      //             <div style={{ maxHeight: "220px", overflowY: "auto" }}>
      //               {currentOptions.length > 0 ? (
      //                 currentOptions.map((opt) => (
      //                   <div
      //                     key={opt.value}
      //                     onClick={(e) => {
      //                       e.stopPropagation();
      //                       handleFieldChange(name, opt.value);
      //                       setDropdownOpen((prev) => ({
      //                         ...prev,
      //                         [name]: false,
      //                       }));
      //                       setLocalSearchTerms((prev) => ({
      //                         ...prev,
      //                         [name]: "",
      //                       }));
      //                     }}
      //                     style={{
      //                       padding: "10px 12px",
      //                       cursor: "pointer",
      //                       backgroundColor:
      //                         value === opt.value ? "#f0f0f0" : "white",
      //                       borderBottom: "1px solid #f0f0f0",
      //                     }}
      //                     onMouseEnter={(e) =>
      //                       (e.target.style.backgroundColor = "#f8f8f8")
      //                     }
      //                     onMouseLeave={(e) =>
      //                       (e.target.style.backgroundColor =
      //                         value === opt.value ? "#f0f0f0" : "white")
      //                     }
      //                   >
      //                     {opt.label}
      //                   </div>
      //                 ))
      //               ) : (
      //                 <div
      //                   style={{
      //                     padding: "12px",
      //                     color: "#999",
      //                     textAlign: "center",
      //                   }}
      //                 >
      //                   {localSearch ? "No results found" : "Type to search..."}
      //                 </div>
      //               )}
      //             </div>
      //           </div>
      //         )}
      //       </div>
      //     </div>
      //   );
      // }

      // Default dropdown
      if (combo?.searchable) {
        const localSearch = localSearchTerms[name] || "";
        const isOpen = dropdownOpen[name] || false;
        const currentOptions = localSearch
          ? filteredOptions.filter((opt) =>
              opt.label.toLowerCase().includes(localSearch.toLowerCase())
            )
          : filteredOptions;

        const visibleCount = visibleItemsCount[name] || ITEMS_PER_PAGE;
        const visibleOptions = currentOptions.slice(0, visibleCount);
        const hasMore = currentOptions.length > visibleCount;

        const selectedOption = filteredOptions.find(
          (opt) => opt.value === value
        );

        const handleScroll = (e) => {
          const element = e.target;
          const isBottom =
            element.scrollHeight - element.scrollTop <=
            element.clientHeight + 50;

          if (isBottom && hasMore) {
            setVisibleItemsCount((prev) => ({
              ...prev,
              [name]: (prev[name] || ITEMS_PER_PAGE) + ITEMS_PER_PAGE,
            }));
          }
        };

        return (
          <div key={field.name} className={`form-field ${gridClass}`}>
            <label className="field-label">{label || name}</label>
            <div style={{ position: "relative" }}>
              <div
                className="field-select"
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  position: "relative",
                }}
                onClick={() => {
                  if (!isEnabled) return;
                  setDropdownOpen((prev) => ({ ...prev, [name]: !isOpen }));
                  // Reset visible count when opening
                  if (!isOpen) {
                    setVisibleItemsCount((prev) => ({
                      ...prev,
                      [name]: ITEMS_PER_PAGE,
                    }));
                  }
                }}
              >
                <span style={{ flex: 1, opacity: selectedOption ? 1 : 0.5 }}>
                  {selectedOption?.label || `Select ${label || name}...`}
                </span>
                <span style={{ marginLeft: "8px" }}>▼</span>
              </div>

              {isOpen && isEnabled && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "white",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    marginTop: "4px",
                    maxHeight: "300px",
                    overflow: "hidden",
                    zIndex: 1000,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <input
                    type="text"
                    className="field-input"
                    placeholder={`Search ${label || name}...`}
                    value={localSearch}
                    onChange={(e) => {
                      debouncedSearch(name, e.target.value);
                      // Reset visible count on search
                      setVisibleItemsCount((prev) => ({
                        ...prev,
                        [name]: ITEMS_PER_PAGE,
                      }));
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    style={{
                      margin: "8px",
                      width: "calc(100% - 16px)",
                      border: "1px solid #ddd",
                    }}
                  />

                  <div
                    style={{ maxHeight: "220px", overflowY: "auto" }}
                    onScroll={handleScroll}
                  >
                    {visibleOptions.length > 0 ? (
                      <>
                        {visibleOptions.map((opt) => (
                          <div
                            key={opt.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFieldChange(name, opt.value);
                              setDropdownOpen((prev) => ({
                                ...prev,
                                [name]: false,
                              }));
                              setLocalSearchTerms((prev) => ({
                                ...prev,
                                [name]: "",
                              }));
                              setSearchTerms((prev) => ({
                                ...prev,
                                [name]: "",
                              }));
                            }}
                            style={{
                              padding: "10px 12px",
                              cursor: "pointer",
                              backgroundColor:
                                value === opt.value ? "#f0f0f0" : "white",
                              borderBottom: "1px solid #f0f0f0",
                            }}
                            onMouseEnter={(e) =>
                              (e.target.style.backgroundColor = "#f8f8f8")
                            }
                            onMouseLeave={(e) =>
                              (e.target.style.backgroundColor =
                                value === opt.value ? "#f0f0f0" : "white")
                            }
                          >
                            {opt.label}
                          </div>
                        ))}
                        {hasMore && (
                          <div
                            style={{
                              padding: "8px",
                              textAlign: "center",
                              color: "#999",
                              fontSize: "12px",
                            }}
                          >
                            Scroll for more... ({visibleCount} of{" "}
                            {currentOptions.length})
                          </div>
                        )}
                      </>
                    ) : (
                      <div
                        style={{
                          padding: "12px",
                          color: "#999",
                          textAlign: "center",
                        }}
                      >
                        {localSearch ? "No results found" : "Type to search..."}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      // Regular dropdown (non-searchable)
      return (
        <div key={field.name} className={`form-field ${gridClass}`}>
          <label className="field-label">{label || name}</label>
          <select
            value={value}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            className="field-select"
            disabled={!isEnabled}
          >
            <option value="">Select {label || name}...</option>
            {filteredOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div key={field.name} className={`form-field ${gridClass}`}>
        <label className="field-label">{label || name}</label>
        <div className="placeholder-field">
          {fieldType} component (not implemented in preview)
        </div>
      </div>
    );
  };

  const renderSection = (section) => {
    const { type, label, children } = section;
    const parsedDataSources = getParsedDataSources();

    if (!isFieldVisible(section, formValues, parsedDataSources)) {
      return null;
    }

    if (type === "ACCORDION") {
      return (
        <details key={section.id} className="accordion-section" open>
          <summary className="accordion-header">{label}</summary>
          <div className="accordion-content">
            <div className="form-grid">{children?.map(renderElement)}</div>
          </div>
        </details>
      );
    }

    return (
      <div key={section.id} className="form-section">
        {label && <h3 className="section-title">{label}</h3>}
        <div className="form-grid">{children?.map(renderElement)}</div>
      </div>
    );
  };

  const renderTab = (tab) => {
    return (
      <div key={tab.id} className="tab-container">
        <h2 className="tab-title">{tab.name || tab.label}</h2>
        <div className="tab-content">{tab.children?.map(renderElement)}</div>
      </div>
    );
  };

  const renderElement = (element) => {
    switch (element.render) {
      case "field":
        return renderField(element);
      case "section":
        return renderSection(element);
      case "TAB":
        return renderTab(element);
      default:
        return null;
    }
  };

  return (
    <div className="modal" style={{ zIndex: 1001 }}>
      <div
        className="modal-content"
        style={{ maxWidth: "1200px", height: "90vh" }}
      >
        <div className="modal-header">
          <h3 className="font-semibold">Live Form Preview</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDataEditor(true)}
              className="button button-purple"
              disabled={!isLoaded}
            >
              Edit Data Sources
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  JSON.stringify(formValues, null, 2)
                );
                alert("Form values copied to clipboard!");
              }}
              className="button button-success"
            >
              Copy Values
            </button>
            <button onClick={onClose} className="button button-secondary">
              Close
            </button>
          </div>
        </div>

        <div
          className="modal-body"
          style={{ height: "calc(100% - 80px)", overflow: "auto" }}
        >
          <div className="form-preview">{schema?.map(renderElement)}</div>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Current Form Values:</h4>
            <pre
              className="text-sm bg-gray-100 p-4 rounded"
              style={{ maxHeight: "200px", overflow: "auto" }}
            >
              {JSON.stringify(formValues, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Data Sources Editor */}
      {showDataEditor && (
        <div className="modal" style={{ zIndex: 1002 }}>
          <div className="modal-content" style={{ maxWidth: "800px" }}>
            <div className="modal-header">
              <h3 className="font-semibold">Edit Data Sources</h3>
              <div className="flex gap-2">
                <button
                  onClick={updateDataSources}
                  className="button button-primary"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Apply Changes"}
                </button>
                <button
                  onClick={() => setShowDataEditor(false)}
                  className="button button-secondary"
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
            <div className="modal-body">
              <p className="text-sm text-gray-600 mb-4">
                Edit the JSON data that will be used for combo boxes and
                dropdowns in the form preview. Saving will overwrite the server
                file.
              </p>
              <textarea
                className="textarea"
                value={dataSourcesText}
                onChange={(e) => setDataSourcesText(e.target.value)}
                style={{ minHeight: "400px", fontFamily: "monospace" }}
                placeholder="Enter JSON data sources..."
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    try {
                      const formatted = JSON.stringify(
                        JSON.parse(dataSourcesText),
                        null,
                        2
                      );
                      setDataSourcesText(formatted);
                    } catch (e) {
                      alert("Invalid JSON format");
                    }
                  }}
                  className="button button-secondary"
                  disabled={isSaving}
                >
                  Format JSON
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(dataSourcesText);
                    alert("Data sources copied to clipboard!");
                  }}
                  className="button button-success"
                  disabled={isSaving}
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFormPreview;