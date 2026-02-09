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
import { getCache, setCache } from './cache.js';

/** ---- Debug/Event-Hook --------------------------------------------------- */
const DEBUG = () => (localStorage.getItem('OFM_DEBUG') === '1');

const emit = (detail) => {
  // map.js (Trace/Overlay) kann darauf hören
  try { window.dispatchEvent(new CustomEvent('ofm:overpass', { detail })); } catch (_) { /* ignore */ }
  if (DEBUG()) console.log('[OFM]', detail);
};

let REQ_SEQ = 0;

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
    showNotification(`⏳ ${t('status_waiting')} (${waitSec}${t('seconds_short')})...`, Math.min(waitMs, 5000));

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

function epHealthyOrder(endpoints) {
  const now = Date.now();
  // 1) Endpoints ohne Cooldown zuerst, sortiert nach "zuletzt OK"
  const ok = [];
  const cool = [];
  for (const ep of endpoints) {
    const s = epGet(ep);
    if (s.failUntil > now) cool.push(ep);
    else ok.push(ep);
  }
  ok.sort((a, b) => epGet(b).lastOkTs - epGet(a).lastOkTs);

  // 2) Cooldown-Endpunkte hinten dran (damit du notfalls trotzdem noch Fallback hast)
  cool.sort((a, b) => epGet(a).failUntil - epGet(b).failUntil);

  return [...ok, ...cool];
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
function roundCoord(x, decimals = 3) {
  const m = 10 ** decimals;
  return Math.round(Number(x) * m) / m;
}
function makeBBoxKey(bounds, decimals = 3) {
  const s = roundCoord(bounds.getSouth(), decimals);
  const w = roundCoord(bounds.getWest(), decimals);
  const n = roundCoord(bounds.getNorth(), decimals);
  const e = roundCoord(bounds.getEast(), decimals);
  return `${s},${w},${n},${e}`;
}
function makeOverpassCacheKey({ zoom, bboxKey, queryKind }) {
  return `overpass:v1:${queryKind}:z${zoom}:bbox:${bboxKey}`;
}

/** ---- Overpass Fetch mit Retry + Cache + Circuit Breaker ------------------ */
/** ---- Overpass Fetch mit Retry + Cache + Circuit Breaker ------------------ */
async function fetchWithRetry(overpassQueryString, { cacheKey, cacheTtlMs, reqId, skipCache = false, signal = null }) {
  if (!navigator.onLine) throw new Error('err_offline');

  // Cache lesen (nur wenn nicht übersprungen)
  if (cacheKey && !skipCache) {
    const cached = getCache(cacheKey, cacheTtlMs);
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
        showNotification(`⚠️ ${t('server_overloaded_wait')} ${waitSec}${t('seconds_short')}...`, 3000);
      }
      continue;
    }

    try {
      // Zeige bei Retry (nicht beim ersten Versuch) welcher Server probiert wird
      if (attemptNum > 0) {
        const serverName = endpoint.includes('overpass-api.de') ? 'Server 1' :
          endpoint.includes('z.overpass-api.de') ? 'Server 2' :
            endpoint.includes('lz4.overpass-api.de') ? 'Server 3' : 'Alternativ-Server';
        showNotification(`🔄 ${t('trying_server')} ${serverName}...`, 2000);
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

      // Cache schreiben (immer, wenn wir Key haben)
      if (cacheKey) setCache(cacheKey, json);

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
            showNotification(`⚠️ ${t('server_ratelimit_retry')}`, 3000);
          } else {
            showNotification(`⚠️ ${t('all_servers_busy')}`, 5000);
          }

          await sleep(300);
          continue;
        }
        if (err.status >= 500) {
          epMarkFail(endpoint, err.status, 30000); // 30s
          bumpGlobalBackoff({ minMs: 1200, maxMs: 8000 });

          // Visuelles Feedback: Server Error
          if (attemptNum < endpoints.length - 1) {
            showNotification(`⚠️ ${t('server_error_retry')} (${err.status}), ${t('trying_server')} ${t('alt_server')}...`, 3000);
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
      showNotification(`⏳ ${t('server_overloaded_wait')} ${waitSec}${t('seconds_short')}...`, minCooldown);

      await sleep(minCooldown + 500); // +500ms Puffer

      // Erneuter Versuch
      emit({ phase: 'retry_after_cooldown', reqId });
      return fetchWithRetry(overpassQueryString, { cacheKey, cacheTtlMs, reqId, skipCache, signal });
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
    State.cachedElements = [];
    emit({ phase: 'skip', reqId, reason: 'zoom<12', zoom });
    return [];
  }

  // map.js kann gepaddete/snappted Query-Bounds setzen
  const b = State.queryBounds || State.map.getBounds();
  const bbox = State.queryMeta?.bbox || `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
  const bboxKey = State.queryMeta?.bbox ? State.queryMeta.bbox : makeBBoxKey(b, 3);

  // loading state...
  emit({ phase: 'load_start', reqId, zoom, bboxKey });

  // Alte Anfrage abbrechen + neuen Controller setzen
  if (State.controllers.fetch) State.controllers.fetch.abort();
  State.controllers.fetch = new AbortController();

  const queryParts = [];

  // Feuerwachen ab 12
  if (zoom >= 12) {
    queryParts.push(`nwr["amenity"="fire_station"];`);
    queryParts.push(`nwr["building"="fire_station"];`);
  }

  // Hydranten/Wasser/Defi ab 15
  if (zoom >= 15) {
    queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"];`);
    queryParts.push(`node["emergency"="defibrillator"];`);
  }

  // Boundaries ab 14 (admin_level=8)
  const boundaryQuery = (zoom >= 14)
    ? `(way["boundary"="administrative"]["admin_level"="8"];)->.boundaries; .boundaries out geom;`
    : '';

  if (queryParts.length === 0 && boundaryQuery === '') {
    emit({ phase: 'skip', reqId, reason: 'no_query_parts', zoom });
    return null;
  }

  const queryKind =
    (zoom >= 15 && zoom >= 14) ? 'pois+boundary' :
      (zoom >= 14) ? 'stations+boundary' :
        'stations';

  // Caching:
  // User-Wunsch: "Einmal geladen, länger behalten".
  // UND: "Trotzdem aktualisieren" (Stale-While-Revalidate).
  const ONE_DAY_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage Cache
  const cacheKey = makeOverpassCacheKey({ zoom, bboxKey, queryKind });

  // SCHRITT 1: Cache prüfen & sofort anzeigen
  let hasCachedData = false;
  try {
    const cached = getCache(cacheKey, ONE_DAY_MS);
    if (cached) {
      hasCachedData = true;
      State.cachedElements = cached.elements || [];
      emit({ phase: 'swr_hit', reqId, cacheKey });

      // SWR: Nur rendern, wenn tatsächlich Daten vorhanden
      if (typeof onProgressData === 'function' && State.cachedElements.length > 0) {
        onProgressData(State.cachedElements);
      }
    }
  } catch (e) { /* ignore */ }


  const q = `[out:json][timeout:25][bbox:${bbox}];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;

  const tAll0 = performance.now();

  try {
    const data = await fetchWithRetry(q, { cacheKey, cacheTtlMs: ONE_DAY_MS, reqId, skipCache: true });

    State.cachedElements = data.elements || [];
    const totalMs = Math.round(performance.now() - tAll0);
    emit({ phase: 'load_ok', reqId, zoom, totalMs, elements: State.cachedElements.length });

    return State.cachedElements;

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
      showNotification(`ℹ️ ${errType} - ${t('showing_cached')}`, 4000);

      // WICHTIG: NICHT werfen! Wir haben ja erfolgreiche Daten (aus Cache).
      // Der User sieht Marker, also ist das KEIN Fehler-Zustand.
      return State.cachedElements;
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
  if (zoom >= 15) {
    queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"];`);
    queryParts.push(`node["emergency"="defibrillator"];`);
  }
  const boundaryQuery = (zoom >= 14)
    ? `(way["boundary"="administrative"]["admin_level"="8"];)->.boundaries; .boundaries out geom;`
    : '';

  const q = `[out:json][timeout:25][bbox:${bbox}];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;

  const cacheKey = `export:${zoom}:${bbox}`;
  return await fetchWithRetry(q, {
    cacheKey,
    cacheTtlMs: 1000 * 60 * 60, // 1h Cache
    reqId,
    skipCache: false,
    signal
  });
}
