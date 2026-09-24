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

let _pmtilesInstance = null;
let _pmtilesUrl = null;
let _pmtilesHeader = null;

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
 * @param {L.LatLngBounds} bounds 
 * @param {number} zoom 
 * @returns {boolean}
 */
export function isPipelineEligible(bounds, zoom) {
  if (!Config.pipeline?.enabled || !Config.pipeline?.url) return false;
  if (!bounds || zoom < 12) return false;

  const pb = Config.pipeline.bounds;
  if (!pb) return false;

  const center = typeof bounds.getCenter === 'function' ? bounds.getCenter() : null;
  if (!center) return false;

  const lat = center.lat;
  const lon = center.lng ?? center.lon;
  if (lat == null || lon == null) return false;

  return (
    lat >= pb.south &&
    lat <= pb.north &&
    lon >= pb.west &&
    lon <= pb.east
  );
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
 * Lädt Kacheln via PMTiles Range-Requests für den aktuellen Sichtbereich.
 * @param {L.LatLngBounds} bounds 
 * @param {string} mode 'stations' | 'all'
 * @param {Object} options 
 * @returns {Promise<Array<Object>>}
 */
export async function fetchPipelinePmtiles(bounds, mode, { signal, zoom } = {}) {
  const baseUrl = Config.pipeline?.url;
  const pmtilesFile = Config.pipeline?.pmtilesFile || 'openfiremap.pmtiles';
  if (!baseUrl) throw new Error('Pipeline-URL ist nicht konfiguriert.');

  const url = `${baseUrl.replace(/\/+$/, '')}/${pmtilesFile}`;
  const pmtiles = getPMTilesInstance(url);

  if (!_pmtilesHeader) {
    _pmtilesHeader = await pmtiles.getHeader();
  }

  const maxZoom = _pmtilesHeader.maxZoom || 14;
  const minZoom = _pmtilesHeader.minZoom || 12;
  const currentZoom = typeof zoom === 'number' ? zoom : 14;
  const queryZoom = Math.min(Math.max(currentZoom, minZoom), maxZoom);

  const south = typeof bounds.getSouth === 'function' ? bounds.getSouth() : bounds.south;
  const north = typeof bounds.getNorth === 'function' ? bounds.getNorth() : bounds.north;
  const west = typeof bounds.getWest === 'function' ? bounds.getWest() : bounds.west;
  const east = typeof bounds.getEast === 'function' ? bounds.getEast() : bounds.east;

  let minX = lon2tile(west, queryZoom);
  let maxX = lon2tile(east, queryZoom);
  let minY = lat2tile(north, queryZoom);
  let maxY = lat2tile(south, queryZoom);

  // 1 Kachel Puffer in alle Richtungen für flüssiges Panning und vollständige Bildschirmabdeckung,
  // solange die Kachelanforderung im performanten Rahmen bleibt (<= 150 Kacheln).
  if ((maxX - minX + 3) * (maxY - minY + 3) <= 150) {
    minX -= 1;
    maxX += 1;
    minY -= 1;
    maxY += 1;
  }

  const tileCount = (maxX - minX + 1) * (maxY - minY + 1);
  if (tileCount > 300) {
    throw new Error(`Tile-Ausschnitt zu groß (${tileCount} Kacheln), wechsle auf Fallback.`);
  }

  const targetLayers = mode === 'stations'
    ? ['fire_stations']
    : ['fire_stations', 'hydrants', 'water_points', 'defibrillators'];

  const elementsMap = new Map();
  const promises = [];

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      promises.push(
        pmtiles.getZxy(queryZoom, x, y, signal).then((resp) => {
          if (!resp || !resp.data) return;
          const pbf = new PbfReader(new Uint8Array(resp.data));
          const vTile = new VectorTile(pbf);

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
              }
            }
          }
        })
      );
    }
  }

  await Promise.all(promises);

  const loadedSouth = tile2lat(maxY + 1, queryZoom);
  const loadedNorth = tile2lat(minY, queryZoom);
  const loadedWest = tile2lon(minX, queryZoom);
  const loadedEast = tile2lon(maxX + 1, queryZoom);

  const elements = Array.from(elementsMap.values());
  elements.loadedBounds = (typeof L !== 'undefined' && L.latLngBounds)
    ? L.latLngBounds([loadedSouth, loadedWest], [loadedNorth, loadedEast])
    : { south: loadedSouth, north: loadedNorth, west: loadedWest, east: loadedEast };

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
export async function fetchPipelineData(bounds, mode, { signal, zoom } = {}) {
  const baseUrl = Config.pipeline?.url;
  if (!baseUrl) throw new Error('Pipeline-URL ist nicht konfiguriert.');

  // 1. Bevorzugt: PMTiles Vektorkacheln per Range-Request
  if (Config.pipeline?.usePmtiles) {
    try {
      const pmtilesElements = await fetchPipelinePmtiles(bounds, mode, { signal, zoom });
      if (Array.isArray(pmtilesElements)) {
        return pmtilesElements;
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      console.warn('[Pipeline] PMTiles-Abruf fehlgeschlagen, wechsle auf GeoJSON-Fallback:', err.message);
    }
  }

  // 2. Fallback: GeoJSON-Dataset mit 10-Minuten-In-Memory-Cache
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
export async function fetchPipelineBoundaries(bounds, { signal, zoom } = {}) {
  const baseUrl = Config.pipeline?.url;
  if (!baseUrl) throw new Error('Pipeline-URL ist nicht konfiguriert.');

  // Stufe 1: PMTiles Vektor-Kacheln
  if (Config.pipeline?.usePmtiles) {
    try {
      const pmtilesFile = Config.pipeline?.pmtilesFile || 'openfiremap.pmtiles';
      const url = `${baseUrl.replace(/\/+$/, '')}/${pmtilesFile}`;
      const pmtiles = getPMTilesInstance(url);

      if (!_pmtilesHeader) {
        _pmtilesHeader = await pmtiles.getHeader();
      }

      const maxZoom = _pmtilesHeader.maxZoom || 16;
      const minZoom = _pmtilesHeader.minZoom || 12;
      const currentZoom = typeof zoom === 'number' ? zoom : 14;
      const queryZoom = Math.min(Math.max(currentZoom, minZoom), maxZoom);

      const south = typeof bounds.getSouth === 'function' ? bounds.getSouth() : bounds.south;
      const north = typeof bounds.getNorth === 'function' ? bounds.getNorth() : bounds.north;
      const west = typeof bounds.getWest === 'function' ? bounds.getWest() : bounds.west;
      const east = typeof bounds.getEast === 'function' ? bounds.getEast() : bounds.east;

      let minX = lon2tile(west, queryZoom);
      let maxX = lon2tile(east, queryZoom);
      let minY = lat2tile(north, queryZoom);
      let maxY = lat2tile(south, queryZoom);

      if ((maxX - minX + 3) * (maxY - minY + 3) <= 150) {
        minX -= 1;
        maxX += 1;
        minY -= 1;
        maxY += 1;
      }

      const boundaryMap = new Map();
      const promises = [];

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          promises.push(
            pmtiles.getZxy(queryZoom, x, y, signal).then((resp) => {
              if (!resp || !resp.data) return;
              const pbf = new PbfReader(new Uint8Array(resp.data));
              const vTile = new VectorTile(pbf);
              const layer = vTile.layers['boundaries'];
              if (!layer) return;

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
                }
              }
            })
          );
        }
      }

      await Promise.all(promises);
      const elements = Array.from(boundaryMap.values());
      if (elements.length > 0) return elements;
    } catch (pmErr) {
      if (pmErr?.name === 'AbortError') throw pmErr;
      console.warn('[Pipeline] PMTiles-Boundary-Abruf fehlgeschlagen, wechsle auf GeoJSON:', pmErr.message);
    }
  }

  // Stufe 2: Fallback auf boundaries.geojson
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
}
