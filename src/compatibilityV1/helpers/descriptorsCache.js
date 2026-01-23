// /src/compatibilityV1/helpers/descriptorsCache.js
let _cache = null;

export function getDescriptorsCache() {
  return _cache;
}

export function setDescriptorsCache(list) {
  _cache = list;
}
