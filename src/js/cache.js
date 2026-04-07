// src/js/cache.js
// Persistenter Cache mit IndexedDB (viel mehr Platz als LocalStorage).
// Speichert OSM-Daten über Page-Reloads hinweg.

const DB_NAME = 'OFM_DB';
const STORE_NAME = 'keyval';
const DB_VERSION = 1;
const CACHE_ENTRY_VERSION = 2;
const DEFAULT_STALE_MULTIPLIER = 3;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function getCachePolicy(dataClass = 'default') {
  switch (dataClass) {
    case 'boundaries':
      return { dataClass, version: CACHE_ENTRY_VERSION, ttlMs: 30 * DAY_MS, staleTtlMs: 120 * DAY_MS };
    case 'fire_stations':
      return { dataClass, version: CACHE_ENTRY_VERSION, ttlMs: 14 * DAY_MS, staleTtlMs: 45 * DAY_MS };
    case 'aed':
      return { dataClass, version: CACHE_ENTRY_VERSION, ttlMs: 2 * DAY_MS, staleTtlMs: 10 * DAY_MS };
    case 'hydrants_and_water_points':
      return { dataClass, version: CACHE_ENTRY_VERSION, ttlMs: 3 * DAY_MS, staleTtlMs: 14 * DAY_MS };
    default:
      return { dataClass, version: CACHE_ENTRY_VERSION, ttlMs: 7 * DAY_MS, staleTtlMs: 21 * DAY_MS };
  }
}

function normalizeCacheEntry(entry) {
  if (!entry) return null;

  const createdAt = entry.createdAt ?? entry.ts ?? 0;
  const data = entry.data;
  if (!createdAt || !data) return null;

  const ttlMs = Number(entry.ttlMs ?? 0) || null;
  const staleTtlMs = Number(entry.staleTtlMs ?? 0) || (ttlMs ? ttlMs * DEFAULT_STALE_MULTIPLIER : null);

  return {
    createdAt,
    data,
    dataClass: entry.dataClass || 'legacy',
    ttlMs,
    staleTtlMs,
    version: entry.version || 1
  };
}

function resolveTtlMs(entry, ttlOverrideMs = null) {
  return Number(ttlOverrideMs ?? entry?.ttlMs ?? 0) || 0;
}

export function isCacheFresh(entry, now = Date.now()) {
  if (!entry?.createdAt) return false;
  const ttlMs = resolveTtlMs(entry);
  if (!ttlMs) return false;
  return (now - entry.createdAt) <= ttlMs;
}

export function isCacheUsableStale(entry, now = Date.now()) {
  if (!entry?.createdAt) return false;
  const staleTtlMs = Number(entry.staleTtlMs ?? 0) || resolveTtlMs(entry) * DEFAULT_STALE_MULTIPLIER;
  if (!staleTtlMs) return false;
  return (now - entry.createdAt) <= staleTtlMs;
}

/**
 * Minimaler IndexedDB Wrapper (Promise-basiert).
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

/**
 * Liest Daten aus dem Cache.
 * @param {string} key 
 * @param {number} maxAgeMs 
 * @returns {Promise<object|null>}
 */
export async function getCache(key, maxAgeMs) {
  console.log('[Cache] getCache', key);
  try {
    const entry = await getCacheEntry(key);
    if (!entry) return null;

    const age = Date.now() - entry.createdAt;
    console.log('[Cache] Found entry, age:', Math.round(age / 1000), 'sec, maxAge:', Math.round(maxAgeMs / 1000), 'sec');
    if (maxAgeMs && age > maxAgeMs) {
      console.log('[Cache] Entry EXPIRED, deleting');
      deleteCacheEntry(key).catch(console.warn);
      return null;
    }

    console.log('[Cache] Returning cached data');
    return entry.data;
  } catch (e) {
    console.warn('[Cache] Read error', e);
    return null;
  }
}

export async function getCacheEntry(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(normalizeCacheEntry(req.result));
    });
  } catch (e) {
    console.warn('[Cache] Entry read error', e);
    return null;
  }
}

async function deleteCacheEntry(key) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  } catch { /* ignore */ }
}

/**
 * Schreibt Daten in den Cache.
 * @param {string} key 
 * @param {object} data 
 */
export async function setCache(key, data, meta = {}) {
  console.log('[Cache] setCache', key, data?.elements?.length);
  try {
    const policy = meta?.dataClass ? getCachePolicy(meta.dataClass) : {};
    const entry = {
      createdAt: Date.now(),
      ttlMs: Number(meta.ttlMs ?? policy.ttlMs ?? 0) || null,
      staleTtlMs: Number(meta.staleTtlMs ?? policy.staleTtlMs ?? 0) || null,
      dataClass: meta.dataClass ?? policy.dataClass ?? 'default',
      version: meta.version ?? policy.version ?? CACHE_ENTRY_VERSION,
      data: data
    };

    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry, key);

      req.onerror = () => {
        console.warn('[Cache] Write error', req.error);
        resolve(); // Nichts tun, ist nur Cache
      };
      req.onsuccess = () => resolve();
    });
  } catch (e) {
    console.warn('[Cache] Write error', e);
  }
}

/**
 * Löscht alle Cache-Einträge (z.B. bei Versionswechsel)
 */
export async function clearCache() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();

    // Auch alten LocalStorage aufräumen, falls vorhanden
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('OFM_CACHE')) localStorage.removeItem(k);
    });
  } catch (e) {
    console.error('[Cache] Clear error', e);
  }
}
