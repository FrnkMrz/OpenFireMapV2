import { describe, it, expect } from 'vitest';
import {
  DACHLILU_IDS, buildDachRows, cadence, buildRegionRows, buildRows, summarize, timelineRows
} from '../src/js/status/model.js';

// Aufbau wie eu/regions.json und metadata.json der Pipeline (gekürzt)
const region = (id, name, hydrants, over = {}) => ({
  id, name, bounds: [0, 0, 1, 1], file: `eu/${id}-20261018T010000Z.pmtiles`, minzoom: 0, maxzoom: 14, size_bytes: 2_500_000,
  generated_at: '2026-10-18T01:00:00.123+00:00', osm_data_until: '2026-10-17T20:00:00Z',
  counts: { hydrants, fire_stations: 10, water_points: 2, defibrillators: 3, boundaries: 50 }, ...over
});
const manifest = () => ({
  version: 1,
  regions: {
    poland: region('poland', 'Polen', 400),
    france: region('france', 'Frankreich', 240),
    italy: region('italy', 'Italien', 50),
    hungary: region('hungary', 'Ungarn', 33),
    spain: region('spain', 'Spanien', 20),
    portugal: region('portugal', 'Portugal', 12),
    malta: region('malta', 'Malta', 1, { generated_at: '2026-10-19T01:00:00+00:00' }),
    neuland: region('neuland', 'Neuland', 7)
  }
});
const extract = (name, ts) => ({ name, osm_data_timestamp: ts, mtime: '2026-10-19T00:30:00+00:00', size_mb: 10 });
const metadata = (features) => ({
  generated_at: '2026-10-19T05:59:26.477688+00:00',
  osm_data_until: '2026-10-18T20:25:06Z',
  extracts: {
    germany: extract('Deutschland', '2026-10-18T20:25:06Z'),
    austria: extract('Österreich', '2026-10-18T20:25:06Z'),
    switzerland: extract('Schweiz', '2026-10-18T20:25:06Z'),
    luxembourg: extract('Luxemburg', '2026-10-18T20:25:06Z'),
    liechtenstein: extract('Liechtenstein', '2026-10-18T20:25:06Z')
  },
  pmtiles: { file: 'openfiremap.pmtiles', size_mb: 182.5, minzoom: 12, maxzoom: 14, duration_sec: 156 },
  features: features ?? {
    hydrants: { count: 1000 }, fire_stations: { count: 100 }, water_points: { count: 20 }, defibrillators: { count: 30 }, boundaries: { count: 500 }
  }
});
const snapshot = {
  hydrants: { germany: 700, austria: 150, switzerland: 100, luxembourg: 40, liechtenstein: 10 },
  fire_stations: { germany: 60, austria: 20, switzerland: 12, luxembourg: 5, liechtenstein: 3 },
  water_points: { germany: 10, austria: 5, switzerland: 3, luxembourg: 1, liechtenstein: 1 },
  defibrillators: { germany: 15, austria: 8, switzerland: 5, luxembourg: 1, liechtenstein: 1 }
};
const pop = { germany: 80, austria: 9, switzerland: 9, luxembourg: 0.6, liechtenstein: 0.04, poland: 36, france: 66, italy: 59, hungary: 9.6, spain: 48, portugal: 10, malta: 0.5 };

describe('buildRegionRows', () => {
  it('rechnet Verzug, Größe und Dichte', () => {
    const rows = buildRegionRows(manifest(), pop);
    const poland = rows.find((r) => r.id === 'poland');
    expect(poland.lagH).toBe(5);
    expect(poland.sizeMb).toBe(2.5);
    expect(poland.per1000).toBeCloseTo(400 / 36000, 10);
    expect(poland.inhPerHydrant).toBeCloseTo(36e6 / 400, 6);
    expect(poland.fireStations).toBe(10);
    expect(poland.file).toBe('eu/poland-20261018T010000Z.pmtiles');
  });

  it('lässt ein Land ohne Einwohnerzahl in der Liste, ohne Dichte', () => {
    const neuland = buildRegionRows(manifest(), pop).find((r) => r.id === 'neuland');
    expect(neuland.hydrants).toBe(7);
    expect(neuland.per1000).toBeNull();
    expect(neuland.inhPerHydrant).toBeNull();
  });

  it('überspringt ungültige Einträge und DACHLiLu-Länder im Manifest', () => {
    const m = manifest();
    m.regions.kaputt = null;
    m.regions.ohneZeit = { ...region('ohneZeit', 'X', 1), generated_at: 'gestern' };
    m.regions.germany = region('germany', 'Deutschland', 5);
    const ids = buildRegionRows(m, pop).map((r) => r.id);
    expect(ids).not.toContain('kaputt');
    expect(ids).not.toContain('ohneZeit');
    expect(ids).not.toContain('germany');
  });

  it('behandelt ein fehlendes Manifest als leer', () => {
    expect(buildRegionRows(null, pop)).toEqual([]);
  });
});

describe('buildDachRows', () => {
  it('nimmt Zahlen je Land aus der eingecheckten Zählung, wenn der Builder keine liefert', () => {
    const { rows, usedSnapshot } = buildDachRows(metadata(), snapshot, pop);
    expect(usedSnapshot).toBe(true);
    expect(rows.map((r) => r.id)).toEqual(DACHLILU_IDS);
    const de = rows.find((r) => r.id === 'germany');
    expect(de.hydrants).toBe(700);
    expect(de.fireStations).toBe(60);
    expect(de.waterPoints).toBe(10);
    expect(de.defibrillators).toBe(15);
    expect(de.per1000).toBeCloseTo(700 / 80000, 10);
  });

  it('gibt Deutschland, Österreich, Schweiz und Liechtenstein Wachen (nicht null)', () => {
    const { rows } = buildDachRows(metadata(), snapshot, pop);
    for (const id of ['germany', 'austria', 'switzerland', 'liechtenstein']) {
      expect(rows.find((r) => r.id === id).fireStations).toBeGreaterThan(0);
    }
  });

  it('bevorzugt by_country aus metadata.json vor der Zählung', () => {
    const features = {
      hydrants: { count: 1, by_country: { germany: 123, austria: 1, switzerland: 1, luxembourg: 1, liechtenstein: 1 } },
      fire_stations: { count: 1, by_country: { germany: 9, austria: 1, switzerland: 1, luxembourg: 1, liechtenstein: 1 } },
      water_points: { count: 1, by_country: { germany: 1, austria: 1, switzerland: 1, luxembourg: 1, liechtenstein: 1 } },
      defibrillators: { count: 1, by_country: { germany: 1, austria: 1, switzerland: 1, luxembourg: 1, liechtenstein: 1 } }
    };
    const { rows, usedSnapshot } = buildDachRows(metadata(features), snapshot, pop);
    expect(usedSnapshot).toBe(false);
    expect(rows.find((r) => r.id === 'germany').hydrants).toBe(123);
    expect(rows.find((r) => r.id === 'germany').fireStations).toBe(9);
  });

  it('nutzt Zeitstempel der Auszüge und den Upload des gemeinsamen Builds', () => {
    const de = buildDachRows(metadata(), snapshot, pop).rows[0];
    expect(de.osmMs).toBe(Date.parse('2026-10-18T20:25:06Z'));
    expect(de.uploadMs).toBe(Date.parse('2026-10-19T05:59:26.477688+00:00'));
    expect(de.lagH).toBe(9.6);
  });

  it('liefert ohne metadata.json keine Zeilen', () => {
    expect(buildDachRows(null, snapshot, pop)).toEqual({ rows: [], usedSnapshot: false });
  });
});

describe('buildRows', () => {
  const { rows, hasDach, usedSnapshot } = buildRows({ manifest: manifest(), metadata: metadata(), snapshot, population: { populationM: pop } });

  it('führt jedes Land einmal einzeln, die fünf DACHLiLu-Länder zuerst', () => {
    expect(rows).toHaveLength(13);
    expect(new Set(rows.map((r) => r.id)).size).toBe(13);
    expect(rows.slice(0, 5).map((r) => r.id)).toEqual(DACHLILU_IDS);
    expect(hasDach).toBe(true);
    expect(usedSnapshot).toBe(true);
  });

  it('kennt keine Gruppen: keine Summen für DACH, LuLi oder DACHLiLu', () => {
    for (const r of rows) {
      expect(r).not.toHaveProperty('group');
      expect(r).not.toHaveProperty('groups');
    }
    expect(rows.some((r) => r.id === 'dachlilu' || r.id === 'dach' || r.id === 'luli')).toBe(false);
  });

  it('weist die gemeinsame Datei des DACHLiLu-Builds je Land aus', () => {
    const de = rows.find((r) => r.id === 'germany');
    expect(de).toMatchObject({ shared: true, file: 'openfiremap.pmtiles', minzoom: 12, maxzoom: 14, sizeMb: null });
    const pl = rows.find((r) => r.id === 'poland');
    expect(pl).toMatchObject({ shared: false, file: 'eu/poland-20261018T010000Z.pmtiles' });
  });

  it('meldet fehlende DACHLiLu-Länder, wenn metadata.json vorhanden, aber unvollständig ist', () => {
    const md = metadata();
    delete md.extracts.austria;
    delete md.extracts.liechtenstein;
    const out = buildRows({ manifest: manifest(), metadata: md, snapshot, population: { populationM: pop } });
    expect(out.dachMissing).toEqual(['austria', 'liechtenstein']);
    expect(buildRows({ manifest: manifest(), metadata: { extracts: {} }, snapshot, population: { populationM: pop } }).dachMissing).toHaveLength(5);
    expect(rows.length).toBe(13);
    expect(buildRows({ manifest: manifest(), metadata: metadata(), snapshot, population: { populationM: pop } }).dachMissing).toEqual([]);
    expect(buildRows({ manifest: manifest(), metadata: null, snapshot, population: { populationM: pop } }).dachMissing).toEqual([]);
  });

  it('kommt ohne metadata.json aus und liefert nur die Länder-Dateien', () => {
    const out = buildRows({ manifest: manifest(), metadata: null, snapshot, population: { populationM: pop } });
    expect(out.hasDach).toBe(false);
    expect(out.rows).toHaveLength(8);
  });
});

describe('summarize', () => {
  const { rows } = buildRows({ manifest: manifest(), metadata: metadata(), snapshot, population: { populationM: pop } });
  const { total } = summarize(rows);

  it('zählt Länder, Hydranten und Wachen insgesamt (jedes Land einmal)', () => {
    expect(total.regions).toBe(13);
    expect(total.hydrants).toBe(700 + 150 + 100 + 40 + 10 + 400 + 240 + 50 + 33 + 20 + 12 + 1 + 7);
    expect(total.fireStations).toBe(60 + 20 + 12 + 5 + 3 + 6 * 10 + 10 + 10);
  });

  it('rechnet die Dichte nur über Länder mit bekannter Einwohnerzahl', () => {
    const withPop = rows.filter((r) => r.per1000 != null);
    const hydrants = withPop.reduce((s, r) => s + r.hydrants, 0);
    const people = withPop.reduce((s, r) => s + r.populationM, 0);
    expect(total.per1000).toBeCloseTo(hydrants / (people * 1000), 6);
  });

  it('nennt ältesten OSM-Stand und letzten Upload', () => {
    expect(total.oldestOsmMs).toBe(Date.parse('2026-10-17T20:00:00Z'));
    expect(total.latestUploadMs).toBe(Date.parse('2026-10-19T05:59:26.477688+00:00'));
  });

  it('zählt Länder ohne Angabe nicht als 0, sondern nennt, wie viele in der Summe fehlen', () => {
    const m = manifest();
    m.regions.poland.counts = { fire_stations: 5 };          // keine Hydranten
    m.regions.france.counts = { hydrants: 240 };             // keine Wachen
    const out = buildRows({ manifest: m, metadata: metadata(), snapshot, population: { populationM: pop } });
    const t = summarize(out.rows).total;
    expect(t.hydrantsUnknown).toBe(1);
    expect(t.fireStationsUnknown).toBe(1);
    expect(t.hydrants).toBe(700 + 150 + 100 + 40 + 10 + 240 + 50 + 33 + 20 + 12 + 1 + 7);
    expect(total.hydrantsUnknown).toBe(0);
    expect(total.fireStationsUnknown).toBe(0);
  });

  it('rechnet Wachen und Defibrillatoren je 100.000 Einwohner, je Land und insgesamt', () => {
    const de = rows.find((r) => r.id === 'germany');
    expect(de.fireStationsPer100k).toBeCloseTo(60 / (80 * 10), 10);
    expect(de.defibrillatorsPer100k).toBeCloseTo(15 / (80 * 10), 10);
    const known = rows.filter((r) => r.fireStationsPer100k != null);
    const stations = known.reduce((s, r) => s + r.fireStations, 0);
    const people = known.reduce((s, r) => s + r.populationM, 0);
    expect(total.fireStationsPer100k).toBeCloseTo(stations / (people * 10), 8);
    expect(total.defibrillatorsPer100k).toBeGreaterThan(0);
    expect(total.defibrillators).toBe(15 + 8 + 5 + 1 + 1 + 8 * 3);
  });

  it('Länder ohne Einwohner oder Zählung haben keine Dichte', () => {
    const neuland = rows.find((r) => r.id === 'neuland');
    expect(neuland.fireStationsPer100k).toBeNull();
    const m = manifest();
    m.regions.poland.counts = { hydrants: 400 };
    const out = buildRows({ manifest: m, metadata: metadata(), snapshot, population: { populationM: pop } });
    expect(out.rows.find((r) => r.id === 'poland').fireStationsPer100k).toBeNull();
    expect(out.rows.find((r) => r.id === 'poland').defibrillatorsPer100k).toBeNull();
  });

  it('zählt ein Gebiet nicht doppelt, das im Auszug eines anderen Landes steckt (Azoren in Portugal)', () => {
    const m = manifest();
    m.regions.azores = region('azores', 'Azoren', 5);
    const popWith = { ...pop, azores: 0.2 };
    const out = buildRows({ manifest: m, metadata: metadata(), snapshot, population: { populationM: popWith } });
    const azores = out.rows.find((r) => r.id === 'azores');
    expect(azores.containedIn).toBe('portugal');
    expect(out.rows.find((r) => r.id === 'portugal').containedIn).toBeNull();
    const t = summarize(out.rows).total;
    expect(t.regions).toBe(14);                       // die Zeile zählt als Gebiet
    expect(t.hydrants).toBe(total.hydrants);          // Hydranten der Azoren nicht doppelt
    expect(t.populationM).toBe(total.populationM);    // Einwohner auch nicht
    // Datenstand und Upload gelten für alle Karten: eine ältere/neuere Azoren-Datei bleibt sichtbar
    const m2 = manifest();
    m2.regions.azores = region('azores', 'Azoren', 5, { osm_data_until: '2026-10-10T00:00:00Z', generated_at: '2026-10-25T00:00:00+00:00' });
    const t2 = summarize(buildRows({ manifest: m2, metadata: metadata(), snapshot, population: { populationM: popWith } }).rows).total;
    expect(t2.oldestOsmMs).toBe(Date.parse('2026-10-10T00:00:00Z'));
    expect(t2.latestUploadMs).toBe(Date.parse('2026-10-25T00:00:00+00:00'));
    expect(t2.hydrants).toBe(total.hydrants);   // die Zählung bleibt trotzdem einfach
    // ohne Portugal in der Liste zählt das Gebiet normal
    const noPt = out.rows.filter((r) => r.id !== 'portugal');
    expect(summarize(noPt).total.hydrants).toBe(total.hydrants - 12 + 5);
  });

  it('liefert für eine leere Liste keine Zeiten und keine Dichte', () => {
    expect(summarize([]).total).toMatchObject({ regions: 0, per1000: null, oldestOsmMs: null, latestUploadMs: null });
  });
});

describe('timelineRows', () => {
  const { rows } = buildRows({ manifest: manifest(), metadata: metadata(), snapshot, population: { populationM: pop } });
  const list = timelineRows(rows);

  it('zeigt jedes Land einmal, neuester Upload zuerst', () => {
    expect(list).toHaveLength(rows.length);
    const times = list.map((r) => r.uploadMs);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('ordnet gleiche Upload-Zeiten nach Hydranten', () => {
    expect(list.slice(0, 5).map((r) => r.id)).toEqual(['germany', 'austria', 'switzerland', 'luxembourg', 'liechtenstein']);
    expect(list[5].id).toBe('malta');
  });

  it('lässt Länder ohne Zeitstempel aus', () => {
    expect(timelineRows([{ id: 'x', osmMs: null, uploadMs: 5 }])).toEqual([]);
  });
});

describe('cadence', () => {
  const { rows } = buildRows({ manifest: manifest(), metadata: metadata(), snapshot, population: { populationM: pop } });
  const c = cadence(rows, metadata());

  it('nennt den letzten Lauf des gemeinsamen DACHLiLu-Builds', () => {
    expect(c.dach.lastMs).toBe(Date.parse('2026-10-19T05:59:26.477688+00:00'));
  });

  it('nennt für die übrigen Länder Anzahl, letzten Lauf und älteste Karte', () => {
    expect(c.eu.regions).toBe(8);
    expect(c.eu.lastMs).toBe(Date.parse('2026-10-19T01:00:00+00:00'));      // Malta
    expect(c.eu.oldestMs).toBe(Date.parse('2026-10-18T01:00:00.123+00:00')); // die übrigen
  });

  it('liest den DACHLiLu-Lauf direkt aus metadata.json, auch wenn dort keine Auszüge stehen', () => {
    const md = { ...metadata(), extracts: {} };
    const out = buildRows({ manifest: manifest(), metadata: md, snapshot, population: { populationM: pop } });
    expect(out.rows.some((r) => r.shared)).toBe(false);            // keine Länder-Zeilen
    expect(cadence(out.rows, md).dach.lastMs).toBe(Date.parse('2026-10-19T05:59:26.477688+00:00'));
    // ohne metadata.json bleibt die Zeit der gemeinsamen Zeilen als Rückfall, sonst nichts
    expect(cadence(rows, null).dach.lastMs).toBe(Date.parse('2026-10-19T05:59:26.477688+00:00'));
    expect(cadence([], null).dach.lastMs).toBeNull();
  });

  it('rechnet DACHLiLu nicht in die Länder-Dateien ein und umgekehrt', () => {
    expect(c.eu.lastMs).toBeLessThan(c.dach.lastMs);
    const noDach = cadence(rows.filter((r) => !r.shared), null);
    expect(noDach.dach.lastMs).toBeNull();
    expect(noDach.eu.regions).toBe(8);
    expect(cadence([], null)).toEqual({ dach: { lastMs: null }, eu: { regions: 0, lastMs: null, oldestMs: null } });
  });
});
