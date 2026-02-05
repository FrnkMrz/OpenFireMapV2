// src/js/cache.js
// Persistenter Cache mit LocalStorage + LRU-Strategy (bei vollem Speicher).
// Speichert OSM-Daten über Page-Reloads hinweg.

const PREFIX = 'OFM_CACHE_v1_';

function getStorageKey(key) {
  return PREFIX + key;
}

/**
 * Liest Daten aus dem Cache.
 * @param {string} key 
 * @param {number} maxAgeMs 
 * @returns {object|null}
 */
export function getCache(key, maxAgeMs) {
  try {
    const storageKey = getStorageKey(key);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (!entry || !entry.ts || !entry.data) return null;

    const age = Date.now() - entry.ts;
    if (age > maxAgeMs) {
      // Abgelaufen -> weg damit
      localStorage.removeItem(storageKey);
      return null;
    }

    return entry.data;
  } catch (e) {
    console.warn('[Cache] Read error', e);
    return null;
  }
}

/**
 * Schreibt Daten in den Cache.
 * Handhabt QuotaExceededError durch Löschen alter Einträge.
 * @param {string} key 
 * @param {object} data 
 */
export function setCache(key, data) {
  const storageKey = getStorageKey(key);
  const entry = {
    ts: Date.now(),
    data: data
  };
  const json = JSON.stringify(entry);

  try {
    localStorage.setItem(storageKey, json);
  } catch (e) {
    if (isQuotaError(e)) {
      console.log('[Cache] Quota exceeded. Cleaning up...');
      pruneCache();
      // Zweiter Versuch
      try {
        localStorage.setItem(storageKey, json);
      } catch (e2) {
        console.error('[Cache] Write failed after cleanup', e2);
      }
    } else {
      console.warn('[Cache] Write error', e);
    }
  }
}

/**
 * Löscht alle Cache-Einträge dieser Version
 */
export function clearCache() {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  });
}

/**
 * Hilfsfunktion: Erkennt "Storage Full" Errors browserübergreifend
 */
function isQuotaError(e) {
  return e instanceof DOMException && (
    e.code === 22 ||
    e.code === 1014 ||
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
}

/**
 * Entfernt die älteste Hälfte der Cache-Einträge, um Platz zu schaffen.
 */
function pruneCache() {
  const items = [];
  // 1. Alle eigenen Cache-Items sammeln
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) {
      try {
        // Wir parsen nur den TS, um Performance zu sparen? 
        // Leider ist alles in einem JSON-String. 
        // Wir lesen erstmal nur den Key.
        items.push(k);
      } catch (e) { /* ignore */ }
    }
  }

  // 2. Metadaten lesen (Timestamp)
  const entries = items.map(k => {
    try {
      const raw = localStorage.getItem(k);
      // Kleiner Hack: Wir suchen nach "ts":12345 im String, um nicht alles parsen zu müssen?
      // Safer: Kurz parsen.
      const obj = JSON.parse(raw);
      return { key: k, ts: obj.ts || 0, size: raw.length };
    } catch (e) {
      return { key: k, ts: 0, size: 0 };
    }
  });

  // 3. Nach Alter sortieren (älteste zuerst -> kleinster TS)
  entries.sort((a, b) => a.ts - b.ts);

  // 4. Löschen bis wir z.B. 30% Platz freigemacht haben oder 50% der Items weg sind.
  // Einfache Strategie: Die ältesten 50% löschen.
  const toDelete = Math.ceil(entries.length / 2);

  console.log(`[Cache] Pruning ${toDelete} old entries...`);

  for (let i = 0; i < toDelete; i++) {
    localStorage.removeItem(entries[i].key);
  }
}
