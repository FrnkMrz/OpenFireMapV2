/**
 * Tests für die Quellenwahl mit groben Länder-Umrissen (Europa-Erweiterung): Der Client öffnet nur Länder-Dateien, deren
 * Umriss (Land vereinfacht, ca. 5 km nach außen gepuffert) den Ausschnitt schneidet, nicht mehr alle Länder, deren
 * großes Rechteck ihn berührt (Frankreichs Rechteck reichte bis Benelux und Rhein).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Config } from '../src/js/config.js';
import { isRectIntersectingPolygon, isRectInPolygon } from '../src/js/geometry.js';
import { parseManifest, requiredRegionIds, resolveEuropeSources, setEuropeStateForTests } from '../src/js/europe.js';
import { EUROPE_COVERAGE, EUROPE_REGION_BOUNDS, EUROPE_REGION_OUTLINES } from '../src/js/coverage/europe.js';

const SHIPPED = JSON.parse(JSON.stringify(Config.pipeline.europe));
const vp = (lat, lon, d = 0.006) => ({ south: lat - d, north: lat + d, west: lon - d, east: lon + d });
const ALL_IDS = Object.keys(EUROPE_REGION_BOUNDS);
const STAMP = '20261015T145638Z';
const manifestOf = (ids) => parseManifest({
  version: 1, updated_at: '2026-10-15T14:56:39Z',
  regions: Object.fromEntries(ids.map((id) => [id, {
    id, name: id, file: `eu/${id}-${STAMP}.pmtiles`, size_bytes: 1000, generated_at: '2026-10-15T14:56:38+00:00',
    osm_data_until: '2026-10-14T20:21:12Z', bounds: EUROPE_REGION_BOUNDS[id], minzoom: 0, maxzoom: 14
  }]))
});
const needs = (lat, lon, d) => requiredRegionIds(vp(lat, lon, d), EUROPE_REGION_BOUNDS, EUROPE_REGION_OUTLINES);

beforeEach(() => { Config.pipeline.europe.enabled = true; setEuropeStateForTests(); });
afterEach(() => { Config.pipeline.europe = JSON.parse(JSON.stringify(SHIPPED)); setEuropeStateForTests(); });

describe('isRectIntersectingPolygon', () => {
  const square = [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]];                          // [lat, lon]
  const concave = [[0, 0], [0, 10], [10, 10], [10, 6], [4, 6], [4, 4], [10, 4], [10, 0], [0, 0]];   // U-Form, offen nach Norden

  it('Rechteck ganz im Polygon, Polygon ganz im Rechteck, Teilüberlappung: ja', () => {
    expect(isRectIntersectingPolygon(2, 2, 3, 3, square)).toBe(true);
    expect(isRectIntersectingPolygon(-5, -5, 15, 15, square)).toBe(true);     // Polygon liegt komplett im Rechteck
    expect(isRectIntersectingPolygon(8, 8, 12, 12, square)).toBe(true);       // Ecke ragt hinein
  });

  it('Kreuzung ohne Eckpunkt: Rechteck und Polygon schneiden sich nur mit den Kanten (Pluszeichen)', () => {
    const wideBar = [[4, -10], [4, 20], [6, 20], [6, -10], [4, -10]];         // lang und schmal
    expect(isRectIntersectingPolygon(-5, 4, 15, 6, wideBar)).toBe(true);      // hohes schmales Rechteck quer dazu
  });

  it('getrennt: nein (auch dicht daneben und im Bogen einer konkaven Form)', () => {
    expect(isRectIntersectingPolygon(11, 0, 12, 10, square)).toBe(false);
    expect(isRectIntersectingPolygon(0, 11, 10, 12, square)).toBe(false);
    expect(isRectIntersectingPolygon(5, 4.5, 8, 5.5, concave)).toBe(false);   // liegt in der Aussparung der U-Form
    expect(isRectIntersectingPolygon(5, 5.5, 8, 6.5, concave)).toBe(true);    // schneidet den rechten Schenkel
  });

  it('Berührung zählt (konservativ)', () => {
    expect(isRectIntersectingPolygon(10, 0, 12, 10, square)).toBe(true);
    expect(isRectIntersectingPolygon(2, 10, 3, 12, square)).toBe(true);
  });

  it('Liste von Ringen (Multipolygon): ein Ring genügt', () => {
    const far = [[50, 50], [50, 60], [60, 60], [60, 50], [50, 50]];
    expect(isRectIntersectingPolygon(2, 2, 3, 3, [far, square])).toBe(true);
    expect(isRectIntersectingPolygon(20, 20, 30, 30, [far, square])).toBe(false);
  });

  it('ungültige Eingaben: nein', () => {
    expect(isRectIntersectingPolygon(2, 2, 3, 3, null)).toBe(false);
    expect(isRectIntersectingPolygon(2, 2, 3, 3, [])).toBe(false);
    expect(isRectIntersectingPolygon(2, 2, 3, 3, [[0, 0], [1, 1]])).toBe(false);
    expect(isRectIntersectingPolygon(3, 2, 2, 3, square)).toBe(false);          // süd > nord
    expect(isRectIntersectingPolygon(null, 2, 3, 3, square)).toBe(false);
  });
});

describe('requiredRegionIds mit Umrissen', () => {
  const rect = { south: 50.0, north: 50.1, west: 5.0, east: 5.1 };
  const bounds = { big: [0, 40, 10, 60], other: [4, 49, 6, 51] };               // beide Rechtecke berühren das Rechteck
  const farOutline = [[[40, 0], [40, 3], [45, 3], [45, 0], [40, 0]]];           // Umriss des "big" liegt weit weg
  const nearOutline = [[[49.9, 4.9], [49.9, 5.2], [50.2, 5.2], [50.2, 4.9], [49.9, 4.9]]];

  it('der Umriss entscheidet: Rechteck berührt, Umriss nicht -> nicht nötig; Umriss berührt -> nötig', () => {
    expect(requiredRegionIds(rect, bounds)).toEqual(['big', 'other']);
    expect(requiredRegionIds(rect, bounds, { big: farOutline, other: nearOutline })).toEqual(['other']);
    expect(requiredRegionIds(rect, bounds, { big: nearOutline, other: farOutline })).toEqual(['big']);
  });

  it('ohne Umriss (oder mit leerem) gilt das Rechteck wie bisher; ein fehlender Umriss darf kein Land verlieren', () => {
    expect(requiredRegionIds(rect, bounds, {})).toEqual(['big', 'other']);
    expect(requiredRegionIds(rect, bounds, { big: [], other: nearOutline })).toEqual(['big', 'other']);
    expect(requiredRegionIds(rect, bounds, null)).toEqual(['big', 'other']);
  });

  it('der Umriss macht nie mehr Länder nötig als das Rechteck', () => {
    expect(requiredRegionIds({ south: 70, north: 71, west: 70, east: 71 }, bounds, { big: nearOutline, other: nearOutline })).toEqual([]);
  });
});

describe('echte, generierte Umrisse', () => {
  it('es gibt zu jedem Land ein Rechteck und einen Umriss, die Ringe sind geschlossen und liegen in Europa', () => {
    expect(Object.keys(EUROPE_REGION_OUTLINES).sort()).toEqual([...ALL_IDS].sort());
    for (const [id, rings] of Object.entries(EUROPE_REGION_OUTLINES)) {
      expect(rings.length, id).toBeGreaterThan(0);
      for (const ring of rings) {
        expect(ring.length, id).toBeGreaterThanOrEqual(4);
        expect(ring[0], id).toEqual(ring[ring.length - 1]);
        for (const [lat, lon] of ring) {
          expect(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180, `${id} ${lat},${lon}`).toBe(true);
        }
      }
    }
  });

  it('Maastricht und Aachen/Vaals brauchen nur Belgien und die Niederlande (Frankreichs Rechteck reichte bis dorthin)', () => {
    expect(requiredRegionIds(vp(50.85, 5.69), EUROPE_REGION_BOUNDS)).toEqual(['belgium', 'france', 'netherlands']);
    expect(needs(50.85, 5.69)).toEqual(['belgium', 'netherlands']);
    expect(needs(50.768, 6.02)).toEqual(['belgium', 'netherlands']);
  });

  it('weitere Grenzfälle: Tarvisio nur Italien, Aosta nur Italien, Straßburg/Kehl und Basel Frankreich, Görlitz Polen', () => {
    expect(needs(46.5, 13.58)).toEqual(['italy']);
    expect(needs(45.74, 7.32)).toEqual(['italy']);
    expect(needs(48.575, 7.8)).toEqual(['france']);
    expect(needs(47.58, 7.57)).toEqual(['france']);
    expect(needs(51.153, 14.99)).toEqual(['poland']);
  });

  it('ein Ausschnitt ganz in DACHLiLu braucht kein Land, an der Grenze (wenige km) kommt der Nachbar dazu', () => {
    expect(needs(47.54, 9.69)).toEqual([]);                          // Lindau/Bregenz
    expect(needs(48.137, 11.576)).toEqual([]);                       // München
    expect(needs(48.575, 7.8, 0.06)).toContain('france');           // größerer Ausschnitt bei Kehl
  });

  // Jede Hauptstadt (oder ein anderer Ort im Land) braucht ihr Land: der Umriss ist immer größer als das Land
  const CITIES = {
    'albania': [41.33, 19.82], 'andorra': [42.51, 1.52], 'azores': [37.74, -25.67], 'belgium': [50.85, 4.35],
    'bosnia-herzegovina': [43.86, 18.41], 'bulgaria': [42.7, 23.32], 'croatia': [45.81, 15.98], 'cyprus': [35.17, 33.36],
    'czech-republic': [50.08, 14.44], 'denmark': [55.68, 12.57], 'estonia': [59.44, 24.75], 'faroe-islands': [62.01, -6.77],
    'finland': [60.17, 24.94], 'france': [48.86, 2.35], 'great-britain': [51.51, -0.13], 'greece': [37.98, 23.73],
    'guernsey-jersey': [49.19, -2.11], 'hungary': [47.5, 19.04], 'iceland': [64.15, -21.94],
    'ireland-and-northern-ireland': [53.35, -6.26], 'isle-of-man': [54.15, -4.48], 'italy': [41.9, 12.5],
    'kosovo': [42.66, 21.17], 'latvia': [56.95, 24.11], 'lithuania': [54.69, 25.28], 'macedonia': [42.0, 21.43],
    'malta': [35.9, 14.51], 'moldova': [47.01, 28.86], 'monaco': [43.74, 7.42], 'montenegro': [42.44, 19.26],
    'netherlands': [52.37, 4.9], 'norway': [59.91, 10.75], 'poland': [52.23, 21.01], 'portugal': [38.72, -9.14],
    'romania': [44.43, 26.1], 'serbia': [44.79, 20.45], 'slovakia': [48.15, 17.11], 'slovenia': [46.06, 14.51],
    'spain': [40.42, -3.7], 'sweden': [59.33, 18.07]
  };
  it('jedes der 40 Länder wird an einem Ort in seinem Gebiet als nötig erkannt', () => {
    expect(Object.keys(CITIES).sort()).toEqual([...ALL_IDS].sort());
    for (const [id, [lat, lon]] of Object.entries(CITIES)) {
      expect(needs(lat, lon, 0.01), id).toContain(id);
    }
  });

  it('Eigenschaft über ein Raster: der Umriss macht nie mehr Länder nötig als das Rechteck, und ein Ausschnitt in der Abdeckung bekommt eine Quelle', () => {
    const dach = [5.69, 45.79, 17.2, 55.06];
    let checked = 0;
    const emptyOutsideDach = [];
    for (let lat = 35; lat < 71.5; lat += 1) {
      for (let lon = -25; lon < 34; lon += 1) {
        const r = vp(lat, lon, 0.01);
        if (!EUROPE_COVERAGE.some((ring) => isRectInPolygon(r.south, r.west, r.north, r.east, ring))) continue;
        checked++;
        const byRect = requiredRegionIds(r, EUROPE_REGION_BOUNDS);
        const byOutline = requiredRegionIds(r, EUROPE_REGION_BOUNDS, EUROPE_REGION_OUTLINES);
        expect(byOutline.every((id) => byRect.includes(id)), `${lat},${lon}`).toBe(true);
        // außerhalb des DACHLiLu-Rechtecks muss ein Ausschnitt in der Abdeckung (an Land) mindestens ein Land bekommen, ausgenommen Meeresflächen
        if (!(r.west <= dach[2] && r.east >= dach[0] && r.south <= dach[3] && r.north >= dach[1]) && byOutline.length === 0) emptyOutsideDach.push(`${lat},${lon}`);
      }
    }
    expect(checked).toBeGreaterThan(500);
    // Leere Treffer gibt es nur auf offener See (Ostsee, Adria, Biskaya ...), nie in nennenswerter Zahl
    expect(emptyOutsideDach.length / checked).toBeLessThan(0.05);
  });

  it('die Quellenwahl: Maastricht öffnet DACHLiLu, Niederlande, Belgien, nicht Frankreich; fehlt Frankreich im Manifest, ist der Ausschnitt trotzdem geeignet', () => {
    const data = { manifest: manifestOf(ALL_IDS.filter((id) => id !== 'france')), coverage: EUROPE_COVERAGE, regionBounds: EUROPE_REGION_BOUNDS, regionOutlines: EUROPE_REGION_OUTLINES };
    const maastricht = vp(50.80, 5.85);                              // Dreiländerecke bei Vaals: DACHLiLu, Niederlande, Belgien
    const withOutlines = resolveEuropeSources(maastricht, 16, data);
    expect(withOutlines.eligible).toBe(true);
    expect(withOutlines.sources.map((s) => s.id)).toEqual(['dachlilu', 'belgium', 'netherlands']);
    // ohne Umrisse (alter Weg): Frankreich wäre nötig und fehlt -> Overpass
    const old = resolveEuropeSources(maastricht, 16, { ...data, regionOutlines: null });
    expect(old.eligible).toBe(false);
    expect(old.missing).toEqual(['france']);
  });

  it('echte Eignung am Rand: ein Ausschnitt in Frankreich braucht Frankreich, fehlt es, ist er nicht geeignet', () => {
    const data = { manifest: manifestOf(ALL_IDS.filter((id) => id !== 'france')), coverage: EUROPE_COVERAGE, regionBounds: EUROPE_REGION_BOUNDS, regionOutlines: EUROPE_REGION_OUTLINES };
    const r = resolveEuropeSources(vp(48.8566, 2.3522), 16, data);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe('region_missing');
    expect(r.missing).toEqual(['france']);
  });
});
