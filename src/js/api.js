/**
 * ==========================================================================================
 * DATEI: api.js
 * ZWECK: Kommunikation mit OSM-Services (Overpass + Nominatim) + Overpass Cache (P2b-3)
 * ==========================================================================================
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t } from './i18n.js';
import { renderMarkers } from './map.js';
import { showNotification } from './ui.js';

import { fetchJson, HttpError } from './net.js';
import { getCache, setCache } from './cache.js';

/**
 * Vereinheitlichte Fehlercodes für UI/i18n.
 */
function mapError(err) {
  if (err?.name === 'AbortError') return 'err_timeout';

  // eigene Codes aus geocodeNominatim()
  if (err?.code === 'query_too_short') return 'err_query_too_short';
  if (err?.code === 'no_results') return 'err_no_results';
  if (err?.code === 'bad_response') return 'err_generic';

  // Netzwerk / HTTP
  if (err instanceof HttpError && err.status === 429) return 'err_ratelimit';
  if (err instanceof HttpError && err.status >= 500) return 'err_server';
  if (err?.message === 'err_offline') return 'err_offline';

  return 'err_generic';
}

/**
 * P2b-2: Nominatim Geocoding
 */
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

/**
 * Cache helpers
 * Rounding verhindert, dass Micropans den Cache nutzlos machen.
 */
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

/**
 * Overpass: Fallback über mehrere Endpoints, POST statt URL-Query,
 * Timeout + Abort, JSON-Check + Cache (P2b-3).
 */
async function fetchWithRetry(overpassQueryString, { cacheKey = null, cacheTtlMs = 60000 } = {}) {
  if (!navigator.onLine) throw new Error('err_offline');

  // Cache hit?
  if (cacheKey) {
    const cached = getCache(cacheKey, cacheTtlMs);
    if (cached) return cached;
  }

  const endpoints = Config.overpassEndpoints || [];
  let lastErr = null;

  for (const endpoint of endpoints) {
    try {
      console.log(`Versuche Server: ${endpoint}`);

      const body = new URLSearchParams({ data: overpassQueryString }).toString();

      const json = await fetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body,
        timeoutMs: 25000,
        signal: State.controllers.fetch.signal
      });

      if (!json || typeof json !== 'object') {
        lastErr = new Error('err_generic');
        continue;
      }

      // Cache save nur bei Erfolg
      if (cacheKey) setCache(cacheKey, json);

      return json;

    } catch (err) {
      if (err?.name === 'AbortError') throw err;

      lastErr = err;
      console.warn(`Fehler bei ${endpoint}:`, err);
      continue;
    }
  }

  throw lastErr || new Error('err_generic');
}

/**
 * Hauptfunktion: lädt OSM-Daten passend zum Zoom-Level und BBox.
 * Arbeitet mit AbortController, damit Zoom/Pan alte Requests killt.
 */
export async function fetchOSMData() {
  const zoom = State.map.getZoom();
  const status = document.getElementById('data-status');

  // Wenn Zoom klein: standby + Layers leeren
  if (zoom < 12) {
    if (status) {
      status.innerText = t('status_standby');
      status.className = 'text-green-400';
    }
    State.markerLayer.clearLayers();
    State.boundaryLayer.clearLayers();
    State.cachedElements = [];
    return;
  }

  const b = State.map.getBounds();

  // exakte bbox für Overpass
  const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;

  // gerundete bbox für Cache-Key
  const bboxKey = makeBBoxKey(b, 3);

  if (status) {
    status.innerText = t('status_loading');
    status.className = 'text-amber-400 font-bold';
  }

  // Alte Anfrage abbrechen + neuen Controller setzen (Reihenfolge ist wichtig)
  if (State.controllers.fetch) State.controllers.fetch.abort();
  State.controllers.fetch = new AbortController();

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

  if (queryParts.length === 0 && boundaryQuery === '') return;

  // Query-Typ für Cache-Key (grob, reicht)
  const queryKind =
    zoom >= 15 ? 'pois+boundary' :
    zoom >= 14 ? 'stations+boundary' :
    'stations';

  const cacheKey = makeOverpassCacheKey({ zoom, bboxKey, queryKind });

  // TTL nach Zoom (höherer Zoom = kürzer)
  const cacheTtlMs = zoom >= 15 ? 30000 : 60000;

  const q = `[out:json][timeout:25][bbox:${bbox}];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;

  try {
    const data = await fetchWithRetry(q, { cacheKey, cacheTtlMs });

    State.cachedElements = data.elements || [];
    renderMarkers(State.cachedElements, zoom);

    if (status) {
      status.innerText = t('status_current');
      status.className = 'text-green-400';
    }
  } catch (err) {
    // Abbruch still schlucken (Zoom/Pan)
    if (err?.name === 'AbortError') return;

    const msgKey = mapError(err);
    const txt = t(msgKey);

    if (status) {
      status.innerText = txt;
      status.className = 'text-red-500 font-bold';
    }
    showNotification(txt, 5000);
  }
}
