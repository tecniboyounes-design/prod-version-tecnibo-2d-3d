// =====================================
// Smart Dynamic Dependency Mapper - Fixed
// =====================================

export class SmartDependencyMapper {
  constructor() {
    this.cache = new Map();
    this.learningData = this.loadLearningData();
  }

  // Auto-generate mappings from data patterns
  analyzeDataRelationships(parentData, childData) {
    const relationships = {};

    if (!Array.isArray(parentData) || !Array.isArray(childData)) {
      return relationships;
    }

    parentData.forEach((parentItem) => {
      const parentValue = this.extractValue(parentItem);
      const relatedChildren = childData.filter((childItem) =>
        this.findRelationship(parentItem, childItem)
      );

      if (relatedChildren.length > 0) {
        relationships[parentValue] = relatedChildren.map((child) =>
          this.extractValue(child)
        );
      }
    });

    return relationships;
  }

  // Smart value extraction with better error handling
  extractValue(item) {
    if (item === null || item === undefined) return "";
    if (typeof item !== "object") return String(item);

    // Try common value properties in order
    const valueProps = ["value", "code", "id", "name", "label"];
    for (const prop of valueProps) {
      if (item[prop] !== null && item[prop] !== undefined) {
        return String(item[prop]);
      }
    }

    // Fallback to first non-null object value
    const values = Object.values(item).filter(
      (v) => v !== null && v !== undefined
    );
    return values.length > 0 ? String(values[0]) : "";
  }

  // Enhanced relationship finding with multiple strategies
  findRelationship(parent, child) {
    if (
      !parent ||
      !child ||
      typeof parent !== "object" ||
      typeof child !== "object"
    ) {
      return false;
    }

    // Strategy 1: Direct ID relationships (like producerId -> id)
    if (this.findIdRelationship(parent, child)) return true;

    // Strategy 2: Shared properties
    if (this.findSharedPropertyRelationship(parent, child)) return true;

    // Strategy 3: Name/category matching
    if (this.findNameRelationship(parent, child)) return true;

    // Strategy 4: Numeric range matching
    if (this.findRangeRelationship(parent, child)) return true;

    return false;
  }

  // ID-based relationships (e.g., material.producerId === producer.id)
  findIdRelationship(parent, child) {
    const parentId = parent.id || parent.value || parent.code;
    const childRefKeys = ["producerId", "categoryId", "typeId", "parentId"];

    for (const refKey of childRefKeys) {
      if (
        child[refKey] &&
        parentId &&
        String(child[refKey]) === String(parentId)
      ) {
        return true;
      }
    }

    // Reverse relationship
    const childId = child.id || child.value || child.code;
    const parentRefKeys = ["producerId", "categoryId", "typeId", "parentId"];

    for (const refKey of parentRefKeys) {
      if (
        parent[refKey] &&
        childId &&
        String(parent[refKey]) === String(childId)
      ) {
        return true;
      }
    }

    return false;
  }

  // Shared properties relationship
  findSharedPropertyRelationship(parent, child) {
    const commonKeys = ["category", "type", "group", "series"];
    for (const key of commonKeys) {
      if (
        parent[key] &&
        child[key] &&
        String(parent[key]).toLowerCase() === String(child[key]).toLowerCase()
      ) {
        return true;
      }
    }
    return false;
  }

  // Name-based relationships
  findNameRelationship(parent, child) {
    const parentName = (parent.name || parent.label || "").toLowerCase();
    const childName = (child.name || child.label || "").toLowerCase();
    const parentCategory = (parent.category || "").toLowerCase();
    const childCategory = (child.category || "").toLowerCase();

    if (
      parentName &&
      childName &&
      (childName.includes(parentName) || parentName.includes(childName))
    ) {
      return true;
    }

    if (parentCategory && childCategory && parentCategory === childCategory) {
      return true;
    }

    return false;
  }

  // Range-based relationships
  findRangeRelationship(parent, child) {
    if (parent.range && child.value) {
      const [min, max] = Array.isArray(parent.range)
        ? parent.range
        : [parent.range, parent.range];
      const value = parseFloat(child.value);
      return !isNaN(value) && value >= min && value <= max;
    }
    return false;
  }

  // Generate mapping with enhanced options and validation
  generateSmartMapping(dependentFieldData, targetFieldData, options = {}) {
    const {
      maxOptionsPerValue = 10,
      minOptionsPerValue = 1,
      allowFallback = true,
      enableLearning = true,
    } = options;

    if (!Array.isArray(dependentFieldData) || !Array.isArray(targetFieldData)) {
      console.warn("Invalid data provided to generateSmartMapping");
      return {};
    }

    const mapping = {};
    const cacheKey = `${JSON.stringify(dependentFieldData)}_${JSON.stringify(
      targetFieldData
    )}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    dependentFieldData.forEach((depItem) => {
      const depValue = this.extractValue(depItem);
      if (!depValue) return;

      let relatedOptions = [];

      // Try to find smart relationships
      relatedOptions = targetFieldData
        .filter((targetItem) => this.findRelationship(depItem, targetItem))
        .slice(0, maxOptionsPerValue);

      // Apply learned preferences if available
      if (enableLearning && relatedOptions.length > 1) {
        const learnedSuggestions = this.getLearnedSuggestions(
          depValue,
          targetFieldData,
          3
        );
        if (learnedSuggestions.length > 0) {
          // Prioritize learned suggestions
          const learnedItems = targetFieldData.filter((item) =>
            learnedSuggestions.includes(this.extractValue(item))
          );
          relatedOptions = [
            ...learnedItems,
            ...relatedOptions.filter((item) => !learnedItems.includes(item)),
          ].slice(0, maxOptionsPerValue);
        }
      }

      // Fallback strategies if needed
      if (relatedOptions.length < minOptionsPerValue && allowFallback) {
        const fallbackOptions = this.generateFallbackMapping(
          depValue,
          targetFieldData,
          maxOptionsPerValue - relatedOptions.length
        );
        relatedOptions = [...relatedOptions, ...fallbackOptions];
      }

      if (relatedOptions.length > 0) {
        mapping[depValue] = relatedOptions.map((item) =>
          this.extractValue(item)
        );
      }
    });

    this.cache.set(cacheKey, mapping);
    return mapping;
  }

  generateFallbackMapping(dependentValue, targetData, maxOptions) {
    if (!Array.isArray(targetData) || maxOptions <= 0) return [];

    // Strategy 1: Alphabetical proximity
    const depStr = String(dependentValue).toLowerCase();
    const proximityMatches = targetData.filter((item) => {
      const itemStr = String(this.extractValue(item)).toLowerCase();
      return (
        itemStr.charAt(0) === depStr.charAt(0) ||
        itemStr.includes(depStr.slice(0, 2)) ||
        depStr.includes(itemStr.slice(0, 2))
      );
    });

    if (proximityMatches.length >= maxOptions) {
      return proximityMatches.slice(0, maxOptions);
    }

    // Strategy 2: Consistent pseudo-random selection based on hash
    const remaining = maxOptions - proximityMatches.length;
    const availableItems = targetData.filter(
      (item) => !proximityMatches.includes(item)
    );

    if (availableItems.length === 0) return proximityMatches;

    const hash = this.simpleHash(dependentValue);
    const startIndex = hash % availableItems.length;
    const selected = [];

    for (let i = 0; i < Math.min(remaining, availableItems.length); i++) {
      const index = (startIndex + i) % availableItems.length;
      selected.push(availableItems[index]);
    }

    return [...proximityMatches, ...selected];
  }

  // Improved hash function
  simpleHash(str) {
    let hash = 5381;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) + hash + s.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  // Enhanced learning from user selections
  learnFromUserSelection(dependentValue, selectedValue, context = {}) {
    const key = `${dependentValue}->${selectedValue}`;
    const contextKey = context.fieldKey ? `${context.fieldKey}:${key}` : key;

    this.learningData[contextKey] = (this.learningData[contextKey] || 0) + 1;

    // Also store general pattern
    this.learningData[key] = (this.learningData[key] || 0) + 1;

    this.saveLearningData();
  }

  // Get learned suggestions with context awareness
  getLearnedSuggestions(dependentValue, targetData, limit = 5) {
    if (!Array.isArray(targetData)) return [];

    const suggestions = [];
    const targetValues = new Set(
      targetData.map((item) => this.extractValue(item))
    );

    Object.entries(this.learningData).forEach(([key, count]) => {
      if (key.includes(`${dependentValue}->`)) {
        const targetValue = key.split("->")[1];
        if (targetValues.has(targetValue)) {
          const existingIndex = suggestions.findIndex(
            (s) => s.value === targetValue
          );
          if (existingIndex >= 0) {
            suggestions[existingIndex].score += count;
          } else {
            suggestions.push({ value: targetValue, score: count });
          }
        }
      }
    });

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.value);
  }

  // Safe localStorage operations
  loadLearningData() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = localStorage.getItem("dependencyLearningData");
        return saved ? JSON.parse(saved) : {};
      }
    } catch (error) {
      console.warn("Failed to load learning data:", error);
    }
    return {};
  }

  saveLearningData() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(
          "dependencyLearningData",
          JSON.stringify(this.learningData)
        );
      }
    } catch (error) {
      console.warn("Failed to save learning data:", error);
    }
  }

  // Clear cache for development/testing
  clearCache() {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      learningDataSize: Object.keys(this.learningData).length,
    };
  }
}
