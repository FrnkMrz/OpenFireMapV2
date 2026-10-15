/**
 * Tests für die Abfrage über mehrere Quellen in pipeline.js (Europa-Erweiterung): DACHLiLu plus Länder-Dateien.
 * PMTiles und VectorTile sind gemockt; jede Quelle liefert eine Markierung, an der man sieht, woher ein Objekt kommt.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PMTiles } from 'pmtiles';

// Markierung der Quelle steckt im ersten Byte der "Kachel" (Pbf hält die Bytes in .buf)
let layersByMarker = {};
vi.mock('@mapbox/vector-tile', () => ({
  VectorTile: class MockVectorTile {
    constructor(pbf) {
      this.layers = layersByMarker[pbf?.buf?.[0]] || {};
    }
  }
}));

import { Config } from '../src/js/config.js';
import {
  isPipelineEligible, fetchPipelinePmtiles, fetchPipelineBoundaries, getVectorTile, getPipelineOsmDataUntil,
  getPipelineGeneratedAt, clearPipelineCache, waitForPendingBuffers, PmtilesCoverageMismatch
} from '../src/js/pipeline.js';
import { parseManifest, setEuropeStateForTests } from '../src/js/europe.js';
import { EUROPE_COVERAGE, EUROPE_REGION_BOUNDS } from '../src/js/coverage/europe.js';

const BASE = 'https://pipeline.example.com';
const STAMP = '20261015T145638Z';
const MARKER = { dach: 1, netherlands: 2, belgium: 3, norway: 4, sweden: 5, france: 6 };
const SHIPPED_PIPELINE = { ...Config.pipeline, europe: { ...Config.pipeline.europe }, bounds: { ...Config.pipeline.bounds } };

const DAY = 86400000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString().replace(/\.\d{3}Z$/, 'Z');
const regionFile = (id) => `eu/${id}-${STAMP}.pmtiles`;

let calls;          // { key, z, x, y } je getZxy
let failing;        // URLs, für die getZxy fehlschlägt
let headerFailing;  // URLs, für die getHeader fehlschlägt
let headers;        // URL-Teil -> PMTiles-Header
let dachOsmDaysAgo; // OSM-Datenstand von DACHLiLu (metadata.json), Tage vor jetzt
let headerGate;     // wenn gesetzt: getHeader() der Länder-Dateien wartet darauf (Promise)
let headerGateFor;  // Teil der URL, für den das Warten gilt

function markerFor(key) {
  if (key.includes('openfiremap.pmtiles')) return MARKER.dach;
  for (const id of Object.keys(MARKER)) if (key.includes(`/eu/${id}-`)) return MARKER[id];
  return 0;
}
const header = (minLon, minLat, maxLon, maxLat) => ({ minZoom: 0, maxZoom: 14, minLon, minLat, maxLon, maxLat });

function manifestFor(entries) {
  const regions = {};
  for (const [id, over] of Object.entries(entries)) {
    regions[id] = {
      id, name: id, file: regionFile(id), size_bytes: 1000, generated_at: iso(1) + '', osm_data_until: iso(2),
      bounds: EUROPE_REGION_BOUNDS[id], minzoom: 0, maxzoom: 14, ...over
    };
  }
  return parseManifest({ version: 1, updated_at: iso(0), regions });
}
function useEurope(entries) {
  Config.pipeline.europe.enabled = true;
  setEuropeStateForTests({ manifest: manifestFor(entries), coverage: EUROPE_COVERAGE, regionBounds: EUROPE_REGION_BOUNDS, loadedAt: Date.now() });
}
const poi = (osmId, layer = 'hydrants') => ({
  [layer]: { length: 1, feature: () => ({ toGeoJSON: () => ({ type: 'Feature', id: `t${osmId}`, geometry: { type: 'Point', coordinates: [5.85, 50.8] }, properties: { '@type': 'node', '@id': osmId, emergency: 'fire_hydrant' } }) }) }
});
const vp = (lat, lon, d = 0.001) => ({ south: lat - d, north: lat + d, west: lon - d, east: lon + d });
const AMSTERDAM = vp(52.37, 4.90);
const MAASTRICHT = vp(50.80, 5.85);        // DACHLiLu + Niederlande + Belgien
const MUNICH = vp(48.137, 11.576);
const ids = (els) => els.map((e) => `${e.type}:${e.id}`).sort();
const urlsUsed = () => [...new Set(calls.map((c) => c.key))].sort();

beforeEach(() => {
  layersByMarker = {};
  calls = [];
  failing = new Set();
  headerFailing = new Set();
  headers = { dach: header(5.69, 45.79, 17.2, 55.06) };
  dachOsmDaysAgo = 3;
  headerGate = null;
  headerGateFor = '/eu/';
  clearPipelineCache();
  Config.pipeline = { ...SHIPPED_PIPELINE, europe: { ...SHIPPED_PIPELINE.europe }, bounds: { ...SHIPPED_PIPELINE.bounds }, enabled: true, usePmtiles: true, url: BASE };
  setEuropeStateForTests();

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (String(url).includes('metadata.json')) {
      return { ok: true, json: async () => ({ generated_at: iso(0), osm_data_until: iso(dachOsmDaysAgo) }) };
    }
    return { ok: false, status: 404 };
  });
  vi.spyOn(PMTiles.prototype, 'getHeader').mockImplementation(async function () {
    const key = this.source.getKey();
    if (headerGate && key.includes(headerGateFor)) await headerGate;
    if (headerFailing.has(key) || [...headerFailing].some((f) => key.includes(f))) throw new Error(`Header nicht ladbar: ${key}`);
    if (key.includes('openfiremap.pmtiles')) return headers.dach;
    for (const id of Object.keys(MARKER)) if (key.includes(`/eu/${id}-`) && headers[id]) return headers[id];
    throw new Error(`Kein Test-Header für ${key}`);
  });
  vi.spyOn(PMTiles.prototype, 'getZxy').mockImplementation(async function (z, x, y) {
    const key = this.source.getKey();
    calls.push({ key, z, x, y });
    if ([...failing].some((f) => key.includes(f))) throw new Error(`Netzfehler: ${key}`);
    return { data: new Uint8Array([markerFor(key)]) };
  });
});

afterEach(async () => {
  await waitForPendingBuffers({ timeoutMs: 500 }).catch(() => {});
  vi.restoreAllMocks();
  clearPipelineCache();
  Config.pipeline = SHIPPED_PIPELINE;
  setEuropeStateForTests();
});

describe('isPipelineEligible mit Europa', () => {
  it('Schalter aus (Auslieferungszustand): Amsterdam bleibt außerhalb, München innerhalb wie bisher', () => {
    Config.pipeline.europe.enabled = false;
    setEuropeStateForTests({ manifest: manifestFor({ netherlands: {} }), coverage: EUROPE_COVERAGE, regionBounds: EUROPE_REGION_BOUNDS, loadedAt: Date.now() });
    expect(isPipelineEligible(AMSTERDAM, 15)).toBe(false);
    expect(isPipelineEligible(MUNICH, 15)).toBe(true);
  });

  it('Schalter an, aber Daten nicht geladen: wie bisher (Amsterdam außerhalb)', () => {
    Config.pipeline.europe.enabled = true;
    expect(isPipelineEligible(AMSTERDAM, 15)).toBe(false);
    expect(isPipelineEligible(MUNICH, 15)).toBe(true);
  });

  it('Schalter an und geladen: Amsterdam innerhalb, Landesgrenze innerhalb, München unverändert', () => {
    useEurope({ netherlands: {}, belgium: {}, france: {} });   // Maastricht liegt auch im Frankreich-Rechteck
    expect(isPipelineEligible(AMSTERDAM, 15)).toBe(true);
    expect(isPipelineEligible(MAASTRICHT, 15)).toBe(true);
    expect(isPipelineEligible(MUNICH, 15)).toBe(true);
  });

  it('fehlendes Land im Manifest, Zoom unter 12, Pipeline aus und Orte außerhalb der Abdeckung: nicht geeignet', () => {
    useEurope({ netherlands: {} });
    expect(isPipelineEligible(vp(48.86, 2.35), 15)).toBe(false);   // Paris, Frankreich fehlt
    expect(isPipelineEligible(AMSTERDAM, 11)).toBe(false);
    expect(isPipelineEligible(vp(50.45, 30.52), 15)).toBe(false);  // Kiew
    Config.pipeline.enabled = false;
    expect(isPipelineEligible(AMSTERDAM, 15)).toBe(false);
  });
});

describe('fetchPipelinePmtiles über mehrere Quellen', () => {
  it('nur ein Land (Amsterdam): genau diese Datei, ohne Versionsparameter, mit Objekten aus dieser Quelle', async () => {
    useEurope({ netherlands: {} });
    headers.netherlands = header(2.9, 50.7, 7.3, 54.0);
    layersByMarker[MARKER.netherlands] = poi(111);
    const els = await fetchPipelinePmtiles(AMSTERDAM, 'all', { zoom: 16 });
    expect(urlsUsed()).toEqual([`${BASE}/${regionFile('netherlands')}`]);
    expect(ids(els)).toEqual(['node:111']);
  });

  it('Landesgrenze: DACHLiLu (mit ?v=) und beide Länder, Objekte aller Quellen zusammengeführt', async () => {
    useEurope({ netherlands: {}, belgium: {}, france: {} });
    headers.france = header(-5.2, 41.3, 8.3, 48.9);   // Rechteck reicht bis Maastricht, die Datei nicht
    headers.netherlands = header(2.9, 50.7, 7.3, 54.0);
    headers.belgium = header(2.5, 49.4, 6.5, 51.6);
    layersByMarker[MARKER.dach] = poi(1);
    layersByMarker[MARKER.netherlands] = poi(2);
    layersByMarker[MARKER.belgium] = poi(3);
    const els = await fetchPipelinePmtiles(MAASTRICHT, 'all', { zoom: 16 });
    const used = urlsUsed();
    expect(used).toHaveLength(3);
    expect(used.some((u) => u.startsWith(`${BASE}/openfiremap.pmtiles?v=`))).toBe(true);
    expect(used).toContain(`${BASE}/${regionFile('netherlands')}`);
    expect(used).toContain(`${BASE}/${regionFile('belgium')}`);
    expect(ids(els)).toEqual(['node:1', 'node:2', 'node:3']);
  });

  it('dasselbe Objekt in zwei Auszügen erscheint nur einmal (type:id)', async () => {
    useEurope({ netherlands: {}, belgium: {}, france: {} });
    headers.france = header(-5.2, 41.3, 8.3, 48.9);   // Rechteck reicht bis Maastricht, die Datei nicht
    headers.netherlands = header(2.9, 50.7, 7.3, 54.0);
    headers.belgium = header(2.5, 49.4, 6.5, 51.6);
    layersByMarker[MARKER.dach] = poi(42);
    layersByMarker[MARKER.netherlands] = poi(42);
    layersByMarker[MARKER.belgium] = { ...poi(42), ...poi(7, 'fire_stations') };
    layersByMarker[MARKER.belgium].fire_stations.feature = () => ({ toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [5.85, 50.8] }, properties: { '@type': 'node', '@id': 7, amenity: 'fire_station' } }) });
    const els = await fetchPipelinePmtiles(MAASTRICHT, 'all', { zoom: 16 });
    expect(ids(els)).toEqual(['node:42', 'node:7']);
  });

  it('gleiche Kachelkoordinate in verschiedenen Dateien kollidiert nicht im Kachel-Cache', async () => {
    useEurope({ netherlands: {}, belgium: {}, france: {} });
    headers.france = header(-5.2, 41.3, 8.3, 48.9);   // Rechteck reicht bis Maastricht, die Datei nicht
    headers.netherlands = header(2.9, 50.7, 7.3, 54.0);
    headers.belgium = header(2.5, 49.4, 6.5, 51.6);
    layersByMarker[MARKER.dach] = poi(1);
    layersByMarker[MARKER.netherlands] = poi(2);
    layersByMarker[MARKER.belgium] = poi(3);
    await fetchPipelinePmtiles(MAASTRICHT, 'all', { zoom: 16 });
    const firstTile = calls[0];
    const sameTile = calls.filter((c) => c.z === firstTile.z && c.x === firstTile.x && c.y === firstTile.y);
    expect(new Set(sameTile.map((c) => c.key)).size).toBe(3);       // jede Datei wurde für diese Kachel gefragt
    // direkt: gleicher Schlüssel, andere Quelle -> eigener Eintrag; gleiche Quelle -> aus dem Cache
    clearPipelineCache();
    calls = [];
    const a = new PMTiles(`${BASE}/${regionFile('netherlands')}`);
    const b = new PMTiles(`${BASE}/${regionFile('belgium')}`);
    layersByMarker[MARKER.netherlands] = poi(2);
    layersByMarker[MARKER.belgium] = poi(3);
    const va = await getVectorTile(a, 14, 1, 1, undefined, 'eu:netherlands:x|');
    const vb = await getVectorTile(b, 14, 1, 1, undefined, 'eu:belgium:x|');
    const va2 = await getVectorTile(a, 14, 1, 1, undefined, 'eu:netherlands:x|');
    expect(va).not.toBe(vb);
    expect(va2).toBe(va);
    expect(calls).toHaveLength(2);
  });

  it('eine Quelle, deren Header den Ausschnitt nicht berührt, wird übersprungen', async () => {
    // Stockholm: das Norwegen-Rechteck reicht bis dorthin, die Datei selbst hat dort keine Daten
    useEurope({ norway: {}, sweden: {} });
    headers.norway = header(4.5, 60.5, 31.2, 71.2);         // Daten erst ab 60,5° Nord: Stockholm (59,3° Nord) wird nicht berührt
    headers.sweden = header(10.5, 55.0, 24.3, 69.1);
    layersByMarker[MARKER.sweden] = poi(5);
    const els = await fetchPipelinePmtiles(vp(59.3, 18.0), 'all', { zoom: 16 });
    expect(urlsUsed()).toEqual([`${BASE}/${regionFile('sweden')}`]);
    expect(ids(els)).toEqual(['node:5']);
  });

  it('keine Quelle enthält den Ausschnitt: PmtilesCoverageMismatch', async () => {
    useEurope({ netherlands: {} });
    headers.netherlands = header(2.9, 50.7, 3.0, 50.8);     // winziger Bereich weit weg von Amsterdam
    await expect(fetchPipelinePmtiles(AMSTERDAM, 'all', { zoom: 16 })).rejects.toBeInstanceOf(PmtilesCoverageMismatch);
  });

  it('Header einer Länder-Datei nicht ladbar: Fehler statt lückenhaftem Ergebnis (Rückfall auf Overpass)', async () => {
    useEurope({ netherlands: {}, belgium: {}, france: {} });
    headers.france = header(-5.2, 41.3, 8.3, 48.9);   // Rechteck reicht bis Maastricht, die Datei nicht
    headers.netherlands = header(2.9, 50.7, 7.3, 54.0);
    headers.belgium = header(2.5, 49.4, 6.5, 51.6);
    headerFailing.add(`/eu/belgium-`);
    layersByMarker[MARKER.dach] = poi(1);
    await expect(fetchPipelinePmtiles(MAASTRICHT, 'all', { zoom: 16 })).rejects.toThrow(/Header nicht ladbar/);
  });

  it('Kachelfehler in einer Quelle verwirft nur deren Kachel, die anderen Quellen liefern weiter', async () => {
    useEurope({ netherlands: {}, belgium: {}, france: {} });
    headers.france = header(-5.2, 41.3, 8.3, 48.9);   // Rechteck reicht bis Maastricht, die Datei nicht
    headers.netherlands = header(2.9, 50.7, 7.3, 54.0);
    headers.belgium = header(2.5, 49.4, 6.5, 51.6);
    layersByMarker[MARKER.dach] = poi(1);
    layersByMarker[MARKER.netherlands] = poi(2);
    layersByMarker[MARKER.belgium] = poi(3);
    failing.add('/eu/netherlands-');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const els = await fetchPipelinePmtiles(MAASTRICHT, 'all', { zoom: 16 });
    expect(ids(els)).toEqual(['node:1', 'node:3']);
    expect(warn.mock.calls.flat().join(' ')).toContain('netherlands');
  });

  it('DACHLiLu-Ausschnitt bleibt beim bisherigen Weg: nur die DACHLiLu-Datei, auch mit Schalter an', async () => {
    useEurope({ netherlands: {}, belgium: {} });
    layersByMarker[MARKER.dach] = poi(9);
    const els = await fetchPipelinePmtiles(MUNICH, 'all', { zoom: 16 });
    const used = urlsUsed();
    expect(used).toHaveLength(1);
    expect(used[0].startsWith(`${BASE}/openfiremap.pmtiles?v=`)).toBe(true);
    expect(ids(els)).toEqual(['node:9']);
  });

  it('DACHLiLu-Ausschnitt: der Stand von DACHLiLu bleibt auch über der Mehrquellen-Obergrenze erhalten (alter Weg, keine Änderung)', async () => {
    useEurope({ netherlands: {} });
    dachOsmDaysAgo = 12;                                  // älter als die Obergrenze für Länder-Daten (10 Tage)
    layersByMarker[MARKER.dach] = poi(9);
    const els = await fetchPipelinePmtiles(MUNICH, 'all', { zoom: 16 });
    expect(getPipelineOsmDataUntil(els)).not.toBeNull();
    expect(Date.now() - Date.parse(getPipelineOsmDataUntil(els))).toBeGreaterThan(11.5 * DAY);
  });

  it('Schalter aus: Amsterdam wird wie bisher gegen den DACHLiLu-Header geprüft und scheitert mit PmtilesCoverageMismatch', async () => {
    Config.pipeline.europe.enabled = false;
    setEuropeStateForTests({ manifest: manifestFor({ netherlands: {} }), coverage: EUROPE_COVERAGE, regionBounds: EUROPE_REGION_BOUNDS, loadedAt: Date.now() });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(fetchPipelinePmtiles(AMSTERDAM, 'all', { zoom: 16 })).rejects.toBeInstanceOf(PmtilesCoverageMismatch);
    expect(urlsUsed().every((u) => u.includes('openfiremap.pmtiles'))).toBe(true);
  });
});

describe('Datenstand über mehrere Quellen', () => {
  const setup = (over = {}) => {
    useEurope({
      netherlands: { osm_data_until: iso(2), generated_at: iso(1), ...(over.netherlands || {}) },
      belgium: { osm_data_until: iso(5), generated_at: iso(4), ...(over.belgium || {}) },
      france: {}
    });
    headers.france = header(-5.2, 41.3, 8.3, 48.9);   // Rechteck reicht bis Maastricht, die Datei nicht
    headers.netherlands = header(2.9, 50.7, 7.3, 54.0);
    headers.belgium = header(2.5, 49.4, 6.5, 51.6);
    layersByMarker[MARKER.dach] = poi(1);
  };

  it('der älteste Stand aller beteiligten Dateien gilt (DACHLiLu 3 Tage, NL 2 Tage, BE 5 Tage)', async () => {
    setup();
    const nlEntry = (await import('../src/js/europe.js')).getEuropeData().manifest.regions;
    const els = await fetchPipelinePmtiles(MAASTRICHT, 'all', { zoom: 16 });
    expect(getPipelineOsmDataUntil(els)).toBe(nlEntry.belgium.osmDataUntil);
    expect(getPipelineGeneratedAt(els)).toBe(nlEntry.belgium.generatedAt);
  });

  it('nur ein Land: dessen Stand', async () => {
    setup();
    const els = await fetchPipelinePmtiles(AMSTERDAM, 'all', { zoom: 16 });
    const reg = (await import('../src/js/europe.js')).getEuropeData().manifest.regions;
    expect(getPipelineOsmDataUntil(els)).toBe(reg.netherlands.osmDataUntil);
  });

  it('kennt eine Quelle ihren OSM-Datenstand nicht, gibt es keinen (kein Overpass-Delta)', async () => {
    setup({ belgium: { osm_data_until: null } });
    const els = await fetchPipelinePmtiles(MAASTRICHT, 'all', { zoom: 16 });
    expect(getPipelineOsmDataUntil(els)).toBeNull();
  });

  it('ist der älteste Stand älter als die Obergrenze (Standard 10 Tage), gibt es keinen', async () => {
    setup({ belgium: { osm_data_until: iso(11) } });
    const els = await fetchPipelinePmtiles(MAASTRICHT, 'all', { zoom: 16 });
    expect(getPipelineOsmDataUntil(els)).toBeNull();
  });

  it('die Obergrenze ist einstellbar', async () => {
    setup({ belgium: { osm_data_until: iso(11) } });
    Config.pipeline.europe.liveDeltaMaxAgeDays = 14;
    const els = await fetchPipelinePmtiles(MAASTRICHT, 'all', { zoom: 16 });
    expect(getPipelineOsmDataUntil(els)).not.toBeNull();
  });

  it('ein Ergebnis nur aus DACHLiLu trägt keinen eigenen Stand: es gilt der von DACHLiLu', async () => {
    setup();
    const multi = await fetchPipelinePmtiles(MAASTRICHT, 'all', { zoom: 16 });
    const dach = await fetchPipelinePmtiles(MUNICH, 'all', { zoom: 16 });
    expect(dach.pipelineMeta).toBeUndefined();
    expect(getPipelineOsmDataUntil(dach)).toMatch(/Z$/);
    expect(Date.now() - Date.parse(getPipelineOsmDataUntil(dach))).toBeGreaterThan(2.5 * DAY);   // DACHLiLu: vor 3 Tagen
    expect(Date.now() - Date.parse(getPipelineOsmDataUntil(dach))).toBeLessThan(3.5 * DAY);
    // das frühere Mehrquellen-Ergebnis behält seinen eigenen Stand
    expect(Date.parse(getPipelineOsmDataUntil(multi))).toBeLessThan(Date.parse(getPipelineOsmDataUntil(dach)));
  });

  it('der Stand hängt am Ergebnis der Anfrage, nicht an globalem Zustand: gleichzeitige Anfragen überschreiben einander nicht', async () => {
    setup();
    const [a, b] = await Promise.all([
      fetchPipelinePmtiles(MAASTRICHT, 'all', { zoom: 16 }),   // DACHLiLu + NL + BE: Belgien (5 Tage) ist der älteste
      fetchPipelinePmtiles(AMSTERDAM, 'all', { zoom: 16 })     // nur NL (2 Tage)
    ]);
    const reg = (await import('../src/js/europe.js')).getEuropeData().manifest.regions;
    expect(getPipelineOsmDataUntil(a)).toBe(reg.belgium.osmDataUntil);
    expect(getPipelineOsmDataUntil(b)).toBe(reg.netherlands.osmDataUntil);
    // ohne Ergebnis: weiterhin nur der Stand von DACHLiLu, kein Rest einer der beiden Anfragen
    expect(Date.now() - Date.parse(getPipelineOsmDataUntil())).toBeGreaterThan(2.5 * DAY);
    expect(Date.now() - Date.parse(getPipelineOsmDataUntil())).toBeLessThan(3.5 * DAY);
  });

  it('eine überholte (abgebrochene) Anfrage bricht ab, sobald die Header da sind, und liefert nichts', async () => {
    setup();
    let release;
    headerGate = new Promise((resolve) => { release = resolve; });
    const controller = new AbortController();
    const pending = fetchPipelinePmtiles(AMSTERDAM, 'all', { zoom: 16, signal: controller.signal });
    const outcome = pending.then(() => 'fertig', (e) => e.name);
    controller.abort();
    release();
    expect(await outcome).toBe('AbortError');
    expect(calls).toHaveLength(0);
  });
});

describe('Pufferring über mehrere Quellen', () => {
  // Landesgrenze Niederlande/Belgien bei Breda: Das Belgien-Rechteck endet knapp im Pufferring, nicht im Ausschnitt
  const BREDA = vp(51.53, 4.47);
  const BORDER_BOUNDS = { ...EUROPE_REGION_BOUNDS, belgium: [2.5, 49.4, 6.5, 51.515] };
  const setupBorder = (entries) => {
    Config.pipeline.europe.enabled = true;
    setEuropeStateForTests({ manifest: manifestFor(entries), coverage: EUROPE_COVERAGE, regionBounds: BORDER_BOUNDS, loadedAt: Date.now() });
    headers.netherlands = header(2.9, 50.7, 7.3, 54.0);
    headers.belgium = header(2.5, 49.4, 6.5, 51.52);
    layersByMarker[MARKER.netherlands] = poi(111);
    layersByMarker[MARKER.belgium] = poi(222);
  };
  const sameRect = (a, b) => ['south', 'north', 'west', 'east'].every((k) => Math.abs(a[k] - b[k]) < 1e-9);

  it('braucht der Ring eine weitere Quelle, wird sie nur für die Ring-Kacheln geöffnet und bestimmt den Datenstand', async () => {
    setupBorder({ netherlands: {}, belgium: { osm_data_until: iso(6) } });
    const els = await fetchPipelinePmtiles(BREDA, 'all', { zoom: 16 });
    await waitForPendingBuffers({ timeoutMs: 500 });
    const be = calls.filter((c) => c.key.includes('/eu/belgium-'));
    const nl = calls.filter((c) => c.key.includes('/eu/netherlands-'));
    expect(nl).toHaveLength(9);                                  // sichtbare Kachel plus acht Ring-Kacheln
    expect(be).toHaveLength(8);                                  // nur Ring, die sichtbare Kachel nicht
    expect(be.some((c) => nl[0].x === c.x && nl[0].y === c.y)).toBe(false);
    const reg = (await import('../src/js/europe.js')).getEuropeData().manifest.regions;
    expect(getPipelineOsmDataUntil(els)).toBe(reg.belgium.osmDataUntil);   // ältester Stand schließt den Ring ein
  });

  it('wird der Ring nicht von allen Quellen bedient (Belgien nicht veröffentlicht), gibt es keinen Ring und keine Abdeckungsmeldung dafür', async () => {
    setupBorder({ netherlands: {} });
    const onBufferComplete = vi.fn();
    const els = await fetchPipelinePmtiles(BREDA, 'all', { zoom: 16, onBufferComplete });
    await waitForPendingBuffers({ timeoutMs: 500 });
    expect(calls).toHaveLength(1);                               // nur die sichtbare Kachel
    expect(onBufferComplete).not.toHaveBeenCalled();
    expect(sameRect(els.loadedBounds, els.bufferBounds)).toBe(true);   // Abdeckung = sichtbarer Ausschnitt
  });

  it('eine überholte Anfrage bricht auch ab, während die Quellen des Rings geöffnet werden', async () => {
    setupBorder({ netherlands: {}, belgium: {} });
    let release;
    headerGate = new Promise((resolve) => { release = resolve; });
    headerGateFor = '/eu/belgium-';                              // Belgien wird erst für den Ring geöffnet
    const controller = new AbortController();
    const outcome = fetchPipelinePmtiles(BREDA, 'all', { zoom: 16, signal: controller.signal }).then(() => 'fertig', (e) => e.name);
    await new Promise((resolve) => setTimeout(resolve, 20));    // Ausschnitt ist geplant, der Ring wartet auf Belgien
    controller.abort();
    release();
    expect(await outcome).toBe('AbortError');
  });

  it('Gegenprobe: ist der Ring bedient, meldet der Pufferring seinen ganzen Bereich als abgedeckt', async () => {
    setupBorder({ netherlands: {}, belgium: {} });
    const onBufferComplete = vi.fn();
    const els = await fetchPipelinePmtiles(BREDA, 'all', { zoom: 16, onBufferComplete });
    await waitForPendingBuffers({ timeoutMs: 500 });
    expect(onBufferComplete).toHaveBeenCalledTimes(1);
    expect(sameRect(onBufferComplete.mock.calls[0][1], els.bufferBounds)).toBe(true);
  });

  it('Grenzen: derselbe Ring-Test für fetchPipelineBoundaries (kein Ring ohne Belgien, Kachel nur der sichtbaren)', async () => {
    setupBorder({ netherlands: {} });
    layersByMarker[MARKER.netherlands] = {};
    const onBufferComplete = vi.fn();
    const els = await fetchPipelineBoundaries(BREDA, { zoom: 16, onBufferComplete });
    await waitForPendingBuffers({ timeoutMs: 500 });
    expect(calls).toHaveLength(1);
    expect(onBufferComplete).not.toHaveBeenCalled();
    expect(sameRect(els.loadedBounds, els.bufferBounds ?? els.loadedBounds)).toBe(true);
  });
});

describe('fetchPipelineBoundaries über mehrere Quellen', () => {
  const line = (id) => ({
    boundaries: { length: 1, feature: () => ({ id, toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[5.8, 50.8], [5.9, 50.81]] }, properties: { boundary: 'administrative', admin_level: '8' } }) }) }
  });

  it('gleiche feat.id in zwei Dateien: beide Grenzstücke bleiben, Länder-IDs tragen die Kennung davor', async () => {
    useEurope({ netherlands: {}, belgium: {}, france: {} });
    headers.france = header(-5.2, 41.3, 8.3, 48.9);   // Rechteck reicht bis Maastricht, die Datei nicht
    headers.netherlands = header(2.9, 50.7, 7.3, 54.0);
    headers.belgium = header(2.5, 49.4, 6.5, 51.6);
    layersByMarker[MARKER.dach] = line(7);
    layersByMarker[MARKER.netherlands] = line(7);
    layersByMarker[MARKER.belgium] = line(7);
    const els = await fetchPipelineBoundaries(MAASTRICHT, { zoom: 16 });
    const eid = els.map((e) => String(e.id));
    expect(eid.filter((i) => i.startsWith('7@'))).toHaveLength(1);                 // DACHLiLu: bisheriges Format
    expect(eid.filter((i) => i.startsWith('netherlands:7@'))).toHaveLength(1);
    expect(eid.filter((i) => i.startsWith('belgium:7@'))).toHaveLength(1);
    expect(els).toHaveLength(3);
  });

  it('nur DACHLiLu: IDs unverändert (kein Präfix)', async () => {
    useEurope({ netherlands: {} });
    layersByMarker[MARKER.dach] = line(7);
    const els = await fetchPipelineBoundaries(MUNICH, { zoom: 16 });
    expect(els.map((e) => String(e.id)).every((i) => /^7@14\/\d+\/\d+$/.test(i))).toBe(true);
  });

  it('Amsterdam: Grenzstücke nur aus der Länder-Datei', async () => {
    useEurope({ netherlands: {} });
    headers.netherlands = header(2.9, 50.7, 7.3, 54.0);
    layersByMarker[MARKER.netherlands] = line(3);
    const els = await fetchPipelineBoundaries(AMSTERDAM, { zoom: 16 });
    expect(els.length).toBeGreaterThan(0);
    expect(els.every((e) => String(e.id).startsWith('netherlands:3@'))).toBe(true);
    expect(urlsUsed()).toEqual([`${BASE}/${regionFile('netherlands')}`]);
  });

  it('Ring mit Belgien: die Grenzstücke des Rings stammen aus der Belgien-Datei und tragen deren Kennung', async () => {
    Config.pipeline.europe.enabled = true;
    setEuropeStateForTests({ manifest: manifestFor({ netherlands: {}, belgium: {} }), coverage: EUROPE_COVERAGE,
      regionBounds: { ...EUROPE_REGION_BOUNDS, belgium: [2.5, 49.4, 6.5, 51.515] }, loadedAt: Date.now() });
    headers.netherlands = header(2.9, 50.7, 7.3, 54.0);
    headers.belgium = header(2.5, 49.4, 6.5, 51.52);
    layersByMarker[MARKER.belgium] = line(5);
    const onBufferComplete = vi.fn();
    await fetchPipelineBoundaries(vp(51.53, 4.47), { zoom: 16, onBufferComplete });
    await waitForPendingBuffers({ timeoutMs: 500 });
    const be = calls.filter((c) => c.key.includes('/eu/belgium-'));
    const nl = calls.filter((c) => c.key.includes('/eu/netherlands-'));
    expect(be).toHaveLength(8);                                              // nur Ring-Kacheln
    expect(be.some((c) => nl[0].x === c.x && nl[0].y === c.y)).toBe(false);  // nicht die sichtbare
    expect(onBufferComplete).toHaveBeenCalledTimes(1);
    const ringIds = onBufferComplete.mock.calls[0][0].map((e) => String(e.id));
    expect(ringIds).toHaveLength(8);
    expect(ringIds.every((i) => i.startsWith('belgium:5@14/'))).toBe(true);
  });
});
