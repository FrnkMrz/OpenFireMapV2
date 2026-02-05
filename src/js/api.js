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
import { renderMarkers } from './map.js';
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
function setStatus(textKey, className) {
  const el = document.getElementById('data-status');
  if (!el) return;
  el.innerText = t(textKey);
  el.className = className;
}

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
async function fetchWithRetry(overpassQueryString, { cacheKey, cacheTtlMs, reqId }) {
  if (!navigator.onLine) throw new Error('err_offline');

  if (cacheKey) {
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

  for (const endpoint of endpoints) {
    const s = epGet(endpoint);
    const now = Date.now();
    if (s.failUntil > now) {
      emit({ phase: 'skip_endpoint', reqId, endpoint, untilMs: s.failUntil - now, lastStatus: s.lastStatus });
      continue;
    }

    try {
      emit({ phase: 'try', reqId, endpoint });

      const t0 = performance.now();
      const body = new URLSearchParams({ data: overpassQueryString }).toString();

      const json = await fetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body,
        timeoutMs: 25000,
        signal: State.controllers.fetch.signal
      });

      if (!json || typeof json !== 'object') throw new Error('err_generic');

      epMarkOk(endpoint, 200);

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
          // längerer Cooldown für diesen Endpoint, plus globaler Backoff
          epMarkFail(endpoint, 429, 90000); // 90s
          bumpGlobalBackoff({ minMs: 8000, maxMs: 30000 });
          emit({ phase: 'ratelimit', reqId, endpoint, backoffMs: GLOBAL_BACKOFF_MS });
          // Bei 429 NICHT direkt den nächsten Endpoint „wegballern“, erst backoffen
          await sleep(300);
          continue;
        }
        if (err.status >= 500) {
          // 504/5xx: Endpoint kurzfristig in Cooldown, dann nächster probieren
          epMarkFail(endpoint, err.status, 30000); // 30s
          // kurzer globaler Backoff, damit wir nicht sofort wieder voll draufgehen
          bumpGlobalBackoff({ minMs: 1200, maxMs: 8000 });
          await sleep(400);
          continue;
        }
      }

      // Netz/sonstige Fehler: kurzer Cooldown
      epMarkFail(endpoint, status, 20000);
      await sleep(300);
      continue;
    }
  }

  throw lastErr || new Error('err_generic');
}

/** ---- Hauptfunktion: Laden + Render, inkl. sauberer Abort-UX -------------- */
export async function fetchOSMData() {
  const reqId = ++REQ_SEQ;
  const zoom = State.map.getZoom();

  // Unter Zoom 12: komplett aus
  if (zoom < 12) {
    setStatus('status_standby', 'text-green-400');
    State.markerLayer.clearLayers();
    State.boundaryLayer.clearLayers();
    State.cachedElements = [];
    emit({ phase: 'skip', reqId, reason: 'zoom<12', zoom });
    return;
  }

  // map.js kann gepaddete/snappted Query-Bounds setzen
  const b = State.queryBounds || State.map.getBounds();
  const bbox = State.queryMeta?.bbox || `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
  const bboxKey = State.queryMeta?.bbox ? State.queryMeta.bbox : makeBBoxKey(b, 3);

  emit({ phase: 'load_start', reqId, zoom, bboxKey });

  // UI: Loading
  setStatus('status_loading', 'text-amber-400 font-bold');

  // Alte Anfrage abbrechen + neuen Controller setzen
  if (State.controllers.fetch) State.controllers.fetch.abort();
  State.controllers.fetch = new AbortController();

  const queryParts = [];

  // Feuerwachen ab 12
  if (zoom >= 12) {
    queryParts.push(`nwr["amenity"="fire_station"];`);
    queryParts.push(`nwr["building"="fire_station"];`);
  }

  // Hydranten/Wasser/Defi ab 15 (du willst "alles", also bleibt das so)
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
    setStatus('status_waiting', 'text-amber-400 font-bold');
    return;
  }

  const queryKind =
    (zoom >= 15 && zoom >= 14) ? 'pois+boundary' :
      (zoom >= 14) ? 'stations+boundary' :
        'stations';

  // Caching:
  // User-Wunsch: "Einmal geladen, länger behalten".
  // Da wir jetzt Persistent Storage (LocalStorage) nutzen, setzen wir die TTL hoch.
  // 24 Stunden (86400000 ms) sollten safe sein.
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const cacheKey = makeOverpassCacheKey({ zoom, bboxKey, queryKind });
  const cacheTtlMs = ONE_DAY_MS;

  const q = `[out:json][timeout:25][bbox:${bbox}];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;

  const tAll0 = performance.now();

  try {
    const data = await fetchWithRetry(q, { cacheKey, cacheTtlMs, reqId });

    const tR0 = performance.now();
    State.cachedElements = data.elements || [];
    renderMarkers(State.cachedElements, zoom);
    const renderMs = Math.round(performance.now() - tR0);

    const totalMs = Math.round(performance.now() - tAll0);
    emit({ phase: 'load_ok', reqId, zoom, totalMs, renderMs, elements: State.cachedElements.length });

    setStatus('status_current', 'text-green-400');

  } catch (err) {
    // Abort ist bei uns normal (User bewegt/zoomt). Status NICHT auf "loading" stehen lassen.
    if (err?.name === 'AbortError') {
      setStatus('status_waiting', 'text-amber-400 font-bold');
      emit({ phase: 'aborted', reqId, zoom });
      return;
    }

    const msgKey = mapErrorKey(err);
    emit({
      phase: 'load_fail',
      reqId,
      zoom,
      code: msgKey,
      status: (err instanceof HttpError) ? err.status : null,
      message: String(err?.message || err)
    });

    setStatus(msgKey, 'text-red-500 font-bold');
    showNotification(t(msgKey), 5000);
  }
}
