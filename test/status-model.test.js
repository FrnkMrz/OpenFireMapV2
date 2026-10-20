import { describe, it, expect } from 'vitest';
import {
  DACHLILU_IDS, GROUPS, assignGroups, buildDachRows, buildRegionRows, buildRows, buildRunRows, summarize, timelineGroups
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

describe('assignGroups', () => {
  const { rows } = buildRows({ manifest: manifest(), metadata: metadata(), snapshot, population: { populationM: pop } });
  const group = (id) => rows.find((r) => r.id === id).group;

  it('teilt DACH, LuLi, Top-5 und Rest zu', () => {
    expect(['germany', 'austria', 'switzerland'].map(group)).toEqual(['DACH', 'DACH', 'DACH']);
    expect(['luxembourg', 'liechtenstein'].map(group)).toEqual(['LuLi', 'LuLi']);
    expect(['poland', 'france', 'italy', 'hungary', 'spain'].map(group)).toEqual(Array(5).fill('Top-5'));
    expect(['portugal', 'malta', 'neuland'].map(group)).toEqual(['Rest', 'Rest', 'Rest']);
  });

  it('zählt DACHLiLu-Länder nicht zu den Top 5, auch wenn sie mehr Hydranten haben', () => {
    expect(rows.filter((r) => r.group === 'Top-5')).toHaveLength(5);
    expect(group('germany')).toBe('DACH');
  });

  it('entscheidet Gleichstand nach Kennung', () => {
    const tied = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, hydrants: 5 }));
    expect(assignGroups(tied).filter((r) => r.group === 'Top-5').map((r) => r.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('summarize', () => {
  const { rows } = buildRows({ manifest: manifest(), metadata: metadata(), snapshot, population: { populationM: pop } });
  const sum = summarize(rows);

  it('zählt Länder, Hydranten und Wachen insgesamt', () => {
    expect(sum.total.regions).toBe(13);
    expect(sum.total.hydrants).toBe(700 + 150 + 100 + 40 + 10 + 400 + 240 + 50 + 33 + 20 + 12 + 1 + 7);
    expect(sum.total.fireStations).toBe(60 + 20 + 12 + 5 + 3 + 6 * 10 + 10 + 10);
  });

  it('rechnet die Dichte nur über Länder mit bekannter Einwohnerzahl', () => {
    const withPop = rows.filter((r) => r.per1000 != null);
    const hydrants = withPop.reduce((s, r) => s + r.hydrants, 0);
    const people = withPop.reduce((s, r) => s + r.populationM, 0);
    expect(sum.total.per1000).toBeCloseTo(hydrants / (people * 1000), 6);
    expect(sum.total.regions).toBe(rows.length);
  });

  it('fasst jede Gruppe zusammen und nennt die Top 5 absteigend', () => {
    expect(Object.keys(sum.groups)).toEqual(GROUPS);
    expect(sum.groups.DACH.regions).toBe(3);
    expect(sum.groups.LuLi.hydrants).toBe(50);
    expect(sum.top5.map((r) => r.id)).toEqual(['poland', 'france', 'italy', 'hungary', 'spain']);
  });

  it('nennt ältesten OSM-Stand und letzten Upload', () => {
    expect(sum.total.oldestOsmMs).toBe(Date.parse('2026-10-17T20:00:00Z'));
    expect(sum.total.latestUploadMs).toBe(Date.parse('2026-10-19T05:59:26.477688+00:00'));
  });
});

describe('buildRunRows', () => {
  const runs = buildRunRows(manifest(), metadata());

  it('listet jede Datei einmal, neueste zuerst', () => {
    expect(runs).toHaveLength(9);
    const times = runs.map((r) => r.uploadMs);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(runs[0].id).toBe('dachlilu');
  });

  it('führt DACHLiLu als einen gemeinsamen Build mit Gesamtzahlen', () => {
    const d = runs.find((r) => r.id === 'dachlilu');
    expect(d.shared).toBe(true);
    expect(d.file).toBe('openfiremap.pmtiles');
    expect(d.sizeMb).toBe(182.5);
    expect(d.minzoom).toBe(12);
    expect(d.hydrants).toBe(1000);
    expect(d.fireStations).toBe(100);
    expect(runs.some((r) => DACHLILU_IDS.includes(r.id))).toBe(false);
  });

  it('übernimmt Datei, Zoom und alle Ebenen der Länder-Dateien', () => {
    const p = runs.find((r) => r.id === 'poland');
    expect(p).toMatchObject({ file: 'eu/poland-20261018T010000Z.pmtiles', minzoom: 0, maxzoom: 14, lagH: 5, waterPoints: 2, defibrillators: 3, boundaries: 50 });
  });

  it('kommt ohne metadata.json zurecht', () => {
    expect(buildRunRows(manifest(), null).some((r) => r.id === 'dachlilu')).toBe(false);
  });
});

describe('timelineGroups', () => {
  const { rows } = buildRows({ manifest: manifest(), metadata: metadata(), snapshot, population: { populationM: pop } });
  const groups = timelineGroups(rows);

  it('hält die Reihenfolge DACH, LuLi, Top-5, Rest', () => {
    expect(groups.map((g) => g.group)).toEqual(GROUPS);
  });

  it('sortiert den Rest nach Upload (neu zuerst), die übrigen nach Hydranten', () => {
    expect(groups[3].rows[0].id).toBe('malta');
    expect(groups[0].rows.map((r) => r.id)).toEqual(['germany', 'austria', 'switzerland']);
  });
});
