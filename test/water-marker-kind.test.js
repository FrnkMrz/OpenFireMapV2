import { describe, expect, it } from 'vitest';
import { getHydrantMarkerType, getWaterMarkerKind } from '../src/js/marker-symbols.js';

describe('getWaterMarkerKind', () => {
    it('leitet offene und geschlossene Bauformen nur aus den vorhandenen OSM-Tags ab', () => {
        expect(getWaterMarkerKind('water_tank', { man_made: 'storage_tank' })).toBe('closed_water_tank');
        expect(getWaterMarkerKind('water_tank', { man_made: 'reservoir_covered' })).toBe('closed_water_tank');
        expect(getWaterMarkerKind('water_tank')).toBe('water_tank');
        expect(getWaterMarkerKind('water_tank', { natural: 'water', water: 'basin' })).toBe('open_water');
        expect(getWaterMarkerKind('cistern')).toBe('water_tank');
        expect(getWaterMarkerKind('fire_water_pond')).toBe('open_water');
        expect(getWaterMarkerKind('pond')).toBe('open_water');
    });

    it('erkennt einen Grundwasseranschluss als Wasserquelle an einem Rohrhydranten', () => {
        expect(getWaterMarkerKind('pipe', {
            water_source: 'groundwater'
        })).toBe('groundwater_pipe');
        expect(getWaterMarkerKind('pipe', { water_source: 'pond' })).toBeNull();
    });

    it('hält gewöhnliche Hydranten von Wasserstellen-Symbolen getrennt', () => {
        expect(getWaterMarkerKind('pillar', {})).toBeNull();
        expect(getWaterMarkerKind('suction_point', {})).toBe('suction_point');
    });
});

describe('getHydrantMarkerType', () => {
    it('erkennt den dokumentierten Typ für dry-barrel-Säulenhydranten', () => {
        expect(getHydrantMarkerType('pillar', { 'pillar:type': 'dry_barrel' })).toBe('dry_barrel');
        expect(getHydrantMarkerType('pillar', { 'pillar:type': 'wet_barrel' })).toBe('pillar');
    });

    it('erkennt den Württembergischen Schachthydranten über seinen OSM-Stil-Tag', () => {
        expect(getHydrantMarkerType('underground', { 'fire_hydrant:style': 'WSH' })).toBe('wsh');
    });
});
