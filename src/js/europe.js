/**
 * ==========================================================================================
 * DATEI: europe.js
 * ZWECK: Europa-Erweiterung der Pipeline: Manifest lesen, für einen Kartenausschnitt die nötigen
 *        Länder-Dateien bestimmen und prüfen, ob der Ausschnitt über die Pipeline bedient werden darf.
 *
 * STAND: In pipeline.js eingebunden (isPipelineEligible, fetchPipelinePmtiles, fetchPipelineBoundaries,
 *        warmupPipeline), alles hinter Config.pipeline.europe.enabled (Standard: aus). Liegt ein Ausschnitt
 *        in DACHLiLu oder ist Europa nicht bereit, bleibt es beim bisherigen Weg. api.js und map.js sind
 *        unverändert und nutzen weiter isPipelineEligible/fetchPipelineData.
 *        VOR DEM EINSCHALTEN: Text data_source_pipeline nennt noch "DACHLiLu" (Sprachdateien).
 *
 * DATENQUELLEN (beide stammen aus dem Pipeline-Repo):
 * - Manifest eu/regions.json (Cloudflare R2): welche Länder veröffentlicht sind, mit Dateiname,
 *   Größe, Datenstand und Rechteck. Wird zur Laufzeit geladen.
 * - coverage/europe.js: Abdeckung (Polygone) und Rechtecke ALLER geplanten Länder. Ist eingecheckt
 *   und wird bei Bedarf nachgeladen (eigener Chunk), nicht ins Haupt-Bundle gepackt.
 *
 * REGELN DER EIGNUNGSPRÜFUNG (alle müssen stimmen, sonst Overpass wie bisher):
 * 1. Schalter an, Zoom >= minZoom, gültiger Ausschnitt.
 * 2. Manifest und Abdeckung sind geladen (sonst "nicht bereit": der Aufrufer nutzt den bisherigen Weg).
 * 3. Der Ausschnitt liegt vollständig innerhalb EINES Abdeckungspolygons (wie bei DACHLiLu).
 * 4. Jedes Land, dessen Rechteck den Ausschnitt schneidet, steht im Manifest. Fehlt eines (noch nicht
 *    veröffentlicht oder ausgefallen), wäre der Ausschnitt lückenhaft; dann Overpass. Die Rechtecke
 *    reichen wegen der Meeresränder der Auszüge weit (Norwegen von -11° bis 35° Länge) und schneiden
 *    deshalb oft auch Nachbarländer; solange alle Länder veröffentlicht sind, ist das folgenlos.
 *
 * QUELLEN EINES AUSSCHNITTS: DACHLiLu (wenn der Ausschnitt dessen Rechteck schneidet) plus die
 * Länder-Dateien aus dem Manifest. An Landesgrenzen sind es mehrere Dateien; Objekte an der Grenze
 * können in zwei Auszügen stehen und werden vom Aufrufer per type:id zusammengeführt.
 * ==========================================================================================
 */

import { Config } from './config.js';
import { fetchJson } from './net.js';
import { isRectInPolygon } from './geometry.js';

const MANIFEST_VERSION = 1;
const REGION_ID_RE = /^[a-z0-9-]+$/;
// Dateiname eines Länder-Archivs: eu/<land>-<UTC-Stempel>.pmtiles (versioniert, unveränderlich)
const REGION_FILE_RE = /^eu\/[a-z0-9-]+-\d{8}T\d{6}Z\.pmtiles$/;
const STAMP_SUFFIX = '-\\d{8}T\\d{6}Z\\.pmtiles$';

/** Exaktes Dateimuster eines Landes. Ein Präfixvergleich genügt nicht: eu/ireland-… passt sonst auch auf ireland-and-northern-ireland. */
function regionFileRe(id) {
  return new RegExp(`^eu/${id}${STAMP_SUFFIX}`);
}
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const OSM_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

// ------------------------------------------------------------------------------------------
// Manifest
// ------------------------------------------------------------------------------------------

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Rechteck [west, süd, ost, nord] mit gültigem Wertebereich? */
export function isValidBounds(b) {
  return Array.isArray(b) && b.length === 4 && b.every(isNum)
    && b[0] >= -180 && b[2] <= 180 && b[1] >= -90 && b[3] <= 90
    && b[0] < b[2] && b[1] < b[3];
}

/**
 * Prüft einen Manifest-Eintrag und gibt ihn bereinigt zurück (oder null). Streng, weil der Dateiname
 * später Teil einer URL wird: nur das Schema eu/<land>-<stempel>.pmtiles zu genau diesem Land.
 */
function parseRegionEntry(key, entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (!REGION_ID_RE.test(key) || entry.id !== key) return null;
  if (typeof entry.file !== 'string' || !regionFileRe(key).test(entry.file)) return null;
  if (!Number.isInteger(entry.size_bytes) || entry.size_bytes <= 0) return null;
  if (typeof entry.generated_at !== 'string' || !ISO_DATE_RE.test(entry.generated_at)) return null;
  if (!isValidBounds(entry.bounds)) return null;
  const osm = entry.osm_data_until;
  if (osm != null && !(typeof osm === 'string' && OSM_TIMESTAMP_RE.test(osm))) return null;
  return {
    id: key,
    name: typeof entry.name === 'string' ? entry.name : key,
    file: entry.file,
    sizeBytes: entry.size_bytes,
    generatedAt: entry.generated_at,
    osmDataUntil: osm ?? null,
    bounds: entry.bounds.slice(),
    minzoom: Number.isInteger(entry.minzoom) ? entry.minzoom : null,
    maxzoom: Number.isInteger(entry.maxzoom) ? entry.maxzoom : null
  };
}

/**
 * Prüft das Manifest. Unbekannte Version oder falsche Form: null (Europa nicht nutzbar). Einzelne
 * ungültige Länder-Einträge werden verworfen und gelistet, die übrigen bleiben nutzbar.
 * @returns {{version:number, updatedAt:string|null, regions:Object<string,Object>, rejected:string[]}|null}
 */
export function parseManifest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (raw.version !== MANIFEST_VERSION) return null;
  if (!raw.regions || typeof raw.regions !== 'object' || Array.isArray(raw.regions)) return null;
  const regions = {};
  const rejected = [];
  for (const [key, entry] of Object.entries(raw.regions)) {
    const parsed = parseRegionEntry(key, entry);
    if (parsed) regions[key] = parsed;
    else rejected.push(key);
  }
  return {
    version: raw.version,
    updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : null,
    regions,
    rejected
  };
}

/**
 * URL der Länder-Datei. Wirft bei einem Namen, der nicht dem Schema entspricht (kein Pfad nach außen,
 * kein fremder Host), auch wenn das Manifest schon geprüft wurde.
 */
export function buildRegionUrl(baseUrl, file, id) {
  const matches = typeof file === 'string'
    && (id === undefined ? REGION_FILE_RE.test(file) : REGION_ID_RE.test(id) && regionFileRe(id).test(file));
  if (!matches) {
    throw new Error(`Ungültiger Länder-Dateiname: ${String(file).slice(0, 80)}`);
  }
  return `${String(baseUrl).replace(/\/+$/, '')}/${file}`;
}

// ------------------------------------------------------------------------------------------
// Geometrie des Ausschnitts
// ------------------------------------------------------------------------------------------

/** Ausschnitt als {south, west, north, east}; akzeptiert Leaflet-Bounds und einfache Objekte. */
export function viewportRect(bounds) {
  if (!bounds) return null;
  const south = typeof bounds.getSouth === 'function' ? bounds.getSouth() : (bounds.south ?? bounds._southWest?.lat);
  const north = typeof bounds.getNorth === 'function' ? bounds.getNorth() : (bounds.north ?? bounds._northEast?.lat);
  const west = typeof bounds.getWest === 'function' ? bounds.getWest() : (bounds.west ?? bounds._southWest?.lng);
  const east = typeof bounds.getEast === 'function' ? bounds.getEast() : (bounds.east ?? bounds._northEast?.lng);
  if (![south, north, west, east].every(isNum) || south > north || west > east) return null;
  return { south, west, north, east };
}

/** Schneiden sich Ausschnitt und Rechteck [west, süd, ost, nord]? Berührung zählt als Schnitt (konservativ). */
export function rectIntersectsBounds(rect, b) {
  return rect.west <= b[2] && rect.east >= b[0] && rect.south <= b[3] && rect.north >= b[1];
}

/** IDs aller Länder, deren Rechteck den Ausschnitt schneidet (aus der Abdeckung, also auch unveröffentlichte). */
export function requiredRegionIds(rect, regionBounds) {
  return Object.keys(regionBounds || {}).filter((id) => isValidBounds(regionBounds[id]) && rectIntersectsBounds(rect, regionBounds[id])).sort();
}

// ------------------------------------------------------------------------------------------
// Eignungsprüfung (rein, ohne State)
// ------------------------------------------------------------------------------------------

/**
 * Bestimmt, ob ein Ausschnitt über die Pipeline bedient werden kann, und aus welchen Dateien.
 * @param {*} bounds Leaflet-Bounds oder {south, west, north, east}
 * @param {number} zoom
 * @param {{manifest:Object|null, coverage:Array|null, regionBounds:Object|null}} data
 * @param {Object} [config] Standard: Config.pipeline
 * @returns {{eligible:boolean, reason:string, sources:Array<{id:string, kind:string, file:string}>, missing:string[]}}
 *   reason: disabled | not_ready | invalid_bounds | zoom | outside_coverage | region_missing | no_source | ok
 */
export function resolveEuropeSources(bounds, zoom, data, config = Config.pipeline) {
  const no = (reason, missing = []) => ({ eligible: false, reason, sources: [], missing });
  const eu = config?.europe;
  if (!eu?.enabled) return no('disabled');
  const { manifest, coverage, regionBounds } = data || {};
  if (!manifest || !Array.isArray(coverage) || coverage.length === 0 || !regionBounds) return no('not_ready');
  const rect = viewportRect(bounds);
  if (!rect) return no('invalid_bounds');
  if (!isNum(zoom) || zoom < (eu.minZoom ?? 12)) return no('zoom');

  // Ausschnitt vollständig innerhalb eines Abdeckungspolygons (Liste von Ringen [[lat, lon], ...])
  const inside = coverage.some((ring) => isRectInPolygon(rect.south, rect.west, rect.north, rect.east, ring));
  if (!inside) return no('outside_coverage');

  // Jedes Land, dessen Rechteck den Ausschnitt schneidet, muss veröffentlicht sein
  const needed = requiredRegionIds(rect, regionBounds);
  const missing = needed.filter((id) => !manifest.regions[id]);
  if (missing.length > 0) return no('region_missing', missing);

  const sources = [];
  const dach = config.bounds;
  if (dach && rectIntersectsBounds(rect, [dach.west, dach.south, dach.east, dach.north])) {
    sources.push({ id: 'dachlilu', kind: 'dachlilu', file: config.pmtilesFile || 'openfiremap.pmtiles' });
  }
  for (const id of needed) {
    sources.push({ id, kind: 'europe', file: manifest.regions[id].file });
  }
  if (sources.length === 0) return no('no_source');
  return { eligible: true, reason: 'ok', sources, missing: [] };
}

// ------------------------------------------------------------------------------------------
// Laden und Zustand
// ------------------------------------------------------------------------------------------

const _state = { manifest: null, coverage: null, regionBounds: null, loadedAt: 0, pending: null, failedAt: 0 };

/** Nur für Tests: Zustand setzen bzw. leeren. */
export function setEuropeStateForTests(next = {}) {
  _state.manifest = next.manifest ?? null;
  _state.coverage = next.coverage ?? null;
  _state.regionBounds = next.regionBounds ?? null;
  _state.loadedAt = next.loadedAt ?? 0;
  _state.pending = null;
  _state.failedAt = 0;
}

/** Aktuell geladene Daten (für die Eignungsprüfung); Felder sind null, solange nichts geladen ist. */
export function getEuropeData() {
  return { manifest: _state.manifest, coverage: _state.coverage, regionBounds: _state.regionBounds };
}

/**
 * Lädt Manifest und Abdeckung. Blockiert nie und wirft nie: Fehler werden geloggt, der Zustand bleibt
 * "nicht bereit" (bzw. der letzte gute Stand). Mehrere gleichzeitige Aufrufe teilen sich eine Anfrage.
 * @returns {Promise<boolean>} true, wenn Manifest und Abdeckung nutzbar sind
 */
export async function loadEuropeData({ signal, force = false } = {}) {
  const eu = Config.pipeline?.europe;
  if (!eu?.enabled || !Config.pipeline?.url) return false;
  const ready = () => Boolean(_state.manifest && _state.coverage);
  const fresh = Date.now() - _state.loadedAt < (eu.manifestTtlMs ?? 600000);
  if (!force && ready() && fresh) return true;
  if (_state.pending) return _state.pending;
  // Nach einem Fehler nicht bei jeder Kartenbewegung neu anfragen (isPipelineEligible stößt das Laden an)
  if (!force && _state.failedAt && Date.now() - _state.failedAt < (eu.manifestRetryMs ?? 30000)) return ready();

  _state.pending = (async () => {
    try {
      const base = String(Config.pipeline.url).replace(/\/+$/, '');
      const [rawManifest, coverageModule] = await Promise.all([
        fetchJson(`${base}/${eu.manifestPath || 'eu/regions.json'}`, { timeoutMs: eu.manifestTimeoutMs ?? 3000, signal }),
        _state.coverage ? Promise.resolve(null) : import('./coverage/europe.js')
      ]);
      const manifest = parseManifest(rawManifest);
      if (!manifest) throw new Error('Manifest hat ein unbekanntes Format');
      if (manifest.rejected.length > 0) console.warn('[Europe] Ungültige Manifest-Einträge verworfen:', manifest.rejected.join(', '));
      if (coverageModule) {
        _state.coverage = coverageModule.EUROPE_COVERAGE;
        _state.regionBounds = coverageModule.EUROPE_REGION_BOUNDS;
      }
      _state.manifest = manifest;
      _state.loadedAt = Date.now();
      _state.failedAt = 0;
      return ready();
    } catch (err) {
      _state.failedAt = Date.now();
      console.warn('[Europe] Manifest oder Abdeckung nicht verfügbar (nicht kritisch):', err?.message || err);
      return ready();
    } finally {
      _state.pending = null;
    }
  })();
  return _state.pending;
}

/** Synchrone Eignungsprüfung mit den geladenen Daten (für Aufrufer, die nicht warten können). */
export function resolveEuropeForViewport(bounds, zoom) {
  return resolveEuropeSources(bounds, zoom, getEuropeData());
}

export function isEuropeEligible(bounds, zoom) {
  return resolveEuropeForViewport(bounds, zoom).eligible;
}
