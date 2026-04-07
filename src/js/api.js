/**
 * ==========================================================================================
 * DATEI: api.js
 * ZWECK: Kommunikation mit OSM-Services (Overpass + Nominatim)
 *        Fokus: robustes Overpass-Laden (Cache, Backoff, Endpoint-Circuit-Breaker, Debug)
 *
 * Debug aktivieren:
 *   localStorage.setItem('OFM_DEBUG','1'); location.reload();
 * Debug aus:
 *   localStorage.removeItem('OFM_DEBUG'); location.reload();
 * ==========================================================================================
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t } from './i18n.js';
import { showNotification } from './ui.js';

import { fetchJson, HttpError } from './net.js';
import {
  getCache,
  getCacheEntry,
  getCachePolicy,
  isCacheFresh,
  isCacheUsableStale,
  setCache
} from './cache.js';

/** ---- Debug/Event-Hook --------------------------------------------------- */
const DEBUG = () => (localStorage.getItem('OFM_DEBUG') === '1');

const emit = (detail) => {
  // map.js (Trace/Overlay) kann darauf hören
  try { window.dispatchEvent(new CustomEvent('ofm:overpass', { detail })); } catch { /* ignore */ }
  if (DEBUG()) console.log('[OFM]', detail);
};

let REQ_SEQ = 0;

/** ---- SWR Hintergrund-Refresh Tracking ----------------------------------- */
// Verhindert doppelte Hintergrund-Requests für denselben Bereich und
// stellt sicher, dass veraltete Callbacks (nach Bereichswechsel) ignoriert werden.
let _bgPoiRefresh = null; // { controller: AbortController, cacheKey: string } | null
let _bgPoiGen = 0;        // Hochzählen = alle laufenden Callbacks ungültig machen
let _bgBoundaryRefresh = null;
let _bgBoundaryGen = 0;

/** ---- Globaler Backoff (429/Server-Überlast) ----------------------------- */
let GLOBAL_BACKOFF_MS = 0;
let GLOBAL_BACKOFF_UNTIL = 0;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function maybeGlobalBackoff(reqId) {
  const now = Date.now();
  if (GLOBAL_BACKOFF_UNTIL > now) {
    const waitMs = GLOBAL_BACKOFF_UNTIL - now;
    emit({ phase: 'backoff_wait', reqId, ms: waitMs });

    // Visuelles Feedback: Zeige dem User, dass wir aufgrund Überlastung warten
    const waitSec = Math.ceil(waitMs / 1000);
    showNotification(`${t('status_waiting')} (${waitSec}${t('seconds_short')})...`, Math.min(waitMs, 5000));

    await sleep(waitMs);
  }
}

function bumpGlobalBackoff({ minMs, maxMs }) {
  const base = GLOBAL_BACKOFF_MS ? Math.min(GLOBAL_BACKOFF_MS * 2, maxMs) : minMs;
  const jitter = Math.floor(Math.random() * 1500);
  GLOBAL_BACKOFF_MS = base + jitter;
  GLOBAL_BACKOFF_UNTIL = Date.now() + GLOBAL_BACKOFF_MS;
}

/** ---- Endpoint-Circuit-Breaker ------------------------------------------ */
/**
 * Problem aus deinen Logs:
 * - Jeder neue Request startet wieder bei overpass-api.de (Endpoint #1)
 * - Wenn der gerade 504 liefert, rennst du immer wieder in dieselbe Wand.
 *
 * Lösung:
 * - Wir merken uns pro Endpoint eine Cooldown-Zeit (failUntil).
 * - Bei 504/5xx/Netzfehlern setzen wir Cooldown (z.B. 20–40 s).
 * - Bei 429 setzen wir längeren Cooldown (z.B. 60–120 s) und globalen Backoff.
 * - Beim nächsten Request überspringen wir Endpoints, die im Cooldown sind.
 */
const EP = new Map(); // endpoint -> { failUntil, lastOkTs, lastFailTs, lastStatus }

function epGet(ep) {
  if (!EP.has(ep)) EP.set(ep, { failUntil: 0, lastOkTs: 0, lastFailTs: 0, lastStatus: null });
  return EP.get(ep);
}



function epMarkOk(endpoint, status = 200) {
  const s = epGet(endpoint);
  s.lastOkTs = Date.now();
  s.lastStatus = status;
  s.failUntil = 0;
}

function epMarkFail(endpoint, status, cooldownMs) {
  const s = epGet(endpoint);
  s.lastFailTs = Date.now();
  s.lastStatus = status;
  s.failUntil = Math.max(s.failUntil, Date.now() + cooldownMs);
}

/** ---- UI Helper ---------------------------------------------------------- */
function mapErrorKey(err) {
  if (err?.name === 'AbortError') return 'status_waiting'; // kein Fehler, nur abgebrochen
  if (err instanceof HttpError && err.status === 429) return 'err_ratelimit';
  if (err instanceof HttpError && err.status >= 500) return 'err_server';
  if (err?.message === 'err_offline') return 'err_offline';
  return 'err_generic';
}

/** ---- Nominatim Geocoding (unverändert, nur robust) ---------------------- */
export async function geocodeNominatim(query, { signal } = {}) {
  const q = (query || '').trim();
  if (q.length < 3) {
    const e = new Error('query_too_short');
    e.code = 'query_too_short';
    throw e;
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');
  url.searchParams.set('accept-language', (navigator.language || 'en').toLowerCase());

  const data = await fetchJson(url.toString(), { timeoutMs: 8000, signal });

  if (!Array.isArray(data) || data.length === 0) {
    const e = new Error('no_results');
    e.code = 'no_results';
    throw e;
  }

  const hit = data[0];
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const e = new Error('bad_response');
    e.code = 'bad_response';
    throw e;
  }

  return { lat, lon, label: hit.display_name || q };
}

/** ---- Cache Keys --------------------------------------------------------- */
/** ---- Grid Snapping & Round Robin ---------------------------------------- */
function snapToGrid(coord, gridSize = 0.005) { // ~500m
  return Math.floor(Number(coord) / gridSize) * gridSize;
}

function roundCoord(x, decimals = 4) {
  const m = 10 ** decimals;
  return Math.round(Number(x) * m) / m;
}

function makeBBoxKey(bounds) {
  // Grid Snapping: Wir runden auf ein festes Raster (z.B. 0.005 Grad).
  // Wenn man sich innerhalb des Rasters bewegt, bleibt der Key IDENTISCH -> Cache Hit!
  // Wir laden immer die "umschließende Grid-Zelle" + etwas Puffer.

  const GRID = 0.005;

  const s = roundCoord(snapToGrid(bounds.getSouth(), GRID));
  const w = roundCoord(snapToGrid(bounds.getWest(), GRID));
  // North/East müssen "aufgerundet" werden, damit wir das ganze Fenster abdecken
  // Einfachste Logik: Wir definieren die Zelle über South-West und die Größe

  // Besser: Wir snappen alle Kanten auf das Grid.
  // Achtung: Wenn wir nur floor() machen, könnte der Viewport über den Rand ragen.
  // Aber da 'getBounds' vom aktuellen Viewport kommt, ist das OK. 
  // Wir wollen ja einen Key, der "repräsentativ" für die Region ist.

  // Um Flackern am Rand zu vermeiden, nehmen wir immer die Grid-Linien.
  const n = roundCoord(snapToGrid(bounds.getNorth(), GRID) + GRID); // immer nächste Linie
  const e = roundCoord(snapToGrid(bounds.getEast(), GRID) + GRID);

  return `${s},${w},${n},${e}`;
}

function makeOverpassCacheKey({ zoom, bboxKey, queryKind }) {
  // Zoom-Level Normalisierung:
  // Wir laden ab Zoom 15 immer dieselben Daten (Hydranten, etc.).
  // Damit beim Reinzoomen (z.B. 15 -> 16) die Daten aus dem Cache kommen,
  // nutzen wir einen gemeinsamen Key für alle hohen Zoom-Stufen.

  let zKey = zoom;
  if (zoom >= 15) zKey = '15+';
  else if (zoom >= 12 && zoom < 14) zKey = '12-13';
  // z14 bleibt separat (Stations + Boundaries)

  return `overpass:v3:${queryKind}:z${zKey}:bbox:${bboxKey}`;
}

function makeBoundaryCacheKey({ bboxKey }) {
  return `overpass:v3:boundaries:bbox:${bboxKey}`;
}

function syncCombinedCachedElements() {
  State.cachedElements = [
    ...(State.cachedPoiElements || []),
    ...(State.cachedBoundaryElements || [])
  ];
}

function getViewQueryMeta() {
  const b = State.queryBounds || State.map.getBounds();
  return {
    bbox: State.queryMeta?.bbox || `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`,
    bboxKey: State.queryMeta?.bbox ? State.queryMeta.bbox : makeBBoxKey(b)
  };
}

function buildPoiQuery(zoom, bbox) {
  const queryParts = [];
  if (zoom >= 12) {
    queryParts.push(`nwr["amenity"="fire_station"];`);
    queryParts.push(`nwr["building"="fire_station"];`);
  }
  if (zoom >= 15) {
    queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"];`);
    queryParts.push(`node["emergency"="defibrillator"];`);
  }
  if (queryParts.length === 0) return { query: '', queryKind: 'none', dataClass: 'default' };

  const queryKind = zoom >= 15 ? 'pois' : 'stations';
  const dataClass = zoom >= 15 ? 'hydrants_and_water_points' : 'fire_stations';
  return {
    query: `[out:json][timeout:25][bbox:${bbox}];(${queryParts.join('')})->.pois;.pois out center;`,
    queryKind,
    dataClass
  };
}

function buildBoundaryQuery(zoom, bbox) {
  if (zoom < 14) return '';
  return `[out:json][timeout:25][bbox:${bbox}];(way["boundary"="administrative"]["admin_level"="8"];)->.boundaries;.boundaries out geom;`;
}

function stableObjectEntries(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
}

function elementFingerprint(el) {
  if (!el || typeof el !== 'object') return '';
  const tags = stableObjectEntries(el.tags).map(([k, v]) => `${k}:${String(v)}`).join('|');
  const centerLat = Number(el.center?.lat ?? el.lat ?? 0).toFixed(5);
  const centerLon = Number(el.center?.lon ?? el.lon ?? 0).toFixed(5);
  const geometry = Array.isArray(el.geometry)
    ? el.geometry.map((p) => `${Number(p.lat).toFixed(5)},${Number(p.lon).toFixed(5)}`).join(';')
    : '';
  return [
    el.type || 'node',
    el.id ?? '',
    centerLat,
    centerLon,
    tags,
    geometry
  ].join('#');
}

function elementsFingerprint(elements) {
  if (!Array.isArray(elements) || elements.length === 0) return 'empty';
  return elements.map(elementFingerprint).sort().join('||');
}

async function readDatasetCache(cacheKey, cachePolicy) {
  const entry = await getCacheEntry(cacheKey);
  if (!entry) return { entry: null, freshData: null, staleData: null };

  const mergedEntry = {
    ...entry,
    dataClass: entry.dataClass || cachePolicy.dataClass,
    ttlMs: entry.ttlMs ?? cachePolicy.ttlMs,
    staleTtlMs: entry.staleTtlMs ?? cachePolicy.staleTtlMs
  };

  return {
    entry: mergedEntry,
    freshData: isCacheFresh(mergedEntry) ? mergedEntry.data : null,
    staleData: isCacheUsableStale(mergedEntry) ? mergedEntry.data : null
  };
}

function epHealthyOrder(endpoints) {
  const now = Date.now();
  // 1) Endpoints ohne Cooldown zuerst
  const ok = [];
  const cool = [];
  for (const ep of endpoints) {
    const s = epGet(ep);
    if (s.failUntil > now) cool.push(ep);
    else ok.push(ep);
  }

  // ROUND ROBIN / SHUFFLE:
  // Wir sortieren NICHT nach Last-OK, sondern mischen zufällig.
  // Das verteilt die Last besser auf alle verfügbaren Server.
  for (let i = ok.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ok[i], ok[j]] = [ok[j], ok[i]];
  }

  // 2) Cooldown-Endpunkte hinten dran
  cool.sort((a, b) => epGet(a).failUntil - epGet(b).failUntil);

  return [...ok, ...cool];
}

/** ---- Overpass Fetch mit Retry + Cache + Circuit Breaker ------------------ */
/** ---- Overpass Fetch mit Retry + Cache + Circuit Breaker ------------------ */
async function fetchWithRetry(overpassQueryString, { cacheKey, cacheTtlMs, cacheMeta = null, reqId, skipCache = false, signal = null, minElementCount = null }) {
  if (!navigator.onLine) throw new Error('err_offline');

  // Cache lesen (nur wenn nicht übersprungen)
  if (cacheKey && !skipCache) {
    const cached = await getCache(cacheKey, cacheTtlMs);
    if (cached) {
      emit({ phase: 'cache_hit', reqId, cacheKey });
      return cached;
    }
    emit({ phase: 'cache_miss', reqId, cacheKey });
  }

  const endpoints = epHealthyOrder(Config.overpassEndpoints || []);
  if (endpoints.length === 0) throw new Error('err_generic');

  await maybeGlobalBackoff(reqId);

  let lastErr = null;

  for (let attemptNum = 0; attemptNum < endpoints.length; attemptNum++) {
    const endpoint = endpoints[attemptNum];
    const s = epGet(endpoint);
    const now = Date.now();

    if (s.failUntil > now) {
      const waitSec = Math.ceil((s.failUntil - now) / 1000);
      emit({ phase: 'skip_endpoint', reqId, endpoint, untilMs: s.failUntil - now, lastStatus: s.lastStatus });

      // Zeige nur wenn es der letzte Endpoint ist (sonst zu viele Notifications)
      if (attemptNum === endpoints.length - 1) {
        showNotification(`${t('server_overloaded_wait')} ${waitSec}${t('seconds_short')}...`, 3000);
      }
      continue;
    }

    try {
      // Zeige bei Retry (nicht beim ersten Versuch) welcher Server probiert wird
      if (attemptNum > 0) {
        const serverName = endpoint.includes('overpass-api.de') ? 'Server 1' :
          endpoint.includes('z.overpass-api.de') ? 'Server 2' :
            endpoint.includes('lz4.overpass-api.de') ? 'Server 3' : 'Alternativ-Server';

        // FIX: Dauer auf 60 Sekunden erhöht, damit der User sieht, dass noch was passiert.
        showNotification(`${t('trying_server')} ${serverName}...`, 60000);
      }

      emit({ phase: 'try', reqId, endpoint, attemptNum });

      const t0 = performance.now();
      const body = new URLSearchParams({ data: overpassQueryString }).toString();

      const json = await fetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body,
        timeoutMs: 25000,
        signal: signal || State.controllers.fetch.signal
      });

      if (!json || typeof json !== 'object') throw new Error('err_generic');

      epMarkOk(endpoint, 200);

      // Cache schreiben – aber nur wenn das Ergebnis nicht schlechter als der Schwellwert ist.
      // minElementCount verhindert, dass ein degradiertes Overpass-Ergebnis gute Cache-Daten überschreibt.
      const elementCount = Array.isArray(json?.elements) ? json.elements.length : 0;
      const meetsThreshold = minElementCount == null || elementCount >= minElementCount;
      if (cacheKey && meetsThreshold) {
        await setCache(cacheKey, json, cacheMeta || (cacheTtlMs ? { ttlMs: cacheTtlMs } : {}));
      } else if (cacheKey) {
        emit({ phase: 'cache_skip_degraded', reqId, elements: elementCount, minRequired: minElementCount });
      }

      const ms = Math.round(performance.now() - t0);
      const elements = Array.isArray(json?.elements) ? json.elements.length : null;
      emit({ phase: 'net_ok', reqId, endpoint, ms, elements });

      // Erfolg -> globalen Backoff resetten
      GLOBAL_BACKOFF_MS = 0;
      GLOBAL_BACKOFF_UNTIL = 0;

      return json;

    } catch (err) {
      if (err?.name === 'AbortError') throw err;

      lastErr = err;
      const status = (err instanceof HttpError) ? err.status : null;
      emit({ phase: 'net_err', reqId, endpoint, status, message: String(err?.message || err) });

      // Circuit-Breaker & Backoff Regeln:
      if (err instanceof HttpError) {
        if (err.status === 429) {
          epMarkFail(endpoint, 429, 90000); // 90s
          bumpGlobalBackoff({ minMs: 8000, maxMs: 30000 });
          emit({ phase: 'ratelimit', reqId, endpoint, backoffMs: GLOBAL_BACKOFF_MS });

          // Visuelles Feedback: Rate Limit
          if (attemptNum < endpoints.length - 1) {
            showNotification(t('server_ratelimit_retry'), 4000);
          } else {
            showNotification(t('all_servers_busy'), 6000);
          }

          await sleep(300);
          continue;
        }
        if (err.status >= 500) {
          epMarkFail(endpoint, err.status, 30000); // 30s
          bumpGlobalBackoff({ minMs: 1200, maxMs: 8000 });

          // Visuelles Feedback: Server Error
          if (attemptNum < endpoints.length - 1) {
            showNotification(t('server_error_retry'), 4000);
          }


          await sleep(400);
          continue;
        }
      }

      epMarkFail(endpoint, status, 20000);
      await sleep(300);
      continue;
    }

  }

  // Alle Endpoints durchprobiert, keiner verfügbar.
  // ABER: Wenn alle nur kurz im Cooldown sind, warte lieber ab!
  const nowAfterLoop = Date.now();
  const cooldowns = endpoints.map(ep => {
    const s = epGet(ep);
    return s.failUntil > nowAfterLoop ? s.failUntil - nowAfterLoop : 0;
  }).filter(cd => cd > 0);

  if (cooldowns.length === endpoints.length) {
    // ALLE im Cooldown
    const minCooldown = Math.min(...cooldowns);
    const MAX_REASONABLE_WAIT = 15000; // 15 Sekunden

    if (minCooldown <= MAX_REASONABLE_WAIT) {
      // Lohnt sich zu warten!
      const waitSec = Math.ceil(minCooldown / 1000);
      emit({ phase: 'wait_for_cooldown', reqId, waitMs: minCooldown });
      showNotification(`${t('server_overloaded_wait')} ${waitSec}${t('seconds_short')}...`, minCooldown);

      await sleep(minCooldown + 500); // +500ms Puffer

      // Erneuter Versuch
      emit({ phase: 'retry_after_cooldown', reqId });
      return fetchWithRetry(overpassQueryString, { cacheKey, cacheTtlMs, reqId, skipCache, signal, minElementCount });
    }
  }

  throw lastErr || new Error('err_generic');
}

/**
 * SCHRITT 1: Daten laden (Wrapper um fetchWithRetry)
 * SWR-Pattern (Stale-While-Revalidate):
 * Wenn onProgressData übergeben wird, rufen wir es SOFORT mit Cache-Daten auf,
 * während wir im Hintergrund die neuen Daten laden.
 */
export async function fetchOSMData(onProgressData = null) {
  const reqId = Math.random().toString(36).substring(2, 7);
  const zoom = State.map.getZoom();

  // Unter Zoom 12: komplett aus
  if (zoom < 12) {
    State.cachedPoiElements = [];
    syncCombinedCachedElements();
    emit({ phase: 'skip', reqId, reason: 'zoom<12', zoom });
    return [];
  }

  const { bbox, bboxKey } = getViewQueryMeta();
  const { query: q, queryKind, dataClass } = buildPoiQuery(zoom, bbox);
  if (!q) {
    emit({ phase: 'skip', reqId, reason: 'no_query_parts', zoom });
    return [];
  }
  const cachePolicy = getCachePolicy(dataClass);
  const cacheKey = makeOverpassCacheKey({ zoom, bboxKey, queryKind });

  // loading state...
  State.isFetchingData = true;
  emit({ phase: 'load_start', reqId, zoom, bboxKey, dataset: 'poi', dataClass });

  // Alte Anfrage abbrechen + neuen Controller setzen
  if (State.controllers.fetch) State.controllers.fetch.abort();
  State.controllers.fetch = new AbortController();

  // Hintergrund-Refresh für anderen Bereich abbrechen (User hat Gebiet gewechselt)
  if (_bgPoiRefresh && _bgPoiRefresh.cacheKey !== cacheKey) {
    _bgPoiRefresh.controller.abort();
    ++_bgPoiGen;
    _bgPoiRefresh = null;
  }

  // SCHRITT 1: Cache prüfen & sofort anzeigen
  console.log('[API] Cache Key:', cacheKey);
  console.log('[API] queryKind:', queryKind, '| zoom:', zoom, '| bboxKey:', bboxKey);
  let hasCachedData = false;
  try {
    const { freshData, staleData } = await readDatasetCache(cacheKey, cachePolicy);
    const cached = freshData || staleData;
    if (cached?.elements) {
      hasCachedData = true;
      const isFresh = Boolean(freshData);
      State.cachedPoiElements = cached.elements || [];
      syncCombinedCachedElements();
      console.log('[API] CACHE HIT!', State.cachedPoiElements.length, 'elements');
      emit({ phase: isFresh ? 'swr_hit' : 'swr_stale_hit', reqId, cacheKey, dataset: 'poi', dataClass, elements: State.cachedPoiElements.length });

      // SCHRITT 1a: Sofort aus Cache rendern
      if (typeof onProgressData === 'function' && State.cachedPoiElements.length > 0) {
        onProgressData(State.cachedPoiElements);
      }

      // SCHRITT 1b: Hintergrund-Refresh – prüft ob sich Daten geändert haben
      // Nur starten wenn noch kein Refresh für diesen Bereich läuft
      if (!_bgPoiRefresh) {
        const bgController = new AbortController();
        const myGen = ++_bgPoiGen;
        _bgPoiRefresh = { controller: bgController, cacheKey };
        const cachedCount = State.cachedPoiElements.length;
        const cachedFingerprint = elementsFingerprint(State.cachedPoiElements);

        fetchWithRetry(q, {
          cacheKey,
          cacheTtlMs: cachePolicy.ttlMs,
          cacheMeta: cachePolicy,
          reqId: reqId + '_bg',
          skipCache: true,
          signal: bgController.signal,
          // Cache nur überschreiben wenn frische Daten mind. 50% des gecachten Bestands haben.
          // Schützt vor degradierten Overpass-Antworten (Timeout/Überlast).
          minElementCount: Math.floor(cachedCount * 0.5)
        })
          .then(freshData => {
            if (_bgPoiGen !== myGen) return; // Veraltet – User hat Bereich gewechselt
            _bgPoiRefresh = null;
            const freshElements = freshData?.elements || [];
            const changed = elementsFingerprint(freshElements) !== cachedFingerprint;
            emit({ phase: 'swr_refresh_ok', reqId, dataset: 'poi', elements: freshElements.length, changed });
            if (changed) {
              State.cachedPoiElements = freshElements;
              syncCombinedCachedElements();
              if (typeof onProgressData === 'function') {
                onProgressData(freshElements);
              }
            }
          })
          .catch(err => {
            if (_bgPoiGen !== myGen) return;
            _bgPoiRefresh = null;
            emit({ phase: 'swr_refresh_err', reqId, dataset: 'poi', err: err?.name });
          });
      }

      State.isFetchingData = false;
      return State.cachedPoiElements;
    }
  } catch (e) {
    console.log('[API] CACHE MISS or error:', e?.message || 'no data');
  }

  const tAll0 = performance.now();

  try {
    const data = await fetchWithRetry(q, {
      cacheKey,
      cacheTtlMs: cachePolicy.ttlMs,
      cacheMeta: cachePolicy,
      reqId,
      skipCache: true,
      signal: State.controllers.fetch.signal
    });

    State.cachedPoiElements = data.elements || [];
    syncCombinedCachedElements();
    const totalMs = Math.round(performance.now() - tAll0);
    emit({ phase: 'load_ok', reqId, zoom, totalMs, dataset: 'poi', elements: State.cachedPoiElements.length, dataClass });

    State.isFetchingData = false;
    return State.cachedPoiElements;

  } catch (err) {
    State.isFetchingData = false;

    if (err?.name === 'AbortError') {
      emit({ phase: 'aborted', reqId, zoom });
      throw err;
    }

    // Wenn Netzwerk fehlschlägt, wir aber Cached Data haben:
    if (hasCachedData) {
      console.warn("Background fetch failed, using stale data.", err);

      // Visuelles Feedback: Nutzer weiß, dass alte Daten angezeigt werden
      const errType = (err instanceof HttpError && err.status === 429) ? t('server_error_type_overload') :
        (err instanceof HttpError && err.status >= 500) ? t('server_error_type_server') : t('server_error_type_connection');
      showNotification(`${errType} - ${t('showing_cached')}`, 4000);

      // WICHTIG: NICHT werfen! Wir haben ja erfolgreiche Daten (aus Cache).
      // Der User sieht Marker, also ist das KEIN Fehler-Zustand.
      return State.cachedPoiElements;
    } else {
      // Kein Cache UND kein Netzwerk -> Fehler
      const msgKey = mapErrorKey(err);
      emit({
        phase: 'load_fail',
        reqId,
        zoom,
        code: msgKey,
        status: (err instanceof HttpError) ? err.status : null,
        message: String(err?.message || err)
      });

      showNotification(t(msgKey), 5000);
      throw err;
    }
  }
}

export async function fetchBoundaryData(onProgressData = null) {
  const reqId = Math.random().toString(36).substring(2, 7);
  const zoom = State.map.getZoom();

  if (zoom < 14) {
    State.cachedBoundaryElements = [];
    syncCombinedCachedElements();
    emit({ phase: 'skip_boundary', reqId, reason: 'zoom<14', zoom, dataset: 'boundary' });
    return [];
  }

  const { bbox, bboxKey } = getViewQueryMeta();
  const q = buildBoundaryQuery(zoom, bbox);
  const cachePolicy = getCachePolicy('boundaries');
  const cacheKey = makeBoundaryCacheKey({ bboxKey });

  if (!q) return [];

  if (State.controllers.boundaryFetch) State.controllers.boundaryFetch.abort();
  State.controllers.boundaryFetch = new AbortController();

  if (_bgBoundaryRefresh && _bgBoundaryRefresh.cacheKey !== cacheKey) {
    _bgBoundaryRefresh.controller.abort();
    ++_bgBoundaryGen;
    _bgBoundaryRefresh = null;
  }

  let hasCachedData = false;
  try {
    const { freshData, staleData } = await readDatasetCache(cacheKey, cachePolicy);
    const cached = freshData || staleData;
    if (cached?.elements) {
      hasCachedData = true;
      const isFresh = Boolean(freshData);
      State.cachedBoundaryElements = cached.elements || [];
      syncCombinedCachedElements();
      emit({ phase: isFresh ? 'boundary_cache_hit' : 'boundary_stale_hit', reqId, cacheKey, dataset: 'boundary', elements: State.cachedBoundaryElements.length });

      if (typeof onProgressData === 'function') {
        onProgressData(State.cachedBoundaryElements);
      }

      if (!_bgBoundaryRefresh) {
        const bgController = new AbortController();
        const myGen = ++_bgBoundaryGen;
        const cachedCount = State.cachedBoundaryElements.length;
        const cachedFingerprint = elementsFingerprint(State.cachedBoundaryElements);
        _bgBoundaryRefresh = { controller: bgController, cacheKey };

        fetchWithRetry(q, {
          cacheKey,
          cacheTtlMs: cachePolicy.ttlMs,
          cacheMeta: cachePolicy,
          reqId: reqId + '_bg_boundary',
          skipCache: true,
          signal: bgController.signal
        })
          .then((freshData) => {
            if (_bgBoundaryGen !== myGen) return;
            _bgBoundaryRefresh = null;
            const freshElements = freshData?.elements || [];
            const changed = elementsFingerprint(freshElements) !== cachedFingerprint;
            emit({ phase: 'boundary_refresh_ok', reqId, dataset: 'boundary', elements: freshElements.length, changed });
            if (changed) {
              State.cachedBoundaryElements = freshElements;
              syncCombinedCachedElements();
              if (typeof onProgressData === 'function') onProgressData(freshElements);
            }
          })
          .catch((err) => {
            if (_bgBoundaryGen !== myGen) return;
            _bgBoundaryRefresh = null;
            emit({ phase: 'boundary_refresh_err', reqId, dataset: 'boundary', err: err?.name });
          });
      }

      return State.cachedBoundaryElements;
    }
  } catch (e) {
    console.log('[API] Boundary cache miss or error:', e?.message || 'no data');
  }

  try {
    const data = await fetchWithRetry(q, {
      cacheKey,
      cacheTtlMs: cachePolicy.ttlMs,
      cacheMeta: cachePolicy,
      reqId,
      skipCache: true,
      signal: State.controllers.boundaryFetch.signal
    });

    State.cachedBoundaryElements = data?.elements || [];
    syncCombinedCachedElements();
    emit({ phase: 'boundary_load_ok', reqId, zoom, dataset: 'boundary', elements: State.cachedBoundaryElements.length });
    return State.cachedBoundaryElements;
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    if (hasCachedData) {
      emit({ phase: 'boundary_stale_if_error', reqId, zoom, dataset: 'boundary' });
      return State.cachedBoundaryElements;
    }
    throw err;
  }
}

/**
 * Holt Daten spezifisch für den Export (z.B. hohe Zoomstufe + Bounds).
 * Gibt das JSON-Objekt zurück, ohne den globalen Status (Map/Cache) zu verändern.
 */
export async function fetchDataForExport(bounds, zoom, signal) {
  const reqId = ++REQ_SEQ;
  const s = bounds.getSouth();
  const w = bounds.getWest();
  const n = bounds.getNorth();
  const e = bounds.getEast();
  const bbox = `${s},${w},${n},${e}`;

  const queryParts = [];
  if (zoom >= 12) {
    queryParts.push(`nwr["amenity"="fire_station"];`);
    queryParts.push(`nwr["building"="fire_station"];`);
  }
  // Exporte sollen IMMER Detaildaten (Hydranten) enthalten, 
  // selbst wenn der Nutzer sagt "Exportiere auf Zoom 14".
  queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"];`);
  queryParts.push(`node["emergency"="defibrillator"];`);
  const boundaryQuery = (zoom >= 14)
    ? `(way["boundary"="administrative"]["admin_level"="8"];)->.boundaries; .boundaries out geom;`
    : '';

  const q = `[out:json][timeout:25][bbox:${bbox}];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;

  // Wir nutzen v2 als Prefix, um fehlerhafte Caches der alten Version aus der lokalen DB zu umgehen.
  const cacheKey = `export_v2:${zoom}:${bbox}`;
  return await fetchWithRetry(q, {
    cacheKey,
    cacheTtlMs: 1000 * 60 * 60, // 1h Cache
    reqId,
    skipCache: false,
    signal
  });
}

// ---- Test-Exports (nur für Unit-Tests, nicht für die App) ----
export const _testing = {
  snapToGrid,
  roundCoord,
  makeBBoxKey,
  epHealthyOrder,
  epGet,
  epMarkOk,
  epMarkFail,
  EP
};
