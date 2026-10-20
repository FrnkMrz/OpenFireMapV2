/**
 * ==========================================================================================
 * DATEI: status/model.js
 * ZWECK: Rechenkern der Pipeline-Statusseite (/status/): macht aus dem Karten-Manifest
 *        (eu/regions.json), metadata.json (DACHLiLu-Build), den Einwohnerzahlen und der
 *        DACH-Zählung Zeilen je Land mit Gruppe, Hydranten-Dichte und Verzug.
 *
 * Reine Funktionen ohne DOM und Netz, damit sie sich testen lassen.
 *
 * Gruppen: DACH (DE, AT, CH), LuLi (LU, LI), Top-5 (die fünf Länder mit den meisten Hydranten
 * außerhalb von DACHLiLu), Rest (alle übrigen veröffentlichten Länder).
 * ==========================================================================================
 */

export const DACH_IDS = ['germany', 'austria', 'switzerland'];
export const LULI_IDS = ['luxembourg', 'liechtenstein'];
export const DACHLILU_IDS = [...DACH_IDS, ...LULI_IDS];
export const GROUPS = ['DACH', 'LuLi', 'Top-5', 'Rest'];
export const TOP_COUNT = 5;

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
  const lagH = base.osmMs != null && base.uploadMs != null
    ? Math.round(((base.uploadMs - base.osmMs) / 36e5) * 10) / 10
    : null;
  return {
    ...base,
    hydrants,
    populationM: pop,
    per1000: pop && hydrants != null ? hydrants / (pop * 1000) : null,
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
      file: null,
      minzoom: null,
      maxzoom: null,
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

/**
 * Lauf-Dokumentation: eine Zeile je veröffentlichter Datei, neueste zuerst. DACHLiLu ist EIN Build
 * (eine Datei für fünf Länder) und steht mit den Gesamtzahlen aus metadata.json als erste Zeile;
 * die Länder-Dateien kommen aus dem Manifest. Laufzeiten gibt es nur für den DACHLiLu-Build.
 */
export function buildRunRows(manifest, metadata) {
  const rows = [];
  const regions = manifest?.regions && typeof manifest.regions === 'object' ? manifest.regions : {};
  for (const [id, r] of Object.entries(regions)) {
    if (!r || typeof r !== 'object' || DACHLILU_IDS.includes(id)) continue;
    const uploadMs = toMs(r.generated_at);
    if (uploadMs == null) continue;
    const osmMs = toMs(r.osm_data_until);
    const c = r.counts ?? {};
    rows.push({
      id, nameDe: typeof r.name === 'string' ? r.name : id, shared: false,
      file: typeof r.file === 'string' ? r.file : null,
      uploadMs, osmMs,
      lagH: osmMs != null ? Math.round(((uploadMs - osmMs) / 36e5) * 10) / 10 : null,
      sizeMb: isNum(r.size_bytes) ? Math.round((r.size_bytes / 1e6) * 100) / 100 : null,
      minzoom: isNum(r.minzoom) ? r.minzoom : null,
      maxzoom: isNum(r.maxzoom) ? r.maxzoom : null,
      hydrants: isNum(c.hydrants) ? c.hydrants : null,
      fireStations: isNum(c.fire_stations) ? c.fire_stations : null,
      waterPoints: isNum(c.water_points) ? c.water_points : null,
      defibrillators: isNum(c.defibrillators) ? c.defibrillators : null,
      boundaries: isNum(c.boundaries) ? c.boundaries : null
    });
  }
  if (metadata?.pmtiles && metadata.generated_at) {
    const uploadMs = toMs(metadata.generated_at);
    const osmMs = toMs(metadata.osm_data_until);
    const f = metadata.features ?? {};
    const n = (k) => (isNum(f[k]?.count) ? f[k].count : null);
    rows.push({
      id: 'dachlilu', nameDe: 'DACHLiLu', shared: true,
      file: typeof metadata.pmtiles.file === 'string' ? metadata.pmtiles.file : null,
      uploadMs, osmMs,
      lagH: uploadMs != null && osmMs != null ? Math.round(((uploadMs - osmMs) / 36e5) * 10) / 10 : null,
      sizeMb: isNum(metadata.pmtiles.size_mb) ? metadata.pmtiles.size_mb : null,
      minzoom: isNum(metadata.pmtiles.minzoom) ? metadata.pmtiles.minzoom : null,
      maxzoom: isNum(metadata.pmtiles.maxzoom) ? metadata.pmtiles.maxzoom : null,
      hydrants: n('hydrants'), fireStations: n('fire_stations'), waterPoints: n('water_points'),
      defibrillators: n('defibrillators'), boundaries: n('boundaries')
    });
  }
  return rows.sort((a, b) => (b.uploadMs ?? 0) - (a.uploadMs ?? 0));
}

/** Weist jeder Zeile ihre Gruppe zu. Top-5: die meisten Hydranten außerhalb von DACHLiLu. */
export function assignGroups(rows) {
  const top = rows
    .filter((r) => !DACHLILU_IDS.includes(r.id) && r.hydrants != null)
    .sort((a, b) => b.hydrants - a.hydrants || a.id.localeCompare(b.id))
    .slice(0, TOP_COUNT)
    .map((r) => r.id);
  return rows.map((r) => ({
    ...r,
    group: DACH_IDS.includes(r.id) ? 'DACH' : LULI_IDS.includes(r.id) ? 'LuLi' : top.includes(r.id) ? 'Top-5' : 'Rest'
  }));
}

/** Alles zusammen: Zeilen (DACHLiLu-Länder zuerst) und Hinweise für die Seite. */
export function buildRows({ manifest, metadata, snapshot, population }) {
  const popMap = population?.populationM ?? population ?? {};
  const dach = buildDachRows(metadata, snapshot, popMap);
  const regions = buildRegionRows(manifest, popMap);
  return {
    rows: assignGroups([...dach.rows, ...regions]),
    runRows: buildRunRows(manifest, metadata),
    usedSnapshot: dach.usedSnapshot,
    hasDach: dach.rows.length > 0
  };
}

function sumGroup(rows) {
  const withDensity = rows.filter((r) => r.per1000 != null);
  const hydrants = rows.reduce((s, r) => s + (r.hydrants ?? 0), 0);
  const fireStations = rows.reduce((s, r) => s + (r.fireStations ?? 0), 0);
  const hydrantsWithPop = withDensity.reduce((s, r) => s + r.hydrants, 0);
  const pop = Math.round(withDensity.reduce((s, r) => s + r.populationM, 0) * 100) / 100;
  const osm = rows.map((r) => r.osmMs).filter((v) => v != null);
  const up = rows.map((r) => r.uploadMs).filter((v) => v != null);
  return {
    regions: rows.length,
    hydrants,
    fireStations,
    populationM: pop,
    per1000: pop > 0 ? hydrantsWithPop / (pop * 1000) : null,
    oldestOsmMs: osm.length ? Math.min(...osm) : null,
    latestUploadMs: up.length ? Math.max(...up) : null
  };
}

/** Kennzahlen insgesamt und je Gruppe. Die Dichte zählt nur Länder mit bekannter Einwohnerzahl. */
export function summarize(rows) {
  const groups = {};
  for (const g of GROUPS) groups[g] = sumGroup(rows.filter((r) => r.group === g));
  return {
    total: sumGroup(rows),
    groups,
    top5: rows.filter((r) => r.group === 'Top-5').sort((a, b) => b.hydrants - a.hydrants)
  };
}

/** Sortiert Zeilen für die Zeitleiste: je Gruppe, Top-5 und DACH nach Hydranten, Rest nach Upload (neu zuerst). */
export function timelineGroups(rows) {
  return GROUPS.map((g) => {
    const rs = rows.filter((r) => r.group === g && r.osmMs != null && r.uploadMs != null);
    rs.sort(g === 'Rest' ? (a, b) => b.uploadMs - a.uploadMs : (a, b) => (b.hydrants ?? 0) - (a.hydrants ?? 0));
    return { group: g, rows: rs };
  }).filter((x) => x.rows.length);
}
