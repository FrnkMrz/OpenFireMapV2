import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Config } from '../src/js/config.js';
import { stripDevOnlyCspSources } from '../scripts/strip-dev-csp.mjs';

// Prüft die Content Security Policy in index.html gegen die tatsächlich genutzten Dienste:
// Ein neuer Dienst ohne CSP-Eintrag würde im Browser still blockiert.
const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');

function readCsp(source) {
    const match = source.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i);
    if (!match) throw new Error('CSP-Meta-Tag fehlt');
    const directives = {};
    for (const part of match[1].split(';')) {
        const [name, ...values] = part.trim().split(/\s+/);
        if (name) directives[name] = values;
    }
    return directives;
}

// Vereinfachter CSP-Abgleich: exakter Host oder Platzhalter "*.domain" für Subdomains
function allowedBy(sources, url) {
    const { protocol, host } = new URL(url);
    return sources.some((src) => {
        const m = src.match(/^(https?:|wss?:)\/\/(.+)$/);
        if (!m || m[1] !== protocol) return false;
        if (m[2].startsWith('*.')) return host.endsWith(m[2].slice(1));
        return host === m[2];
    });
}

// Leaflet-Platzhalter ({s}, {z}, ...) durch Beispielwerte ersetzen
const sampleTileUrl = (template) => template.replace('{s}', 'a').replace(/\{[a-z]+\}/g, '1');

describe('Content Security Policy (index.html)', () => {
    const csp = readCsp(html);

    it('enthält keine Inline-Skripte (script-src ohne unsafe-inline)', () => {
        expect(csp['script-src']).toEqual(["'self'"]);
        const scriptTags = html.match(/<script\b[^>]*>/gi) || [];
        expect(scriptTags.length).toBeGreaterThan(0);
        for (const tag of scriptTags) expect(tag).toMatch(/\ssrc="/);
    });

    it('steht vor allen Skripten, damit sie auch für das erste Skript gilt', () => {
        expect(html.search(/http-equiv="Content-Security-Policy"/i)).toBeLessThan(html.search(/<script\b/i));
    });

    it('erlaubt alle Datendienste aus config.js in connect-src', () => {
        const urls = [...Config.overpassEndpoints, Config.nominatimUrl, Config.pipeline.url];
        for (const url of urls) expect(allowedBy(csp['connect-src'], url), url).toBe(true);
    });

    it('erlaubt alle Hintergrundkarten aus config.js in img-src', () => {
        for (const [key, layer] of Object.entries(Config.layers)) {
            expect(allowedBy(csp['img-src'], sampleTileUrl(layer.url)), key).toBe(true);
        }
    });
});

describe('stripDevOnlyCspSources (Produktions-Build)', () => {
    it('entfernt localhost-Quellen aus der CSP und lässt den Rest unverändert', () => {
        const built = stripDevOnlyCspSources(html);
        expect(html).toContain('http://localhost:*');
        expect(built).not.toContain('localhost');
        const before = readCsp(html);
        const after = readCsp(built);
        expect(after['connect-src']).toEqual(before['connect-src'].filter((s) => !s.includes('localhost')));
        expect(after['img-src']).toEqual(before['img-src']);
        expect(built.length).toBe(html.length - ' http://localhost:* ws://localhost:*'.length);
    });
});
