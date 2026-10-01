import { describe, it, expect, beforeEach } from 'vitest';
import { _testing } from '../src/js/api.js';

const {
    snapToGrid,
    roundCoord,
    epHealthyOrder,
    epGet,
    epMarkOk,
    epMarkFail,
    EP,
    buildBoundaryQuery,
    buildPoiQuery,
    buildExportQuery
} = _testing;

// ---- Tests ----

describe('buildBoundaryQuery', () => {
    const bbox = '49.48,11.20,49.62,11.50';

    it('gibt bei Zoom < 14 einen leeren String zurück', () => {
        expect(buildBoundaryQuery(13, bbox)).toBe('');
        expect(buildBoundaryQuery(10, bbox)).toBe('');
        expect(buildBoundaryQuery(0, bbox)).toBe('');
    });

    it('erzeugt bei Zoom >= 14 Overpass-Abfrage über Relationen mit expliziter bbox auf Mitglieds-Wege', () => {
        const query14 = buildBoundaryQuery(14, bbox);
        expect(query14).toContain('rel["boundary"="administrative"]["admin_level"="8"]');
        expect(query14).toContain('way(r.');
        expect(query14).toContain(`(${bbox})`);
        expect(query14).toContain('.boundaries out geom;');

        const query16 = buildBoundaryQuery(16, bbox);
        expect(query16).toBe(query14);
    });
});

describe('Overpass-Ausgabeformate (Grundlage für isBoundaryElement)', () => {
    const bbox = '49.48,11.20,49.62,11.50';

    it('POI-Abfragen liefern nur Mittelpunkte (out center), keine Linien-Geometrie', () => {
        for (const zoom of [12, 15, 18]) {
            const { query } = buildPoiQuery(zoom, bbox);
            expect(query).toContain('.pois out center;');
            expect(query).not.toContain('out geom');
        }
    });

    it('Export-Abfrage: POIs mit out center, nur Grenzen mit out geom', () => {
        const q14 = buildExportQuery(14, bbox);
        expect(q14).toContain('.pois out center;');
        expect(q14.match(/out geom/g)).toEqual(['out geom']);
        expect(q14).toContain('.boundaries out geom;');
        expect(q14).toContain(`way(r.r)(${bbox})`);

        const q13 = buildExportQuery(13, bbox);
        expect(q13).not.toContain('out geom');
        expect(q13).toContain('fire_hydrant');
    });
});

describe('snapToGrid', () => {
    it('rundet auf 0.005-Raster', () => {
        expect(snapToGrid(49.453)).toBe(Math.floor(49.453 / 0.005) * 0.005);
    });

    it('Wert genau auf Grid-Punkt bleibt gleich', () => {
        expect(snapToGrid(49.450, 0.005)).toBeCloseTo(49.450, 6);
    });

    it('funktioniert mit negativen Koordinaten', () => {
        const result = snapToGrid(-0.012, 0.005);
        expect(result).toBeCloseTo(-0.015, 6);
    });

    it('nutzt Custom-Grid-Size', () => {
        expect(snapToGrid(49.453, 0.01)).toBeCloseTo(49.45, 6);
    });
});

describe('roundCoord', () => {
    it('rundet auf 4 Dezimalstellen (Standard)', () => {
        expect(roundCoord(49.453789123)).toBe(49.4538);
    });

    it('rundet auf 2 Dezimalstellen', () => {
        expect(roundCoord(49.456, 2)).toBe(49.46);
    });

    it('rundet auf 0 Dezimalstellen', () => {
        expect(roundCoord(49.5, 0)).toBe(50);
    });

    it('funktioniert mit negativen Werten', () => {
        expect(roundCoord(-11.12345, 3)).toBe(-11.123);
    });
});

describe('epHealthyOrder', () => {
    const endpoints = ['https://ep1.com', 'https://ep2.com', 'https://ep3.com'];

    beforeEach(() => {
        // EP-Map komplett leeren
        EP.clear();
    });

    it('gibt alle Endpoints zurück wenn keiner im Cooldown', () => {
        const result = epHealthyOrder(endpoints);
        expect(result).toHaveLength(3);
        // Alle Endpoints müssen enthalten sein (Reihenfolge ist random)
        expect(result.sort()).toEqual(endpoints.sort());
    });

    it('sortiert Endpoints im Cooldown nach hinten', () => {
        // ep1 markieren als failed mit Cooldown
        epMarkFail('https://ep1.com', 429, 60000);

        const result = epHealthyOrder(endpoints);
        // ep1 sollte am Ende stehen (im Cooldown)
        expect(result[result.length - 1]).toBe('https://ep1.com');
    });

    it('gesunde Endpoints kommen vor Cooldown-Endpoints', () => {
        epMarkFail('https://ep1.com', 429, 60000);
        epMarkFail('https://ep2.com', 500, 30000);

        const result = epHealthyOrder(endpoints);
        // ep3 (gesund) sollte an erster Stelle stehen
        expect(result[0]).toBe('https://ep3.com');
        // Die beiden failed endpoints am Ende
        expect(result.slice(1).sort()).toEqual(['https://ep1.com', 'https://ep2.com'].sort());
    });

    it('epMarkOk setzt Endpoint zurück auf gesund', () => {
        epMarkFail('https://ep1.com', 429, 60000);
        epMarkOk('https://ep1.com');

        const state = epGet('https://ep1.com');
        expect(state.failUntil).toBe(0);
    });
});
