// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { _testing } from '../src/js/map.js';

const {
    isFireStation,
    getElementLatLon,
    distanceMeters,
    countTags,
    clusterFireStations
} = _testing;

// ---- Hilfsfunktionen ----

function makeStation(id, lat, lon, extraTags = {}) {
    return {
        id,
        lat,
        lon,
        tags: { amenity: 'fire_station', ...extraTags }
    };
}

function makeHydrant(id, lat, lon) {
    return {
        id,
        lat,
        lon,
        tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'underground' }
    };
}

// ---- Tests ----

describe('isFireStation', () => {
    it('erkennt amenity=fire_station', () => {
        expect(isFireStation({ tags: { amenity: 'fire_station' } })).toBe(true);
    });

    it('erkennt building=fire_station', () => {
        expect(isFireStation({ tags: { building: 'fire_station' } })).toBe(true);
    });

    it('erkennt Hydranten NICHT als Station', () => {
        expect(isFireStation({ tags: { emergency: 'fire_hydrant' } })).toBe(false);
    });

    it('gibt false bei fehlendem element', () => {
        expect(isFireStation(null)).toBe(false);
        expect(isFireStation(undefined)).toBe(false);
    });

    it('gibt false bei fehlenden tags', () => {
        expect(isFireStation({ id: 1 })).toBe(false);
    });
});

describe('getElementLatLon', () => {
    it('liest direkte lat/lon', () => {
        expect(getElementLatLon({ lat: 49.5, lon: 11.1 })).toEqual({ lat: 49.5, lon: 11.1 });
    });

    it('fällt auf center zurück', () => {
        expect(getElementLatLon({ center: { lat: 49.5, lon: 11.1 } })).toEqual({ lat: 49.5, lon: 11.1 });
    });

    it('gibt null bei fehlenden Koordinaten', () => {
        expect(getElementLatLon({})).toBeNull();
    });
});

describe('distanceMeters', () => {
    it('berechnet 0 m für identische Punkte', () => {
        const p = { lat: 49.45, lon: 11.08 };
        expect(distanceMeters(p, p)).toBeCloseTo(0, 1);
    });

    it('berechnet realistische Distanz (~111 km für 1° Breitengrad)', () => {
        const a = { lat: 49.0, lon: 11.0 };
        const b = { lat: 50.0, lon: 11.0 };
        const dist = distanceMeters(a, b);
        // 1 Breitengrad ≈ 111 km
        expect(dist).toBeGreaterThan(110000);
        expect(dist).toBeLessThan(112000);
    });

    it('berechnet kurze Distanzen korrekt (~100 m)', () => {
        const a = { lat: 49.45, lon: 11.08 };
        // ~100m nördlich (ca. 0.0009° Breitengrad)
        const b = { lat: 49.4509, lon: 11.08 };
        const dist = distanceMeters(a, b);
        expect(dist).toBeGreaterThan(90);
        expect(dist).toBeLessThan(110);
    });
});

describe('countTags', () => {
    it('zählt Tags korrekt', () => {
        expect(countTags({ a: '1', b: '2', c: '3' })).toBe(3);
    });

    it('gibt 0 bei null/undefined', () => {
        expect(countTags(null)).toBe(0);
        expect(countTags(undefined)).toBe(0);
    });

    it('gibt 0 bei leerem Objekt', () => {
        expect(countTags({})).toBe(0);
    });
});

describe('clusterFireStations', () => {
    it('gibt leeres/null Array zurück', () => {
        expect(clusterFireStations([])).toEqual([]);
        expect(clusterFireStations(null)).toBeNull();
        expect(clusterFireStations(undefined)).toBeUndefined();
    });

    it('einzelne Station bleibt unverändert', () => {
        const input = [makeStation(1, 49.45, 11.08)];
        const result = clusterFireStations(input);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
    });

    it('merged zwei Stationen innerhalb 150 m', () => {
        // Zwei Stationen ~50 m auseinander
        const s1 = makeStation(1, 49.45000, 11.08000, { name: 'Hauptwache' });
        const s2 = makeStation(2, 49.45040, 11.08000, { phone: '112' });

        const result = clusterFireStations([s1, s2]);

        // Nur ein Ergebnis (gemerged)
        expect(result).toHaveLength(1);
        // Master (mehr Tags) behält seinen Namen
        expect(result[0].tags.name).toBe('Hauptwache');
        // Phone wurde vom Kandidaten übernommen
        expect(result[0].tags.phone).toBe('112');
    });

    it('lässt weit entfernte Stationen getrennt', () => {
        // Zwei Stationen ~1 km auseinander
        const s1 = makeStation(1, 49.45, 11.08);
        const s2 = makeStation(2, 49.46, 11.08);

        const result = clusterFireStations([s1, s2]);
        expect(result).toHaveLength(2);
    });

    it('lässt Hydranten und andere Elemente unverändert', () => {
        const h = makeHydrant(10, 49.45, 11.08);
        const s = makeStation(1, 49.45, 11.08);

        const result = clusterFireStations([h, s]);
        expect(result).toHaveLength(2);
    });

    it('berechnet Mittelpunkt bei Merge', () => {
        const s1 = makeStation(1, 49.4500, 11.0800, { name: 'A', extra: 'x' });
        const s2 = makeStation(2, 49.4504, 11.0800);

        const result = clusterFireStations([s1, s2]);
        expect(result).toHaveLength(1);
        // Mittelpunkt sollte zwischen den beiden liegen
        expect(result[0].lat).toBeCloseTo(49.4502, 3);
    });

    it('Master-Tags werden NICHT überschrieben', () => {
        const s1 = makeStation(1, 49.45, 11.08, { name: 'Original', phone: '110' });
        const s2 = makeStation(2, 49.45004, 11.08, { name: 'Override', website: 'ff.de' });

        const result = clusterFireStations([s1, s2]);
        expect(result).toHaveLength(1);
        expect(result[0].tags.name).toBe('Original');     // NICHT überschrieben
        expect(result[0].tags.phone).toBe('110');          // bleibt
        expect(result[0].tags.website).toBe('ff.de');      // ergänzt
    });
});
