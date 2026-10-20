import { describe, it, expect } from 'vitest';
import { getMarkerLabel, getMarkerDetailsText } from '../src/js/map.js';

// Ohne geladenes Wörterbuch liefert t() den Schlüssel selbst; das reicht, um Aufbau und Typwahl zu prüfen.

describe('getMarkerLabel', () => {
    it('nennt Typ und Namen', () => {
        expect(getMarkerLabel({ type: 'station', tags: { name: 'Wache Mitte' }, isStation: true })).toBe('station: Wache Mitte');
    });

    it('nimmt ohne Namen die Nummer (ref)', () => {
        expect(getMarkerLabel({ type: 'pillar', tags: { ref: '42' } })).toBe('hydrant: 42');
    });

    it('nennt ohne Namen und Nummer nur den Typ', () => {
        expect(getMarkerLabel({ type: 'defibrillator', tags: {}, isDefib: true })).toBe('defib');
        expect(getMarkerLabel({ type: 'pillar', tags: undefined })).toBe('hydrant');
    });

    it('unterscheidet Löschwasserstellen von Hydranten', () => {
        for (const type of ['water_tank', 'cistern', 'fire_water_pond', 'suction_point']) {
            expect(getMarkerLabel({ type, tags: {} })).toBe('marker_water');
        }
    });

    it('beschreibt Cluster mit der Anzahl', () => {
        expect(getMarkerLabel({ type: 'pillar', tags: {}, isHydrantCluster: true, clusterCount: 3 })).toBe('3 cluster_info');
    });
});

describe('getMarkerDetailsText', () => {
    it('hängt alle Tags als Text an das Label', () => {
        const text = getMarkerDetailsText('hydrant: A', { name: 'A', 'fire_hydrant:type': 'pillar' });
        expect(text).toBe('hydrant: A. name: A. fire_hydrant:type: pillar');
    });

    it('liefert ohne Tags nur das Label', () => {
        expect(getMarkerDetailsText('hydrant', {})).toBe('hydrant');
        expect(getMarkerDetailsText('hydrant', undefined)).toBe('hydrant');
    });

    it('zählt Cluster-Mitglieder durch', () => {
        const text = getMarkerDetailsText('2 cluster_info', {}, [
            { tags: { name: 'Eins' } },
            { tags: { ref: '7' } }
        ]);
        expect(text).toContain('1. Eins. name: Eins');
        expect(text).toContain('2. details_hydrant. ref: 7');
    });
});
