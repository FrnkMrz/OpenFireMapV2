import { describe, it, expect } from 'vitest';
import { Config } from '../src/js/config.js';

// Weiße Zeichen (Buchstaben, Symbole) auf den Marker-Füllungen: WCAG 1.4.3 verlangt 4,5:1 für kleinen Text.

function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    const channel = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

const contrastWithWhite = (hex) => 1.05 / (luminance(hex) + 0.05);

describe('Marker-Farben', () => {
    for (const key of ['station', 'hydrant', 'water', 'defib']) {
        it(`${key}: weiß auf der Füllung hat mindestens 4,5:1`, () => {
            expect(contrastWithWhite(Config.colors[key])).toBeGreaterThanOrEqual(4.5);
        });
    }
});
