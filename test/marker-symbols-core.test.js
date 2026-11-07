import { describe, expect, it } from 'vitest';
import { Config } from '../src/js/config.js';
import { getMarkerSvg as getAppMarkerSvg } from '../src/js/marker-symbols.js';
import {
    getHydrantMarkerType,
    getMarkerSvg,
    getWaterMarkerKind
} from '../src/js/marker-symbols-core.js';

const cases = [
    ['underground', {}],
    ['underground', { 'fire_hydrant:style': 'wsh' }],
    ['pillar', {}],
    ['pillar', { 'pillar:type': 'dry_barrel' }],
    ['pipe', { water_source: 'groundwater' }],
    ['wall', {}],
    ['water_tank', { man_made: 'storage_tank' }],
    ['water_tank', { natural: 'water' }],
    ['suction_point', {}],
    ['station', {}],
    ['defibrillator', {}],
];

describe('renderer-independent marker SVG core', () => {
    it.each(cases)('matches the web app SVG for %s', (type, tags) => {
        const resolvedType = getHydrantMarkerType(type, tags);
        const appSvg = getAppMarkerSvg(resolvedType, 28, 2, tags);
        const coreSvg = getMarkerSvg(resolvedType, 28, 2, tags, Config.colors);
        expect(coreSvg).toBe(appSvg);
    });

    it('retains the existing OSM tag classification', () => {
        expect(getHydrantMarkerType('underground', { 'fire_hydrant:style': 'WSH' })).toBe('wsh');
        expect(getHydrantMarkerType('pillar', { 'pillar:type': 'dry_barrel' })).toBe('dry_barrel');
        expect(getWaterMarkerKind('water_tank', { man_made: 'storage_tank' })).toBe('closed_water_tank');
        expect(getWaterMarkerKind('suction_point')).toBe('suction_point');
    });
});
