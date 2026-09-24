import { describe, it, expect, beforeEach } from 'vitest';
import { isPipelineEligible, geoJsonFeatureToElement, clearPipelineCache } from '../src/js/pipeline.js';
import { Config } from '../src/js/config.js';

describe('pipeline.js', () => {
  beforeEach(() => {
    clearPipelineCache();
    Config.pipeline.enabled = true;
    Config.pipeline.url = 'http://192.168.178.152:8080';
    Config.pipeline.bounds = {
      south: 49.0,
      west: 10.1,
      north: 50.0,
      east: 11.9
    };
  });

  describe('isPipelineEligible', () => {
    it('sollte true zurückgeben, wenn der Ausschnitt in Mittelfranken liegt (z. B. Schnaittach)', () => {
      const mockBounds = {
        getCenter: () => ({ lat: 49.555, lng: 11.35 })
      };
      expect(isPipelineEligible(mockBounds, 15)).toBe(true);
      expect(isPipelineEligible(mockBounds, 12)).toBe(true);
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
});
