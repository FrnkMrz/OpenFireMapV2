import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Marked } from 'marked';
import { articleLanguages, buildHelpPages, helpOutFile, HELP_LANGS, parseFrontmatter, renderArticle } from '../scripts/build-help.mjs';
import { Config } from '../src/js/config.js';
import { EUROPE_REGION_BOUNDS } from '../src/js/coverage/europe.js';

// Hilfe-Seite „Technik & Aufbau“ (/help/technology/): nur Deutsch und Englisch, Schaubilder als eingebettetes SVG,
// Zahlen im Text passen zur Konfiguration (sonst veraltet die Seite still).

const root = resolve(__dirname, '..');
const marked = new Marked();
const { pages } = buildHelpPages({ root, write: false });
const read = (lang) => parseFrontmatter(readFileSync(resolve(root, `help/content/${lang}/technology.md`), 'utf8'), `${lang}/technology.md`);
const langs = ['de', 'en'];

describe('Hilfe: Technik & Aufbau', () => {
  it('gibt es nur auf Deutsch und Englisch, mit Kachel auf beiden Startseiten', () => {
    expect(articleLanguages(read('de').meta, HELP_LANGS)).toEqual(langs);
    for (const lang of HELP_LANGS.filter((code) => !langs.includes(code))) {
      expect(existsSync(resolve(root, `help/content/${lang}/technology.md`)), lang).toBe(false);
      expect(pages[helpOutFile(lang)], lang).not.toContain('technology/');
    }
    expect(pages[helpOutFile('de')]).toContain('href="/help/technology/"');
    expect(pages[helpOutFile('en')]).toContain('href="/help/en/technology/"');
  });

  it('Zahlen im Text passen zur Konfiguration', () => {
    const countries = Object.keys(EUROPE_REGION_BOUNDS).length;
    // Asien-Auszüge (seit 28.11.2026) laufen über dasselbe Manifest, zählen im Text aber nicht als Europa-Länder
    const asia = ['japan', 'taiwan', 'malaysia-singapore-brunei'].filter((id) => id in EUROPE_REGION_BOUNDS);
    const europe = countries - asia.length;
    const appLanguages = readdirSync(resolve(root, 'src/js/lang')).filter((f) => f.endsWith('.js')).length;
    const endpoints = Config.overpassEndpoints.length;
    for (const lang of langs) {
      const { body } = read(lang);
      expect(body, lang).toContain(`${europe} ${lang === 'de' ? 'Europa-Länder' : 'European countries'}`);
      for (const name of ['Japan', 'Taiwan']) expect(body, lang).toContain(name);
      expect(body, lang).toContain(`${countries + 5} ${lang === 'de' ? 'Länder' : 'countries'}`);
      expect(body, lang).toContain(`${Config.exportMaxSideKm} km`);
      expect(body, lang).toContain(`${appLanguages} ${lang === 'de' ? 'Sprachen' : 'languages'}`);
      expect(body, lang).toContain(lang === 'de' ? ['', '', '', 'drei', 'vier', 'fünf'][endpoints] + ' öffentliche Overpass-Server' : ['', '', '', 'three', 'four', 'five'][endpoints] + ' public Overpass servers');
    }
    for (const lang of langs) {
      const svg = readFileSync(resolve(root, `help/diagrams/${lang}/architecture.svg`), 'utf8');
      expect(svg, lang).toContain(`${endpoints} ${lang === 'de' ? 'öffentliche Server' : 'public servers'}`);
    }
  });

  it('jedes Schaubild gibt es in beiden Sprachen, ohne Stile, Skripte oder doppelte IDs', () => {
    const names = readdirSync(resolve(root, 'help/diagrams/de')).sort();
    expect(readdirSync(resolve(root, 'help/diagrams/en')).sort()).toEqual(names);
    const ids = [];
    for (const name of names) {
      for (const lang of langs) {
        const svg = readFileSync(resolve(root, `help/diagrams/${lang}/${name}`), 'utf8');
        expect(svg, `${lang}/${name}`).not.toMatch(/\sstyle=|<style|<script|\son[a-z]+=/i);
        if (lang === 'de') ids.push(...[...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      }
    }
    // Alle Schaubilder stehen auf einer Seite: IDs (Pfeilspitzen) müssen seitenweit eindeutig sein
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('bettet Schaubilder benannt und per Tastatur erreichbar ein', () => {
    const { html } = renderArticle(':::diagram loading\nLadeweg mit [Link](https://example.org)\n:::\n', { lang: 'de', shots: {}, root, file: 't', marked });
    expect(html).toContain('<figure class="fig fig-diagram"><div class="diagram" tabindex="0" role="img" aria-label="Ladeweg mit Link"><svg aria-hidden="true" focusable="false"');
    expect(html).toContain('<figcaption>Ladeweg mit <a href="https://example.org" rel="noopener">Link</a></figcaption>');
  });

  it('bricht bei fehlendem oder unsicherem Schaubild ab', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'ofm-help-'));
    mkdirSync(join(tmp, 'help', 'diagrams', 'de'), { recursive: true });
    writeFileSync(join(tmp, 'help', 'diagrams', 'de', 'bad.svg'), '<svg><rect style="fill:red"/></svg>');
    const ctx = { lang: 'de', shots: {}, root: tmp, file: 't', marked };
    expect(() => renderArticle(':::diagram gibtsnicht\nx\n:::\n', ctx)).toThrow(/fehlt/);
    expect(() => renderArticle(':::diagram ../bad\nx\n:::\n', ctx)).toThrow(/fehlt/);
    expect(() => renderArticle(':::diagram bad\nx\n:::\n', ctx)).toThrow(/keine Stile/);
  });
});
