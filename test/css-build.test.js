// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'vite';

// Baut die Seite einmal wie in der CI (vite.config.js, Lightning CSS als CSS-Minifier) und prüft das
// erzeugte Stylesheet auf zwei Stolpersteine aus dem Umstieg auf Vite 8:
// - Lightning CSS ließ bei "backdrop-filter; -webkit-backdrop-filter" nur die Präfix-Variante stehen,
//   Chrome und Firefox zeigten die Glas-Panels dann ohne Unschärfe.
// - Mit dem Vite-8-Standardziel (Safari/iOS 16.4) entstehen Media Queries in Bereichssyntax
//   "(width>=768px)", die iOS 16.0-16.3 ignoriert; build.target hält das Ziel von Vite 7.
let css = '';

beforeAll(async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ofm-css-build-'));
    try {
        const result = await build({
            root: resolve(__dirname, '..'),
            logLevel: 'silent',
            build: { outDir, emptyOutDir: true, write: false }
        });
        const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output);
        css = outputs.filter((o) => o.fileName.endsWith('.css')).map((o) => String(o.source)).join('\n');
    } finally {
        rmSync(outDir, { recursive: true, force: true });
    }
}, 60000);

describe('gebautes CSS (Vite + Lightning CSS)', () => {
    it('enthält ein Stylesheet', () => {
        expect(css.length).toBeGreaterThan(10000);
    });

    it('behält backdrop-filter mit und ohne -webkit-Präfix', () => {
        for (const selector of ['.glass-panel', '#notification-box', '.hydrant-download-status']) {
            const escaped = selector.replace(/[.#]/g, '\\$&');
            const rule = css.match(new RegExp(`(?:^|})${escaped}\\{[^}]*backdrop-filter[^}]*\\}`))?.[0] || '';
            expect(rule, selector).toMatch(/-webkit-backdrop-filter:blur\(\d+px\)/);
            expect(rule, selector).toMatch(/[;{]backdrop-filter:blur\(\d+px\)/);
        }
    });

    it('schreibt Media Queries als min-/max-width, nicht in Bereichssyntax', () => {
        expect(css).toMatch(/@media\s*\(min-width:768px\)/);
        expect(css).toMatch(/@media\s*\(max-width:768px\)/);
        expect(css).not.toMatch(/@media[^{]*\(\s*width\s*[<>]=?/);
    });
});
