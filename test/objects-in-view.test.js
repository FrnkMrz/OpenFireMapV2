import { describe, it, expect, beforeEach } from 'vitest';
import { State } from '../src/js/state.js';
import { getObjectsInView } from '../src/js/map.js';

// Kleine Attrappe der Karte: Rechteck als Ausschnitt, Mittelpunkt in der Mitte
function fakeMap(south, west, north, east) {
    return {
        getBounds: () => ({ contains: ([lat, lon]) => lat >= south && lat <= north && lon >= west && lon <= east }),
        getCenter: () => ({ lat: (south + north) / 2, lng: (west + east) / 2 })
    };
}

const entry = (lat, lon, tags = {}, extra = {}) => ({ lat, lon, tags, type: 'pillar', ...extra });

describe('getObjectsInView', () => {
    beforeEach(() => {
        State.map = fakeMap(48.0, 9.0, 48.2, 9.2);
        State.markerCache = new Map();
    });

    it('liefert ohne Karte oder Cache eine leere Liste', () => {
        State.map = null;
        expect(getObjectsInView()).toEqual({ items: [], total: 0 });
    });

    it('nimmt nur Objekte im Ausschnitt und sortiert nach Entfernung zur Mitte', () => {
        State.markerCache.set('node:1', entry(48.19, 9.19, { name: 'Fern' }));
        State.markerCache.set('node:2', entry(48.1, 9.1, { name: 'Mitte' }));
        State.markerCache.set('node:3', entry(49.0, 9.1, { name: 'Draußen' }));
        State.markerCache.set('node:4', entry(48.105, 9.1, { name: 'Nah' }));

        const { items, total } = getObjectsInView();
        expect(total).toBe(3);
        expect(items.map(i => i.id)).toEqual(['node:2', 'node:4', 'node:1']);
        expect(items[0].distance).toBeLessThan(items[1].distance);
        expect(items[0].label).toContain('Mitte');
    });

    it('begrenzt auf max Einträge, total zählt alle', () => {
        for (let i = 0; i < 12; i++) State.markerCache.set(`node:${i}`, entry(48.1 + i * 0.001, 9.1));
        const { items, total } = getObjectsInView(5);
        expect(items).toHaveLength(5);
        expect(total).toBe(12);
    });

    it('beschriftet Cluster mit der Anzahl', () => {
        State.markerCache.set('node:9', entry(48.1, 9.1, {}, { isHydrantCluster: true, clusterCount: 4 }));
        expect(getObjectsInView().items[0].label).toBe('4 cluster_info');
    });
});
