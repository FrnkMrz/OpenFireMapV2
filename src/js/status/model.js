/**
 * ==========================================================================================
 * DATEI: status/model.js
 * ZWECK: Rechenkern der Pipeline-Statusseite (/status/): macht aus dem Karten-Manifest
 *        (eu/regions.json), metadata.json (DACHLiLu-Build), den Einwohnerzahlen und der
 *        DACH-Zählung Zeilen je Land mit Gruppe, Hydranten-Dichte und Verzug.
 *
 * Reine Funktionen ohne DOM und Netz, damit sie sich testen lassen.
 *
 * Alle Auswertungen gelten je Land oder Gebiet. DACHLiLu ist ein gemeinsamer Build, wird aber nie
 * als Summe oder als DACH/LuLi-Teilgruppe ausgewertet; die fünf Länder stehen einzeln da.
 * ==========================================================================================
 */

export const DACHLILU_IDS = ['germany', 'austria', 'switzerland', 'luxembourg', 'liechtenstein'];

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const toMs = (iso) => {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
};

/**
 * Fügt Zeile und Einwohner zusammen. Fehlen Einwohner (neues Land im Manifest), bleiben die
 * abgeleiteten Werte null; die Zeile erscheint trotzdem in Zeitleiste und Tabelle.
 */
function finishRow(base, populationM) {
  const pop = isNum(populationM) && populationM > 0 ? populationM : null;
  const hydrants = isNum(base.hydrants) ? base.hydrants : null;
  const fireStations = isNum(base.fireStations) ? base.fireStations : null;
  const defibrillators = isNum(base.defibrillators) ? base.defibrillators : null;
  const lagH = base.osmMs != null && base.uploadMs != null
    ? Math.round(((base.uploadMs - base.osmMs) / 36e5) * 10) / 10
    : null;
  return {
    ...base,
    hydrants,
    fireStations,
    defibrillators,
    populationM: pop,
    per1000: pop && hydrants != null ? hydrants / (pop * 1000) : null,
    fireStationsPer100k: pop && fireStations != null ? fireStations / (pop * 10) : null,
    defibrillatorsPer100k: pop && defibrillators != null ? defibrillators / (pop * 10) : null,
    inhPerHydrant: pop && hydrants ? (pop * 1e6) / hydrants : null,
    lagH
  };
}

// Zählungen je Ebene; Schlüssel wie in metadata.json (features.<ebene>) und in der Zählung
const LAYERS = [
  ['hydrants', 'hydrants'],
  ['fire_stations', 'fireStations'],
  ['water_points', 'waterPoints'],
  ['defibrillators', 'defibrillators']
];

/**
 * Zeilen für die fünf DACHLiLu-Länder aus metadata.json. Zahlen je Land und Ebene stammen aus
 * features.<ebene>.by_country (vom Builder), sonst aus der eingecheckten Zählung (`snapshot`).
 * @returns {{rows: Object[], usedSnapshot: boolean}}
 */
export function buildDachRows(metadata, snapshot, populationM) {
  const rows = [];
  let usedSnapshot = false;
  const extracts = metadata?.extracts && typeof metadata.extracts === 'object' ? metadata.extracts : {};
  const generatedMs = toMs(metadata?.generated_at);
  for (const id of DACHLILU_IDS) {
    const ex = extracts[id];
    if (!ex) continue;
    const counts = {};
    for (const [layer, key] of LAYERS) {
      const live = metadata?.features?.[layer]?.by_country;
      const snap = snapshot?.[layer];
      if (live && isNum(live[id])) counts[key] = live[id];
      else if (snap && isNum(snap[id])) { counts[key] = snap[id]; usedSnapshot = true; }
      else counts[key] = null;
    }
    rows.push(finishRow({
      id,
      nameDe: typeof ex.name === 'string' ? ex.name : id,
      ...counts,
      boundaries: null,
      sizeMb: null,
      shared: true,
      file: typeof metadata?.pmtiles?.file === 'string' ? metadata.pmtiles.file : null,
      minzoom: isNum(metadata?.pmtiles?.minzoom) ? metadata.pmtiles.minzoom : null,
      maxzoom: isNum(metadata?.pmtiles?.maxzoom) ? metadata.pmtiles.maxzoom : null,
      osmMs: toMs(ex.osm_data_timestamp),
      uploadMs: generatedMs,
      fetchedMs: toMs(ex.mtime),
      extractSizeMb: isNum(ex.size_mb) ? ex.size_mb : null
    }, populationM?.[id]));
  }
  return { rows, usedSnapshot };
}

/** Zeilen für alle Länder-Dateien des Manifests (ungültige Einträge werden übersprungen). */
export function buildRegionRows(manifest, populationM) {
  const regions = manifest?.regions && typeof manifest.regions === 'object' ? manifest.regions : {};
  const rows = [];
  for (const [id, r] of Object.entries(regions)) {
    if (!r || typeof r !== 'object' || DACHLILU_IDS.includes(id)) continue;
    const osmMs = toMs(r.osm_data_until);
    const uploadMs = toMs(r.generated_at);
    if (uploadMs == null) continue;
    const c = r.counts ?? {};
    rows.push(finishRow({
      id,
      nameDe: typeof r.name === 'string' ? r.name : id,
      hydrants: c.hydrants,
      fireStations: isNum(c.fire_stations) ? c.fire_stations : null,
      waterPoints: isNum(c.water_points) ? c.water_points : null,
      defibrillators: isNum(c.defibrillators) ? c.defibrillators : null,
      boundaries: isNum(c.boundaries) ? c.boundaries : null,
      sizeMb: isNum(r.size_bytes) ? Math.round((r.size_bytes / 1e6) * 100) / 100 : null,
      shared: false,
      file: typeof r.file === 'string' ? r.file : null,
      minzoom: isNum(r.minzoom) ? r.minzoom : null,
      maxzoom: isNum(r.maxzoom) ? r.maxzoom : null,
      osmMs,
      uploadMs,
      fetchedMs: null,
      extractSizeMb: null
    }, populationM?.[id]));
  }
  return rows;
}

/** Alles zusammen: Zeilen (DACHLiLu-Länder zuerst) und Hinweise für die Seite. */
// Gebiete, die der Auszug eines anderen Landes schon enthält (Geofabrik-Portugal umfasst die Azoren): sie
// bleiben als eigene Zeile stehen, zählen in den Gesamtsummen aber nur einmal.
export const CONTAINED_IN = { azores: 'portugal' };

export function buildRows({ manifest, metadata, snapshot, population }) {
  const popMap = population?.populationM ?? population ?? {};
  const dach = buildDachRows(metadata, snapshot, popMap);
  const regions = buildRegionRows(manifest, popMap);
  return {
    rows: [...dach.rows, ...regions].map((r) => ({ ...r, containedIn: CONTAINED_IN[r.id] ?? null })),
    // Die Auszüge fehlen in einer vorhandenen metadata.json: die Länder erscheinen nicht, die Seite soll das melden
    dachMissing: metadata ? DACHLILU_IDS.filter((id) => !dach.rows.some((r) => r.id === id)) : [],
    usedSnapshot: dach.usedSnapshot,
    hasDach: dach.rows.length > 0
  };
}

/** Anteil je Einheit über die Länder, die Zählung und Einwohner kennen (Einwohner in Millionen). */
function densityOf(rows, countKey, perMillionDivisor) {
  const known = rows.filter((r) => r[countKey] != null && r.populationM != null);
  const pop = known.reduce((s, r) => s + r.populationM, 0);
  return pop > 0 ? known.reduce((s, r) => s + r[countKey], 0) / (pop * perMillionDivisor) : null;
}

function sumRows(rows) {
  // Summen zählen nur Länder mit Angabe; wie viele fehlen, steht daneben, damit die Summe nicht vollständig wirkt
  const sum = (k) => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
  const unknown = (k) => rows.filter((r) => r[k] == null).length;
  const withHydrantDensity = rows.filter((r) => r.per1000 != null);
  const pop = Math.round(withHydrantDensity.reduce((s, r) => s + r.populationM, 0) * 100) / 100;
  return {
    regions: rows.length,
    hydrants: sum('hydrants'),
    fireStations: sum('fireStations'),
    defibrillators: sum('defibrillators'),
    hydrantsUnknown: unknown('hydrants'),
    fireStationsUnknown: unknown('fireStations'),
    defibrillatorsUnknown: unknown('defibrillators'),
    populationM: pop,
    per1000: densityOf(rows, 'hydrants', 1000),
    fireStationsPer100k: densityOf(rows, 'fireStations', 10),
    defibrillatorsPer100k: densityOf(rows, 'defibrillators', 10)
  };
}

/**
 * Gesamtkennzahlen über alle Länder. Dichten zählen nur Länder mit bekannter Einwohnerzahl; ein Gebiet, das
 * schon im Auszug eines anderen Landes steckt (Azoren in Portugal), zählt in Objektzahlen, Einwohnern und
 * Dichten nicht doppelt. Ältester Datenstand und letzter Upload gelten für ALLE veröffentlichten Karten, auch
 * für die doppelt enthaltene: Es ist eine eigene Datei mit eigenem Stand.
 */
export function summarize(rows) {
  const own = rows.filter((r) => !r.containedIn || !rows.some((x) => x.id === r.containedIn));
  const osm = rows.map((r) => r.osmMs).filter((v) => v != null);
  const up = rows.map((r) => r.uploadMs).filter((v) => v != null);
  return {
    total: {
      ...sumRows(own),
      regions: rows.length,
      oldestOsmMs: osm.length ? Math.min(...osm) : null,
      latestUploadMs: up.length ? Math.max(...up) : null
    }
  };
}

/** Zeilen der Zeitleiste: je Land eine, neuester Upload zuerst, dann die meisten Hydranten. */
export function timelineRows(rows) {
  return rows
    .filter((r) => r.osmMs != null && r.uploadMs != null)
    .sort((a, b) => b.uploadMs - a.uploadMs || (b.hydrants ?? 0) - (a.hydrants ?? 0) || a.id.localeCompare(b.id));
}

/**
 * Rhythmus und letzter Lauf: Die fünf DACHLiLu-Länder entstehen in einem gemeinsamen, täglich geprüften Build,
 * alle übrigen Länder einzeln einmal pro Woche. "Letzter Lauf" ist die letzte Veröffentlichung (Upload).
 * metadata: die geprüfte metadata.json des DACHLiLu-Builds (oder null).
 */
export function cadence(rows, metadata) {
  const times = (list) => list.map((r) => r.uploadMs).filter((v) => v != null);
  // Der Lauf des gemeinsamen Builds steht in metadata.json selbst; er gilt auch dann, wenn dort einzelne Auszüge fehlen
  // und deshalb keine Länder-Zeilen entstehen. Ohne metadata.json bleibt die Zeit der Länder-Zeilen als Rückfall.
  const generated = toMs(metadata?.generated_at);
  const dach = generated != null ? [generated] : times(rows.filter((r) => r.shared));
  const eu = rows.filter((r) => !r.shared);
  const euTimes = times(eu);
  return {
    dach: { lastMs: dach.length ? Math.max(...dach) : null },
    eu: {
      regions: eu.length,
      lastMs: euTimes.length ? Math.max(...euTimes) : null,
      oldestMs: euTimes.length ? Math.min(...euTimes) : null
    }
  };
}

/** Status eines Auszugs im Builder (`extracts.<land>.status` in metadata.json) -> Art des Bezugs in diesem Lauf. */
const DOWNLOAD_KIND = {
  fresh_download: 'downloaded',
  downloaded_dated: 'downloaded',
  cached_head_ok: 'cached',
  cached_head_failed: 'fallback',
  fallback_after_error: 'fallback'
};

/**
 * Was der letzte Lauf je Geofabrik-Auszug getan hat: `downloaded` (neu geladen), `cached` (Geofabrik unverändert,
 * Auszug aus dem Cache) oder `fallback` (Geofabrik nicht erreichbar, älterer Auszug weiterverwendet); alles andere
 * (fehlender oder unbekannter Status) ist `unknown`. Reihenfolge: DACHLiLu-Länder, dann der Rest wie in metadata.json.
 * @returns {{id: string, nameDe: string, sizeMb: number|null, kind: string}[]}
 */
export function runDownloads(metadata) {
  const extracts = metadata?.extracts && typeof metadata.extracts === 'object' && !Array.isArray(metadata.extracts) ? metadata.extracts : {};
  const ids = [...DACHLILU_IDS.filter((id) => id in extracts), ...Object.keys(extracts).filter((id) => !DACHLILU_IDS.includes(id))];
  return ids.filter((id) => extracts[id] && typeof extracts[id] === 'object').map((id) => {
    const ex = extracts[id];
    return {
      id,
      nameDe: typeof ex.name === 'string' ? ex.name : id,
      sizeMb: isNum(ex.size_mb) ? ex.size_mb : null,
      kind: Object.hasOwn(DOWNLOAD_KIND, ex.status) ? DOWNLOAD_KIND[ex.status] : 'unknown'
    };
  });
}
