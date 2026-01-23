// Option 3: Simple random ID generator (fallback)
export const replaceIdsWithSimpleIds = (obj) => {
  const generateSimpleId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  if (Array.isArray(obj)) {
    return obj.map(replaceIdsWithSimpleIds);
  } else if (typeof obj === "object" && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      if (key === "id") {
        newObj[key] = generateSimpleId();
      } else {
        newObj[key] = replaceIdsWithSimpleIds(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};
