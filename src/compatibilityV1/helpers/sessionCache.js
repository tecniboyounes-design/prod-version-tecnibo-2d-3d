let _cache = null; // { checked: true/false, ok: true/false, user: any, ts: number }

export function getSessionCache() {
  return _cache;
}

export function setSessionCache(next) {
  _cache = { ...next, ts: Date.now() };
}
