/**
 * Tests für src/js/europe.js (Grundlage der Europa-Erweiterung): Manifest, Eignungsprüfung, Laden.
 * Die Abdeckung und die Länder-Rechtecke kommen aus dem generierten Modul src/js/coverage/europe.js.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../src/js/net.js', () => ({ fetchJson: vi.fn() }));

import { Config } from '../src/js/config.js';
import { fetchJson } from '../src/js/net.js';
import * as geometry from '../src/js/geometry.js';
import * as pipeline from '../src/js/pipeline.js';
import {
  parseManifest, buildRegionUrl, viewportRect, rectIntersectsBounds, requiredRegionIds, isValidBounds,
  resolveEuropeSources, loadEuropeData, getEuropeData, setEuropeStateForTests, isEuropeEligible
} from '../src/js/europe.js';
import { EUROPE_COVERAGE, EUROPE_REGION_BOUNDS } from '../src/js/coverage/europe.js';

// Vor jeder Änderung durch die Tests festgehalten: Auslieferungszustand
const SHIPPED_EUROPE_CONFIG = JSON.parse(JSON.stringify(Config.pipeline.europe));

const STAMP = '20261015T145638Z';
function entry(id, over = {}) {
  return {
    id, name: id, file: `eu/${id}-${STAMP}.pmtiles`, size_bytes: 6532444,
    generated_at: '2026-10-15T14:56:38.224856+00:00', osm_data_until: '2026-10-14T20:21:12Z',
    bounds: [3.3, 50.7, 7.3, 53.6], minzoom: 0, maxzoom: 14, counts: { hydrants: 1 }, ...over
  };
}
function rawManifest(ids, over = {}) {
  return { version: 1, updated_at: '2026-10-15T14:56:39Z', regions: Object.fromEntries(ids.map((i) => [i, entry(i)])), ...over };
}
const ALL_IDS = Object.keys(EUROPE_REGION_BOUNDS);
const vp = (lat, lon, d = 0.01) => ({ south: lat - d, north: lat + d, west: lon - d, east: lon + d });

beforeEach(() => {
  Config.pipeline.europe.enabled = true;
  setEuropeStateForTests();
  fetchJson.mockReset();
});
afterEach(() => {
  Config.pipeline.europe = JSON.parse(JSON.stringify(SHIPPED_EUROPE_CONFIG));
  vi.restoreAllMocks();
});

describe('Auslieferungszustand', () => {
  it('Europa ist standardmäßig aus und nicht in die Datenabfrage eingebunden', () => {
    expect(SHIPPED_EUROPE_CONFIG.enabled).toBe(false);
    expect(SHIPPED_EUROPE_CONFIG.manifestPath).toBe('eu/regions.json');
    expect(SHIPPED_EUROPE_CONFIG.minZoom).toBe(12);
  });

  it('geometry.js: pipeline.js exportiert dieselben Funktionen weiter', () => {
    expect(pipeline.isRectInPolygon).toBe(geometry.isRectInPolygon);
    expect(pipeline.isPointInPolygon).toBe(geometry.isPointInPolygon);
  });
});

describe('parseManifest', () => {
  it('liest ein gültiges Manifest', () => {
    const m = parseManifest(rawManifest(['netherlands', 'belgium']));
    expect(Object.keys(m.regions)).toEqual(['netherlands', 'belgium']);
    expect(m.regions.netherlands).toMatchObject({
      id: 'netherlands', file: `eu/netherlands-${STAMP}.pmtiles`, sizeBytes: 6532444,
      generatedAt: '2026-10-15T14:56:38.224856+00:00', osmDataUntil: '2026-10-14T20:21:12Z'
    });
    expect(m.updatedAt).toBe('2026-10-15T14:56:39Z');
    expect(m.rejected).toEqual([]);
  });

  it('verwirft unbekannte Versionen und falsche Formen', () => {
    for (const bad of [null, undefined, 'x', 5, [], {}, { version: 2, regions: {} }, { version: 1 },
      { version: 1, regions: [] }, { version: 1, regions: 'x' }]) {
      expect(parseManifest(bad)).toBeNull();
    }
  });

  it('verwirft nur den ungültigen Eintrag, die übrigen bleiben nutzbar', () => {
    const raw = rawManifest(['netherlands', 'belgium']);
    raw.regions.belgium.size_bytes = 0;
    const m = parseManifest(raw);
    expect(Object.keys(m.regions)).toEqual(['netherlands']);
    expect(m.rejected).toEqual(['belgium']);
  });

  it('prüft den Dateinamen streng (er wird Teil einer URL)', () => {
    const unsafe = [
      '../secret.pmtiles', 'eu/../x-20261015T145638Z.pmtiles', 'https://evil.example/eu/netherlands-20261015T145638Z.pmtiles',
      '//evil.example/eu/netherlands-20261015T145638Z.pmtiles', '/eu/netherlands-20261015T145638Z.pmtiles',
      'eu/netherlands.pmtiles', 'eu/netherlands-20261015T145638Z.pmtiles?x=1', 'eu/netherlands-20261015T145638Z.pmtiles/../a',
      'eu/netherlands-20261015T145638Z.json', 'eu/_spike/nl-20261015T061810Z.pmtiles', 'eu/NETHERLANDS-20261015T145638Z.pmtiles',
      'eu/netherlands-2026101T145638Z.pmtiles', 'eu/netherlands-20261015T145638Z.pmtiles\n', 'openfiremap.pmtiles', 5, null
    ];
    for (const file of unsafe) {
      const raw = rawManifest(['netherlands']);
      raw.regions.netherlands.file = file;
      expect(Object.keys(parseManifest(raw).regions), String(file)).toEqual([]);
    }
  });

  it('der Dateiname muss zu genau diesem Land gehören (ireland ist kein Präfix von ireland-and-northern-ireland)', () => {
    const raw = rawManifest(['ireland']);
    raw.regions.ireland.file = `eu/ireland-and-northern-ireland-${STAMP}.pmtiles`;
    expect(Object.keys(parseManifest(raw).regions)).toEqual([]);
    const other = rawManifest(['belgium']);
    other.regions.belgium.file = `eu/netherlands-${STAMP}.pmtiles`;
    expect(Object.keys(parseManifest(other).regions)).toEqual([]);
    const own = rawManifest(['ireland-and-northern-ireland']);
    expect(Object.keys(parseManifest(own).regions)).toEqual(['ireland-and-northern-ireland']);
  });

  it('Schlüssel und id müssen übereinstimmen, ungültige IDs fliegen raus', () => {
    const raw = rawManifest(['netherlands']);
    raw.regions.netherlands.id = 'belgium';
    expect(parseManifest(raw).rejected).toEqual(['netherlands']);
    const weird = { version: 1, regions: { '__proto__': entry('x'), 'A B': entry('a-b') } };
    expect(Object.keys(parseManifest(weird).regions)).toEqual([]);
  });

  it('prüft Rechteck, Größe, Zeitstempel und OSM-Datenstand', () => {
    const cases = [
      ['bounds', [4, 52, 3, 53]], ['bounds', [4, 52, 5]], ['bounds', [4, 52, 5, 95]], ['bounds', [4, 52, NaN, 53]], ['bounds', 'x'],
      ['size_bytes', -1], ['size_bytes', 1.5], ['size_bytes', '5'],
      ['generated_at', ''], ['generated_at', 12], ['generated_at', 'gestern'],
      ['osm_data_until', '14.10.2026'], ['osm_data_until', 5]
    ];
    for (const [field, value] of cases) {
      const raw = rawManifest(['netherlands']);
      raw.regions.netherlands[field] = value;
      expect(parseManifest(raw).rejected, `${field}=${JSON.stringify(value)}`).toEqual(['netherlands']);
    }
    // osm_data_until darf fehlen oder null sein
    const raw = rawManifest(['netherlands']);
    delete raw.regions.netherlands.osm_data_until;
    expect(parseManifest(raw).regions.netherlands.osmDataUntil).toBeNull();
  });
});

describe('buildRegionUrl', () => {
  it('baut die URL aus Basis und gültigem Dateinamen', () => {
    expect(buildRegionUrl('https://pipeline.openfiremap.org/', `eu/netherlands-${STAMP}.pmtiles`))
      .toBe(`https://pipeline.openfiremap.org/eu/netherlands-${STAMP}.pmtiles`);
    expect(buildRegionUrl('https://p.example', `eu/netherlands-${STAMP}.pmtiles`, 'netherlands')).toContain('/eu/netherlands-');
  });

  it('wirft bei ungültigen Namen und bei falschem Land', () => {
    for (const f of ['../x.pmtiles', 'https://evil.example/a.pmtiles', 'eu/x.pmtiles', null, undefined, 5]) {
      expect(() => buildRegionUrl('https://p.example', f)).toThrow();
    }
    expect(() => buildRegionUrl('https://p.example', `eu/belgium-${STAMP}.pmtiles`, 'netherlands')).toThrow();
    expect(() => buildRegionUrl('https://p.example', `eu/ireland-and-northern-ireland-${STAMP}.pmtiles`, 'ireland')).toThrow();
    expect(() => buildRegionUrl('https://p.example', `eu/netherlands-${STAMP}.pmtiles`, '../x')).toThrow();
  });
});

describe('Geometrie des Ausschnitts', () => {
  it('viewportRect liest Leaflet-Bounds und einfache Objekte, lehnt Ungültiges ab', () => {
    const leaflet = { getSouth: () => 1, getNorth: () => 2, getWest: () => 3, getEast: () => 4 };
    expect(viewportRect(leaflet)).toEqual({ south: 1, north: 2, west: 3, east: 4 });
    expect(viewportRect({ south: 1, north: 2, west: 3, east: 4 })).toEqual({ south: 1, north: 2, west: 3, east: 4 });
    expect(viewportRect({ _southWest: { lat: 1, lng: 3 }, _northEast: { lat: 2, lng: 4 } })).toEqual({ south: 1, north: 2, west: 3, east: 4 });
    for (const bad of [null, undefined, {}, { south: 2, north: 1, west: 3, east: 4 }, { south: 1, north: 2, west: 4, east: 3 },
      { south: 'a', north: 2, west: 3, east: 4 }, { south: NaN, north: 2, west: 3, east: 4 }]) {
      expect(viewportRect(bad)).toBeNull();
    }
  });

  it('Schnitt von Ausschnitt und Rechteck, Berührung zählt', () => {
    const rect = { south: 50, north: 51, west: 5, east: 6 };
    expect(rectIntersectsBounds(rect, [5.5, 50.5, 7, 52])).toBe(true);
    expect(rectIntersectsBounds(rect, [6, 51, 7, 52])).toBe(true);      // Ecke berührt
    expect(rectIntersectsBounds(rect, [6.01, 50, 7, 51])).toBe(false);
    expect(rectIntersectsBounds(rect, [0, 52, 10, 53])).toBe(false);
    expect(rectIntersectsBounds(rect, [0, 40, 10, 60])).toBe(true);     // Rechteck umschließt den Ausschnitt
  });

  it('requiredRegionIds: sortiert, ignoriert ungültige Rechtecke', () => {
    const rect = { south: 50.8, north: 50.9, west: 5.8, east: 5.9 };
    const bounds = { netherlands: [2.9, 50.7, 7.3, 54], belgium: [2.5, 49.4, 6.5, 51.6], france: [-5, 41, 9, 51.2],
      poland: [14, 49, 24, 55], broken: [1, 2], other: 'x' };
    expect(requiredRegionIds(rect, bounds)).toEqual(['belgium', 'france', 'netherlands']);
    expect(requiredRegionIds(rect, null)).toEqual([]);
  });

  it('isValidBounds', () => {
    expect(isValidBounds([-10, 35, 30, 70])).toBe(true);
    for (const b of [null, [1, 2, 3], [1, 2, 3, NaN], [5, 0, 4, 1], [0, 5, 1, 4], [-181, 0, 1, 1], [0, -91, 1, 1], [0, 0, 181, 1], [0, 0, 1, 91]]) {
      expect(isValidBounds(b)).toBe(false);
    }
  });
});

describe('resolveEuropeSources: künstliche Daten', () => {
  const coverage = [[[40, -10], [40, 30], [60, 30], [60, -10], [40, -10]]];
  const regionBounds = { netherlands: [2.9, 50.7, 7.3, 54], belgium: [2.5, 49.4, 6.5, 51.6], norway: [-11, 57, 35, 81] };
  const data = (ids) => ({ manifest: parseManifest(rawManifest(ids)), coverage, regionBounds });

  it('Schalter aus: disabled, auch bei vollständigen Daten', () => {
    Config.pipeline.europe.enabled = false;
    expect(resolveEuropeSources(vp(52.37, 4.9), 15, data(['netherlands']))).toMatchObject({ eligible: false, reason: 'disabled' });
  });

  it('nicht bereit, solange Manifest oder Abdeckung fehlen', () => {
    expect(resolveEuropeSources(vp(52.37, 4.9), 15, { manifest: null, coverage, regionBounds }).reason).toBe('not_ready');
    expect(resolveEuropeSources(vp(52.37, 4.9), 15, { manifest: data([]).manifest, coverage: null, regionBounds }).reason).toBe('not_ready');
    expect(resolveEuropeSources(vp(52.37, 4.9), 15, { manifest: data([]).manifest, coverage: [], regionBounds }).reason).toBe('not_ready');
    expect(resolveEuropeSources(vp(52.37, 4.9), 15, { manifest: data([]).manifest, coverage, regionBounds: null }).reason).toBe('not_ready');
    expect(resolveEuropeSources(vp(52.37, 4.9), 15, undefined).reason).toBe('not_ready');
  });

  it('ungültiger Ausschnitt und zu kleiner Zoom', () => {
    expect(resolveEuropeSources(null, 15, data(['netherlands'])).reason).toBe('invalid_bounds');
    expect(resolveEuropeSources(vp(52.37, 4.9), 11, data(['netherlands'])).reason).toBe('zoom');
    expect(resolveEuropeSources(vp(52.37, 4.9), 12, data(['netherlands'])).eligible).toBe(true);
    expect(resolveEuropeSources(vp(52.37, 4.9), undefined, data(['netherlands'])).reason).toBe('zoom');
  });

  it('außerhalb der Abdeckung, auch wenn der Ausschnitt sie nur teilweise schneidet', () => {
    expect(resolveEuropeSources(vp(35, 4.9), 15, data(['netherlands'])).reason).toBe('outside_coverage');
    expect(resolveEuropeSources({ south: 59.9, north: 60.5, west: 4, east: 5 }, 15, data(['netherlands'])).reason).toBe('outside_coverage');
  });

  it('Land im Manifest: geeignet, nur diese Quelle', () => {
    const r = resolveEuropeSources(vp(52.37, 4.9), 15, data(['netherlands']));
    expect(r).toEqual({ eligible: true, reason: 'ok', sources: [{ id: 'netherlands', kind: 'europe', file: `eu/netherlands-${STAMP}.pmtiles` }], missing: [] });
  });

  it('nötiges Land fehlt im Manifest: nicht geeignet, fehlende IDs werden genannt', () => {
    const r = resolveEuropeSources(vp(52.37, 4.9), 15, data(['belgium']));
    expect(r).toMatchObject({ eligible: false, reason: 'region_missing', sources: [], missing: ['netherlands'] });
  });

  it('Landesgrenze: DACHLiLu und beide Länder als Quellen', () => {
    // Ausschnitt bei Aachen/Maastricht: schneidet DACHLiLu (Rechteck) sowie NL und BE
    const r = resolveEuropeSources({ south: 50.78, north: 50.82, west: 5.8, east: 5.9 }, 15, data(['netherlands', 'belgium']));
    expect(r.eligible).toBe(true);
    expect(r.sources.map((s) => `${s.kind}:${s.id}`)).toEqual(['dachlilu:dachlilu', 'europe:belgium', 'europe:netherlands']);
    expect(r.sources[0].file).toBe('openfiremap.pmtiles');
  });

  it('ein nur angrenzend geschnittenes, unveröffentlichtes Land genügt für den Rückfall auf Overpass', () => {
    const r = resolveEuropeSources({ south: 50.78, north: 50.82, west: 5.8, east: 5.9 }, 15, data(['netherlands']));
    expect(r).toMatchObject({ eligible: false, reason: 'region_missing', missing: ['belgium'] });
  });

  it('große Länder-Rechtecke: Norwegen schneidet auch Ausschnitte in Schweden', () => {
    // bekannte Einschränkung: Das Rechteck reicht wegen der Meeresränder weit
    const r = resolveEuropeSources(vp(59.3, 18.0), 15, data(['netherlands']));
    expect(r).toMatchObject({ eligible: false, reason: 'region_missing', missing: ['norway'] });
    expect(resolveEuropeSources(vp(59.3, 18.0), 15, data(['norway'])).eligible).toBe(true);
  });

  it('nutzt die übergebene Config, nicht fest verdrahtete Werte', () => {
    const cfg = { europe: { enabled: true, minZoom: 14 }, bounds: { south: 0, west: 0, north: 1, east: 1 }, pmtilesFile: 'x.pmtiles' };
    expect(resolveEuropeSources(vp(52.37, 4.9), 13, data(['netherlands']), cfg).reason).toBe('zoom');
    expect(resolveEuropeSources(vp(52.37, 4.9), 14, data(['netherlands']), cfg).eligible).toBe(true);
    expect(resolveEuropeSources(vp(0.5, 0.5), 14, { ...data([]), coverage: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]], regionBounds: {} }, cfg).sources)
      .toEqual([{ id: 'dachlilu', kind: 'dachlilu', file: 'x.pmtiles' }]);
  });
});

describe('Generierte Abdeckung (src/js/coverage/europe.js)', () => {
  const all = () => ({ manifest: parseManifest(rawManifest(ALL_IDS)), coverage: EUROPE_COVERAGE, regionBounds: EUROPE_REGION_BOUNDS });
  const ids = (r) => r.sources.map((s) => s.id);

  it('Aufbau: geschlossene Ringe, 40 Länder mit gültigen Rechtecken, keine DACHLiLu-Länder', () => {
    expect(EUROPE_COVERAGE.length).toBeGreaterThanOrEqual(1);
    for (const ring of EUROPE_COVERAGE) {
      expect(ring.length).toBeGreaterThanOrEqual(4);
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    }
    expect(ALL_IDS).toHaveLength(40);
    expect(ALL_IDS.every((id) => isValidBounds(EUROPE_REGION_BOUNDS[id]))).toBe(true);
    for (const dach of ['germany', 'austria', 'switzerland', 'luxembourg', 'liechtenstein']) expect(ALL_IDS).not.toContain(dach);
    for (const excluded of ['russia', 'ukraine', 'belarus', 'turkey', 'georgia']) expect(ALL_IDS).not.toContain(excluded);
  });

  it('jedes Land-Rechteck enthält seinen Hauptort', () => {
    const places = { netherlands: [52.37, 4.90], france: [48.86, 2.35], malta: [35.90, 14.51], iceland: [64.15, -21.94],
      azores: [37.74, -25.67], cyprus: [35.17, 33.37], 'great-britain': [51.51, -0.13], norway: [59.91, 10.75], greece: [37.98, 23.73] };
    for (const [id, [lat, lon]] of Object.entries(places)) {
      const [w, s, e, n] = EUROPE_REGION_BOUNDS[id];
      expect(lon >= w && lon <= e && lat >= s && lat <= n, id).toBe(true);
    }
  });

  it('Städte in Europa sind geeignet, sobald ihre Länder im Manifest stehen', () => {
    const cities = { Amsterdam: [52.37, 4.90, 'netherlands'], Paris: [48.86, 2.35, 'france'], Madrid: [40.42, -3.70, 'spain'],
      Rom: [41.90, 12.50, 'italy'], Athen: [37.98, 23.73, 'greece'], Valletta: [35.90, 14.51, 'malta'], Reykjavik: [64.15, -21.94, 'iceland'],
      'Ponta Delgada': [37.74, -25.67, 'azores'], Dublin: [53.35, -6.26, 'ireland-and-northern-ireland'], Warschau: [52.23, 21.01, 'poland'] };
    for (const [name, [lat, lon, id]] of Object.entries(cities)) {
      const r = resolveEuropeSources(vp(lat, lon), 15, all());
      expect(r.eligible, name).toBe(true);
      expect(ids(r), name).toContain(id);
    }
  });

  it('Orte außerhalb der Auszüge bleiben bei Overpass', () => {
    for (const [name, lat, lon] of [['Kiew', 50.45, 30.52], ['Minsk', 53.90, 27.57], ['Moskau', 55.76, 37.62], ['Istanbul', 41.01, 28.98],
      ['Kaliningrad', 54.71, 20.51], ['Teneriffa', 28.46, -16.25], ['Tunis', 36.81, 10.18]]) {
      expect(resolveEuropeSources(vp(lat, lon), 15, all()).reason, name).toBe('outside_coverage');
    }
  });

  it('Landesgrenzen zu DACHLiLu: Aachen/Maastricht, Basel/Mulhouse, Kehl/Straßburg', () => {
    for (const [name, lat, lon, expected] of [['Aachen/Maastricht', 50.80, 5.85, ['netherlands', 'belgium']],
      ['Basel/Mulhouse', 47.57, 7.60, ['france']], ['Kehl/Straßburg', 48.57, 7.80, ['france']]]) {
      const r = resolveEuropeSources(vp(lat, lon, 0.02), 15, all());
      expect(r.eligible, name).toBe(true);
      expect(ids(r), name).toContain('dachlilu');
      for (const id of expected) expect(ids(r), name).toContain(id);
    }
  });

  it('München liegt in DACHLiLu: nur diese Quelle', () => {
    const r = resolveEuropeSources(vp(48.137, 11.576), 15, all());
    expect(r.eligible).toBe(true);
    expect(ids(r)).toEqual(['dachlilu']);
  });

  it('fehlt Frankreich im Manifest, fällt Paris auf Overpass zurück; ein anderes Land bleibt davon unberührt', () => {
    const without = (id) => ({ ...all(), manifest: parseManifest(rawManifest(ALL_IDS.filter((i) => i !== id))) });
    expect(resolveEuropeSources(vp(48.86, 2.35), 15, without('france'))).toMatchObject({ eligible: false, reason: 'region_missing', missing: ['france'] });
    expect(resolveEuropeSources(vp(52.37, 4.90), 15, without('france')).eligible).toBe(true);
  });
});

describe('loadEuropeData', () => {
  it('Schalter aus: lädt nichts', async () => {
    Config.pipeline.europe.enabled = false;
    expect(await loadEuropeData()).toBe(false);
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it('lädt Manifest (richtige URL, Timeout) und Abdeckung, danach ist die Prüfung synchron möglich', async () => {
    fetchJson.mockResolvedValue(rawManifest(ALL_IDS));
    expect(await loadEuropeData()).toBe(true);
    expect(fetchJson).toHaveBeenCalledTimes(1);
    expect(fetchJson.mock.calls[0][0]).toBe('https://pipeline.openfiremap.org/eu/regions.json');
    expect(fetchJson.mock.calls[0][1]).toMatchObject({ timeoutMs: 3000 });
    expect(getEuropeData().regionBounds).toBe(EUROPE_REGION_BOUNDS);
    expect(isEuropeEligible(vp(52.37, 4.90), 15)).toBe(true);
    expect(isEuropeEligible(vp(50.45, 30.52), 15)).toBe(false);
  });

  it('vor dem Laden ist nichts geeignet (nicht bereit), danach nicht mehr', async () => {
    expect(isEuropeEligible(vp(52.37, 4.90), 15)).toBe(false);
    fetchJson.mockResolvedValue(rawManifest(ALL_IDS));
    await loadEuropeData();
    expect(isEuropeEligible(vp(52.37, 4.90), 15)).toBe(true);
  });

  it('frischer Zustand wird nicht neu geladen, force und abgelaufene TTL schon', async () => {
    fetchJson.mockResolvedValue(rawManifest(ALL_IDS));
    await loadEuropeData();
    await loadEuropeData();
    expect(fetchJson).toHaveBeenCalledTimes(1);
    await loadEuropeData({ force: true });
    expect(fetchJson).toHaveBeenCalledTimes(2);
    const old = getEuropeData();
    setEuropeStateForTests({ ...old, loadedAt: Date.now() - Config.pipeline.europe.manifestTtlMs - 1000 });
    await loadEuropeData();
    expect(fetchJson).toHaveBeenCalledTimes(3);
  });

  it('gleichzeitige Aufrufe teilen sich eine Anfrage', async () => {
    let release;
    fetchJson.mockReturnValue(new Promise((resolve) => { release = () => resolve(rawManifest(ALL_IDS)); }));
    const calls = [loadEuropeData(), loadEuropeData(), loadEuropeData()];
    await new Promise((r) => setTimeout(r, 0));
    release();
    expect(await Promise.all(calls)).toEqual([true, true, true]);
    expect(fetchJson).toHaveBeenCalledTimes(1);
  });

  it('Netzfehler: wirft nicht, bleibt nicht bereit, loggt eine Warnung', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchJson.mockRejectedValue(new Error('offline'));
    expect(await loadEuropeData()).toBe(false);
    expect(isEuropeEligible(vp(52.37, 4.90), 15)).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it('ungültiges Manifest (unbekannte Version): nicht bereit', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchJson.mockResolvedValue({ version: 99, regions: {} });
    expect(await loadEuropeData()).toBe(false);
    expect(getEuropeData().manifest).toBeNull();
  });

  it('ein späterer Fehler behält den letzten guten Stand', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchJson.mockResolvedValue(rawManifest(ALL_IDS));
    await loadEuropeData();
    fetchJson.mockRejectedValue(new Error('offline'));
    expect(await loadEuropeData({ force: true })).toBe(true);
    expect(isEuropeEligible(vp(52.37, 4.90), 15)).toBe(true);
  });

  it('verworfene Einträge werden gemeldet, die übrigen Länder bleiben nutzbar', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = rawManifest(ALL_IDS);
    raw.regions.france.file = '../evil.pmtiles';
    fetchJson.mockResolvedValue(raw);
    expect(await loadEuropeData()).toBe(true);
    expect(warn.mock.calls.flat().join(' ')).toContain('france');
    expect(isEuropeEligible(vp(48.86, 2.35), 15)).toBe(false);   // Frankreich verworfen
    expect(isEuropeEligible(vp(52.37, 4.90), 15)).toBe(true);    // Niederlande weiter nutzbar
  });
});
