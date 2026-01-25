// src/js/cache.js
// Super einfacher In-Memory Cache mit TTL.
// Reicht völlig für Browser-Session.

const store = new Map();

export function getCache(key, maxAgeMs) {
  const item = store.get(key);
  if (!item) return null;

  if (Date.now() - item.ts > maxAgeMs) {
    store.delete(key);
    return null;
  }
  return item.data;
}

export function setCache(key, data) {
  store.set(key, { ts: Date.now(), data });
}

export function clearCache() {
  store.clear();
}
