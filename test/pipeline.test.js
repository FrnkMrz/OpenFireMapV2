import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isPipelineEligible,
  isPointInPolygon,
  isRectInPolygon,
  geoJsonFeatureToElement,
  clearPipelineCache,
  fetchPipelineData,
  fetchPipelineBoundaries,
  fetchPipelinePmtiles,
  getPipelineVersion,
  getPipelinePmtilesUrl,
  isViewportInHeader,
  ensurePmtilesHeaderCoverage,
  getPMTilesInstance,
  getVectorTile,
  clearTileCache,
  PmtilesCoverageMismatch,
  warmupPipeline,
  computeQueryZoom
} from '../src/js/pipeline.js';
import { Config } from '../src/js/config.js';
import { PMTiles } from 'pmtiles';

let mockVectorTileLayers = null;

vi.mock('@mapbox/vector-tile', () => {
  return {
    VectorTile: class MockVectorTile {
      constructor() {
        this.layers = mockVectorTileLayers || {};
      }
    }
  };
});

// Ausgangszustand der Pipeline-Konfiguration sichern
const initialPipelineConfig = {
  ...Config.pipeline,
  bounds: { ...Config.pipeline.bounds },
  coveragePolygon: Config.pipeline.coveragePolygon
};

describe('pipeline.js', () => {
  beforeEach(() => {
    mockVectorTileLayers = null;
    clearPipelineCache();
    Config.pipeline = {
      ...initialPipelineConfig,
      bounds: { ...initialPipelineConfig.bounds },
      coveragePolygon: initialPipelineConfig.coveragePolygon
    };
  });

  afterEach(() => {
    mockVectorTileLayers = null;
    vi.restoreAllMocks();
    clearPipelineCache();
    Config.pipeline = {
      ...initialPipelineConfig,
      bounds: { ...initialPipelineConfig.bounds },
      coveragePolygon: initialPipelineConfig.coveragePolygon
    };
  });

  describe('isPointInPolygon (Ray-Casting Jordan Curve)', () => {
    const polygon = Config.pipeline.coveragePolygon;

    it('sollte DACHLiLu-Städte als innerhalb (true) erkennen', () => {
      // München (BY)
      expect(isPointInPolygon(48.137, 11.576, polygon)).toBe(true);
      // Nürnberg (BY)
      expect(isPointInPolygon(49.452, 11.077, polygon)).toBe(true);
      // Augsburg (BY)
      expect(isPointInPolygon(48.366, 10.894, polygon)).toBe(true);
      // Würzburg (BY)
      expect(isPointInPolygon(49.793, 9.953, polygon)).toBe(true);
      // Regensburg (BY)
      expect(isPointInPolygon(49.013, 12.101, polygon)).toBe(true);
      // Passau (Zentrum)
      expect(isPointInPolygon(48.566, 13.431, polygon)).toBe(true);
      // Berlin (DE)
      expect(isPointInPolygon(52.520, 13.405, polygon)).toBe(true);
      // Hamburg (DE)
      expect(isPointInPolygon(53.551, 9.993, polygon)).toBe(true);
      // Köln (DE)
      expect(isPointInPolygon(50.937, 6.960, polygon)).toBe(true);
      // Stuttgart (BW)
      expect(isPointInPolygon(48.775, 9.182, polygon)).toBe(true);
      // Ulm (BW)
      expect(isPointInPolygon(48.401, 9.987, polygon)).toBe(true);
      // Wien (AT)
      expect(isPointInPolygon(48.208, 16.373, polygon)).toBe(true);
      // Salzburg (AT)
      expect(isPointInPolygon(47.809, 13.055, polygon)).toBe(true);
      // Innsbruck (AT)
      expect(isPointInPolygon(47.269, 11.404, polygon)).toBe(true);
      // Zürich (CH)
      expect(isPointInPolygon(47.376, 8.541, polygon)).toBe(true);
      // Bern (CH)
      expect(isPointInPolygon(46.948, 7.447, polygon)).toBe(true);
      // Vaduz (LI)
      expect(isPointInPolygon(47.141, 9.521, polygon)).toBe(true);
      // Luxemburg-Stadt (LU)
      expect(isPointInPolygon(49.611, 6.131, polygon)).toBe(true);
    });

    it('sollte Städte außerhalb von DACHLiLu als außerhalb (false) erkennen', () => {
      // Paris (Frankreich)
      expect(isPointInPolygon(48.856, 2.352, polygon)).toBe(false);
      // Straßburg (Frankreich)
      expect(isPointInPolygon(48.573, 7.752, polygon)).toBe(false);
      // Prag (Tschechien)
      expect(isPointInPolygon(50.075, 14.437, polygon)).toBe(false);
      // Mailand (Italien)
      expect(isPointInPolygon(45.464, 9.190, polygon)).toBe(false);
      // Warschau (Polen)
      expect(isPointInPolygon(52.229, 21.012, polygon)).toBe(false);
      // Brüssel (Belgien)
      expect(isPointInPolygon(50.850, 4.352, polygon)).toBe(false);
      // Amsterdam (Niederlande)
      expect(isPointInPolygon(52.367, 4.904, polygon)).toBe(false);
    });

    it('sollte bei ungültigen Eingaben sicher false zurückgeben', () => {
      expect(isPointInPolygon(null, 11.0, polygon)).toBe(false);
      expect(isPointInPolygon(48.0, null, polygon)).toBe(false);
      expect(isPointInPolygon(48.0, 11.0, null)).toBe(false);
      expect(isPointInPolygon(48.0, 11.0, [])).toBe(false);
      expect(isPointInPolygon(48.0, 11.0, [[48.0, 11.0]])).toBe(false);
    });
  });

  describe('isRectInPolygon (Exakter Rechteck-in-Polygon Test)', () => {
    // Konkaves Test-Polygon in U-Form:
    // Basis: lat 0 bis 4 (lon 0 bis 10)
    // Linker Schenkel: lat 4 bis 10 (lon 0 bis 3)
    // Rechter Schenkel: lat 4 bis 10 (lon 7 bis 10)
    // Einbuchtung (konkav): lat 4 bis 10, lon 3 bis 7
    const uPolygon = [
      [0, 0],
      [10, 0],
      [10, 3],
      [4, 3],
      [4, 7],
      [10, 7],
      [10, 10],
      [0, 10],
      [0, 0]
    ];

    it('sollte false liefern, wenn alle 4 Ecken innen liegen, das Rechteck aber die Einbuchtung überspannt', () => {
      // SW=(2, 1) [Basis], NW=(8, 1) [linker Schenkel], NE=(8, 9) [rechter Schenkel], SE=(2, 9) [Basis]
      // Alle 4 Ecken sind im Polygon, aber die obere Kante von lon 1 bis 9 bei lat 8 schneidet
      // die Einbuchtungskanten (bei lon 3 und lon 7).
      expect(isRectInPolygon(2, 1, 8, 9, uPolygon)).toBe(false);
    });

    it('sollte true liefern, wenn das Rechteck vollständig in einem Schenkel oder der Basis liegt', () => {
      // Vollständig im linken Schenkel
      expect(isRectInPolygon(5, 0.5, 9, 2.5, uPolygon)).toBe(true);
      // Vollständig in der Basis
      expect(isRectInPolygon(0.5, 1, 3.5, 9, uPolygon)).toBe(true);
      // Vollständig im rechten Schenkel
      expect(isRectInPolygon(5, 7.5, 9, 9.5, uPolygon)).toBe(true);
    });

    it('sollte false liefern, wenn eine oder mehrere Ecken außerhalb liegen', () => {
      // Liegt teilweise unterhalb der Basis (south < 0)
      expect(isRectInPolygon(-1, 1, 2, 5, uPolygon)).toBe(false);
      // Liegt in der Einbuchtung (lat 5..9, lon 4..6)
      expect(isRectInPolygon(5, 4, 9, 6, uPolygon)).toBe(false);
    });

    it('sollte bei ungültigen Eingaben sicher false zurückgeben', () => {
      expect(isRectInPolygon(null, 10, 50, 12, uPolygon)).toBe(false);
      expect(isRectInPolygon(48, 10, 47, 12, uPolygon)).toBe(false); // south > north
      expect(isRectInPolygon(48, 12, 49, 10, uPolygon)).toBe(false); // west > east
      expect(isRectInPolygon(48, 10, 49, 11, null)).toBe(false);
      expect(isRectInPolygon(48, 10, 49, 11, [])).toBe(false);
    });
  });

  describe('isPipelineEligible', () => {
    it('sollte true zurückgeben, wenn der Ausschnitt in DACHLiLu liegt (z. B. Schnaittach, München, Wien, Zürich)', () => {
      const schnaittachBounds = {
        getCenter: () => ({ lat: 49.555, lng: 11.35 }),
        getSouth: () => 49.54,
        getNorth: () => 49.57,
        getWest: () => 11.33,
        getEast: () => 11.37
      };
      const muenchenBounds = {
        getCenter: () => ({ lat: 48.137, lng: 11.576 }),
        getSouth: () => 48.12,
        getNorth: () => 48.15,
        getWest: () => 11.55,
        getEast: () => 11.60
      };
      const wienBounds = {
        getCenter: () => ({ lat: 48.208, lng: 16.373 }),
        getSouth: () => 48.19,
        getNorth: () => 48.22,
        getWest: () => 16.35,
        getEast: () => 16.39
      };
      const zuerichBounds = {
        getCenter: () => ({ lat: 47.376, lng: 8.541 }),
        getSouth: () => 47.36,
        getNorth: () => 47.39,
        getWest: () => 8.52,
        getEast: () => 8.56
      };
      expect(isPipelineEligible(schnaittachBounds, 15)).toBe(true);
      expect(isPipelineEligible(schnaittachBounds, 12)).toBe(true);
      expect(isPipelineEligible(muenchenBounds, 15)).toBe(true);
      expect(isPipelineEligible(wienBounds, 15)).toBe(true);
      expect(isPipelineEligible(zuerichBounds, 15)).toBe(true);
    });

    it('sollte false zurückgeben für Städte außerhalb DACHLiLu (z. B. Paris, Prag)', () => {
      const parisBounds = {
        getCenter: () => ({ lat: 48.856, lng: 2.352 }),
        getSouth: () => 48.84,
        getNorth: () => 48.87,
        getWest: () => 2.33,
        getEast: () => 2.37
      };
      const pragBounds = {
        getCenter: () => ({ lat: 50.075, lng: 14.437 }),
        getSouth: () => 50.06,
        getNorth: () => 50.09,
        getWest: () => 14.41,
        getEast: () => 14.46
      };
      expect(isPipelineEligible(parisBounds, 15)).toBe(false);
      expect(isPipelineEligible(pragBounds, 15)).toBe(false);
    });

    it('sollte false zurückgeben bei Grenzüberschreitung an der DACHLiLu-Außengrenze (z. B. Kehl DE / Straßburg FR)', () => {
      // Zentrum in Kehl (Deutschland), aber Viewport reicht über den Rhein nach Straßburg (Frankreich)
      const borderCrossingBounds = {
        getCenter: () => ({ lat: 48.571, lng: 7.809 }),
        getSouth: () => 48.56,
        getNorth: () => 48.59,
        getWest: () => 7.74, // Liegt in Straßburg (Frankreich)!
        getEast: () => 7.82
      };
      // Da die Westecke außerhalb von DACHLiLu liegt, MUSS isPipelineEligible false liefern,
      // damit Overpass anspringt und Straßburg nicht als leere Fläche gerendert wird!
      expect(isPipelineEligible(borderCrossingBounds, 15)).toBe(false);
    });

    it('sollte Plain-Object Bounds mit south, west, north, east ohne Leaflet-Methoden unterstützen', () => {
      const plainBounds = {
        south: 48.12,
        north: 48.15,
        west: 11.55,
        east: 11.60
      };
      expect(isPipelineEligible(plainBounds, 15)).toBe(true);
    });

    it('sollte false zurückgeben, wenn der Zoom unter 12 liegt', () => {
      const mockBounds = {
        getCenter: () => ({ lat: 49.555, lng: 11.35 })
      };
      expect(isPipelineEligible(mockBounds, 11)).toBe(false);
      expect(isPipelineEligible(mockBounds, 8)).toBe(false);
    });

    it('sollte false zurückgeben, wenn der Ausschnitt außerhalb von DACHLiLu liegt (z. B. Paris oder London)', () => {
      const mockBounds = {
        getCenter: () => ({ lat: 48.856, lng: 2.352 })
      };
      expect(isPipelineEligible(mockBounds, 15)).toBe(false);
    });

    it('sollte false zurückgeben, wenn die Pipeline deaktiviert ist', () => {
      Config.pipeline.enabled = false;
      const mockBounds = {
        getCenter: () => ({ lat: 49.555, lng: 11.35 })
      };
      expect(isPipelineEligible(mockBounds, 15)).toBe(false);
      Config.pipeline.enabled = true;
    });

    it('sollte false liefern für Positionen außerhalb von DACHLiLu (Paris, Prag, Mailand, Warschau, Straßburg)', () => {
      const makeViewport = (lat, lon) => ({
        south: lat - 0.015,
        north: lat + 0.015,
        west: lon - 0.01,
        east: lon + 0.01
      });

      // Paris (Frankreich): 48.856, 2.352
      expect(isPipelineEligible(makeViewport(48.856, 2.352), 15)).toBe(false);
      // Prag (Tschechien): 50.075, 14.437
      expect(isPipelineEligible(makeViewport(50.075, 14.437), 15)).toBe(false);
      // Mailand (Italien): 45.464, 9.190
      expect(isPipelineEligible(makeViewport(45.464, 9.190), 15)).toBe(false);
      // Warschau (Polen): 52.229, 21.012
      expect(isPipelineEligible(makeViewport(52.229, 21.012), 15)).toBe(false);
      // Straßburg (Frankreich, westlich des Rheins): 48.573, 7.752
      expect(isPipelineEligible(makeViewport(48.573, 7.752), 15)).toBe(false);
    });

    it('sollte true liefern für Städte in allen 5 DACHLiLu-Ländern (DE, AT, CH, LU, LI)', () => {
      const makeViewport = (lat, lon) => ({
        south: lat - 0.015,
        north: lat + 0.015,
        west: lon - 0.01,
        east: lon + 0.01
      });

      // Deutschland (DE)
      expect(isPipelineEligible(makeViewport(52.520, 13.405), 15)).toBe(true);  // Berlin
      expect(isPipelineEligible(makeViewport(53.551, 9.993), 15)).toBe(true);   // Hamburg
      expect(isPipelineEligible(makeViewport(50.937, 6.960), 15)).toBe(true);   // Köln
      expect(isPipelineEligible(makeViewport(48.137, 11.576), 15)).toBe(true);  // München
      expect(isPipelineEligible(makeViewport(49.452, 11.077), 15)).toBe(true);  // Nürnberg
      expect(isPipelineEligible(makeViewport(48.401, 9.987), 15)).toBe(true);   // Ulm (BW)
      expect(isPipelineEligible(makeViewport(49.555, 11.350), 15)).toBe(true);  // Schnaittach

      // Österreich (AT)
      expect(isPipelineEligible(makeViewport(48.208, 16.373), 15)).toBe(true);  // Wien
      expect(isPipelineEligible(makeViewport(47.809, 13.055), 15)).toBe(true);  // Salzburg
      expect(isPipelineEligible(makeViewport(47.269, 11.404), 15)).toBe(true);  // Innsbruck
      expect(isPipelineEligible(makeViewport(47.070, 15.439), 15)).toBe(true);  // Graz

      // Schweiz (CH)
      expect(isPipelineEligible(makeViewport(47.376, 8.541), 15)).toBe(true);   // Zürich
      expect(isPipelineEligible(makeViewport(46.948, 7.447), 15)).toBe(true);   // Bern
      expect(isPipelineEligible(makeViewport(47.050, 8.309), 15)).toBe(true);   // Luzern
      expect(isPipelineEligible(makeViewport(47.424, 9.376), 15)).toBe(true);   // St. Gallen

      // Luxemburg (LU)
      expect(isPipelineEligible(makeViewport(49.611, 6.131), 15)).toBe(true);   // Luxemburg-Stadt

      // Liechtenstein (LI)
      expect(isPipelineEligible(makeViewport(47.141, 9.521), 15)).toBe(true);   // Vaduz
    });

    it('sollte mit Multi-Polygonen und Regionenlisten korrekt funktionieren', () => {
      const origPolygon = Config.pipeline.coveragePolygon;
      try {
        // Multi-Polygon mit 2 separaten Test-Rechtecken
        Config.pipeline.coveragePolygon = [
          // Polygon 1 (um 48.0, 11.0)
          [
            [47.9, 10.9],
            [48.1, 10.9],
            [48.1, 11.1],
            [47.9, 11.1],
            [47.9, 10.9]
          ],
          // Polygon 2 (um 49.0, 12.0)
          [
            [48.9, 11.9],
            [49.1, 11.9],
            [49.1, 12.1],
            [48.9, 12.1],
            [48.9, 11.9]
          ]
        ];

        // Liegt komplett in Polygon 1
        expect(isPipelineEligible({ south: 47.95, north: 48.05, west: 10.95, east: 11.05 }, 15)).toBe(true);
        // Liegt komplett in Polygon 2
        expect(isPipelineEligible({ south: 48.95, north: 49.05, west: 11.95, east: 12.05 }, 15)).toBe(true);
        // Liegt zwischen den beiden Polygonen (Niemandsland)
        expect(isPipelineEligible({ south: 48.4, north: 48.6, west: 11.4, east: 11.6 }, 15)).toBe(false);
      } finally {
        Config.pipeline.coveragePolygon = origPolygon;
      }
    });
  });

  describe('geoJsonFeatureToElement', () => {
    it('sollte ein Point-Feature korrekt in ein OSM-Element konvertieren', () => {
      const feature = {
        id: 12345,
        geometry: {
          type: 'Point',
          coordinates: [11.3501, 49.5552]
        },
        properties: {
          emergency: 'fire_hydrant',
          'fire_hydrant:type': 'underground'
        }
      };

      const el = geoJsonFeatureToElement(feature, 'hydrants', 0);
      expect(el).not.toBeNull();
      expect(el.id).toBe(12345);
      expect(el.lat).toBe(49.5552);
      expect(el.lon).toBe(11.3501);
      expect(el.tags.emergency).toBe('fire_hydrant');
      expect(el.tags['fire_hydrant:type']).toBe('underground');
    });

    it('sollte ein Polygon-Feature auf den Mittelpunkt (Centroid) reduzieren', () => {
      const feature = {
        id: 999,
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [11.0, 49.0],
              [11.2, 49.0],
              [11.2, 49.2],
              [11.0, 49.2]
            ]
          ]
        },
        properties: {
          amenity: 'fire_station'
        }
      };

      const el = geoJsonFeatureToElement(feature, 'fire_stations', 0);
      expect(el).not.toBeNull();
      expect(el.id).toBe(999);
      expect(el.lat).toBeCloseTo(49.1, 4);
      expect(el.lon).toBeCloseTo(11.1, 4);
      expect(el.tags.amenity).toBe('fire_station');
    });

    it('sollte ein MultiPolygon-Feature (z. B. komplexe Feuerwehrhäuser) auf den Centroid reduzieren', () => {
      const feature = {
        id: 'ff_schnaittach',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [11.338, 49.565],
                [11.340, 49.565],
                [11.340, 49.567],
                [11.338, 49.567]
              ]
            ]
          ]
        },
        properties: {
          amenity: 'fire_station',
          name: 'Freiwillige Feuerwehr Schnaittach'
        }
      };

      const el = geoJsonFeatureToElement(feature, 'fire_stations', 0);
      expect(el).not.toBeNull();
      expect(el.id).toBe('ff_schnaittach');
      expect(el.lat).toBeCloseTo(49.566, 3);
      expect(el.lon).toBeCloseTo(11.339, 3);
      expect(el.tags.name).toBe('Freiwillige Feuerwehr Schnaittach');
    });

    it('sollte ungültige Geometrien sicher abfangen und null zurückgeben', () => {
      expect(geoJsonFeatureToElement(null, 'hydrants', 0)).toBeNull();
      expect(geoJsonFeatureToElement({}, 'hydrants', 0)).toBeNull();
      expect(geoJsonFeatureToElement({ geometry: {} }, 'hydrants', 0)).toBeNull();
    });

    it('sollte bei fehlender ID eine stabile räumliche Koordinate als ID generieren', () => {
      const feat1 = {
        geometry: { type: 'Point', coordinates: [11.338691, 49.5274751] },
        properties: { emergency: 'fire_hydrant' }
      };
      const feat2 = {
        geometry: { type: 'Point', coordinates: [11.3361234, 49.539252] },
        properties: { emergency: 'fire_hydrant' }
      };

      const el1 = geoJsonFeatureToElement(feat1, 'hydrants', 0);
      const el2 = geoJsonFeatureToElement(feat2, 'hydrants', 0);

      expect(el1.id).toBe('hydrants_49527475_11338691');
      expect(el2.id).toBe('hydrants_49539252_11336123');
      expect(el1.id).not.toBe(el2.id); // Keine Kollision trotz gleichem Index 0!
    });
  });

  describe('PMTiles Tile-Berechnungen', () => {
    it('sollte lon2tile und lat2tile für Schnaittach auf Zoom 14 korrekt berechnen', async () => {
      const { lon2tile, lat2tile } = await import('../src/js/pipeline.js');
      const x = lon2tile(11.35, 14);
      const y = lat2tile(49.555, 14);
      expect(x).toBe(8708);
      expect(y).toBe(5587);
    });

    it('sollte tile2lon und tile2lat als Umkehrfunktion für Schnaittach verifizieren', async () => {
      const { lon2tile, lat2tile, tile2lon, tile2lat } = await import('../src/js/pipeline.js');
      const origLon = 11.3437;
      const origLat = 49.5259;
      const z = 14;

      const x = lon2tile(origLon, z);
      const y = lat2tile(origLat, z);

      const lonWest = tile2lon(x, z);
      const lonEast = tile2lon(x + 1, z);
      const latNorth = tile2lat(y, z);
      const latSouth = tile2lat(y + 1, z);

      expect(origLon).toBeGreaterThanOrEqual(lonWest);
      expect(origLon).toBeLessThanOrEqual(lonEast);
      expect(origLat).toBeGreaterThanOrEqual(latSouth);
      expect(origLat).toBeLessThanOrEqual(latNorth);
    });

    it('sollte getPMTilesInstance als stabiles Singleton instanziieren', async () => {
      const { getPMTilesInstance } = await import('../src/js/pipeline.js');
      const inst1 = getPMTilesInstance('http://example.com/tiles.pmtiles');
      const inst2 = getPMTilesInstance('http://example.com/tiles.pmtiles');
      expect(inst1).toBe(inst2);
    });

    it('sollte fetchPipelineBoundaries als Funktion exportieren', async () => {
      const { fetchPipelineBoundaries } = await import('../src/js/pipeline.js');
      expect(typeof fetchPipelineBoundaries).toBe('function');
    });
  });

  describe('geojsonFallback Steuerung', () => {
    it('sollte bei PMTiles-Fehler und geojsonFallback=false eine Exception werfen und KEIN GeoJSON fetchen', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.usePmtiles = true;
      Config.pipeline.geojsonFallback = false;
      Config.pipeline.url = 'https://pipeline.example.com';
      Config.pipeline.pmtilesFile = 'test_error.pmtiles';

      // fetch vollständig mocken: metadata.json scheitert -> URL bleibt garantiert ohne ?v=
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : (input?.url || input?.href || String(input));
        if (url.includes('metadata.json')) {
          throw new Error('offline');
        }
        throw new Error(`Unerwarteter fetch-Aufruf im Test: ${url}`);
      });

      const bounds = {
        getSouth: () => 48.12,
        getNorth: () => 48.15,
        getWest: () => 11.55,
        getEast: () => 11.60
      };

      const { getPMTilesInstance } = await import('../src/js/pipeline.js');
      const instance = getPMTilesInstance('https://pipeline.example.com/test_error.pmtiles');
      vi.spyOn(instance, 'getHeader').mockRejectedValueOnce(new Error('PMTiles network failure'));

      await expect(fetchPipelineData(bounds, 'all', { zoom: 14 })).rejects.toThrow(
        /PMTiles-Abruf fehlgeschlagen.*GeoJSON-Fallback ist deaktiviert/
      );

      const geoJsonCalls = fetchSpy.mock.calls.filter(call => {
        const url = typeof call[0] === 'string' ? call[0] : (call[0]?.url || call[0]?.href || String(call[0]));
        return url.includes('.geojson');
      });
      expect(geoJsonCalls.length).toBe(0);
    });

    it('sollte bei Boundary-PMTiles-Fehler und geojsonFallback=false eine Exception werfen und KEIN boundaries.geojson fetchen', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.usePmtiles = true;
      Config.pipeline.geojsonFallback = false;
      Config.pipeline.url = 'https://pipeline.example.com';
      Config.pipeline.pmtilesFile = 'boundary_error.pmtiles';

      // fetch vollständig mocken: metadata.json scheitert -> URL bleibt garantiert ohne ?v=
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : (input?.url || input?.href || String(input));
        if (url.includes('metadata.json')) {
          throw new Error('offline');
        }
        throw new Error(`Unerwarteter fetch-Aufruf im Test: ${url}`);
      });

      const bounds = {
        getSouth: () => 48.12,
        getNorth: () => 48.15,
        getWest: () => 11.55,
        getEast: () => 11.60
      };

      const { getPMTilesInstance } = await import('../src/js/pipeline.js');
      const instance = getPMTilesInstance('https://pipeline.example.com/boundary_error.pmtiles');
      vi.spyOn(instance, 'getHeader').mockRejectedValueOnce(new Error('PMTiles boundary failure'));

      await expect(fetchPipelineBoundaries(bounds, { zoom: 14 })).rejects.toThrow(
        /PMTiles-Boundary-Abruf fehlgeschlagen.*GeoJSON-Fallback ist deaktiviert/
      );

      const geoJsonCalls = fetchSpy.mock.calls.filter(call => {
        const url = typeof call[0] === 'string' ? call[0] : (call[0]?.url || call[0]?.href || String(call[0]));
        return url.includes('boundaries.geojson');
      });
      expect(geoJsonCalls.length).toBe(0);
    });
  });

  describe('isViewportInHeader', () => {
    const bayernHeader = {
      minLat: 47.24,
      maxLat: 50.59,
      minLon: 8.94,
      maxLon: 13.94
    };
    const dachliluHeader = {
      minLat: 45.8,
      maxLat: 55.1,
      minLon: 5.7,
      maxLon: 17.2
    };

    it('sollte true zurückgeben, wenn der Viewport vollständig im Header liegt', () => {
      // München im Bayern-Header
      const muenchen = { south: 48.12, north: 48.15, west: 11.55, east: 11.60 };
      expect(isViewportInHeader(muenchen, bayernHeader)).toBe(true);

      // Berlin im DACHLiLu-Header
      const berlin = { south: 52.50, north: 52.54, west: 13.38, east: 13.43 };
      expect(isViewportInHeader(berlin, dachliluHeader)).toBe(true);
    });

    it('sollte false zurückgeben, wenn der Viewport nördlich außerhalb des Headers liegt (z. B. Berlin in Bayern-Header)', () => {
      const berlin = { south: 52.50, north: 52.54, west: 13.38, east: 13.43 };
      expect(isViewportInHeader(berlin, bayernHeader)).toBe(false);
    });

    it('sollte false zurückgeben, wenn der Viewport in eine andere Himmelsrichtung herausragt', () => {
      expect(isViewportInHeader({ south: 45.0, north: 48.0, west: 10.0, east: 11.0 }, bayernHeader)).toBe(false);
      expect(isViewportInHeader({ south: 48.0, north: 49.0, west: 7.0, east: 10.0 }, bayernHeader)).toBe(false);
      expect(isViewportInHeader({ south: 48.0, north: 49.0, west: 10.0, east: 15.0 }, bayernHeader)).toBe(false);
    });

    it('sollte Rundungsungenauigkeiten an der Grenze tolerieren (Epsilon)', () => {
      const borderBox = {
        south: 47.24 - 0.000005,
        north: 50.59 + 0.000005,
        west: 8.94 - 0.000005,
        east: 13.94 + 0.000005
      };
      expect(isViewportInHeader(borderBox, bayernHeader)).toBe(true);
    });

    it('sollte false zurückgeben bei ungültigen Eingaben', () => {
      expect(isViewportInHeader(null, bayernHeader)).toBe(false);
      expect(isViewportInHeader({ south: 48.0 }, null)).toBe(false);
    });
  });

  describe('getPipelineVersion & getPipelinePmtilesUrl', () => {
    it('sollte generated_at aus metadata.json als Query-String anhängen', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ generated_at: '2026-09-29T12:00:00Z' })
      });

      const url = await getPipelinePmtilesUrl('https://pipeline.example.com', 'openfiremap.pmtiles');
      expect(url).toBe('https://pipeline.example.com/openfiremap.pmtiles?v=2026-09-29T12%3A00%3A00Z');
      expect(fetchSpy).toHaveBeenCalledWith('https://pipeline.example.com/metadata.json', expect.objectContaining({ cache: 'no-cache' }));
    });

    it('sollte bei Netzwerkfehler ohne ?v= fortfahren und keine Exception werfen', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

      const url = await getPipelinePmtilesUrl('https://pipeline.example.com', 'openfiremap.pmtiles');
      expect(url).toBe('https://pipeline.example.com/openfiremap.pmtiles');
    });

    it('sollte das Ergebnis cachen und metadata.json innerhalb der TTL nicht erneut abrufen', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ generated_at: '2026-09-29T12:00:00Z' })
      });

      const v1 = await getPipelineVersion('https://pipeline.example.com');
      const v2 = await getPipelineVersion('https://pipeline.example.com');
      expect(v1).toBe('2026-09-29T12:00:00Z');
      expect(v2).toBe('2026-09-29T12:00:00Z');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('PMTiles Cache-Busting & Coverage Mismatch Detection', () => {
    it('Test 1: Header nur Bayern + Viewport Berlin -> wirft PmtilesCoverageMismatch und liefert KEIN leeres Array', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.usePmtiles = true;
      Config.pipeline.geojsonFallback = false;
      Config.pipeline.url = 'https://pipeline.example.com';
      Config.pipeline.pmtilesFile = 'openfiremap.pmtiles';

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          return {
            ok: true,
            json: async () => ({ generated_at: '2026-09-28T08:00:00Z' })
          };
        }
        return { ok: false, status: 404 };
      });

      // Viewport Berlin Mitte (lat: 52.52, lon: 13.40)
      const berlinBounds = {
        getSouth: () => 52.50,
        getNorth: () => 52.54,
        getWest: () => 13.38,
        getEast: () => 13.43
      };

      const bayernHeader = {
        minLat: 47.24,
        maxLat: 50.59,
        minLon: 8.94,
        maxLon: 13.94,
        minZoom: 12,
        maxZoom: 16
      };
      vi.spyOn(PMTiles.prototype, 'getHeader').mockResolvedValue(bayernHeader);

      let caughtError = null;
      let result = null;
      try {
        result = await fetchPipelineData(berlinBounds, 'all', { zoom: 14 });
      } catch (err) {
        caughtError = err;
      }

      // Darf KEIN leeres Array [] liefern und muss fehlschlagen!
      expect(result).toBeNull();
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toContain('liegt außerhalb der PMTiles-Header-Abdeckung');
      // Überprüfe die zugrundeliegende Ursache
      const mismatchErr = caughtError instanceof PmtilesCoverageMismatch ? caughtError : caughtError.cause;
      expect(mismatchErr).toBeInstanceOf(PmtilesCoverageMismatch);
      expect(mismatchErr.details.header.maxLat).toBe(50.59);
      expect(mismatchErr.details.viewport.north).toBe(52.54);
    });

    it('Test 2: Header DACHLiLu + Viewport Berlin -> normaler Ablauf, liefert Elemente', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.usePmtiles = true;
      Config.pipeline.geojsonFallback = false;
      Config.pipeline.url = 'https://pipeline.example.com';
      Config.pipeline.pmtilesFile = 'openfiremap.pmtiles';

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          return {
            ok: true,
            json: async () => ({ generated_at: '2026-09-29T10:00:00Z' })
          };
        }
        return { ok: false, status: 404 };
      });

      const berlinBounds = {
        getSouth: () => 52.50,
        getNorth: () => 52.54,
        getWest: () => 13.38,
        getEast: () => 13.43
      };

      const dachliluHeader = {
        minLat: 45.8,
        maxLat: 55.1,
        minLon: 5.7,
        maxLon: 17.2,
        minZoom: 12,
        maxZoom: 16
      };
      vi.spyOn(PMTiles.prototype, 'getHeader').mockResolvedValue(dachliluHeader);
      vi.spyOn(PMTiles.prototype, 'getZxy').mockResolvedValue({
        data: new Uint8Array([1, 2, 3])
      });

      mockVectorTileLayers = {
        fire_stations: {
          length: 1,
          feature: () => ({
            toGeoJSON: () => ({
              type: 'Feature',
              id: 'berlin_mitte_112',
              geometry: { type: 'Point', coordinates: [13.405, 52.520] },
              properties: { amenity: 'fire_station', name: 'Feuerwache Berlin Mitte' }
            })
          })
        }
      };

      const elements = await fetchPipelineData(berlinBounds, 'stations', { zoom: 14 });

      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBeGreaterThan(0);
      const station = elements.find(el => el.id === 'berlin_mitte_112');
      expect(station).toBeDefined();
      expect(station.lat).toBe(52.520);
      expect(station.lon).toBe(13.405);
      expect(station.tags.name).toBe('Feuerwache Berlin Mitte');
    });

    it('Test 3: Versionswechsel in metadata.json -> verwirft Singleton-Instanz, holt Header neu', async () => {
      let currentVersion = '2026-09-28T10:00:00Z';

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          return {
            ok: true,
            json: async () => ({ generated_at: currentVersion })
          };
        }
        return { ok: false, status: 404 };
      });

      // 1. Initialer Abruf mit Version 1
      const url1 = await getPipelinePmtilesUrl('https://pipeline.example.com', 'openfiremap.pmtiles');
      expect(url1).toBe('https://pipeline.example.com/openfiremap.pmtiles?v=2026-09-28T10%3A00%3A00Z');

      const inst1 = getPMTilesInstance(url1);

      // 2. Neuer Rollout auf dem Server: Version wechselt auf Version 2
      currentVersion = '2026-09-29T12:00:00Z';

      // forceRefresh simuliert Ablauf des TTL oder erzwungenen Abruf
      const v2 = await getPipelineVersion('https://pipeline.example.com', { forceRefresh: true });
      expect(v2).toBe('2026-09-29T12:00:00Z');

      const url2 = await getPipelinePmtilesUrl('https://pipeline.example.com', 'openfiremap.pmtiles');
      expect(url2).toBe('https://pipeline.example.com/openfiremap.pmtiles?v=2026-09-29T12%3A00%3A00Z');

      const inst2 = getPMTilesInstance(url2);
      expect(inst2).not.toBe(inst1); // Neue Instanz erzeugt!

      const headerSpy2 = vi.spyOn(inst2, 'getHeader').mockResolvedValue({
        minLat: 45.8, maxLat: 55.1, minLon: 5.7, maxLon: 17.2, minZoom: 12, maxZoom: 16
      });

      const header = await inst2.getHeader();
      expect(header.maxLat).toBe(55.1);
      expect(headerSpy2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Kachel-Cache & Deduplizierung (Performance-Optimierung)', () => {
    it('sollte parallele Anfragen für dieselbe Kachel deduplizieren (Promise Sharing)', async () => {
      let getZxyCalls = 0;
      const dummyPmtiles = {
        getZxy: vi.fn(async () => {
          getZxyCalls++;
          // Künstliche Verzögerung simulieren
          await new Promise((r) => setTimeout(r, 10));
          return { data: new Uint8Array([1, 2, 3]) };
        })
      };

      // Zwei parallele Abrufe für dieselbe Kachel 14/8705/5586
      const [res1, res2] = await Promise.all([
        getVectorTile(dummyPmtiles, 14, 8705, 5586),
        getVectorTile(dummyPmtiles, 14, 8705, 5586)
      ]);

      expect(res1).toBeDefined();
      expect(res2).toBeDefined();
      expect(res1).toBe(res2); // Exakt dieselbe Instanz geteilt!
      expect(getZxyCalls).toBe(1); // Nur EIN Netzwerkaufruf!
    });

    it('sollte bereits abgerufene Kacheln aus dem In-Memory-Cache liefern (0 Netzwerkaufrufe)', async () => {
      const dummyPmtiles = {
        getZxy: vi.fn(async () => ({ data: new Uint8Array([1, 2, 3]) }))
      };

      // 1. Abruf: Netzwerk
      const res1 = await getVectorTile(dummyPmtiles, 14, 8705, 5586);
      expect(dummyPmtiles.getZxy).toHaveBeenCalledTimes(1);

      // 2. Abruf: Aus Memory-Cache
      const res2 = await getVectorTile(dummyPmtiles, 14, 8705, 5586);
      expect(dummyPmtiles.getZxy).toHaveBeenCalledTimes(1); // Keine zweite Anfrage!
      expect(res2).toBe(res1);
    });

    it('sollte parallele metadata.json-Abrufe deduplizieren (Promise Sharing)', async () => {
      let fetchCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          fetchCount++;
          await new Promise((r) => setTimeout(r, 10));
          return {
            ok: true,
            json: async () => ({ generated_at: '2026-09-29T15:00:00Z' })
          };
        }
        return { ok: false, status: 404 };
      });

      // Zwei gleichzeitige Aufrufe von getPipelineVersion
      const [v1, v2] = await Promise.all([
        getPipelineVersion('https://pipeline.example.com'),
        getPipelineVersion('https://pipeline.example.com')
      ]);

      expect(v1).toBe('2026-09-29T15:00:00Z');
      expect(v2).toBe('2026-09-29T15:00:00Z');
      expect(fetchCount).toBe(1); // Nur EIN HTTP-Request!
    });

    it('clearPipelineCache sollte auch den Kachel-Cache leeren', async () => {
      const dummyPmtiles = {
        getZxy: vi.fn(async () => ({ data: new Uint8Array([1, 2, 3]) }))
      };

      await getVectorTile(dummyPmtiles, 14, 100, 200);
      expect(dummyPmtiles.getZxy).toHaveBeenCalledTimes(1);

      clearPipelineCache();

      // Nach dem Cache-Clear muss getZxy erneut aufgerufen werden
      await getVectorTile(dummyPmtiles, 14, 100, 200);
      expect(dummyPmtiles.getZxy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Teil B: warmupPipeline, Progressives Streaming & Pufferring im Hintergrund', () => {
    it('warmupPipeline sollte metadata.json und Header vorab laden, wenn Viewport in DACHLiLu liegt', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.url = 'https://pipeline.example.com';
      Config.defaultCenter = [49.555, 11.35];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          return {
            ok: true,
            json: async () => ({ generated_at: '2026-09-29T16:00:00Z' })
          };
        }
        return { ok: false, status: 404 };
      });

      const getHeaderSpy = vi.spyOn(PMTiles.prototype, 'getHeader').mockResolvedValue({
        minZoom: 12,
        maxZoom: 16,
        minLat: 45.8,
        maxLat: 55.1,
        minLon: 5.7,
        maxLon: 17.2
      });

      await warmupPipeline();

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://pipeline.example.com/metadata.json',
        expect.objectContaining({ cache: 'no-cache' })
      );
      expect(getHeaderSpy).toHaveBeenCalled();
    });

    it('warmupPipeline sollte bei Netzwerkfehler nicht werfen und Start nicht blockieren', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.url = 'https://pipeline.example.com';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

      await expect(warmupPipeline()).resolves.not.toThrow();
    });

    it('fetchPipelinePmtiles sollte Kacheln streamen (onProgressData) und Puffer im Hintergrund laden', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.usePmtiles = true;
      Config.pipeline.url = 'https://pipeline.example.com';

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          return {
            ok: true,
            json: async () => ({ generated_at: '2026-09-29T16:00:00Z' })
          };
        }
        return { ok: false, status: 404 };
      });

      vi.spyOn(PMTiles.prototype, 'getHeader').mockResolvedValue({
        minZoom: 12,
        maxZoom: 16,
        minLat: 45.8,
        maxLat: 55.1,
        minLon: 5.7,
        maxLon: 17.2
      });

      vi.spyOn(PMTiles.prototype, 'getZxy').mockResolvedValue({
        data: new Uint8Array([1, 2, 3])
      });

      let featureCounter = 0;
      mockVectorTileLayers = {
        hydrants: {
          length: 1,
          feature: () => ({
            toGeoJSON: (x, y) => ({
              type: 'Feature',
              id: `hydrant_${x}_${y}_${++featureCounter}`,
              geometry: { type: 'Point', coordinates: [11.35, 49.55] },
              properties: { emergency: 'fire_hydrant' }
            })
          })
        }
      };

      const smallBounds = {
        getSouth: () => 49.554,
        getNorth: () => 49.556,
        getWest: () => 11.349,
        getEast: () => 11.351
      };

      const progressCalls = [];
      const onProgressData = vi.fn((elements, isPartial) => {
        progressCalls.push({ count: elements.length, isPartial });
      });

      let bufferCompleted = false;
      const onBufferComplete = vi.fn(() => {
        bufferCompleted = true;
      });

      const result = await fetchPipelinePmtiles(smallBounds, 'all', {
        zoom: 16,
        onProgressData,
        onBufferComplete
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(onProgressData).toHaveBeenCalled();
      // Erstes Rendern liefert Ergebnis sofort zurück
      expect(progressCalls.some(c => c.isPartial === true)).toBe(true);

      // Kurze Pause, damit der un-awaited Hintergrundpuffer fertig werden kann
      await new Promise(r => setTimeout(r, 50));
      expect(onBufferComplete).toHaveBeenCalled();
    });
  });

  describe('Teil D: Dynamische Kachel-Zoomstufe aus Header & RAM-Wiederverwendung', () => {
    it('computeQueryZoom sollte z16-Header auf Zoom 16 und z14-Header auf Zoom 14 deckeln', () => {
      const headerZ16 = { minZoom: 12, maxZoom: 16 };
      const headerZ14 = { minZoom: 12, maxZoom: 14 };

      // Bei z16 Header: Kartenzoom 16 -> Kachelzoom 16
      expect(computeQueryZoom(16, headerZ16)).toBe(16);
      expect(computeQueryZoom(15, headerZ16)).toBe(15);
      expect(computeQueryZoom(12, headerZ16)).toBe(12);
      expect(computeQueryZoom(10, headerZ16)).toBe(12); // clamp auf minZoom

      // Bei z14 Header: Kartenzoom 16 -> Kachelzoom 14!
      expect(computeQueryZoom(16, headerZ14)).toBe(14);
      expect(computeQueryZoom(15, headerZ14)).toBe(14);
      expect(computeQueryZoom(14, headerZ14)).toBe(14);
      expect(computeQueryZoom(12, headerZ14)).toBe(12);
    });

    it('Test 1: mit gemocktem z16-Header -> Lädt Kacheln auf Zoom 16', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.usePmtiles = true;
      Config.pipeline.url = 'https://pipeline.example.com';

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          return { ok: true, json: async () => ({ generated_at: '2026-09-29T16:00:00Z' }) };
        }
        return { ok: false, status: 404 };
      });

      vi.spyOn(PMTiles.prototype, 'getHeader').mockResolvedValue({
        minZoom: 12,
        maxZoom: 16,
        minLat: 45.8,
        maxLat: 55.1,
        minLon: 5.7,
        maxLon: 17.2
      });

      const getZxySpy = vi.spyOn(PMTiles.prototype, 'getZxy').mockResolvedValue({
        data: new Uint8Array([1, 2, 3])
      });

      mockVectorTileLayers = {
        fire_stations: {
          length: 1,
          feature: () => ({
            toGeoJSON: () => ({
              type: 'Feature',
              id: 'station_1',
              geometry: { type: 'Point', coordinates: [11.35, 49.55] },
              properties: { amenity: 'fire_station' }
            })
          })
        }
      };

      const smallBounds = {
        getSouth: () => 49.554,
        getNorth: () => 49.556,
        getWest: () => 11.349,
        getEast: () => 11.351
      };

      await fetchPipelinePmtiles(smallBounds, 'stations', { zoom: 16 });

      expect(getZxySpy).toHaveBeenCalled();
      const requestedZoomLevels = getZxySpy.mock.calls.map(call => call[0]);
      expect(requestedZoomLevels.every(z => z === 16)).toBe(true);
    });

    it('Test 2: mit gemocktem z14-Header -> Lädt Kacheln auf Zoom 14, wenn Karte auf Zoom 16 ist', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.usePmtiles = true;
      Config.pipeline.url = 'https://pipeline.example.com';

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          return { ok: true, json: async () => ({ generated_at: '2026-09-29T16:00:00Z' }) };
        }
        return { ok: false, status: 404 };
      });

      vi.spyOn(PMTiles.prototype, 'getHeader').mockResolvedValue({
        minZoom: 12,
        maxZoom: 14,
        minLat: 45.8,
        maxLat: 55.1,
        minLon: 5.7,
        maxLon: 17.2
      });

      const getZxySpy = vi.spyOn(PMTiles.prototype, 'getZxy').mockResolvedValue({
        data: new Uint8Array([1, 2, 3])
      });

      mockVectorTileLayers = {
        fire_stations: {
          length: 1,
          feature: () => ({
            toGeoJSON: () => ({
              type: 'Feature',
              id: 'station_1',
              geometry: { type: 'Point', coordinates: [11.35, 49.55] },
              properties: { amenity: 'fire_station' }
            })
          })
        }
      };

      const smallBounds = {
        getSouth: () => 49.554,
        getNorth: () => 49.556,
        getWest: () => 11.349,
        getEast: () => 11.351
      };

      // Karte ist auf Zoom 16, aber Header hat maxZoom 14
      await fetchPipelinePmtiles(smallBounds, 'stations', { zoom: 16 });

      expect(getZxySpy).toHaveBeenCalled();
      const requestedZoomLevels = getZxySpy.mock.calls.map(call => call[0]);
      expect(requestedZoomLevels.every(z => z === 14)).toBe(true);
    });

    it('Test 3: Zoom 15 -> 16 mit z14-Header macht 0 neue PMTiles-Requests', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.usePmtiles = true;
      Config.pipeline.url = 'https://pipeline.example.com';

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          return { ok: true, json: async () => ({ generated_at: '2026-09-29T16:00:00Z' }) };
        }
        return { ok: false, status: 404 };
      });

      vi.spyOn(PMTiles.prototype, 'getHeader').mockResolvedValue({
        minZoom: 12,
        maxZoom: 14,
        minLat: 45.8,
        maxLat: 55.1,
        minLon: 5.7,
        maxLon: 17.2
      });

      const getZxySpy = vi.spyOn(PMTiles.prototype, 'getZxy').mockResolvedValue({
        data: new Uint8Array([1, 2, 3])
      });

      mockVectorTileLayers = {
        hydrants: {
          length: 1,
          feature: () => ({
            toGeoJSON: () => ({
              type: 'Feature',
              id: 'hydrant_1',
              geometry: { type: 'Point', coordinates: [11.35, 49.55] },
              properties: { emergency: 'fire_hydrant' }
            })
          })
        }
      };

      const smallBounds = {
        getSouth: () => 49.554,
        getNorth: () => 49.556,
        getWest: () => 11.349,
        getEast: () => 11.351
      };

      // Schritt 1: Nutzer betrachtet Bereich auf Zoom 15 (lädt Kacheln auf z14)
      await fetchPipelinePmtiles(smallBounds, 'all', { zoom: 15 });
      const initialCalls = getZxySpy.mock.calls.length;
      expect(initialCalls).toBeGreaterThan(0);

      // Schritt 2: Nutzer zoomt hinein auf Zoom 16 (gleicher Ausschnitt)
      // Bei z14 Header ist queryZoom weiterhin 14 -> alle Kacheln liegen im RAM-Cache
      await fetchPipelinePmtiles(smallBounds, 'all', { zoom: 16 });
      const callsAfterZoomIn = getZxySpy.mock.calls.length;

      // EXAKT 0 neue Netzwerkaufrufe!
      expect(callsAfterZoomIn).toBe(initialCalls);
    });

    it('Test 4: Hydranten bleiben bei Zoom 14 unsichtbar, auch wenn die Kachel sie enthält', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.usePmtiles = true;
      Config.pipeline.url = 'https://pipeline.example.com';

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          return { ok: true, json: async () => ({ generated_at: '2026-09-29T16:00:00Z' }) };
        }
        return { ok: false, status: 404 };
      });

      vi.spyOn(PMTiles.prototype, 'getHeader').mockResolvedValue({
        minZoom: 12,
        maxZoom: 14,
        minLat: 45.8,
        maxLat: 55.1,
        minLon: 5.7,
        maxLon: 17.2
      });

      vi.spyOn(PMTiles.prototype, 'getZxy').mockResolvedValue({
        data: new Uint8Array([1, 2, 3])
      });

      // Vektorkachel enthält sowohl Wachen als auch Hydranten
      mockVectorTileLayers = {
        fire_stations: {
          length: 1,
          feature: () => ({
            toGeoJSON: () => ({
              type: 'Feature',
              id: 'station_1',
              geometry: { type: 'Point', coordinates: [11.35, 49.55] },
              properties: { amenity: 'fire_station' }
            })
          })
        },
        hydrants: {
          length: 1,
          feature: () => ({
            toGeoJSON: () => ({
              type: 'Feature',
              id: 'hydrant_1',
              geometry: { type: 'Point', coordinates: [11.35, 49.55] },
              properties: { emergency: 'fire_hydrant' }
            })
          })
        }
      };

      const smallBounds = {
        getSouth: () => 49.554,
        getNorth: () => 49.556,
        getWest: () => 11.349,
        getEast: () => 11.351
      };

      // Auf Zoom 14 wählt die Map 'stations'-Modus
      const elementsAtZ14 = await fetchPipelinePmtiles(smallBounds, 'stations', { zoom: 14 });

      // Station ist enthalten
      expect(elementsAtZ14.some(el => el.tags?.amenity === 'fire_station')).toBe(true);
      // Hydrant ist NICHT enthalten (obwohl in Kachel vorhanden!)
      expect(elementsAtZ14.some(el => el.tags?.emergency === 'fire_hydrant')).toBe(false);

      // Auf Zoom 15 wählt die Map 'all'-Modus -> Hydranten jetzt enthalten
      const elementsAtZ15 = await fetchPipelinePmtiles(smallBounds, 'all', { zoom: 15 });
      expect(elementsAtZ15.some(el => el.tags?.emergency === 'fire_hydrant')).toBe(true);
    });

    it('Test 5: Tile-RAM-Cache verwendet Versions-Namespace aus metadata.json', async () => {
      const dummyPmtiles = {
        getZxy: vi.fn(async () => ({ data: new Uint8Array([1, 2, 3]) }))
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          return {
            ok: true,
            json: async () => ({ generated_at: '2026-09-29T10:00:00Z' })
          };
        }
        return { ok: false, status: 404 };
      });

      // Version initialisieren
      await getPipelineVersion('https://pipeline.example.com');

      // Kachel laden
      const t1 = await getVectorTile(dummyPmtiles, 14, 100, 200);
      expect(dummyPmtiles.getZxy).toHaveBeenCalledTimes(1);

      // Zweiter Abruf: aus Cache (0 neue Requests)
      const t2 = await getVectorTile(dummyPmtiles, 14, 100, 200);
      expect(t2).toBe(t1);
      expect(dummyPmtiles.getZxy).toHaveBeenCalledTimes(1);

      // Versionswechsel simulieren
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('metadata.json')) {
          return {
            ok: true,
            json: async () => ({ generated_at: '2026-09-29T18:00:00Z' })
          };
        }
        return { ok: false, status: 404 };
      });

      // Frische Version erzwingen
      await getPipelineVersion('https://pipeline.example.com', { forceRefresh: true });

      // Jetzt muss die Kachel für die neue Version neu geladen werden
      const t3 = await getVectorTile(dummyPmtiles, 14, 100, 200);
      expect(dummyPmtiles.getZxy).toHaveBeenCalledTimes(2);
      expect(t3).toBeDefined();
    });
  });
});
