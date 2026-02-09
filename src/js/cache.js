// src/js/cache.js
// Persistenter Cache mit IndexedDB (viel mehr Platz als LocalStorage).
// Speichert OSM-Daten über Page-Reloads hinweg.

const DB_NAME = 'OFM_DB';
const STORE_NAME = 'keyval';
const DB_VERSION = 1;

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
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const entry = req.result;
        if (!entry || !entry.ts || !entry.data) {
          resolve(null);
          return;
        }

        const age = Date.now() - entry.ts;
        if (age > maxAgeMs) {
          // Abgelaufen -> (Lazy Delete beim nächsten Write oder explizit hier fire-and-forget delete)
          // Wir löschen es hier direkt asynchron, warten aber nicht drauf.
          deleteCacheEntry(key).catch(console.warn);
          resolve(null);
          return;
        }

        resolve(entry.data);
      };
    });
  } catch (e) {
    console.warn('[Cache] Read error', e);
    return null;
  }
}

async function deleteCacheEntry(key) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  } catch (e) { /* ignore */ }
}

/**
 * Schreibt Daten in den Cache.
 * @param {string} key 
 * @param {object} data 
 */
export async function setCache(key, data) {
  console.log('[Cache] setCache', key, data?.elements?.length);
  try {
    const entry = {
      ts: Date.now(),
      data: data
    };

    const db = await openDB();
    return new Promise((resolve, reject) => {
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

