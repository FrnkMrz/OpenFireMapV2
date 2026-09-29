import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isPipelineEligible,
  isPointInPolygon,
  isRectInPolygon,
  geoJsonFeatureToElement,
  clearPipelineCache,
  fetchPipelineData,
  fetchPipelineBoundaries
} from '../src/js/pipeline.js';
import { Config } from '../src/js/config.js';

describe('pipeline.js', () => {
  beforeEach(() => {
    clearPipelineCache();
    Config.pipeline.enabled = true;
    Config.pipeline.url = 'https://pipeline.openfiremap.org';
    Config.pipeline.bounds = {
      south: 47.2,
      west: 8.9,
      north: 50.6,
      east: 13.9
    };
  });

  describe('isPointInPolygon (Ray-Casting Jordan Curve)', () => {
    const polygon = Config.pipeline.coveragePolygon;

    it('sollte bayerische Städte als innerhalb (true) erkennen', () => {
      // München
      expect(isPointInPolygon(48.137, 11.576, polygon)).toBe(true);
      // Nürnberg
      expect(isPointInPolygon(49.452, 11.077, polygon)).toBe(true);
      // Augsburg
      expect(isPointInPolygon(48.366, 10.894, polygon)).toBe(true);
      // Würzburg
      expect(isPointInPolygon(49.793, 9.953, polygon)).toBe(true);
      // Regensburg
      expect(isPointInPolygon(49.013, 12.101, polygon)).toBe(true);
      // Passau (Zentrum)
      expect(isPointInPolygon(48.566, 13.431, polygon)).toBe(true);
      // Kempten (Allgäu)
      expect(isPointInPolygon(47.728, 10.316, polygon)).toBe(true);
      // Hof (Oberfranken)
      expect(isPointInPolygon(50.319, 11.916, polygon)).toBe(true);
      // Aschaffenburg (Unterfranken)
      expect(isPointInPolygon(49.974, 9.155, polygon)).toBe(true);
      // Neu-Ulm (bayerische Seite, südöstlich des 500m-Grenzstreifens)
      expect(isPointInPolygon(48.38, 10.01, polygon)).toBe(true);
    });

    it('sollte Städte außerhalb Bayerns (auch innerhalb der Bounding-Box) als außerhalb (false) erkennen', () => {
      // Salzburg (Österreich - lag früher in der BBox!)
      expect(isPointInPolygon(47.809, 13.055, polygon)).toBe(false);
      // Ulm (Baden-Württemberg - direkt gegenüber von Neu-Ulm an der Donau)
      expect(isPointInPolygon(48.401, 9.987, polygon)).toBe(false);
      // Innsbruck (Österreich)
      expect(isPointInPolygon(47.269, 11.404, polygon)).toBe(false);
      // Stuttgart (Baden-Württemberg)
      expect(isPointInPolygon(48.775, 9.182, polygon)).toBe(false);
      // Fulda (Hessen)
      expect(isPointInPolygon(50.553, 9.675, polygon)).toBe(false);
      // Sonneberg (Thüringen)
      expect(isPointInPolygon(50.360, 11.176, polygon)).toBe(false);
      // Plauen (Sachsen)
      expect(isPointInPolygon(50.495, 12.138, polygon)).toBe(false);
      // Hamburg (weit außerhalb)
      expect(isPointInPolygon(53.551, 9.993, polygon)).toBe(false);
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
    it('sollte true zurückgeben, wenn der Ausschnitt in Bayern liegt (z. B. Schnaittach, München, Würzburg)', () => {
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
      expect(isPipelineEligible(schnaittachBounds, 15)).toBe(true);
      expect(isPipelineEligible(schnaittachBounds, 12)).toBe(true);
      expect(isPipelineEligible(muenchenBounds, 15)).toBe(true);
    });

    it('sollte false zurückgeben für Salzburg (AT), obwohl es in der alten Bounding-Box lag', () => {
      const salzburgBounds = {
        getCenter: () => ({ lat: 47.809, lng: 13.055 }),
        getSouth: () => 47.78,
        getNorth: () => 47.83,
        getWest: () => 13.02,
        getEast: () => 13.08
      };
      expect(isPipelineEligible(salzburgBounds, 15)).toBe(false);
    });

    it('sollte false zurückgeben für Ulm (BW), obwohl es in der alten Bounding-Box lag', () => {
      const ulmBounds = {
        getCenter: () => ({ lat: 48.401, lng: 9.987 }),
        getSouth: () => 48.38,
        getNorth: () => 48.42,
        getWest: () => 9.96,
        getEast: () => 10.01
      };
      expect(isPipelineEligible(ulmBounds, 15)).toBe(false);
    });

    it('sollte false zurückgeben bei Grenzüberschreitung (z. B. Zentrum in Neu-Ulm/BY, aber Westkante in Ulm/BW)', () => {
      // Zentrum ist in Neu-Ulm (BY), aber der Viewport reicht über die Donau nach Ulm (BW)
      const borderCrossingBounds = {
        getCenter: () => ({ lat: 48.395, lng: 10.005 }), // Neu-Ulm (in Bayern)
        getSouth: () => 48.38,
        getNorth: () => 48.41,
        getWest: () => 9.97, // Liegt in Ulm (Baden-Württemberg)!
        getEast: () => 10.02
      };
      // Da die Westecke außerhalb von Bayern liegt, MUSS isPipelineEligible false liefern,
      // damit Overpass anspringt und Ulm nicht als leere Fläche gerendert wird!
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

    it('sollte false zurückgeben, wenn der Ausschnitt außerhalb liegt (z. B. Hamburg)', () => {
      const mockBounds = {
        getCenter: () => ({ lat: 53.55, lng: 9.99 })
      };
      expect(isPipelineEligible(mockBounds, 15)).toBe(false);
    });

    it('sollte false zurückgeben, wenn die Pipeline deaktiviert ist', () => {
      Config.pipeline.enabled = false;
      const mockBounds = {
        getCenter: () => ({ lat: 49.555, lng: 11.35 })
      };
      expect(isPipelineEligible(mockBounds, 15)).toBe(false);
    });

    it('sollte false liefern für Grenz- und Auslandspositionen (Braunau, CZ, Salzburg, Ulm, Neu-Ulm mit Westkante 9.97)', () => {
      const makeViewport = (lat, lon) => ({
        south: lat - 0.015,
        north: lat + 0.015,
        west: lon - 0.01,
        east: lon + 0.01
      });

      // Braunau am Inn (AT): 48.2512, 13.0693
      expect(isPipelineEligible(makeViewport(48.2512, 13.0693), 15)).toBe(false);
      // CZ bei Asch/Eger: 50.1247, 12.2107
      expect(isPipelineEligible(makeViewport(50.1247, 12.2107), 15)).toBe(false);
      // Salzburg (AT): 47.809, 13.055
      expect(isPipelineEligible(makeViewport(47.809, 13.055), 15)).toBe(false);
      // Ulm (BW): 48.401, 9.987
      expect(isPipelineEligible(makeViewport(48.401, 9.987), 15)).toBe(false);
      // Neu-Ulm-Viewport mit Westkante 9.97 (reicht über die Donau nach Ulm)
      const borderCrossing = { south: 48.38, north: 48.41, west: 9.97, east: 10.02 };
      expect(isPipelineEligible(borderCrossing, 15)).toBe(false);
    });

    it('sollte true liefern für bayerische Städte (München, Nürnberg, Würzburg, Regensburg, Hof, Kempten, Schnaittach)', () => {
      const makeViewport = (lat, lon) => ({
        south: lat - 0.015,
        north: lat + 0.015,
        west: lon - 0.01,
        east: lon + 0.01
      });

      expect(isPipelineEligible(makeViewport(48.137, 11.576), 15)).toBe(true);  // München
      expect(isPipelineEligible(makeViewport(49.452, 11.077), 15)).toBe(true);  // Nürnberg
      expect(isPipelineEligible(makeViewport(49.793, 9.953), 15)).toBe(true);   // Würzburg
      expect(isPipelineEligible(makeViewport(49.013, 12.101), 15)).toBe(true);  // Regensburg
      expect(isPipelineEligible(makeViewport(50.319, 11.916), 15)).toBe(true);  // Hof
      expect(isPipelineEligible(makeViewport(47.728, 10.316), 15)).toBe(true);  // Kempten
      expect(isPipelineEligible(makeViewport(49.555, 11.350), 15)).toBe(true);  // Schnaittach
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

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

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

      const geoJsonCalls = fetchSpy.mock.calls.filter(call => typeof call[0] === 'string' && call[0].endsWith('.geojson'));
      expect(geoJsonCalls.length).toBe(0);

      fetchSpy.mockRestore();
    });

    it('sollte bei Boundary-PMTiles-Fehler und geojsonFallback=false eine Exception werfen und KEIN boundaries.geojson fetchen', async () => {
      Config.pipeline.enabled = true;
      Config.pipeline.usePmtiles = true;
      Config.pipeline.geojsonFallback = false;
      Config.pipeline.url = 'https://pipeline.example.com';
      Config.pipeline.pmtilesFile = 'boundary_error.pmtiles';

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

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

      const geoJsonCalls = fetchSpy.mock.calls.filter(call => typeof call[0] === 'string' && call[0].includes('boundaries.geojson'));
      expect(geoJsonCalls.length).toBe(0);

      fetchSpy.mockRestore();
    });
  });
});
