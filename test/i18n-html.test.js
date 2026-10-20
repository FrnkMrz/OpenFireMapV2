import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import de from '../src/js/lang/de.js';
import en from '../src/js/lang/en.js';

// Texte in index.html laufen über i18n: kein fest verdrahtetes aria-label/placeholder ohne data-i18n-* und
// jeder referenzierte Schlüssel existiert in de und en (sonst bliebe der deutsche Platzhaltertext oder der Schlüssel stehen).

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const tags = [...html.matchAll(/<(?:button|input|div|a|span|select|textarea|section|h[1-6]|p|ul|li|label|svg)\b[^>]*>/g)].map(m => m[0]);

const tagName = (tag) => (/id="([^"]+)"/.exec(tag)?.[1]) || tag.slice(0, 60);

describe('index.html: Texte über i18n', () => {
    it('jedes aria-label hat ein data-i18n-aria-label', () => {
        const missing = tags
            .filter(t => /\saria-label="/.test(t) && !/data-i18n-aria-label=/.test(t))
            .map(tagName);
        expect(missing).toEqual([]);
    });

    it('jeder Platzhalter hat ein data-i18n-placeholder', () => {
        const missing = tags
            .filter(t => /\splaceholder="/.test(t) && !/data-i18n-placeholder=/.test(t))
            .map(tagName);
        expect(missing).toEqual([]);
    });

    it('alle referenzierten Schlüssel gibt es in de und en', () => {
        const keys = new Set();
        for (const m of html.matchAll(/data-i18n(?:-title|-placeholder|-aria-label)?="([^"]+)"/g)) keys.add(m[1]);
        expect(keys.size).toBeGreaterThan(20);
        const missingDe = [...keys].filter(k => !(k in de));
        const missingEn = [...keys].filter(k => !(k in en));
        expect(missingDe).toEqual([]);
        expect(missingEn).toEqual([]);
    });
});
