/**
 * ==========================================================================================
 * DATEI: pipeline.js
 * ZWECK: Adapter für die lokale OpenFireMap DACH Data Pipeline (Proxmox / Docker).
 *        Lädt vorbereitete GeoJSON-Objekte blitzschnell im Heimnetzwerk und wandelt sie
 *        in das Standard-Elementformat von OpenFireMap um.
 * ==========================================================================================
 */

import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { Config } from './config.js';
import { State } from './state.js';
import { isPointInPolygon, isRectInPolygon } from './geometry.js';
import { resolveEuropeSources, loadEuropeData, buildRegionUrl, getEuropeData } from './europe.js';

// Geometrie-Hilfen liegen in geometry.js; hier weiter exportiert, damit Aufrufer und Tests unverändert bleiben
export { isPointInPolygon, isRectInPolygon };

let _pipelineCache = {
  stations: null,
  all: null,
  timestamp: 0
};

/**
 * Fehlerklasse für den Fall, dass der angeforderte Viewport außerhalb der
 * Header-Abdeckung der geladenen PMTiles-Datei liegt (z. B. bei veraltetem Cache).
 */
export class PmtilesCoverageMismatch extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'PmtilesCoverageMismatch';
    this.details = details;
  }
}

let _pmtilesInstance = null;
let _pmtilesUrl = null;
let _pmtilesHeader = null;
let _pipelineVersion = null;
let _pipelineOsmDataUntil = null; // OSM-Datenstand der Pipeline (metadata.json: osm_data_until)
let _lastMetadataFetchTime = 0;
let _pendingMetadataPromise = null;
const METADATA_CACHE_TTL_MS = 10 * 60 * 1000; // 10 Minuten
const METADATA_TIMEOUT_MS = 3000; // 3 Sekunden Timeout

// In-Memory-Cache für dekodierte Vektorkacheln (FIFO/LRU, max. 256 Kacheln)
const _tileCache = new Map();
const MAX_CACHED_TILES = 256;

// In-Flight Tile Promises (verhindert doppelte parallele Downloads derselben Kachel)
const _inFlightTileRequests = new Map();

/**
 * Wärmt die Pipeline-Verbindung frühzeitig auf:
 * Lädt metadata.json und den PMTiles-Header parallel zum Bootstrapping,
 * damit Header und Root-Directory im Speicher und Verbindungscache liegen.
 * Fehler werden ignoriert/geloggt; blockiert niemals.
 */
export async function warmupPipeline() {
  try {
    if (!Config.pipeline?.enabled || !Config.pipeline?.url) return;

    // Europa-Erweiterung: Manifest und Abdeckung schon beim Start laden (auch wenn die Startansicht außerhalb
    // von DACHLiLu liegt). Blockiert nie; ohne Schalter passiert nichts.
    loadEuropeData();

    // Start-Koordinaten ermitteln (Permalink > localStorage > Config)
    let lat = null;
    let lon = null;

    if (typeof window !== 'undefined') {
      const hash = window.location?.hash?.replace(/^#/, '');
      if (hash) {
        const parts = hash.split('/');
        if (parts.length >= 3) {
          const lt = Number(parts[1]);
          const ln = Number(parts[2]);
          if (Number.isFinite(lt) && Number.isFinite(ln)) {
            lat = lt;
            lon = ln;
          }
        }
      }

      if (lat == null) {
        try {
          const saved = localStorage.getItem('ofm_last_view');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed.center) && parsed.center.length === 2) {
              lat = parsed.center[0];
              lon = parsed.center[1];
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (lat == null || lon == null) {
      lat = Config.defaultCenter?.[0] ?? 49.555;
      lon = Config.defaultCenter?.[1] ?? 11.35;
    }

    // Bounding-Box Grobfilter
    const pb = Config.pipeline.bounds;
    if (pb) {
      if (lat < pb.south || lat > pb.north || lon < pb.west || lon > pb.east) {
        return; // Startansicht liegt außerhalb DACHLiLu
      }
    }

    const baseUrl = Config.pipeline.url;
    const pmtilesFile = Config.pipeline.pmtilesFile || 'openfiremap.pmtiles';

    // 1. metadata.json vorab holen (Deduplizierung via _pendingMetadataPromise)
    const url = await getPipelinePmtilesUrl(baseUrl, pmtilesFile);

    // 2. PMTiles-Header vorab laden
    const pmtiles = getPMTilesInstance(url);
    if (!_pmtilesHeader) {
      _pmtilesHeader = await pmtiles.getHeader();
    }
    console.log('[Pipeline] Warmup erfolgreich: Header geladen.');
  } catch (err) {
    console.warn('[Pipeline] Warmup fehlgeschlagen (nicht kritisch):', err?.message || err);
  }
}

/**
 * Leert den internen Kachel-Cache und verwirft laufende Anfragen.
 */
export function clearTileCache() {
  _tileCache.clear();
  _inFlightTileRequests.clear();
}

/**
 * Holt eine VectorTile-Instanz für (z, x, y) via PMTiles getZxy.
 * Parallele Anfragen für dieselbe Kachelkoordinate werden dedupliziert (Promise Sharing).
 * Bereits abgerufene Kacheln werden im Arbeitsspeicher vorgehalten.
 * @param {PMTiles} pmtiles
 * @param {number} z
 * @param {number} x
 * @param {number} y
 * @param {AbortSignal} [signal]
 * @param {string} [scope] Kennung der Quelle (leer = DACHLiLu)
 * @returns {Promise<VectorTile|null>}
 */
export async function getVectorTile(pmtiles, z, x, y, signal, scope = '') {
  // scope trennt die Kacheln mehrerer Quellen (gleiche z/x/y in verschiedenen Dateien). DACHLiLu nutzt
  // weiter den leeren Bereich und die Version aus metadata.json; Länder-Dateien tragen ihre Kennung selbst.
  const versionPrefix = scope ? scope : (_pipelineVersion ? `${_pipelineVersion}|` : '');
  const cacheKey = `${versionPrefix}${z}/${x}/${y}`;

  if (_tileCache.has(cacheKey)) {
    return _tileCache.get(cacheKey);
  }

  if (_inFlightTileRequests.has(cacheKey)) {
    return _inFlightTileRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    if (signal?.aborted) return null;
    const resp = await pmtiles.getZxy(z, x, y, signal);
    if (!resp || !resp.data) return null;

    const pbf = new PbfReader(new Uint8Array(resp.data));
    const vTile = new VectorTile(pbf);

    if (_tileCache.size >= MAX_CACHED_TILES) {
      const oldestKey = _tileCache.keys().next().value;
      _tileCache.delete(oldestKey);
    }
    _tileCache.set(cacheKey, vTile);
    return vTile;
  })().finally(() => {
    _inFlightTileRequests.delete(cacheKey);
  });

  _inFlightTileRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Führt Kachelabrufe über einen Worker-Pool mit begrenzter Parallelität aus.
 * Verhindert Socket-Erschöpfung und HTTP/2-Stream-Staus im Browser.
 * @param {Array<{x: number, y: number}>} tiles
 * @param {Function} workerFn async (x, y) => void
 * @param {number} [concurrency=10]
 * @param {AbortSignal} [signal]
 */
async function processTilesWithPool(tiles, workerFn, concurrency = 10, signal = null) {
  if (!Array.isArray(tiles) || tiles.length === 0) return;
  let idx = 0;
  const numWorkers = Math.min(concurrency, tiles.length);

  const workers = Array.from({ length: numWorkers }, async () => {
    while (idx < tiles.length) {
      if (signal?.aborted) return;
      const tile = tiles[idx++];
      try {
        await workerFn(tile.x, tile.y);
      } catch (err) {
        if (err?.name === 'AbortError' || signal?.aborted) return;
        console.warn(`[Pipeline] Fehler bei Kachel ${tile.x}/${tile.y}:`, err?.message || err);
      }
    }
  });

  await Promise.all(workers);
}

/**
 * Lädt die aktuelle Pipeline-Version (generated_at) aus metadata.json.
 * Wird in der Sitzung höchstens alle 10 Minuten neu angefragt, es sei denn forceRefresh=true ist gesetzt.
 * Ändert sich generated_at, werden die PMTiles-Instanz, der Header und der Kachel-Cache verworfen.
 * Bei Fehler/Timeout wird ohne Versionsparameter fortgefahren (kein Abbruch).
 * @param {string} baseUrl
 * @param {Object} [options]
 * @returns {Promise<string|null>}
 */
const OSM_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/**
 * OSM-Datenstand der zuletzt geladenen metadata.json (z. B. "2026-09-30T20:22:42Z") oder null,
 * wenn der Build ihn nicht kennt (ältere Builds ohne OSM-IDs in den Kacheln).
 * @returns {string|null}
 */
export function getPipelineOsmDataUntil(result = null) {
  // Ein Ergebnis über mehrere Quellen trägt den ältesten Stand aller beteiligten Dateien selbst (je Anfrage,
  // nicht global: eine überholte Anfrage darf den Stand einer neueren nicht überschreiben)
  return result?.pipelineMeta ? result.pipelineMeta.osmDataUntil : _pipelineOsmDataUntil;
}

/**
 * Zeitpunkt der Pipeline-Generierung (generated_at) aus metadata.json oder null.
 * @returns {string|null}
 */
export function getPipelineGeneratedAt(result = null) {
  return result?.pipelineMeta ? result.pipelineMeta.generatedAt : _pipelineVersion;
}

export async function getPipelineVersion(baseUrl, { signal, forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && _lastMetadataFetchTime > 0 && (now - _lastMetadataFetchTime < METADATA_CACHE_TTL_MS)) {
    return _pipelineVersion;
  }

  if (!forceRefresh && _pendingMetadataPromise) {
    return _pendingMetadataPromise;
  }

  const fetchVersion = async () => {
    const metaUrl = `${baseUrl.replace(/\/+$/, '')}/metadata.json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS);

    let abortListener = null;
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeoutId);
        controller.abort();
      } else {
        abortListener = () => controller.abort();
        signal.addEventListener('abort', abortListener, { once: true });
      }
    }

    try {
      const res = await fetch(metaUrl, {
        cache: 'no-cache',
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        const newVersion = data?.generated_at ? String(data.generated_at) : null;
        // Nur ein exakt formatierter Zeitstempel landet später in einer Overpass-Abfrage
        _pipelineOsmDataUntil = OSM_TIMESTAMP_RE.test(String(data?.osm_data_until ?? '')) ? data.osm_data_until : null;
        if (newVersion && _pipelineVersion && newVersion !== _pipelineVersion) {
          console.warn(`[Pipeline] Neue Pipeline-Version erkannt: ${newVersion} (vorher: ${_pipelineVersion}). Verwerfe PMTiles-Instanz und Header.`);
          _pmtilesInstance = null;
          _pmtilesUrl = null;
          _pmtilesHeader = null;
          clearTileCache();
        }
        _pipelineVersion = newVersion;
        _lastMetadataFetchTime = Date.now();
        return _pipelineVersion;
      }
    } catch (err) {
      console.warn('[Pipeline] metadata.json konnte nicht abgerufen werden (fahre ohne Version fort):', err?.message || err);
    } finally {
      clearTimeout(timeoutId);
      if (signal && abortListener) {
        signal.removeEventListener('abort', abortListener);
      }
    }

    _lastMetadataFetchTime = Date.now();
    return _pipelineVersion;
  };

  _pendingMetadataPromise = fetchVersion().finally(() => {
    _pendingMetadataPromise = null;
  });

  return _pendingMetadataPromise;
}

/**
 * Erzeugt die vollständige PMTiles-URL inklusive Cache-Busting-Parameter (?v=<generated_at>).
 * @param {string} baseUrl
 * @param {string} pmtilesFile
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
export async function getPipelinePmtilesUrl(baseUrl, pmtilesFile, { signal, forceRefresh = false } = {}) {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const version = await getPipelineVersion(cleanBase, { signal, forceRefresh });
  if (version) {
    const sep = pmtilesFile.includes('?') ? '&' : '?';
    return `${cleanBase}/${pmtilesFile}${sep}v=${encodeURIComponent(version)}`;
  }
  return `${cleanBase}/${pmtilesFile}`;
}

/**
 * Wandelt Längengrad in Tile-X um.
 */
export function lon2tile(lon, z) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, z));
}

/**
 * Wandelt Breitengrad in Tile-Y um.
 */
export function lat2tile(lat, z) {
  const rad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z));
}

/**
 * Wandelt Tile-X in WGS84 Längengrad um.
 */
export function tile2lon(x, z) {
  return (x / Math.pow(2, z)) * 360 - 180;
}

/**
 * Wandelt Tile-Y in WGS84 Breitengrad um.
 */
export function tile2lat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/**
 * Berechnet die Kachel-Zoomstufe für den aktuellen Kartenzoom basierend auf dem PMTiles-Header.
 * Entkoppelt den Kartenzoom vom Kachel-Detail (z. B. z14 Kacheln für Kartenzoom 16).
 * @param {number} currentZoom Aktueller Kartenzoom
 * @param {Object} [header] PMTiles-Header (optional, nutzt sonst gecachten Header)
 * @returns {number}
 */
export function computeQueryZoom(currentZoom, header = _pmtilesHeader) {
  const minZoom = Number.isFinite(header?.minZoom) ? header.minZoom : 12;
  const maxZoom = Number.isFinite(header?.maxZoom) ? header.maxZoom : 14;
  const z = typeof currentZoom === 'number' ? currentZoom : 14;
  return Math.min(Math.max(z, minZoom), maxZoom);
}

/**
 * Liefert die Singleton-Instanz von PMTiles für eine gegebene URL.
 */
export function getPMTilesInstance(url) {
  if (!_pmtilesInstance || _pmtilesUrl !== url) {
    _pmtilesUrl = url;
    _pmtilesInstance = new PMTiles(url);
    _pmtilesHeader = null;
  }
  return _pmtilesInstance;
}

/**
 * Prüft, ob der aktuelle Kartenausschnitt im Abdeckungsbereich der Pipeline liegt.
 * Nutzt ein zweistufiges Verfahren:
 * 1. Schneller Bounding-Box Grobfilter O(1) mit Config.pipeline.bounds
 * 2. Exakter Rechteck-in-Polygon Check (isRectInPolygon): Alle 4 Ecken müssen
 *    innerhalb des Abdeckungspolygons liegen UND keine Kante darf den Viewport schneiden.
 * Wenn der Viewport die Landesgrenze schneidet (z. B. Ulm/Neu-Ulm) oder außerhalb liegt
 * (z. B. Salzburg/Tirol/Hessen/Braunau), wird false zurückgegeben, damit Overpass lückenlos anspringt.
 * @param {L.LatLngBounds|Object} bounds 
 * @param {number} zoom 
 * @returns {boolean}
 */
export function isPipelineEligible(bounds, zoom) {
  if (isDachliluEligible(bounds, zoom)) return true;
  // Europa-Erweiterung (nur mit Schalter und geladenen Daten, sonst false wie bisher)
  if (!Config.pipeline?.enabled || !Config.pipeline?.url) return false;
  // Länder-Dateien gibt es nur als PMTiles; der GeoJSON-Rückfall kennt nur DACHLiLu
  if (!Config.pipeline?.usePmtiles) return false;
  return resolveEuropeSources(bounds, zoom, getEuropeData()).eligible;
}

/**
 * Liegt der Ausschnitt nur dank der Europa-Erweiterung in der Pipeline (Schalter an, nicht in DACHLiLu)? Dann darf
 * kein GeoJSON-Rückfall greifen: Die GeoJSON-Dateien enthalten nur DACHLiLu und lieferten für ein anderes Land
 * eine leere Liste als "Erfolg", statt dass api.js auf Overpass zurückfällt.
 */
function isEuropeOnlyViewport(bounds, zoom) {
  return Boolean(Config.pipeline?.europe?.enabled) && !isDachliluEligible(bounds, typeof zoom === 'number' ? zoom : 14);
}

/**
 * Eignung allein für DACHLiLu (bisherige Prüfung, unverändert): Bounding-Box plus exakter
 * Rechteck-in-Polygon-Test gegen das Abdeckungspolygon.
 */
function isDachliluEligible(bounds, zoom) {
  if (!Config.pipeline?.enabled || !Config.pipeline?.url) return false;
  if (!bounds || zoom < 12) return false;

  const pb = Config.pipeline.bounds;
  if (!pb) return false;

  // Koordinaten aus Leaflet-Bounds oder Plain-Object extrahieren
  const south = typeof bounds.getSouth === 'function' ? bounds.getSouth() : (bounds.south ?? bounds._southWest?.lat);
  const north = typeof bounds.getNorth === 'function' ? bounds.getNorth() : (bounds.north ?? bounds._northEast?.lat);
  const west = typeof bounds.getWest === 'function' ? bounds.getWest() : (bounds.west ?? bounds._southWest?.lng);
  const east = typeof bounds.getEast === 'function' ? bounds.getEast() : (bounds.east ?? bounds._northEast?.lng);

  if (south == null || north == null || west == null || east == null) {
    return false;
  }

  // Stufe 1: Schneller Bounding-Box Grobfilter O(1)
  if (south < pb.south || north > pb.north || west < pb.west || east > pb.east) {
    return false;
  }

  // Stufe 2: Exakter Rechteck-in-Polygon Feinfilter
  const polygon = Config.pipeline.coveragePolygon;
  if (!polygon || !Array.isArray(polygon) || polygon.length === 0) return false;

  // Unterstützt sowohl Einzelpolygone ([ [lat, lon], ... ])
  // als auch Multi-Polygone bzw. Regionenlisten ([ [ [lat, lon], ... ], ... ])
  if (Array.isArray(polygon[0]) && Array.isArray(polygon[0][0])) {
    return polygon.some(subPoly => isRectInPolygon(south, west, north, east, subPoly));
  }

  return isRectInPolygon(south, west, north, east, polygon);
}

/**
 * Extrahiert den Mittelpunkt (Centroid) beliebiger GeoJSON-Geometrien.
 * Unterstützt Point, Polygon, MultiPolygon, LineString und MultiLineString.
 * @param {Object} geom 
 * @returns {{lat: number, lon: number}|null}
 */
export function extractCoordinates(geom) {
  if (!geom || !geom.type) return null;

  if (geom.type === 'Point' && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
    return { lon: geom.coordinates[0], lat: geom.coordinates[1] };
  }

  let ring = null;
  if (geom.type === 'Polygon' && Array.isArray(geom.coordinates?.[0])) {
    ring = geom.coordinates[0];
  } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates?.[0]?.[0])) {
    ring = geom.coordinates[0][0];
  } else if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
    ring = geom.coordinates;
  } else if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates?.[0])) {
    ring = geom.coordinates[0];
  }

  if (!Array.isArray(ring) || ring.length === 0) return null;

  let sumLon = 0;
  let sumLat = 0;
  let count = 0;

  for (const pt of ring) {
    if (Array.isArray(pt) && pt.length >= 2) {
      const lon = pt[0];
      const lat = pt[1];
      if (typeof lon === 'number' && typeof lat === 'number' && !Number.isNaN(lon) && !Number.isNaN(lat)) {
        sumLon += lon;
        sumLat += lat;
        count++;
      }
    }
  }

  if (count === 0) return null;
  return { lon: sumLon / count, lat: sumLat / count };
}

/**
 * Erkennt Grenz-Elemente (Gemeindegrenzen) unabhängig von ihren Tags: Nur Grenzen tragen eine
 * Linien-Geometrie (Overpass `out geom` bzw. Pipeline-Linien), POIs kommen mit `out center`
 * bzw. als Punkt (lat/lon). Mitglieds-Wege der Gemeinde-Relationen haben oft keine eigenen Tags.
 * @param {Object} el
 * @returns {boolean}
 */
export function isBoundaryElement(el) {
  return el?.type === 'way' && Array.isArray(el.geometry) && el.geometry.length >= 2;
}

/**
 * Wandelt die Geometrie eines Grenz-Features in Grenz-Elemente um, ein Element je Linienteil.
 * Der Kachel-Zuschnitt macht aus einem Weg, der eine Kachel verlässt und wieder betritt,
 * einen MultiLineString. Die IDs leiten sich von keyPrefix ab; dieser muss je Kachel eindeutig
 * sein, damit die zugeschnittenen Teile eines Wegs aus verschiedenen Kacheln erhalten bleiben.
 * @param {Object} geometry GeoJSON LineString oder MultiLineString
 * @param {Object} properties
 * @param {string|number} keyPrefix
 * @returns {Array<Object>}
 */
export function boundaryGeometryToElements(geometry, properties, keyPrefix) {
  let lines;
  if (geometry?.type === 'LineString') lines = [geometry.coordinates];
  else if (geometry?.type === 'MultiLineString') lines = geometry.coordinates;
  else return [];

  const elements = [];
  (lines || []).forEach((line, part) => {
    if (!Array.isArray(line) || line.length < 2) return;
    elements.push({
      id: lines.length > 1 ? `${keyPrefix}#${part}` : keyPrefix,
      type: 'way',
      tags: { boundary: 'administrative', ...(properties || {}) },
      geometry: line.map((pt) => ({ lat: pt[1], lon: pt[0] }))
    });
  });
  return elements;
}

/**
 * Schutzfilter je Pipeline-Ebene: Welche Tags ein Objekt tragen muss, um in dieser Ebene zu gelten.
 *
 * Hintergrund: Pipeline-Builds bis zum 04.10.2026 enthielten in fire_stations.geojson/PMTiles neben den
 * Wachen auch Referenzobjekte (Tore, Eingänge, Türen, Laternen, Gebäudeteile), die osmium nur wegen der
 * Geometrie mitgeführt hat: 11 % der Einträge. Die Karte hätte jedes davon ab Zoom 15 als Hydranten-Punkt
 * gezeichnet. Der Builder entfernt sie inzwischen selbst (tags-filter --remove-tags); dieser Filter
 * schützt in der Übergangszeit mit älteren Kacheln und gegen künftige Regressionen. Entspricht dem
 * Filter der Ebene im Builder (nwr/amenity=fire_station, nwr/building=fire_station).
 */
const LAYER_TAG_GUARDS = {
  fire_stations: (tags) => tags.amenity === 'fire_station' || tags.building === 'fire_station'
};

/**
 * Konvertiert ein GeoJSON Feature in das OpenFireMap-Elementformat.
 * @param {Object} feature 
 * @param {string} layerName 
 * @param {number} index 
 * @returns {Object|null}
 */
export function geoJsonFeatureToElement(feature, layerName) {
  if (!feature || !feature.geometry) return null;
  const coords = extractCoordinates(feature.geometry);
  if (!coords) return null;

  const { lat, lon } = coords;
  // @type/@id (osmium export -a type,id) sind OSM-Typ und -ID, keine Tags: herausnehmen, damit
  // Tooltip und GPX-Export sie nicht als Tags anzeigen.
  const { '@type': osmType, '@id': osmId, ...tags } = feature.properties || {};

  // Schutzfilter: Nur Objekte übernehmen, die zur Ebene gehören (siehe LAYER_TAG_GUARDS).
  const guard = LAYER_TAG_GUARDS[layerName];
  if (guard && !guard(tags)) return null;

  // Stabiler, eindeutiger Identifikator:
  // 1. OSM-Typ und -ID aus der Pipeline – gleiche Form wie Overpass-Elemente ({ type, id })
  // 2. Kachel-ID (tippecanoe --generate-ids) bzw. id-Eigenschaft für ältere Builds
  // 3. Fallback: Räumliche Koordinate mit 6 Nachkommastellen (~10 cm Genauigkeit)
  const coordKey = `${Math.round(lat * 1e6)}_${Math.round(lon * 1e6)}`;
  const id = osmId ?? feature.id ?? tags.id ?? `${layerName}_${coordKey}`;
  const type = osmType || (feature.geometry.type === 'Point' ? 'node' : 'way');

  return {
    id,
    type,
    lat,
    lon,
    tags
  };
}

/**
 * Extrahiert Koordinaten (south, north, west, east) aus Leaflet-Bounds oder Plain-Objects.
 * @param {L.LatLngBounds|Object} bounds
 * @returns {{south: number, north: number, west: number, east: number}}
 */
function extractBoundsCoords(bounds) {
  const south = typeof bounds.getSouth === 'function' ? bounds.getSouth() : (bounds.south ?? bounds._southWest?.lat);
  const north = typeof bounds.getNorth === 'function' ? bounds.getNorth() : (bounds.north ?? bounds._northEast?.lat);
  const west = typeof bounds.getWest === 'function' ? bounds.getWest() : (bounds.west ?? bounds._southWest?.lng);
  const east = typeof bounds.getEast === 'function' ? bounds.getEast() : (bounds.east ?? bounds._northEast?.lng);
  return { south, north, west, east };
}

/**
 * Prüft, ob ein gegebenes Rechteck (bounds) vollständig innerhalb der
 * minLat/minLon/maxLat/maxLon-Grenzen eines PMTiles-Headers liegt.
 * @param {L.LatLngBounds|Object} bounds
 * @param {Object} header
 * @returns {boolean}
 */
export function isViewportInHeader(bounds, header) {
  if (!header || !bounds) return false;
  const { south, north, west, east } = extractBoundsCoords(bounds);
  if (south == null || north == null || west == null || east == null) return false;

  const minLat = header.minLat ?? -90;
  const maxLat = header.maxLat ?? 90;
  const minLon = header.minLon ?? -180;
  const maxLon = header.maxLon ?? 180;

  const EPS = 1e-5; // ca. 1 Meter Toleranz für Rundungsungenauigkeiten
  return (
    south >= minLat - EPS &&
    north <= maxLat + EPS &&
    west >= minLon - EPS &&
    east <= maxLon + EPS
  );
}

/**
 * Stellt sicher, dass ein gültiger PMTiles-Header vorhanden ist und der angefragte
 * Viewport vollständig in den Header-Grenzen liegt.
 * Weicht der Viewport ab, wird einmalig die Instanz verworfen, metadata.json mit
 * forceRefresh neu geladen und ein zweiter Versuch unternommen.
 * Bleibt der Viewport außerhalb, wird PmtilesCoverageMismatch geworfen.
 * @param {PMTiles} pmtiles
 * @param {string} baseUrl
 * @param {string} pmtilesFile
 * @param {L.LatLngBounds|Object} bounds
 * @param {Object} [options]
 * @returns {Promise<{ pmtiles: PMTiles, header: Object }>}
 */
export async function ensurePmtilesHeaderCoverage(pmtiles, baseUrl, pmtilesFile, bounds, { signal } = {}) {
  let header = _pmtilesHeader;
  if (!header) {
    header = await pmtiles.getHeader();
    _pmtilesHeader = header;
  }

  if (isViewportInHeader(bounds, header)) {
    return { pmtiles, header };
  }

  // Viewport liegt außerhalb der aktuellen Header-Grenzen -> Einmaliger Reload-Versuch
  const oldBoundsStr = `[minLat=${header?.minLat}, minLon=${header?.minLon}, maxLat=${header?.maxLat}, maxLon=${header?.maxLon}]`;

  // Instanz, Header und Versions-Cache verwerfen
  _pmtilesHeader = null;
  _pmtilesInstance = null;
  _pipelineVersion = null;
  _pipelineOsmDataUntil = null;
  _lastMetadataFetchTime = 0;
  clearTileCache();

  // Frische URL mit forceRefresh erzwingen
  const freshUrl = await getPipelinePmtilesUrl(baseUrl, pmtilesFile, { signal, forceRefresh: true });
  const freshPmtiles = getPMTilesInstance(freshUrl);
  const freshHeader = await freshPmtiles.getHeader();
  _pmtilesHeader = freshHeader;

  const newBoundsStr = `[minLat=${freshHeader?.minLat}, minLon=${freshHeader?.minLon}, maxLat=${freshHeader?.maxLat}, maxLon=${freshHeader?.maxLon}]`;
  console.warn(`[Pipeline] Viewport liegt außerhalb der PMTiles-Header-Grenzen. Header neu geladen: alt=${oldBoundsStr}, neu=${newBoundsStr}`);

  if (!isViewportInHeader(bounds, freshHeader)) {
    const { south, north, west, east } = extractBoundsCoords(bounds);
    throw new PmtilesCoverageMismatch(
      `Viewport [s=${south}, w=${west}, n=${north}, e=${east}] liegt außerhalb der PMTiles-Header-Abdeckung ${newBoundsStr}`,
      { viewport: { south, west, north, east }, header: freshHeader }
    );
  }

  return { pmtiles: freshPmtiles, header: freshHeader };
}

// ------------------------------------------------------------------------------------------
// Mehrere Quellen (Europa-Erweiterung): DACHLiLu plus Länder-Dateien
// ------------------------------------------------------------------------------------------

const MAX_EUROPE_HANDLES = 64;
const _europeHandles = new Map(); // URL -> { pmtiles, header }; Länder-Dateien sind versioniert, die URL ändert sich mit jedem Stand

function getEuropeHandle(url) {
  let handle = _europeHandles.get(url);
  if (!handle) {
    if (_europeHandles.size >= MAX_EUROPE_HANDLES) {
      _europeHandles.delete(_europeHandles.keys().next().value); // älteste (veraltete) Version zuerst
    }
    handle = { pmtiles: new PMTiles(url), header: null };
    _europeHandles.set(url, handle);
  }
  return handle;
}

/** Überschneidet das Rechteck des PMTiles-Headers den Ausschnitt? (anders als isViewportInHeader: Schnitt statt Enthaltensein) */
function headerIntersectsViewport(header, rect) {
  if (!header) return false;
  const minLat = header.minLat ?? -90;
  const maxLat = header.maxLat ?? 90;
  const minLon = header.minLon ?? -180;
  const maxLon = header.maxLon ?? 180;
  return rect.west <= maxLon && rect.east >= minLon && rect.south <= maxLat && rect.north >= minLat;
}

/** Ältester Zeitstempel einer Liste (null, sobald einer fehlt oder ungültig ist: ein unbekannter Stand macht alles unbekannt). */
function oldestTimestamp(values) {
  const times = values.map((v) => (typeof v === 'string' ? Date.parse(v) : NaN));
  if (times.length === 0 || times.some((t) => !Number.isFinite(t))) return null;
  return values[times.indexOf(Math.min(...times))];
}

/**
 * Lädt dieselbe Kachel aus allen Quellen. Ein Fehler in einer Quelle verwirft nur deren Kachel (Warnung, wie
 * bisher bei einer einzelnen Quelle), nicht die der anderen. Ergebnis: eine Liste, Reihenfolge wie `sources`.
 */
async function getTilesFromSources(sources, z, x, y, signal) {
  const results = await Promise.allSettled(sources.map((src) => getVectorTile(src.pmtiles, z, x, y, signal, src.scope)));
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    if (r.reason?.name !== 'AbortError' && !signal?.aborted) {
      console.warn(`[Pipeline] Fehler bei Kachel ${x}/${y} (${sources[i].id}):`, r.reason?.message || r.reason);
    }
    return null;
  });
}

/**
 * Bestimmt die Quellen für einen Ausschnitt. Liegt er (nach der bisherigen Prüfung) in DACHLiLu, oder ist
 * Europa aus bzw. nicht geeignet, bleibt es beim bisherigen Weg: genau eine Datei, Abdeckung gegen den Header
 * geprüft, keine Änderung gegenüber früher. Nur wenn DACHLiLu allein nicht reicht UND Europa den Ausschnitt
 * bedienen kann, werden mehrere Dateien geöffnet (DACHLiLu plus Länder aus dem Manifest). Jede Quelle, deren
 * Header den Ausschnitt gar nicht berührt, entfällt. Schlägt das Öffnen einer Quelle fehl, wirft die Funktion:
 * lieber Overpass als ein lückenhaftes Ergebnis.
 * @returns {Promise<Array<{id:string, kind:string, pmtiles:PMTiles, header:Object, scope:string}>>}
 */
async function planPipelineSources(bounds, zoom, signal) {
  const baseUrl = Config.pipeline?.url;
  const pmtilesFile = Config.pipeline?.pmtilesFile || 'openfiremap.pmtiles';
  const effectiveZoom = typeof zoom === 'number' ? zoom : 14;
  // Ein Stand von Manifest und Abdeckung für die ganze Anfrage (Ausschnitt UND Ring): eine Auffrischung des Manifests
  // mitten in der Abfrage darf den Ring nicht aus anderen Dateien/Ständen bestimmen als den Ausschnitt
  const europeData = getEuropeData();
  const eu = Config.pipeline?.europe?.enabled && !isDachliluEligible(bounds, effectiveZoom)
    ? resolveEuropeSources(bounds, effectiveZoom, europeData)
    : null;

  if (!eu?.eligible) {
    const url = await getPipelinePmtilesUrl(baseUrl, pmtilesFile, { signal });
    const pmtiles = getPMTilesInstance(url);
    const coverage = await ensurePmtilesHeaderCoverage(pmtiles, baseUrl, pmtilesFile, bounds, { signal });
    return [{ id: 'dachlilu', kind: 'dachlilu', pmtiles: coverage.pmtiles, header: coverage.header, scope: '' }];
  }

  const { active, meta } = await openEuropeSources(eu, extractBoundsCoords(bounds), baseUrl, signal, europeData.manifest);
  active.multi = true;
  active.meta = meta;
  active.europeData = europeData;
  return active;
}

/**
 * Öffnet die Quellen einer Europa-Auflösung und behält die, deren Header das Rechteck berührt. Liefert auch den
 * Datenstand dieser Abfrage (ältester aller beteiligten Dateien) als Wert statt als globalen Zustand.
 */
async function openEuropeSources(eu, rect, baseUrl, signal, manifest) {
  const opened = await Promise.all(eu.sources.map(async (src) => {
    if (src.kind === 'dachlilu') {
      const url = await getPipelinePmtilesUrl(baseUrl, src.file, { signal });
      const pmtiles = getPMTilesInstance(url);
      if (!_pmtilesHeader) _pmtilesHeader = await pmtiles.getHeader();
      return { id: src.id, kind: 'dachlilu', pmtiles, header: _pmtilesHeader, scope: '',
        generatedAt: _pipelineVersion, osmDataUntil: _pipelineOsmDataUntil };
    }
    const entry = manifest.regions[src.id];
    const handle = getEuropeHandle(buildRegionUrl(baseUrl, entry.file, src.id));
    if (!handle.header) handle.header = await handle.pmtiles.getHeader();
    return { id: src.id, kind: 'europe', pmtiles: handle.pmtiles, header: handle.header,
      scope: `eu:${src.id}:${entry.generatedAt}|`, generatedAt: entry.generatedAt, osmDataUntil: entry.osmDataUntil };
  }));
  // getHeader() kennt kein Signal: eine inzwischen überholte Anfrage bricht hier ab, statt weiterzumachen
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const { south, north, west, east } = rect;
  const active = opened.filter((src) => headerIntersectsViewport(src.header, rect));
  if (active.length === 0) {
    throw new PmtilesCoverageMismatch(
      `Keine der Quellen (${eu.sources.map((s) => s.id).join(', ')}) enthält den Ausschnitt [s=${south}, w=${west}, n=${north}, e=${east}]`,
      { viewport: rect, sources: eu.sources.map((s) => s.id) }
    );
  }

  // Datenstand der Abfrage: der älteste aller beteiligten Dateien. Ist er älter als die Obergrenze, wird kein
  // Overpass-Delta versucht (null), sonst würden die Änderungs-Abfragen für alte Länderstände sehr groß.
  let osmDataUntil = oldestTimestamp(active.map((s) => s.osmDataUntil));
  const maxAgeDays = Config.pipeline?.europe?.liveDeltaMaxAgeDays ?? 10;
  if (osmDataUntil && Date.now() - Date.parse(osmDataUntil) > maxAgeDays * 86400000) osmDataUntil = null;
  return { active, meta: { osmDataUntil, generatedAt: oldestTimestamp(active.map((s) => s.generatedAt)) } };
}

/**
 * Quellen für den Pufferring. Der Ring gilt nach dem Laden als abgedeckt (loadedBounds), also müssen alle Dateien
 * dafür da sein: Ist der Ring nicht vollständig von veröffentlichten Ländern bedient (oder lässt sich eine Quelle
 * nicht öffnen), gibt es keinen Ring (null) und die Abdeckung bleibt beim sichtbaren Ausschnitt.
 * Der bisherige Einzelquellen-Weg bleibt unverändert (dieselben Quellen).
 */
async function planRingSources(sources, ringRect, zoom, signal) {
  if (!sources.multi) return sources;
  const eu = resolveEuropeSources(ringRect, typeof zoom === 'number' ? zoom : 14, sources.europeData);
  if (!eu.eligible) return null;
  try {
    const { active, meta } = await openEuropeSources(eu, ringRect, Config.pipeline?.url, signal, sources.europeData.manifest);
    active.multi = true;
    active.meta = meta;
    active.europeData = sources.europeData;
    return active;
  } catch (err) {
    if (err?.name === 'AbortError' || signal?.aborted) throw err;
    console.warn('[Pipeline] Pufferring nicht über alle Quellen ladbar, bleibe beim sichtbaren Ausschnitt:', err?.message || err);
    return null;
  }
}

/**
 * Startet die Planung der Ring-Quellen parallel zum Laden der sichtbaren Kacheln (ohne darauf zu warten: der
 * Erst-Render soll nicht an einem langsamen Länder-Header hängen). Nur im Mehrquellen-Weg, sonst null.
 */
function startRingPlan(sources, vis, queryZoom, zoom, signal) {
  if (!sources.multi) return null;
  const ringRect = {
    south: tile2lat(vis.maxY + 2, queryZoom), north: tile2lat(vis.minY - 1, queryZoom),
    west: tile2lon(vis.minX - 1, queryZoom), east: tile2lon(vis.maxX + 2, queryZoom)
  };
  return planRingSources(sources, ringRect, zoom, signal).catch(() => null);   // Abbruch/Fehler: kein Ring
}

/**
 * Wartet NACH dem Rendern der sichtbaren Kacheln auf die Ring-Planung, höchstens `ringPlanTimeoutMs`. Ergebnis:
 * die Quellen für den Ring, oder null (kein Ring: Planung gescheitert, zu langsam oder Ring nicht bedient).
 * Ohne Plan (bisheriger Einzelquellen-Weg) bleiben es die Quellen des Ausschnitts.
 */
async function resolveRingSources(sources, plan) {
  if (!plan) return sources;
  const ms = Config.pipeline?.europe?.ringPlanTimeoutMs ?? 1500;
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), ms); });
  try {
    return await Promise.race([plan, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lädt Kacheln via PMTiles Range-Requests für den aktuellen Sichtbereich.
 * @param {L.LatLngBounds} bounds 
 * @param {string} mode 'stations' | 'all'
 * @param {Object} options 
 * @returns {Promise<Array<Object>>}
 */
export async function fetchPipelinePmtiles(bounds, mode, { signal, zoom, onProgressData, onBufferComplete } = {}) {
  const baseUrl = Config.pipeline?.url;
  if (!baseUrl) throw new Error('Pipeline-URL ist nicht konfiguriert.');

  loadEuropeData(); // Manifest bei Bedarf auffrischen (blockiert und wirft nie; ohne Schalter sofort fertig)
  const sources = await planPipelineSources(bounds, zoom, signal);

  const currentZoom = typeof zoom === 'number' ? zoom : 14;
  const queryZoom = computeQueryZoom(currentZoom, sources[0].header);

  const south = typeof bounds.getSouth === 'function' ? bounds.getSouth() : bounds.south;
  const north = typeof bounds.getNorth === 'function' ? bounds.getNorth() : bounds.north;
  const west = typeof bounds.getWest === 'function' ? bounds.getWest() : bounds.west;
  const east = typeof bounds.getEast === 'function' ? bounds.getEast() : bounds.east;

  const visMinX = lon2tile(west, queryZoom);
  const visMaxX = lon2tile(east, queryZoom);
  const visMinY = lat2tile(north, queryZoom);
  const visMaxY = lat2tile(south, queryZoom);

  const rawTileCount = (visMaxX - visMinX + 1) * (visMaxY - visMinY + 1);
  if (rawTileCount > 300) {
    throw new Error(`Tile-Ausschnitt zu groß (${rawTileCount} Kacheln), wechsle auf Fallback.`);
  }

  const targetLayers = mode === 'stations'
    ? ['fire_stations']
    : ['fire_stations', 'hydrants', 'water_points', 'defibrillators'];

  const elementsMap = new Map();

  // 1. Unmittelbar sichtbare Kacheln
  const visibleTiles = [];
  for (let x = visMinX; x <= visMaxX; x++) {
    for (let y = visMinY; y <= visMaxY; y++) {
      visibleTiles.push({ x, y });
    }
  }

  // 2. Pufferring (nur wenn Kachelausschnitt <= 20): die Quellen dafür werden schon jetzt parallel geplant
  const ringPlan = rawTileCount <= 20
    ? startRingPlan(sources, { minX: visMinX, maxX: visMaxX, minY: visMinY, maxY: visMaxY }, queryZoom, zoom, signal)
    : null;

  // Kachelverarbeitung mit progressivem Rendern (Streaming)
  const processTile = async (x, y, phase = 'visible') => {
    if (signal?.aborted) return 0;
    const vTiles = await getTilesFromSources(phase === 'buffer' ? ringSources : sources, queryZoom, x, y, signal);
    if (signal?.aborted) return 0;

    let newCount = 0;
    for (const vTile of vTiles) {
      if (!vTile || !vTile.layers) continue;
      for (const layerName of targetLayers) {
        const layer = vTile.layers[layerName];
        if (!layer) continue;
        for (let i = 0; i < layer.length; i++) {
          const feat = layer.feature(i);
          const gj = feat.toGeoJSON(x, y, queryZoom);
          const el = geoJsonFeatureToElement(gj, layerName);
          if (!el) continue;

          // OSM-Typ und -ID gemeinsam: ein Knoten und ein Weg können dieselbe ID haben
          const idKey = `${el.type}:${el.id}`;
          if (!elementsMap.has(idKey)) {
            elementsMap.set(idKey, el);
            newCount++;
          }
        }
      }

    }

    if (newCount > 0 && typeof onProgressData === 'function' && !signal?.aborted) {
      try {
        onProgressData(Array.from(elementsMap.values()), true, { phase });
      } catch (renderErr) {
        console.warn('[Pipeline] Fehler bei progressiver POI-Meldung:', renderErr);
      }
    }

    return newCount;
  };

  // Phase 1: Sichtbare Kacheln zuerst laden und sofort rendern
  await processTilesWithPool(visibleTiles, (x, y) => processTile(x, y, 'visible'), 10, signal);

  // Pufferring festlegen: im Mehrquellen-Weg nur, wenn alle seine Quellen da sind (sonst bliebe ein Teil des Rings
  // fälschlich als abgedeckt gemeldet); die Planung lief parallel zu den sichtbaren Kacheln
  const bufferTiles = [];
  let bufMinX = visMinX;
  let bufMaxX = visMaxX;
  let bufMinY = visMinY;
  let bufMaxY = visMaxY;
  let useBuffer = rawTileCount <= 20;
  let ringSources = sources;
  if (useBuffer && ringPlan) {
    ringSources = await resolveRingSources(sources, ringPlan);
    if (!ringSources) { useBuffer = false; ringSources = sources; }
  }
  if (useBuffer) {
    bufMinX = visMinX - 1;
    bufMaxX = visMaxX + 1;
    bufMinY = visMinY - 1;
    bufMaxY = visMaxY + 1;
    for (let x = bufMinX; x <= bufMaxX; x++) {
      for (let y = bufMinY; y <= bufMaxY; y++) {
        if (x < visMinX || x > visMaxX || y < visMinY || y > visMaxY) {
          bufferTiles.push({ x, y });
        }
      }
    }
  }

  // Grenzen der sichtbaren Kacheln
  const visSouth = tile2lat(visMaxY + 1, queryZoom);
  const visNorth = tile2lat(visMinY, queryZoom);
  const visWest = tile2lon(visMinX, queryZoom);
  const visEast = tile2lon(visMaxX + 1, queryZoom);

  const elements = Array.from(elementsMap.values());
  // Datenstand dieser Abfrage (nur Mehrquellen-Weg), am Ergebnis statt global
  if (sources.multi) elements.pipelineMeta = (useBuffer ? ringSources : sources).meta;
  elements.loadedBounds = (typeof L !== 'undefined' && L.latLngBounds)
    ? L.latLngBounds([visSouth, visWest], [visNorth, visEast])
    : { south: visSouth, north: visNorth, west: visWest, east: visEast };

  // Grenzen der aktiven Anfrage inklusive Pufferring merken (verhindert vorzeitigen Abbruch bei kleinen Bewegungen)
  const activeSouth = tile2lat(bufMaxY + 1, queryZoom);
  const activeNorth = tile2lat(bufMinY, queryZoom);
  const activeWest = tile2lon(bufMinX, queryZoom);
  const activeEast = tile2lon(bufMaxX + 1, queryZoom);
  // Bereich inklusive Pufferring: so groß wird loadedPoiBounds nach dem Nachladen (z. B. für das Overpass-Delta)
  elements.bufferBounds = { south: activeSouth, west: activeWest, north: activeNorth, east: activeEast };
  State.activeFetchBounds = (typeof L !== 'undefined' && L.latLngBounds)
    ? L.latLngBounds([activeSouth, activeWest], [activeNorth, activeEast])
    : {
        getSouth: () => activeSouth,
        getNorth: () => activeNorth,
        getWest: () => activeWest,
        getEast: () => activeEast,
        getSouthWest: () => ({ lat: activeSouth, lng: activeWest }),
        getNorthEast: () => ({ lat: activeNorth, lng: activeEast }),
        contains: (b) => {
          const s = b?.getSouth?.() ?? b?.south;
          const n = b?.getNorth?.() ?? b?.north;
          const w = b?.getWest?.() ?? b?.west;
          const e = b?.getEast?.() ?? b?.east;
          return s >= activeSouth && n <= activeNorth && w >= activeWest && e <= activeEast;
        }
      };

  // Phase 2: Pufferring im Hintergrund nachladen (verzögert Erst-Render nicht)
  if (bufferTiles.length > 0 && !signal?.aborted) {
    const bufferPromise = (async () => {
      try {
        await processTilesWithPool(bufferTiles, (x, y) => processTile(x, y, 'buffer'), 10, signal);
        if (signal?.aborted) return;

        const bufSouth = tile2lat(bufMaxY + 1, queryZoom);
        const bufNorth = tile2lat(bufMinY, queryZoom);
        const bufWest = tile2lon(bufMinX, queryZoom);
        const bufEast = tile2lon(bufMaxX + 1, queryZoom);

        const fullBounds = (typeof L !== 'undefined' && L.latLngBounds)
          ? L.latLngBounds([bufSouth, bufWest], [bufNorth, bufEast])
          : { south: bufSouth, north: bufNorth, west: bufWest, east: bufEast };

        elements.loadedBounds = fullBounds;

        if (typeof onBufferComplete === 'function' && !signal?.aborted) {
          onBufferComplete(Array.from(elementsMap.values()), fullBounds);
        }
      } catch (bufErr) {
        if (bufErr?.name !== 'AbortError' && !signal?.aborted) {
          console.warn('[Pipeline] Fehler beim Laden des Pufferrings:', bufErr);
        }
      }
    })();

    State.pendingBufferFetches.add(bufferPromise);
    bufferPromise.finally(() => {
      State.pendingBufferFetches.delete(bufferPromise);
      const hasBuffers = State.pendingBufferFetches.size > 0;
      if (!hasBuffers && !State.isFetchingData) {
        if (State.controllers.fetch?.signal === signal) {
          State.controllers.fetch = null;
        }
      }
      if (!hasBuffers && !State.isFetchingData && !State.isFetchingBoundaries) {
        State.activeFetchBounds = null;
      }
    });
  }

  return elements;
}

/**
 * Lädt GeoJSON-Dateien von der lokalen Pipeline und konvertiert sie.
 * @param {string} baseUrl 
 * @param {string} mode 'stations' | 'all'
 * @param {Object} options 
 * @returns {Promise<Array<Object>>}
 */
async function loadPipelineDataset(baseUrl, mode, { signal } = {}) {
  const endpoints = [];
  if (mode === 'stations') {
    endpoints.push({ name: 'fire_stations', file: 'fire_stations.geojson' });
  } else {
    endpoints.push(
      { name: 'fire_stations', file: 'fire_stations.geojson' },
      { name: 'hydrants', file: 'hydrants.geojson' },
      { name: 'water_points', file: 'water_points.geojson' },
      { name: 'defibrillators', file: 'defibrillators.geojson' }
    );
  }

  const requests = endpoints.map(async (ep) => {
    const url = `${baseUrl.replace(/\/+$/, '')}/${ep.file}`;
    const res = await fetch(url, { signal, cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`Pipeline-Abruf fehlgeschlagen: ${ep.file} (HTTP ${res.status})`);
    }
    const data = await res.json();
    const features = Array.isArray(data?.features) ? data.features : [];
    const elements = [];
    for (let i = 0; i < features.length; i++) {
      const el = geoJsonFeatureToElement(features[i], ep.name);
      if (el) elements.push(el);
    }
    return elements;
  });

  const results = await Promise.all(requests);
  return results.flat();
}

/**
 * Hauptabruf-Funktion für Pipeline-Daten.
 * Nutzt primär PMTiles Vektorkacheln und fällt bei Bedarf transparent auf GeoJSON zurück.
 * @param {L.LatLngBounds} bounds 
 * @param {string} mode 'stations' | 'all'
 * @param {Object} options 
 * @returns {Promise<Array<Object>>}
 */
export async function fetchPipelineData(bounds, mode, { signal, zoom, onProgressData, onBufferComplete } = {}) {
  const baseUrl = Config.pipeline?.url;
  if (!baseUrl) throw new Error('Pipeline-URL ist nicht konfiguriert.');

  // 1. Bevorzugt: PMTiles Vektorkacheln per Range-Request
  if (Config.pipeline?.usePmtiles) {
    try {
      const pmtilesElements = await fetchPipelinePmtiles(bounds, mode, { signal, zoom, onProgressData, onBufferComplete });
      if (Array.isArray(pmtilesElements)) {
        return pmtilesElements;
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      if (!Config.pipeline?.geojsonFallback || isEuropeOnlyViewport(bounds, zoom)) {
        throw new Error(`PMTiles-Abruf fehlgeschlagen (${err.message}). GeoJSON-Fallback ist deaktiviert oder gilt nicht für diesen Ausschnitt.`, { cause: err });
      }
      console.warn('[Pipeline] PMTiles-Abruf fehlgeschlagen, wechsle auf GeoJSON-Fallback:', err.message);
    }
  }

  // 2. Optionaler Fallback: GeoJSON-Dataset mit 10-Minuten-In-Memory-Cache
  if (!Config.pipeline?.geojsonFallback || isEuropeOnlyViewport(bounds, zoom)) {
    throw new Error('PMTiles nicht aktiv oder fehlgeschlagen und GeoJSON-Fallback ist deaktiviert.');
  }

  const now = Date.now();
  const cacheKey = mode === 'stations' ? 'stations' : 'all';
  const isCacheValid = _pipelineCache[cacheKey] && (now - _pipelineCache.timestamp < 10 * 60 * 1000);

  if (!isCacheValid) {
    const elements = await loadPipelineDataset(baseUrl, mode, { signal });
    _pipelineCache[cacheKey] = elements;
    _pipelineCache.timestamp = now;
  }

  const allElements = _pipelineCache[cacheKey] || [];
  if (!bounds || typeof bounds.getSouth !== 'function') {
    return allElements;
  }

  const pad = 0.02;
  const south = bounds.getSouth() - pad;
  const north = bounds.getNorth() + pad;
  const west = bounds.getWest() - pad;
  const east = bounds.getEast() + pad;

  return allElements.filter(el => (
    el.lat >= south &&
    el.lat <= north &&
    el.lon >= west &&
    el.lon <= east
  ));
}

/**
 * Lädt Gemeindegrenzen via PMTiles oder GeoJSON von der lokalen Pipeline.
 * @param {L.LatLngBounds} bounds 
 * @param {Object} options 
 * @returns {Promise<Array<Object>>}
 */
export async function fetchPipelineBoundaries(bounds, { signal, zoom, onProgressData, onBufferComplete } = {}) {
  const baseUrl = Config.pipeline?.url;
  if (!baseUrl) throw new Error('Pipeline-URL ist nicht konfiguriert.');

  // Stufe 1: PMTiles Vektor-Kacheln
  if (Config.pipeline?.usePmtiles) {
    try {
      loadEuropeData(); // Manifest bei Bedarf auffrischen (blockiert und wirft nie)
      const sources = await planPipelineSources(bounds, zoom, signal);

      const currentZoom = typeof zoom === 'number' ? zoom : 14;
      const queryZoom = computeQueryZoom(currentZoom, sources[0].header);

      const south = typeof bounds.getSouth === 'function' ? bounds.getSouth() : bounds.south;
      const north = typeof bounds.getNorth === 'function' ? bounds.getNorth() : bounds.north;
      const west = typeof bounds.getWest === 'function' ? bounds.getWest() : bounds.west;
      const east = typeof bounds.getEast === 'function' ? bounds.getEast() : bounds.east;

      const visMinX = lon2tile(west, queryZoom);
      const visMaxX = lon2tile(east, queryZoom);
      const visMinY = lat2tile(north, queryZoom);
      const visMaxY = lat2tile(south, queryZoom);

      const rawTileCount = (visMaxX - visMinX + 1) * (visMaxY - visMinY + 1);

      const boundaryMap = new Map();

      // 1. Unmittelbar sichtbare Kacheln
      const visibleTiles = [];
      for (let x = visMinX; x <= visMaxX; x++) {
        for (let y = visMinY; y <= visMaxY; y++) {
          visibleTiles.push({ x, y });
        }
      }

      // 2. Pufferring (nur wenn Kachelausschnitt <= 20): die Quellen dafür werden schon jetzt parallel geplant
      const ringPlan = rawTileCount <= 20
        ? startRingPlan(sources, { minX: visMinX, maxX: visMaxX, minY: visMinY, maxY: visMaxY }, queryZoom, zoom, signal)
        : null;

      const processBoundaryTile = async (x, y, phase = 'visible') => {
        if (signal?.aborted) return 0;
        const tileSources = phase === 'buffer' ? ringSources : sources;
        const vTiles = await getTilesFromSources(tileSources, queryZoom, x, y, signal);
        if (signal?.aborted) return 0;

        let newCount = 0;
        for (let s = 0; s < tileSources.length; s++) {
          const vTile = vTiles[s];
          if (!vTile || !vTile.layers) continue;
          const layer = vTile.layers['boundaries'];
          if (!layer) continue;
          // feat.id (--generate-ids) zählt je Datei von vorn: Länder-Dateien bekommen ihre Kennung davor, sonst
          // würden Grenzstücke verschiedener Dateien mit gleicher Nummer einander überschreiben.
          // DACHLiLu behält die bisherigen IDs.
          const keyPrefix = tileSources[s].kind === 'europe' ? `${tileSources[s].id}:` : '';
          for (let i = 0; i < layer.length; i++) {
            const feat = layer.feature(i);
            const gj = feat.toGeoJSON(x, y, queryZoom);
            const coords = gj.geometry?.coordinates;
            if (!Array.isArray(coords) || coords.length === 0) continue;

            // Stabiler ID-Schlüssel je Kachel: tippecanoe (--generate-ids) vergibt allen
            // zugeschnittenen Teilen eines Wegs dieselbe feat.id. Ohne Kachelbezug bliebe nur
            // das Teilstück der zuerst geladenen Kachel übrig (Lücken an Kachelrändern).
            const firstPt = gj.geometry.type === 'MultiLineString' ? coords[0]?.[0] : coords[0];
            const lastLine = gj.geometry.type === 'MultiLineString' ? coords[coords.length - 1] : coords;
            const lastPt = lastLine?.[lastLine.length - 1];
            if (!firstPt || !lastPt) continue;
            const featKey = feat.id ?? `${Math.round(firstPt[1] * 1e5)}_${Math.round(firstPt[0] * 1e5)}_${Math.round(lastPt[1] * 1e5)}_${Math.round(lastPt[0] * 1e5)}`;

            for (const el of boundaryGeometryToElements(gj.geometry, gj.properties, `${keyPrefix}${featKey}@${queryZoom}/${x}/${y}`)) {
              if (!boundaryMap.has(el.id)) {
                boundaryMap.set(el.id, el);
                newCount++;
              }
            }
          }

        }

        if (newCount > 0 && typeof onProgressData === 'function' && !signal?.aborted) {
          try {
            onProgressData(Array.from(boundaryMap.values()), true, { phase });
          } catch (renderErr) {
            console.warn('[Pipeline] Fehler bei progressiver Boundary-Meldung:', renderErr);
          }
        }

        return newCount;
      };

      // Phase 1: Sichtbare Kacheln zuerst
      await processTilesWithPool(visibleTiles, (x, y) => processBoundaryTile(x, y, 'visible'), 10, signal);

      // Pufferring festlegen (Quellen schon parallel geplant, siehe fetchPipelinePmtiles)
      const bufferTiles = [];
      let bufMinX = visMinX;
      let bufMaxX = visMaxX;
      let bufMinY = visMinY;
      let bufMaxY = visMaxY;
      let useBuffer = rawTileCount <= 20;
      let ringSources = sources;
      if (useBuffer && ringPlan) {
        ringSources = await resolveRingSources(sources, ringPlan);
        if (!ringSources) { useBuffer = false; ringSources = sources; }
      }
      if (useBuffer) {
        bufMinX -= 1;
        bufMaxX += 1;
        bufMinY -= 1;
        bufMaxY += 1;
        for (let x = bufMinX; x <= bufMaxX; x++) {
          for (let y = bufMinY; y <= bufMaxY; y++) {
            if (x < visMinX || x > visMaxX || y < visMinY || y > visMaxY) {
              bufferTiles.push({ x, y });
            }
          }
        }
      }

      const visSouth = tile2lat(visMaxY + 1, queryZoom);
      const visNorth = tile2lat(visMinY, queryZoom);
      const visWest = tile2lon(visMinX, queryZoom);
      const visEast = tile2lon(visMaxX + 1, queryZoom);

      const elements = Array.from(boundaryMap.values());
      elements.loadedBounds = (typeof L !== 'undefined' && L.latLngBounds)
        ? L.latLngBounds([visSouth, visWest], [visNorth, visEast])
        : { south: visSouth, north: visNorth, west: visWest, east: visEast };

      // Grenzen der aktiven Anfrage inklusive Pufferring merken (oder erweitern)
      const activeBufSouth = tile2lat(bufMaxY + 1, queryZoom);
      const activeBufNorth = tile2lat(bufMinY, queryZoom);
      const activeBufWest = tile2lon(bufMinX, queryZoom);
      const activeBufEast = tile2lon(bufMaxX + 1, queryZoom);
      const boundaryTotalBounds = (typeof L !== 'undefined' && L.latLngBounds)
        ? L.latLngBounds([activeBufSouth, activeBufWest], [activeBufNorth, activeBufEast])
        : {
            getSouth: () => activeBufSouth,
            getNorth: () => activeBufNorth,
            getWest: () => activeBufWest,
            getEast: () => activeBufEast,
            getSouthWest: () => ({ lat: activeBufSouth, lng: activeBufWest }),
            getNorthEast: () => ({ lat: activeBufNorth, lng: activeBufEast }),
            contains: (b) => {
              const s = b?.getSouth?.() ?? b?.south;
              const n = b?.getNorth?.() ?? b?.north;
              const w = b?.getWest?.() ?? b?.west;
              const e = b?.getEast?.() ?? b?.east;
              return s >= activeBufSouth && n <= activeBufNorth && w >= activeBufWest && e <= activeBufEast;
            }
          };
      if (State.activeFetchBounds?.extend && typeof boundaryTotalBounds?.getSouthWest === 'function') {
        State.activeFetchBounds.extend(boundaryTotalBounds);
      } else if (!State.activeFetchBounds) {
        State.activeFetchBounds = boundaryTotalBounds;
      }

      // Phase 2: Pufferring im Hintergrund
      if (bufferTiles.length > 0 && !signal?.aborted) {
        const boundaryBufferPromise = (async () => {
          try {
            await processTilesWithPool(bufferTiles, (x, y) => processBoundaryTile(x, y, 'buffer'), 10, signal);
            if (signal?.aborted) return;

            const bufSouth = tile2lat(bufMaxY + 1, queryZoom);
            const bufNorth = tile2lat(bufMinY, queryZoom);
            const bufWest = tile2lon(bufMinX, queryZoom);
            const bufEast = tile2lon(bufMaxX + 1, queryZoom);

            const fullBounds = (typeof L !== 'undefined' && L.latLngBounds)
              ? L.latLngBounds([bufSouth, bufWest], [bufNorth, bufEast])
              : { south: bufSouth, north: bufNorth, west: bufWest, east: bufEast };

            elements.loadedBounds = fullBounds;

            if (typeof onBufferComplete === 'function' && !signal?.aborted) {
              onBufferComplete(Array.from(boundaryMap.values()), fullBounds);
            }
          } catch (bufErr) {
            if (bufErr?.name !== 'AbortError' && !signal?.aborted) {
              console.warn('[Pipeline] Fehler beim Laden des Boundary-Puffers:', bufErr);
            }
          }
        })();

        State.pendingBufferFetches.add(boundaryBufferPromise);
        boundaryBufferPromise.finally(() => {
          State.pendingBufferFetches.delete(boundaryBufferPromise);
          const hasBuffers = State.pendingBufferFetches.size > 0;
          if (!hasBuffers && !State.isFetchingBoundaries) {
            if (State.controllers.boundaryFetch?.signal === signal) {
              State.controllers.boundaryFetch = null;
            }
          }
          if (!hasBuffers && !State.isFetchingData && !State.isFetchingBoundaries) {
            State.activeFetchBounds = null;
          }
        });
      }

      return elements;
    } catch (pmErr) {
      if (pmErr?.name === 'AbortError') throw pmErr;
      if (!Config.pipeline?.geojsonFallback || isEuropeOnlyViewport(bounds, zoom)) {
        throw new Error(`PMTiles-Boundary-Abruf fehlgeschlagen (${pmErr.message}). GeoJSON-Fallback ist deaktiviert.`, { cause: pmErr });
      }
      console.warn('[Pipeline] PMTiles-Boundary-Abruf fehlgeschlagen, wechsle auf GeoJSON:', pmErr.message);
    }
  }

  // Stufe 2: Optionaler Fallback auf boundaries.geojson
  if (!Config.pipeline?.geojsonFallback || isEuropeOnlyViewport(bounds, zoom)) {
    throw new Error('PMTiles nicht aktiv oder fehlgeschlagen und GeoJSON-Fallback ist deaktiviert.');
  }

  try {
    const url = `${baseUrl.replace(/\/+$/, '')}/boundaries.geojson`;
    const res = await fetch(url, { signal, cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      const features = Array.isArray(data?.features) ? data.features : [];
      const elements = [];
      for (let i = 0; i < features.length; i++) {
        const feat = features[i];
        elements.push(...boundaryGeometryToElements(feat.geometry, feat.properties, feat.id || `boundary_${i}`));
      }
      return elements;
    }
  } catch (geoErr) {
    if (geoErr?.name === 'AbortError') throw geoErr;
    console.warn('[Pipeline] GeoJSON-Boundary-Abruf fehlgeschlagen:', geoErr.message);
  }

  return [];
}

/**
 * Wartet auf alle aktuell im Hintergrund laufenden Pufferring-Ladevorgänge.
 * Beendet sich sofort, wenn keine Puffer laufen.
 * Unterstützt Timeout und AbortSignal.
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.timeoutMs=5000]
 * @returns {Promise<void>}
 */
export async function waitForPendingBuffers({ signal, timeoutMs = 5000 } = {}) {
  if (!State.pendingBufferFetches || State.pendingBufferFetches.size === 0) {
    return;
  }
  if (signal?.aborted) return;

  const currentPromises = Array.from(State.pendingBufferFetches);
  if (currentPromises.length === 0) return;

  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(resolve, timeoutMs);
  });

  const abortPromise = new Promise((resolve) => {
    if (signal) {
      if (signal.aborted) resolve();
      else signal.addEventListener('abort', resolve, { once: true });
    }
  });

  try {
    await Promise.race([
      Promise.allSettled(currentPromises),
      timeoutPromise,
      abortPromise
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Setzt den Pipeline-Cache zurück (z. B. für Tests oder nach Aktualisierungen).
 */
export function clearPipelineCache() {
  _pipelineCache = {
    stations: null,
    all: null,
    timestamp: 0
  };
  _pmtilesInstance = null;
  _pmtilesUrl = null;
  _pmtilesHeader = null;
  _pipelineVersion = null;
  _pipelineOsmDataUntil = null;
  _lastMetadataFetchTime = 0;
  _pendingMetadataPromise = null;
  _europeHandles.clear();
  clearTileCache();
  if (State.pendingBufferFetches) {
    State.pendingBufferFetches.clear();
  }
  State.isFetchingData = false;
  State.isFetchingBoundaries = false;
  State.activeFetchBounds = null;
}
