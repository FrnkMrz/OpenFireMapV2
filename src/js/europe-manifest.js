/**
 * ==========================================================================================
 * DATEI: europe-manifest.js
 * ZWECK: Strenge Prüfung des Länder-Manifests (eu/regions.json). Gemeinsam genutzt von der Karte
 *        (europe.js) und der Statusseite (/status/), damit beide dieselben Einträge als
 *        veröffentlicht ansehen. Reine Funktionen ohne DOM und Netz; zieht bewusst weder config.js
 *        noch die Abdeckungspolygone mit.
 * ==========================================================================================
 */

const MANIFEST_VERSION = 1;
export const REGION_ID_RE = /^[a-z0-9-]+$/;
// Dateiname eines Länder-Archivs: eu/<land>-<UTC-Stempel>.pmtiles (versioniert, unveränderlich)
export const REGION_FILE_RE = /^eu\/[a-z0-9-]+-\d{8}T\d{6}Z\.pmtiles$/;
const STAMP_SUFFIX = '-\\d{8}T\\d{6}Z\\.pmtiles$';

/** Exaktes Dateimuster eines Landes. Ein Präfixvergleich genügt nicht: eu/ireland-… passt sonst auch auf ireland-and-northern-ireland. */
export function regionFileRe(id) {
  return new RegExp(`^eu/${id}${STAMP_SUFFIX}`);
}
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const OSM_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

// ------------------------------------------------------------------------------------------
// Manifest
// ------------------------------------------------------------------------------------------

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

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

