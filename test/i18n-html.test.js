// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import de from '../src/js/lang/de.js';
import en from '../src/js/lang/en.js';

// Texte in index.html laufen über i18n: kein fest verdrahtetes aria-label/placeholder ohne data-i18n-* und
// jeder referenzierte Schlüssel existiert in de und en (sonst bliebe der deutsche Platzhaltertext oder der Schlüssel stehen).
// Das HTML wird mit dem DOM-Parser gelesen (Skripte werden dabei nicht ausgeführt), nicht mit regulären Ausdrücken.

const doc = new DOMParser().parseFromString(readFileSync(resolve(process.cwd(), 'index.html'), 'utf8'), 'text/html');

const name = (el) => el.id || `${el.tagName.toLowerCase()}[${(el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').slice(0, 40)}]`;

describe('index.html: Texte über i18n', () => {
    it('jedes aria-label hat ein data-i18n-aria-label', () => {
        const missing = [...doc.querySelectorAll('[aria-label]:not([data-i18n-aria-label])')].map(name);
        expect(missing).toEqual([]);
    });

    it('jeder Platzhalter hat ein data-i18n-placeholder', () => {
        const missing = [...doc.querySelectorAll('[placeholder]:not([data-i18n-placeholder])')].map(name);
        expect(missing).toEqual([]);
    });

    it('alle referenzierten Schlüssel gibt es in de und en', () => {
        const keys = new Set();
        for (const el of doc.querySelectorAll('*')) {
            for (const attr of ['data-i18n', 'data-i18n-title', 'data-i18n-placeholder', 'data-i18n-aria-label']) {
                const key = el.getAttribute(attr);
                if (key) keys.add(key);
            }
        }
        expect(keys.size).toBeGreaterThan(20);
        expect([...keys].filter(k => !(k in de))).toEqual([]);
        expect([...keys].filter(k => !(k in en))).toEqual([]);
    });
});
