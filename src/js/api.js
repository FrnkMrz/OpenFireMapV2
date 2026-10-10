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
import { showNotification, hideNotification } from './ui.js';

import { fetchJson, HttpError } from './net.js';
import { isPipelineEligible, fetchPipelineData, fetchPipelineBoundaries, getPipelineOsmDataUntil, getPipelineGeneratedAt } from './pipeline.js';
import { updateDataStatus } from './data-status.js';
import {
  getCache,
  getCacheEntry,
  getCachePolicy,
  isCacheFresh,
  isCacheUsableStale,
  setCache,
  deleteCacheEntry
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
let _poiDelta = null;      // { key, elements } – zuletzt geladene Overpass-Änderungen zum Pipeline-Stand

/** ---- Globaler Backoff (429/Server-Überlast) ----------------------------- */
let GLOBAL_BACKOFF_MS = 0;
let GLOBAL_BACKOFF_UNTIL = 0;

function createAbortError() {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw createAbortError();
}

function sleep(ms, signal = null) {
  if (!signal) return new Promise(resolve => setTimeout(resolve, ms));
  throwIfAborted(signal);

  return new Promise((resolve, reject) => {
    let timer;
    const abort = () => {
      clearTimeout(timer);
      cleanup();
      reject(createAbortError());
    };
    const cleanup = () => signal.removeEventListener('abort', abort);
    const cleanupAndResolve = () => {
      cleanup();
      resolve();
    };
    timer = setTimeout(cleanupAndResolve, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

async function maybeGlobalBackoff(reqId, signal = null, silent = false) {
  let shownMsg = null;
  const now = Date.now();
  if (GLOBAL_BACKOFF_UNTIL > now) {
    const waitMs = GLOBAL_BACKOFF_UNTIL - now;
    emit({ phase: 'backoff_wait', reqId, ms: waitMs });

    // Visuelles Feedback: Zeige dem User, dass wir aufgrund Überlastung warten (nicht bei Hintergrund-Abfragen)
    if (!silent) {
      const waitSec = Math.ceil(waitMs / 1000);
      shownMsg = `${t('status_waiting')} (${waitSec}${t('seconds_short')})...`;
      showNotification(shownMsg, Math.min(waitMs, 5000), 'warning');
    }

    await sleep(waitMs, signal);
  }
  return shownMsg;
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
  return `overpass:v4:boundaries:bbox:${bboxKey}`;
}

function cloneBounds(bounds) {
  if (!bounds) return null;
  return L.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
}

function syncCombinedCachedElements() {
  State.cachedElements = [
    ...(State.cachedPoiElements || []),
    ...(State.cachedBoundaryElements || [])
  ];
}

function getViewQueryMeta() {
  const b = State.map?.getBounds?.() || State.queryBounds;
  return {
    bbox: `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`,
    bboxKey: State.queryMeta?.bbox ? State.queryMeta.bbox : makeBBoxKey(b)
  };
}

// POI-Filter je Zoomstufe, gemeinsam für die Voll- und die Delta-Abfrage
function buildPoiStatements(zoom) {
  const queryParts = [];
  if (zoom >= 12) {
    queryParts.push(`nwr["amenity"="fire_station"];`);
    queryParts.push(`nwr["building"="fire_station"];`);
  }
  if (zoom >= 15) {
    queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"];`);
    queryParts.push(`node["emergency"="defibrillator"];`);
  }
  return queryParts;
}

function buildPoiQuery(zoom, bbox) {
  const queryParts = buildPoiStatements(zoom);
  if (queryParts.length === 0) return { query: '', queryKind: 'none', dataClass: 'default' };

  const queryKind = zoom >= 15 ? 'pois' : 'stations';
  const dataClass = zoom >= 15 ? 'hydrants_and_water_points' : 'fire_stations';
  return {
    query: `[out:json][timeout:25][bbox:${bbox}];(${queryParts.join('')})->.pois;.pois out center;`,
    queryKind,
    dataClass
  };
}

// Änderungen seit dem OSM-Datenstand der Pipeline: dieselben Filter mit (newer:"…").
// Liefert neue und geänderte Objekte, aber keine gelöschten.
function buildPoiDeltaQuery(zoom, bbox, since) {
  const queryParts = buildPoiStatements(zoom).map((stmt) => stmt.replace(/;$/, `(newer:"${since}");`));
  if (queryParts.length === 0) return '';
  return `[out:json][timeout:25][bbox:${bbox}];(${queryParts.join('')})->.pois;.pois out center;`;
}

// OSM-Typ und -ID gemeinsam: node, way und relation können dieselbe ID haben
function osmKey(el) {
  return `${el.type || 'node'}:${el.id}`;
}

// Bereich für das Delta: der ganze von der Pipeline geladene Bereich inklusive Pufferring. Danach gilt
// er als abgedeckt (loadedPoiBounds) und eine kleine Bewegung löst keine neue Abfrage aus.
function deltaBBoxForPipeline(pipelineElements, viewBounds) {
  const b = pipelineElements?.bufferBounds || pipelineElements?.loadedBounds || viewBounds;
  if (!b) return null;
  const val = (getter, key) => (typeof b[getter] === 'function' ? b[getter]() : b[key]);
  const parts = [val('getSouth', 'south'), val('getWest', 'west'), val('getNorth', 'north'), val('getEast', 'east')];
  if (!parts.every((v) => Number.isFinite(v))) return null;
  return parts.map((v) => v.toFixed(5)).join(',');
}

// Overpass-Änderungen ersetzen Kachel-Objekte gleicher OSM-ID oder kommen neu hinzu
function mergePoiDelta(baseElements, deltaElements) {
  if (!Array.isArray(deltaElements) || deltaElements.length === 0) return baseElements;
  const byKey = new Map((baseElements || []).map((el) => [osmKey(el), el]));
  for (const el of deltaElements) byKey.set(osmKey(el), el);
  const merged = Array.from(byKey.values());
  if (baseElements?.loadedBounds) merged.loadedBounds = baseElements.loadedBounds;
  return merged;
}

// Gemeinde-Relationen im Ausschnitt und ihre Mitglieds-Wege. Das globale [bbox:] gilt nicht für
// die Rekursion way(r.r) (sonst kämen alle Wege der Relationen), daher die explizite bbox.
// Nur Grenzen werden mit `out geom` ausgegeben, POIs mit `out center` (siehe isBoundaryElement).
function buildBoundaryStatements(bbox) {
  return `rel["boundary"="administrative"]["admin_level"="8"]->.r; way(r.r)(${bbox})->.boundaries; .boundaries out geom;`;
}

function buildBoundaryQuery(zoom, bbox) {
  if (zoom < 14) return '';
  return `[out:json][timeout:25][bbox:${bbox}];${buildBoundaryStatements(bbox)}`;
}

function buildExportQuery(zoom, bbox) {
  const queryParts = [];
  if (zoom >= 12) {
    queryParts.push(`nwr["amenity"="fire_station"];`);
    queryParts.push(`nwr["building"="fire_station"];`);
  }
  // Exporte sollen IMMER Detaildaten (Hydranten) enthalten, 
  // selbst wenn der Nutzer sagt "Exportiere auf Zoom 14".
  queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"];`);
  queryParts.push(`node["emergency"="defibrillator"];`);
  const boundaryQuery = (zoom >= 14) ? buildBoundaryStatements(bbox) : '';

  return `[out:json][timeout:25][bbox:${bbox}];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;
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

function computeMinElementCount(cachedCount, ratio = 0.5, floor = 1) {
  const normalizedCount = Number.isFinite(cachedCount) ? cachedCount : 0;
  return Math.max(floor, Math.floor(normalizedCount * ratio));
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

  const fresh = isCacheFresh(mergedEntry);
  const stale = isCacheUsableStale(mergedEntry);

  if (!fresh && !stale) {
    try {
      await deleteCacheEntry(cacheKey);
    } catch {
      // ignore cache cleanup errors
    }

    return { entry: null, freshData: null, staleData: null };
  }

  return {
    entry: mergedEntry,
    freshData: fresh ? mergedEntry.data : null,
    staleData: !fresh && stale ? mergedEntry.data : null
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
/**
 * Schließt den zuletzt von diesem Request gezeigten Hinweis, aber nur solange er noch sichtbar ist.
 * Hat inzwischen ein anderer Ablauf die Box mit einer neuen Meldung ersetzt, bleibt diese stehen.
 */
function hideOwnNotification(ctx) {
  const msg = ctx.msg;
  ctx.msg = null;
  if (!msg) return;
  const current = document.querySelector('#notification-box .notification-text')?.textContent;
  if (current === msg) hideNotification();
}

async function fetchWithRetry(overpassQueryString, opts) {
  // ctx.msg: Letzter Hinweis, den dieser Request (inkl. Neuversuch nach Cooldown) selbst gezeigt hat.
  // Nur ein solcher Hinweis wird von hier aus wieder geschlossen (bei Erfolg oder Abbruch),
  // nie fremde wie "Link kopiert", Export- oder Fehlermeldungen anderer Abläufe.
  const ctx = { msg: null };
  try {
    return await fetchWithRetryAttempt(overpassQueryString, opts, ctx);
  } catch (err) {
    if (err?.name === 'AbortError') hideOwnNotification(ctx);
    throw err;
  }
}

async function fetchWithRetryAttempt(overpassQueryString, { cacheKey, cacheTtlMs, cacheMeta = null, reqId, skipCache = false, signal = null, minElementCount = null, silent = false }, ctx) {
  throwIfAborted(signal);

  const notify = (msg, ...rest) => { ctx.msg = msg; showNotification(msg, ...rest); };
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

  const backoffMsg = await maybeGlobalBackoff(reqId, signal, silent);
  if (backoffMsg) ctx.msg = backoffMsg;

  let lastErr = null;

  for (let attemptNum = 0; attemptNum < endpoints.length; attemptNum++) {
    throwIfAborted(signal);
    const endpoint = endpoints[attemptNum];
    const s = epGet(endpoint);
    const now = Date.now();

    if (s.failUntil > now) {
      const waitSec = Math.ceil((s.failUntil - now) / 1000);
      emit({ phase: 'skip_endpoint', reqId, endpoint, untilMs: s.failUntil - now, lastStatus: s.lastStatus });

      // Zeige nur wenn es der letzte Endpoint ist (sonst zu viele Notifications)
      if (!silent && attemptNum === endpoints.length - 1) {
        notify(`${t('server_overloaded_wait')} ${waitSec}${t('seconds_short')}...`, 3000, 'warning');
      }
      continue;
    }

    try {
      // Zeige bei Retry (nicht beim ersten Versuch) welcher Server probiert wird
      if (!silent && attemptNum > 0) {
        const serverName = endpoint.includes('overpass-api.de') ? 'Server 1' :
          endpoint.includes('z.overpass-api.de') ? 'Server 2' :
            endpoint.includes('lz4.overpass-api.de') ? 'Server 3' : 'Alternativ-Server';

        notify(`${t('trying_server')} ${serverName}...`, 60000, 'info');
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

      // Erfolg -> globalen Backoff resetten und temporäre Server-Meldungen schließen
      GLOBAL_BACKOFF_MS = 0;
      GLOBAL_BACKOFF_UNTIL = 0;
      hideOwnNotification(ctx);

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
          if (!silent) {
            if (attemptNum < endpoints.length - 1) {
              notify(t('server_ratelimit_retry'), 4000, 'warning');
            } else {
              notify(t('all_servers_busy'), 6000, 'warning');
            }
          }

          await sleep(300, signal);
          continue;
        }
        if (err.status >= 500) {
          epMarkFail(endpoint, err.status, 30000); // 30s
          bumpGlobalBackoff({ minMs: 1200, maxMs: 8000 });

          // Visuelles Feedback: Server Error
          if (!silent && attemptNum < endpoints.length - 1) {
            notify(t('server_error_retry'), 4000, 'warning');
          }

          await sleep(400, signal);
          continue;
        }
      }

      epMarkFail(endpoint, status, 20000);
      await sleep(300, signal);
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
      if (!silent) {
        notify(`${t('server_overloaded_wait')} ${waitSec}${t('seconds_short')}...`, minCooldown, 'warning');
      }

      await sleep(minCooldown + 500, signal); // +500ms Puffer

      // Erneuter Versuch
      emit({ phase: 'retry_after_cooldown', reqId });
      return fetchWithRetryAttempt(overpassQueryString, { cacheKey, cacheTtlMs, cacheMeta, reqId, skipCache, signal, minElementCount, silent }, ctx);
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
export function countHydrants(elements) {
  if (!Array.isArray(elements)) return 0;
  return elements.filter(element => element?.tags?.emergency === 'fire_hydrant').length;
}

function reportHydrantDownload(onStatus, state, elements = []) {
  if (typeof onStatus !== 'function') return;
  onStatus({ state, count: countHydrants(elements) });
}

// Lädt die Overpass-Änderungen zum Pipeline-Stand für den Ausschnitt (kurz gecacht).
// Gibt null zurück, wenn kein Datenstand bekannt ist (ältere Builds ohne OSM-IDs) oder das Nachladen aus ist.
async function loadPoiDelta({ zoom, bbox, queryKind, reqId, signal }) {
  const since = getPipelineOsmDataUntil();
  if (!Config.pipeline?.liveDelta || !since || !bbox || !navigator.onLine) return null;
  const query = buildPoiDeltaQuery(zoom, bbox, since);
  if (!query) return null;
  // Schlüssel aus genau dem abgefragten Bereich (State.queryMeta gehört zum Overpass-Pfad und kann veraltet sein)
  const key = `${since}|${queryKind}|${bbox}`;
  const data = await fetchWithRetry(query, {
    cacheKey: `overpass:delta:v1:${key}`,
    cacheTtlMs: Config.pipeline.liveDeltaCacheTtlMs,
    reqId: reqId + '_delta',
    signal,
    silent: true
  });
  return { key, since, elements: Array.isArray(data?.elements) ? data.elements : [] };
}

export async function fetchOSMData(onProgressData = null, onStatus = null) {
  const reqId = Math.random().toString(36).substring(2, 7);
  const zoom = State.map.getZoom();
  const requestedBounds = cloneBounds(State.queryBounds || State.map.getBounds());
  const requestedMode = zoom >= 15 ? 'all' : 'stations';
  // Der sichtbare Status bezieht sich bewusst nur auf den Hydrantenmodus.
  const hydrantStatus = zoom >= 15 ? onStatus : null;

  // Unter Zoom 12: komplett aus
  if (zoom < 12) {
    State.cachedPoiElements = [];
    State.loadedPoiBounds = null;
    State.loadedPoiMode = null;
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
  State.activeFetchBounds = cloneBounds(State.map?.getBounds?.() || requestedBounds);
  emit({ phase: 'load_start', reqId, zoom, bboxKey, dataset: 'poi', dataClass });
  reportHydrantDownload(hydrantStatus, 'loading');

  // Alte Anfrage abbrechen + neuen Controller setzen
  if (State.controllers.fetch) State.controllers.fetch.abort();
  const controller = new AbortController();
  State.controllers.fetch = controller;
  const isCurrentRequest = () => !controller.signal.aborted && (State.controllers.fetch === controller || State.controllers.fetch === null);
  const ensureCurrentRequest = () => {
    if (!isCurrentRequest()) throw createAbortError();
  };

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
    // Für die lokale Pipeline das tatsächliche sichtbare Kartenfenster nutzen
    const viewBounds = cloneBounds(State.map?.getBounds?.() || requestedBounds);
    if (isPipelineEligible(viewBounds, zoom)) {
      try {
        console.log('[API] Verwende lokale Pipeline für DACHLiLu...');
        let hasReportedSuccess = false;
        let deltaKey = null;
        const onPoiProgress = (progressElements, isPartial = true, meta = {}) => {
          if (!isCurrentRequest()) return;
          if (meta?.phase !== 'buffer' && !hasReportedSuccess) {
            reportHydrantDownload(hydrantStatus, 'loading', progressElements);
          }
          if (typeof onProgressData === 'function') {
            try {
              onProgressData(progressElements, isPartial);
            } catch (renderErr) {
              console.warn('[API] Fehler beim progressiven Rendern der Pipeline-POIs:', renderErr);
            }
          }
        };

        const onBufferComplete = (bufferedElements, fullBounds) => {
          if (!isCurrentRequest()) return;
          // Der Pufferring ersetzt die Liste; bereits geladene Overpass-Änderungen erneut anwenden
          const mergedElements = _poiDelta?.key === deltaKey ? mergePoiDelta(bufferedElements, _poiDelta.elements) : bufferedElements;
          State.cachedPoiElements = mergedElements;
          State.loadedPoiBounds = fullBounds;
          syncCombinedCachedElements();
          if ((!State.pendingBufferFetches || State.pendingBufferFetches.size === 0) && !State.isFetchingBoundaries) {
            State.activeFetchBounds = null;
          }
          reportHydrantDownload(hydrantStatus, 'success', mergedElements);
          if (typeof onProgressData === 'function') {
            try {
              onProgressData(mergedElements, false);
            } catch (renderErr) {
              console.warn('[API] Fehler beim Rendern nach Pufferabschluss:', renderErr);
            }
          }
        };

        const pipelineElements = await fetchPipelineData(viewBounds, requestedMode, {
          signal: controller.signal,
          zoom,
          onProgressData: onPoiProgress,
          onBufferComplete
        });
        ensureCurrentRequest();

        if (Array.isArray(pipelineElements)) {
          hasReportedSuccess = true;
          State.cachedPoiElements = pipelineElements;
          State.loadedPoiBounds = pipelineElements.loadedBounds || viewBounds;
          State.loadedPoiMode = requestedMode;
          syncCombinedCachedElements();

          emit({ phase: 'pipeline_hit', reqId, zoom, dataset: 'poi', elements: pipelineElements.length });
          reportHydrantDownload(hydrantStatus, 'success', pipelineElements);

          if (typeof onProgressData === 'function') {
            try {
              onProgressData(pipelineElements, false);
            } catch (renderErr) {
              console.warn('[API] Fehler beim Rendern der Pipeline-POIs:', renderErr);
            }
          }

          const baseTimestamp = getPipelineOsmDataUntil();
          const generatedAt = getPipelineGeneratedAt();
          const canRunDelta = Boolean(Config.pipeline?.liveDelta && baseTimestamp && navigator.onLine);
          updateDataStatus({
            source: 'pipeline',
            baseTimestamp,
            generatedAt,
            deltaStatus: canRunDelta ? 'loading' : 'disabled',
            loadPhase: 'ready'
          });

          // Änderungen seit dem Pipeline-Stand per Overpass nachladen (Hintergrund, Fehler sind unkritisch)
          loadPoiDelta({ zoom, bbox: deltaBBoxForPipeline(pipelineElements, viewBounds), queryKind, reqId, signal: controller.signal })
            .then((delta) => {
              if (!isCurrentRequest()) return;
              if (!delta) {
                updateDataStatus({ deltaStatus: 'disabled' });
                return;
              }
              deltaKey = delta.key;
              _poiDelta = { key: delta.key, elements: delta.elements };
              emit({ phase: 'pipeline_delta', reqId, since: delta.since, dataset: 'poi', elements: delta.elements.length });
              updateDataStatus({
                deltaStatus: 'success',
                deltaTimestamp: Date.now(),
                deltaCount: delta.elements.length
              });
              if (delta.elements.length === 0) return;
              State.cachedPoiElements = mergePoiDelta(State.cachedPoiElements, delta.elements);
              syncCombinedCachedElements();
              if (typeof onProgressData === 'function') onProgressData(State.cachedPoiElements, false);
            })
            .catch((err) => {
              if (err?.name !== 'AbortError') {
                console.warn('[API] Overpass-Änderungen konnten nicht geladen werden (nicht kritisch):', err?.message);
                updateDataStatus({ deltaStatus: 'failed' });
              }
            });

          return pipelineElements;
        }
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.warn('[API] Pipeline-Abruf fehlgeschlagen, wechsle auf Overpass-Fallback:', err.message);
        emit({ phase: 'pipeline_fallback_to_overpass', reqId, error: err.message });
      }
    }

    try {
      const { entry, freshData, staleData } = await readDatasetCache(cacheKey, cachePolicy);
      ensureCurrentRequest();
      const cached = freshData || staleData;
      if (cached?.elements) {
        hasCachedData = true;
        const isFresh = Boolean(freshData);
        State.cachedPoiElements = cached.elements || [];
        State.loadedPoiBounds = requestedBounds;
        State.loadedPoiMode = requestedMode;
        syncCombinedCachedElements();
        updateDataStatus({
          source: 'cache',
          cacheTimestamp: entry?.createdAt || cached.timestamp || Date.now(),
          deltaStatus: 'none',
          loadPhase: 'ready'
        });
        console.log('[API] CACHE HIT!', State.cachedPoiElements.length, 'elements');
        emit({ phase: isFresh ? 'swr_hit' : 'swr_stale_hit', reqId, cacheKey, dataset: 'poi', dataClass, elements: State.cachedPoiElements.length });
        reportHydrantDownload(hydrantStatus, 'refreshing', State.cachedPoiElements);

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
            minElementCount: computeMinElementCount(cachedCount, 0.5, 1),
            silent: true
          })
            .then(freshData => {
              if (_bgPoiGen !== myGen) return; // Veraltet – User hat Bereich gewechselt
              _bgPoiRefresh = null;
              const freshElements = freshData?.elements || [];
              const minRequired = computeMinElementCount(cachedCount, 0.5, 1);

              // Schutz vor degradierten Overpass-Antworten: Wenn wir bereits gecachte Hydranten haben,
              // darf eine leere oder unvollständige Server-Antwort den Bildschirm nicht leeren!
              if (cachedCount > 0 && freshElements.length < minRequired) {
                emit({ phase: 'swr_refresh_skip_degraded', reqId, dataset: 'poi', elements: freshElements.length, minRequired });
                reportHydrantDownload(hydrantStatus, 'success', State.cachedPoiElements);
                return;
              }

              const changed = elementsFingerprint(freshElements) !== cachedFingerprint;
              emit({ phase: 'swr_refresh_ok', reqId, dataset: 'poi', elements: freshElements.length, changed });
              if (changed) {
                State.cachedPoiElements = freshElements;
                State.loadedPoiBounds = requestedBounds;
                State.loadedPoiMode = requestedMode;
                syncCombinedCachedElements();
                updateDataStatus({
                  source: 'overpass',
                  deltaStatus: 'none',
                  loadPhase: 'ready'
                });
                if (typeof onProgressData === 'function') {
                  onProgressData(freshElements);
                }
              }
              reportHydrantDownload(hydrantStatus, 'success', freshElements);
            })
            .catch(err => {
              if (_bgPoiGen !== myGen) return;
              _bgPoiRefresh = null;
              emit({ phase: 'swr_refresh_err', reqId, dataset: 'poi', err: err?.name });
              if (err?.name !== 'AbortError') reportHydrantDownload(hydrantStatus, 'error');
            });
        }

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
        signal: controller.signal
      });

      ensureCurrentRequest();

      State.cachedPoiElements = data.elements || [];
      State.loadedPoiBounds = requestedBounds;
      State.loadedPoiMode = requestedMode;
      syncCombinedCachedElements();
      updateDataStatus({
        source: 'overpass',
        deltaStatus: 'none',
        loadPhase: 'ready'
      });
      const totalMs = Math.round(performance.now() - tAll0);
      emit({ phase: 'load_ok', reqId, zoom, totalMs, dataset: 'poi', elements: State.cachedPoiElements.length, dataClass });
      reportHydrantDownload(hydrantStatus, 'success', State.cachedPoiElements);

      return State.cachedPoiElements;

    } catch (err) {
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
        showNotification(`${errType} - ${t('showing_cached')}`, 4000, 'warning');

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

        showNotification(t(msgKey), 5000, 'error');
        reportHydrantDownload(hydrantStatus, 'error');
        throw err;
      }
    }
  } finally {
    if (isCurrentRequest()) {
      State.isFetchingData = false;
      const hasActiveBuffer = Boolean(State.pendingBufferFetches && State.pendingBufferFetches.size > 0);
      if (!hasActiveBuffer && State.controllers.fetch === controller) {
        State.controllers.fetch = null;
      }
      if (!hasActiveBuffer && !State.isFetchingBoundaries) {
        State.activeFetchBounds = null;
      }
    }
  }
}

export async function fetchBoundaryData(onProgressData = null) {
  const reqId = Math.random().toString(36).substring(2, 7);
  const zoom = State.map.getZoom();
  const requestedBounds = cloneBounds(State.queryBounds || State.map.getBounds());

  if (zoom < 14) {
    State.cachedBoundaryElements = [];
    State.loadedBoundaryBounds = null;
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
  const controller = new AbortController();
  State.controllers.boundaryFetch = controller;
  State.isFetchingBoundaries = true;
  const isCurrentBoundaryRequest = () => !controller.signal.aborted && (State.controllers.boundaryFetch === controller || State.controllers.boundaryFetch === null);
  const ensureCurrentRequest = () => {
    if (!isCurrentBoundaryRequest()) throw createAbortError();
  };

  try {
    if (_bgBoundaryRefresh && _bgBoundaryRefresh.cacheKey !== cacheKey) {
      _bgBoundaryRefresh.controller.abort();
      ++_bgBoundaryGen;
      _bgBoundaryRefresh = null;
    }

    const viewBounds = cloneBounds(State.map?.getBounds?.() || requestedBounds);

    if (isPipelineEligible(viewBounds, zoom)) {
      try {
        console.log('[API] Verwende lokale Pipeline für Gemeindegrenzen...');
        const onBoundaryBufferComplete = (bufferedElements, fullBounds) => {
          if (!isCurrentBoundaryRequest()) return;
          State.cachedBoundaryElements = bufferedElements;
          State.loadedBoundaryBounds = fullBounds;
          syncCombinedCachedElements();
          if ((!State.pendingBufferFetches || State.pendingBufferFetches.size === 0) && !State.isFetchingData) {
            State.activeFetchBounds = null;
          }
        if (typeof onProgressData === 'function') {
          try {
            onProgressData(bufferedElements, false);
          } catch (renderErr) {
            console.warn('[API] Fehler beim Rendern nach Boundary-Pufferabschluss:', renderErr);
          }
        }
      };

      const onBoundaryProgress = (progressElements, isPartial = true) => {
        if (!isCurrentBoundaryRequest()) return;
        if (typeof onProgressData === 'function') {
          try {
            onProgressData(progressElements, isPartial);
          } catch (renderErr) {
            console.warn('[API] Fehler bei progressiver Boundary-Meldung:', renderErr);
          }
        }
      };

      const boundaryElements = await fetchPipelineBoundaries(viewBounds, {
        signal: controller.signal,
        zoom,
        onProgressData: onBoundaryProgress,
        onBufferComplete: onBoundaryBufferComplete
      });
      ensureCurrentRequest();

      if (Array.isArray(boundaryElements)) {
        State.cachedBoundaryElements = boundaryElements;
        State.loadedBoundaryBounds = boundaryElements.loadedBounds || viewBounds;
        syncCombinedCachedElements();

        emit({ phase: 'boundary_pipeline_hit', reqId, zoom, dataset: 'boundary', elements: boundaryElements.length });
        if (typeof onProgressData === 'function') {
          onProgressData(boundaryElements, false);
        }
        return boundaryElements;
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn('[API] Pipeline Boundary-Abruf fehlgeschlagen, wechsle auf Overpass-Fallback:', err.message);
    }
  }

  let hasCachedData = false;
  try {
    const { freshData, staleData } = await readDatasetCache(cacheKey, cachePolicy);
    ensureCurrentRequest();
    const cached = freshData || staleData;
    if (cached?.elements) {
      hasCachedData = true;
      const isFresh = Boolean(freshData);
      State.cachedBoundaryElements = cached.elements || [];
      State.loadedBoundaryBounds = requestedBounds;
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
          signal: bgController.signal,
          minElementCount: computeMinElementCount(cachedCount, 0.5, 1),
          silent: true
        })
          .then((freshData) => {
            if (_bgBoundaryGen !== myGen) return;
            _bgBoundaryRefresh = null;
            const freshElements = freshData?.elements || [];
            const minRequired = computeMinElementCount(cachedCount, 0.5, 1);

            if (cachedCount > 0 && freshElements.length < minRequired) {
              emit({ phase: 'boundary_refresh_skip_degraded', reqId, dataset: 'boundary', elements: freshElements.length, minRequired });
              return;
            }

            const changed = elementsFingerprint(freshElements) !== cachedFingerprint;
            emit({ phase: 'boundary_refresh_ok', reqId, dataset: 'boundary', elements: freshElements.length, changed });
            if (changed) {
              State.cachedBoundaryElements = freshElements;
              State.loadedBoundaryBounds = requestedBounds;
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
      signal: controller.signal,
      silent: true
    });

    ensureCurrentRequest();

    State.cachedBoundaryElements = data?.elements || [];
    State.loadedBoundaryBounds = requestedBounds;
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
  } finally {
    if (isCurrentBoundaryRequest()) {
      State.isFetchingBoundaries = false;
      const hasActiveBuffer = Boolean(State.pendingBufferFetches && State.pendingBufferFetches.size > 0);
      if (!hasActiveBuffer && State.controllers.boundaryFetch === controller) {
        State.controllers.boundaryFetch = null;
      }
      if (!hasActiveBuffer && !State.isFetchingData) {
        State.activeFetchBounds = null;
      }
    }
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

  const q = buildExportQuery(zoom, bbox);

  // Wir nutzen v3 als Prefix, um fehlerhafte Caches der alten Version aus der lokalen DB zu umgehen.
  const cacheKey = `export_v3:${zoom}:${bbox}`;
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
  EP,
  countHydrants,
  buildBoundaryQuery,
  buildPoiQuery,
  buildExportQuery,
  buildPoiDeltaQuery,
  mergePoiDelta,
  deltaBBoxForPipeline,
  fetchWithRetry,
  // Server-Sperren und globalen Backoff zwischen Tests zurücksetzen
  resetOverpassState() {
    EP.clear();
    GLOBAL_BACKOFF_MS = 0;
    GLOBAL_BACKOFF_UNTIL = 0;
  }
};
