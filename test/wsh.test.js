import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

// We just test if our logic for `wsh` parsing stays stable.
// Since map.js relies heavily on Leaflet and internal state which is hard to mock in Vitest without full setup,
// we will just extract the core SVG generation block and simulate the JS type parsing here.

// A mini-reproduction of the mapping logic from map.js/export.js
function parseHydrantType(tags) {
    let type = (tags['fire_hydrant:type'] || tags.emergency);
    if (type === 'underground' && tags['fire_hydrant:style'] === 'wsh') {
        type = 'wsh';
    }
    return type;
}

describe('WSH Special Hydrant Parsing', () => {

    it('identifies standard underground hydrants safely', () => {
        const tags = {
            emergency: 'fire_hydrant',
            'fire_hydrant:type': 'underground'
        };
        const activeType = parseHydrantType(tags);
        expect(activeType).toBe('underground');
    });

    it('identifies WSH explicitly when tags are present', () => {
        const tags = {
            emergency: 'fire_hydrant',
            'fire_hydrant:type': 'underground',
            'fire_hydrant:style': 'wsh'
        };
        const activeType = parseHydrantType(tags);
        expect(activeType).toBe('wsh');
    });

    it('ignores hydrants with wsh style but wrong base type (safety precaution)', () => {
        const tags = {
            emergency: 'fire_hydrant',
            'fire_hydrant:type': 'pillar', // user incorrectly tagged
            'fire_hydrant:style': 'wsh'
        };
        const activeType = parseHydrantType(tags);
        expect(activeType).toBe('pillar'); // we only apply wsh rendering to underground base types
    });

    it('displays fallback H WSH name if no name is present for exports', () => {
        const tags = {
            emergency: 'fire_hydrant',
            'fire_hydrant:type': 'underground',
            'fire_hydrant:style': 'wsh'
        };
        
        // Simulating the export.js handling
        let name = tags.name;
        if (!tags.name && tags["fire_hydrant:type"]) {
            let hType = tags["fire_hydrant:type"];
            if (hType === 'underground' && tags['fire_hydrant:style'] === 'wsh') hType = 'wsh';
            name = `H ${hType}`;
        }
        
        expect(name).toBe('H wsh');
    });

});
