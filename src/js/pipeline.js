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
 * @returns {Promise<VectorTile|null>}
 */
export async function getVectorTile(pmtiles, z, x, y, signal) {
  const versionPrefix = _pipelineVersion ? `${_pipelineVersion}|` : '';
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
 * Prüft mit dem Ray-Casting-Algorithmus (Jordan Curve Theorem), ob ein Punkt (lat, lon)
 * innerhalb eines geschlossenen Polygons liegt.
 * @param {number} lat Breitengrad
 * @param {number} lon Längengrad
 * @param {Array<[number, number]>} polygon Array von [lat, lon]-Koordinaten
 * @returns {boolean}
 */
export function isPointInPolygon(lat, lon, polygon) {
  if (!Array.isArray(polygon) || polygon.length === 0 || lat == null || lon == null) {
    return false;
  }
  // Unterstützt Multi-Polygone / Listen von Polygonen
  if (Array.isArray(polygon[0]) && Array.isArray(polygon[0][0])) {
    return polygon.some(subPoly => isPointInPolygon(lat, lon, subPoly));
  }
  if (polygon.length < 3) {
    return false;
  }
  let inside = false;
  const n = polygon.length;
  let j = n - 1;

  for (let i = 0; i < n; i++) {
    const yi = polygon[i][0];
    const xi = polygon[i][1];
    const yj = polygon[j][0];
    const xj = polygon[j][1];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
    j = i;
  }

  return inside;
}

/**
 * Prüft, ob sich zwei 2D-Liniensegmente AB und CD schneiden.
 * Nutzt Vorzeichenprüfung des Kreuzprodukts (CCW) inklusive Grenzfallprüfung.
 * A=(x1, y1), B=(x2, y2), C=(x3, y3), D=(x4, y4)
 * @private
 */
function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Schneller Bounding-Box Vorfilter für die beiden Einzelsegmente
  if (
    Math.max(x1, x2) < Math.min(x3, x4) ||
    Math.min(x1, x2) > Math.max(x3, x4) ||
    Math.max(y1, y2) < Math.min(y3, y4) ||
    Math.min(y1, y2) > Math.max(y3, y4)
  ) {
    return false;
  }

  const ccw = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

  const d1 = ccw(x1, y1, x2, y2, x3, y3);
  const d2 = ccw(x1, y1, x2, y2, x4, y4);
  const d3 = ccw(x3, y3, x4, y4, x1, y1);
  const d4 = ccw(x3, y3, x4, y4, x2, y2);

  // Echter Schnittpunkt (Vorzeichenwechsel bei beiden Linien)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  // Kollineare / Grenzfall-Prüfung (Punkt liegt auf Segment)
  const onSegment = (px, py, rx, ry, sx, sy) =>
    px >= Math.min(rx, sx) && px <= Math.max(rx, sx) &&
    py >= Math.min(ry, sy) && py <= Math.max(ry, sy);

  if (d1 === 0 && onSegment(x3, y3, x1, y1, x2, y2)) return true;
  if (d2 === 0 && onSegment(x4, y4, x1, y1, x2, y2)) return true;
  if (d3 === 0 && onSegment(x1, y1, x3, y3, x4, y4)) return true;
  if (d4 === 0 && onSegment(x2, y2, x3, y3, x4, y4)) return true;

  return false;
}

/**
 * Prüft, ob ein gegebenes geografisches Rechteck [south, west, north, east] vollständig
 * innerhalb eines geschlossenen Polygons liegt.
 * 
 * Bedingungen für 'true':
 * 1. Alle 4 Ecken des Rechtecks liegen innerhalb des Polygons (Jordan Curve Ray-Casting).
 * 2. Keine Kante des Polygons schneidet eine der 4 Kanten des Rechtecks (Segment-Schnitt-Test).
 * 
 * @param {number} south Südliche Grenze (Breitengrad min)
 * @param {number} west Westliche Grenze (Längengrad min)
 * @param {number} north Nördliche Grenze (Breitengrad max)
 * @param {number} east Östliche Grenze (Längengrad max)
 * @param {Array<[number, number]>} polygon Array von [lat, lon]-Koordinaten
 * @returns {boolean} true, wenn das gesamte Rechteck im Polygon liegt
 */
export function isRectInPolygon(south, west, north, east, polygon) {
  if (!Array.isArray(polygon) || polygon.length === 0) return false;
  if (south == null || west == null || north == null || east == null) return false;
  if (south > north || west > east) return false;

  // Unterstützt Multi-Polygone / Listen von Polygonen
  if (Array.isArray(polygon[0]) && Array.isArray(polygon[0][0])) {
    return polygon.some(subPoly => isRectInPolygon(south, west, north, east, subPoly));
  }
  if (polygon.length < 3) return false;

  // Bedingung 1: Alle 4 Ecken des Rechtecks müssen im Polygon liegen
  if (!isPointInPolygon(south, west, polygon)) return false; // Süd-West
  if (!isPointInPolygon(north, west, polygon)) return false; // Nord-West
  if (!isPointInPolygon(north, east, polygon)) return false; // Nord-Ost
  if (!isPointInPolygon(south, east, polygon)) return false; // Süd-Ost

  // Bedingung 2: Keine Polygonkante darf eine der 4 Rechteckkanten schneiden
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const nextIdx = (i + 1) % n;
    const lat1 = polygon[i][0];
    const lon1 = polygon[i][1];
    const lat2 = polygon[nextIdx][0];
    const lon2 = polygon[nextIdx][1];

    if (lat1 === lat2 && lon1 === lon2) continue;

    // Bounding-Box Vorfilter: Nur Kanten prüfen, die das Rechteck räumlich überlappen
    const edgeMinLat = lat1 < lat2 ? lat1 : lat2;
    const edgeMaxLat = lat1 > lat2 ? lat1 : lat2;
    const edgeMinLon = lon1 < lon2 ? lon1 : lon2;
    const edgeMaxLon = lon1 > lon2 ? lon1 : lon2;

    if (edgeMaxLat < south || edgeMinLat > north || edgeMaxLon < west || edgeMinLon > east) {
      continue;
    }

    // Exakter Schnitt-Test mit den 4 Kanten des Rechtecks
    // Süd-Kante (lon: west -> east, lat: south)
    if (segmentsIntersect(lon1, lat1, lon2, lat2, west, south, east, south)) return false;
    // Nord-Kante (lon: west -> east, lat: north)
    if (segmentsIntersect(lon1, lat1, lon2, lat2, west, north, east, north)) return false;
    // West-Kante (lat: south -> north, lon: west)
    if (segmentsIntersect(lon1, lat1, lon2, lat2, west, south, west, north)) return false;
    // Ost-Kante (lat: south -> north, lon: east)
    if (segmentsIntersect(lon1, lat1, lon2, lat2, east, south, east, north)) return false;
  }

  return true;
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
  const tags = feature.properties || {};

  // Stabiler, eindeutiger Identifikator:
  // 1. Nativer OSM-ID (z. B. aus --add-unique-id oder Overpass)
  // 2. Fallback: Räumliche Koordinate mit 6 Nachkommastellen (~10 cm Genauigkeit)
  // Damit haben Features über alle Kacheln und Zooms hinweg stabile, kollisionsfreie IDs!
  const coordKey = `${Math.round(lat * 1e6)}_${Math.round(lon * 1e6)}`;
  const id = feature.id ?? tags['@id'] ?? tags.id ?? `${layerName}_${coordKey}`;
  const type = tags['@type'] || (feature.geometry.type === 'Point' ? 'node' : 'way');

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

/**
 * Lädt Kacheln via PMTiles Range-Requests für den aktuellen Sichtbereich.
 * @param {L.LatLngBounds} bounds 
 * @param {string} mode 'stations' | 'all'
 * @param {Object} options 
 * @returns {Promise<Array<Object>>}
 */
export async function fetchPipelinePmtiles(bounds, mode, { signal, zoom, onProgressData, onBufferComplete } = {}) {
  const baseUrl = Config.pipeline?.url;
  const pmtilesFile = Config.pipeline?.pmtilesFile || 'openfiremap.pmtiles';
  if (!baseUrl) throw new Error('Pipeline-URL ist nicht konfiguriert.');

  const url = await getPipelinePmtilesUrl(baseUrl, pmtilesFile, { signal });
  let pmtiles = getPMTilesInstance(url);

  const coverage = await ensurePmtilesHeaderCoverage(pmtiles, baseUrl, pmtilesFile, bounds, { signal });
  pmtiles = coverage.pmtiles;
  const header = coverage.header;

  const currentZoom = typeof zoom === 'number' ? zoom : 14;
  const queryZoom = computeQueryZoom(currentZoom, header);

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

  // 2. Pufferring (nur wenn Kachelausschnitt <= 20)
  const bufferTiles = [];
  let bufMinX = visMinX;
  let bufMaxX = visMaxX;
  let bufMinY = visMinY;
  let bufMaxY = visMaxY;

  if (rawTileCount <= 20) {
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

  // Kachelverarbeitung mit progressivem Rendern (Streaming)
  const processTile = async (x, y) => {
    if (signal?.aborted) return 0;
    const vTile = await getVectorTile(pmtiles, queryZoom, x, y, signal);
    if (!vTile || !vTile.layers || signal?.aborted) return 0;

    let newCount = 0;
    for (const layerName of targetLayers) {
      const layer = vTile.layers[layerName];
      if (!layer) continue;
      for (let i = 0; i < layer.length; i++) {
        const feat = layer.feature(i);
        const gj = feat.toGeoJSON(x, y, queryZoom);
        const el = geoJsonFeatureToElement(gj, layerName);
        if (!el) continue;

        const idKey = String(el.id);
        if (!elementsMap.has(idKey)) {
          elementsMap.set(idKey, el);
          newCount++;
        }
      }
    }

    if (newCount > 0 && typeof onProgressData === 'function' && !signal?.aborted) {
      try {
        onProgressData(Array.from(elementsMap.values()), true);
      } catch (renderErr) {
        console.warn('[Pipeline] Fehler bei progressiver POI-Meldung:', renderErr);
      }
    }

    return newCount;
  };

  // Phase 1: Sichtbare Kacheln zuerst laden und sofort rendern
  await processTilesWithPool(visibleTiles, processTile, 10, signal);

  // Grenzen der sichtbaren Kacheln
  const visSouth = tile2lat(visMaxY + 1, queryZoom);
  const visNorth = tile2lat(visMinY, queryZoom);
  const visWest = tile2lon(visMinX, queryZoom);
  const visEast = tile2lon(visMaxX + 1, queryZoom);

  const elements = Array.from(elementsMap.values());
  elements.loadedBounds = (typeof L !== 'undefined' && L.latLngBounds)
    ? L.latLngBounds([visSouth, visWest], [visNorth, visEast])
    : { south: visSouth, north: visNorth, west: visWest, east: visEast };

  // Phase 2: Pufferring im Hintergrund nachladen (verzögert Erst-Render nicht)
  if (bufferTiles.length > 0 && !signal?.aborted) {
    (async () => {
      try {
        await processTilesWithPool(bufferTiles, processTile, 10, signal);
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
      if (!Config.pipeline?.geojsonFallback) {
        throw new Error(`PMTiles-Abruf fehlgeschlagen (${err.message}). GeoJSON-Fallback ist deaktiviert.`, { cause: err });
      }
      console.warn('[Pipeline] PMTiles-Abruf fehlgeschlagen, wechsle auf GeoJSON-Fallback:', err.message);
    }
  }

  // 2. Optionaler Fallback: GeoJSON-Dataset mit 10-Minuten-In-Memory-Cache
  if (!Config.pipeline?.geojsonFallback) {
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
      const pmtilesFile = Config.pipeline?.pmtilesFile || 'openfiremap.pmtiles';
      const url = await getPipelinePmtilesUrl(baseUrl, pmtilesFile, { signal });
      let pmtiles = getPMTilesInstance(url);

      const coverage = await ensurePmtilesHeaderCoverage(pmtiles, baseUrl, pmtilesFile, bounds, { signal });
      pmtiles = coverage.pmtiles;
      const header = coverage.header;

      const currentZoom = typeof zoom === 'number' ? zoom : 14;
      const queryZoom = computeQueryZoom(currentZoom, header);

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

      // 2. Pufferring (nur wenn Kachelausschnitt <= 20)
      const bufferTiles = [];
      let bufMinX = visMinX;
      let bufMaxX = visMaxX;
      let bufMinY = visMinY;
      let bufMaxY = visMaxY;

      if (rawTileCount <= 20) {
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

      const processBoundaryTile = async (x, y) => {
        if (signal?.aborted) return 0;
        const vTile = await getVectorTile(pmtiles, queryZoom, x, y, signal);
        if (!vTile || !vTile.layers || signal?.aborted) return 0;
        const layer = vTile.layers['boundaries'];
        if (!layer) return 0;

        let newCount = 0;
        for (let i = 0; i < layer.length; i++) {
          const feat = layer.feature(i);
          const gj = feat.toGeoJSON(x, y, queryZoom);
          const coords = gj.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length === 0) continue;

          // Stabiler ID-Schlüssel
          const firstPt = coords[0];
          const lastPt = coords[coords.length - 1];
          const key = feat.id ?? `${Math.round(firstPt[1] * 1e5)}_${Math.round(firstPt[0] * 1e5)}_${Math.round(lastPt[1] * 1e5)}_${Math.round(lastPt[0] * 1e5)}`;

          if (!boundaryMap.has(key)) {
            boundaryMap.set(key, {
              id: key,
              type: 'way',
              tags: { boundary: 'administrative', ...(gj.properties || {}) },
              geometry: coords.map((pt) => ({ lat: pt[1], lon: pt[0] }))
            });
            newCount++;
          }
        }

        if (newCount > 0 && typeof onProgressData === 'function' && !signal?.aborted) {
          try {
            onProgressData(Array.from(boundaryMap.values()), true);
          } catch (renderErr) {
            console.warn('[Pipeline] Fehler bei progressiver Boundary-Meldung:', renderErr);
          }
        }

        return newCount;
      };

      // Phase 1: Sichtbare Kacheln zuerst
      await processTilesWithPool(visibleTiles, processBoundaryTile, 10, signal);

      const visSouth = tile2lat(visMaxY + 1, queryZoom);
      const visNorth = tile2lat(visMinY, queryZoom);
      const visWest = tile2lon(visMinX, queryZoom);
      const visEast = tile2lon(visMaxX + 1, queryZoom);

      const elements = Array.from(boundaryMap.values());
      elements.loadedBounds = (typeof L !== 'undefined' && L.latLngBounds)
        ? L.latLngBounds([visSouth, visWest], [visNorth, visEast])
        : { south: visSouth, north: visNorth, west: visWest, east: visEast };

      // Phase 2: Pufferring im Hintergrund
      if (bufferTiles.length > 0 && !signal?.aborted) {
        (async () => {
          try {
            await processTilesWithPool(bufferTiles, processBoundaryTile, 10, signal);
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
      }

      return elements;
    } catch (pmErr) {
      if (pmErr?.name === 'AbortError') throw pmErr;
      if (!Config.pipeline?.geojsonFallback) {
        throw new Error(`PMTiles-Boundary-Abruf fehlgeschlagen (${pmErr.message}). GeoJSON-Fallback ist deaktiviert.`, { cause: pmErr });
      }
      console.warn('[Pipeline] PMTiles-Boundary-Abruf fehlgeschlagen, wechsle auf GeoJSON:', pmErr.message);
    }
  }

  // Stufe 2: Optionaler Fallback auf boundaries.geojson
  if (!Config.pipeline?.geojsonFallback) {
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
        const coords = feat.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length === 0) continue;
        elements.push({
          id: feat.id || `boundary_${i}`,
          type: 'way',
          tags: { boundary: 'administrative', ...(feat.properties || {}) },
          geometry: coords.map((pt) => ({ lat: pt[1], lon: pt[0] }))
        });
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
  _lastMetadataFetchTime = 0;
  _pendingMetadataPromise = null;
  clearTileCache();
}
