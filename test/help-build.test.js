import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildHelpPages, helpOutFile, helpUrl, HELP_LANGS, loadHelpText, renderTemplate } from '../scripts/build-help.mjs';

// Hilfe-Seiten (/help/): Build aus help/ prüfen, ohne Dateien zu schreiben.

const root = resolve(__dirname, '..');
const { pages } = buildHelpPages({ root, write: false });
const texts = Object.fromEntries(HELP_LANGS.map((l) => [l, loadHelpText(root, l)]));
const shots = JSON.parse(readFileSync(resolve(root, 'help/shots.json'), 'utf8'));

function readCsp(html) {
  const m = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i);
  const csp = {};
  for (const part of m[1].split(';')) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) csp[name] = values;
  }
  return csp;
}

const tagsOf = (s) => [...String(s).matchAll(/<\/?([a-z]+)\b[^>]*>/g)].map((m) => m[1]).sort();
const hrefsOf = (s) => [...String(s).matchAll(/href="([^"]*)"/g)].map((m) => m[1]).sort();

describe('Hilfe: Texte', () => {
  it('Deutsch und Englisch haben dieselben Schlüssel', () => {
    const de = Object.keys(texts.de).sort();
    const en = Object.keys(texts.en).sort();
    expect(de.filter((k) => !en.includes(k))).toEqual([]);
    expect(en.filter((k) => !de.includes(k))).toEqual([]);
  });

  it('kein Text ist leer', () => {
    for (const lang of HELP_LANGS) {
      for (const [k, v] of Object.entries(texts[lang])) expect(String(v).trim(), `${lang}:${k}`).not.toBe('');
    }
  });

  it('Auszeichnung und Links sind in beiden Sprachen gleich', () => {
    for (const k of Object.keys(texts.de)) {
      expect(tagsOf(texts.en[k]), k).toEqual(tagsOf(texts.de[k]));
      expect(hrefsOf(texts.en[k]), k).toEqual(hrefsOf(texts.de[k]));
    }
  });
});

describe('Hilfe: Vorlagen', () => {
  const ctx = { text: { a: 'A' }, vars: { lang: 'de' }, shots: { de: { desktop: { x1: { x: 10, y: 20 } } } }, lang: 'de', file: 't' };

  it('setzt Texte, Variablen, Bilder und Hotspots ein', () => {
    expect(renderTemplate('{{a}} {{@lang}} {{@img:desktop}} <i {{@spot:desktop:x1}}>', ctx))
      .toBe('A de /help/img/de-desktop.jpg <i data-x="10" data-y="20">');
  });

  it('bricht bei fehlendem Text, Variable oder Hotspot ab', () => {
    expect(() => renderTemplate('{{fehlt}}', ctx)).toThrow(/fehlt/);
    expect(() => renderTemplate('{{@fehlt}}', ctx)).toThrow(/unbekannte Variable/);
    expect(() => renderTemplate('{{@spot:desktop:nix}}', ctx)).toThrow(/Hotspot/);
  });

  it('legt Deutsch unter /help/ und Englisch unter /help/en/ ab', () => {
    expect(helpUrl('de')).toBe('/help/');
    expect(helpUrl('en')).toBe('/help/en/');
    expect(helpUrl('en', 'export')).toBe('/help/en/export/');
    expect(helpOutFile('de')).toBe('help/index.html');
    expect(helpOutFile('en', 'export')).toBe('help/en/export/index.html');
  });
});

describe('Hilfe: erzeugte Seiten', () => {
  const entries = Object.entries(pages);

  it('erzeugt Startseite auf Deutsch und Englisch', () => {
    expect(Object.keys(pages).sort()).toEqual(['help/en/index.html', 'help/index.html']);
  });

  for (const [file, html] of entries) {
    const lang = file.startsWith('help/en/') ? 'en' : 'de';

    describe(file, () => {
      it('enthält keine offenen Platzhalter', () => {
        expect(html).not.toMatch(/\{\{|\}\}/);
      });

      it('hat Seitensprache, Sprachverweise und markiert die aktuelle Sprache', () => {
        expect(html).toMatch(new RegExp(`<html lang="${lang}">`));
        expect(html).toContain('hreflang="de" href="https://openfiremap.org/help/"');
        expect(html).toContain('hreflang="en" href="https://openfiremap.org/help/en/"');
        expect(html).toMatch(new RegExp(`lang="${lang}" hreflang="${lang}" aria-current="page"`));
      });

      it('lädt nichts von fremden Servern und nutzt keine Inline-Stile oder -Skripte', () => {
        const csp = readCsp(html);
        expect(csp['script-src']).toEqual(["'self'"]);
        expect(csp['style-src']).toEqual(["'self'"]);
        expect(csp['font-src']).toEqual(["'self'"]);
        expect(Object.values(csp).flat().filter((s) => s.startsWith('https:'))).toEqual([]);
        expect(html).not.toMatch(/\sstyle="/);
        expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
      });

      it('jeder Sprung innerhalb der Seite hat ein Ziel', () => {
        const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
        const home = helpUrl(lang);
        const anchors = [...html.matchAll(/href="([^"]*#[^"]+)"/g)].map((m) => m[1])
          .filter((h) => h.startsWith('#') || h.startsWith(home + '#'));
        expect(anchors.length).toBeGreaterThan(5);
        for (const h of anchors) expect(ids.has(h.split('#')[1]), h).toBe(true);
      });

      it('alle Bilder und Schriften gibt es', () => {
        const local = [...html.matchAll(/(?:src|href)="(\/help\/[^"#]+\.(?:jpg|woff2))"/g)].map((m) => m[1]);
        expect(local.length).toBeGreaterThan(3);
        for (const p of local) expect(existsSync(resolve(root, 'public' + p)), p).toBe(true);
      });

      it('jedes Bild hat Breite, Höhe und einen Alternativtext', () => {
        for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
          expect(tag).toMatch(/\swidth="\d+"/);
          expect(tag).toMatch(/\sheight="\d+"/);
          expect(tag).toMatch(/\salt="/);
        }
      });
    });
  }
});

describe('Hilfe: Bildschirmfotos und Schriften', () => {
  it('shots.json hat für jede Sprache dieselben Hotspots', () => {
    for (const lang of HELP_LANGS) {
      expect(Object.keys(shots[lang].desktop).sort()).toEqual(Object.keys(shots.de.desktop).sort());
      expect(Object.keys(shots[lang].mobile).sort()).toEqual(Object.keys(shots.de.mobile).sort());
      for (const p of [...Object.values(shots[lang].desktop), ...Object.values(shots[lang].mobile)]) {
        expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(100);
        expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(100);
      }
    }
  });

  it('jede Schrift aus help.css liegt unter public/help/fonts', () => {
    const css = readFileSync(resolve(root, 'src/help.css'), 'utf8');
    const urls = [...css.matchAll(/url\('(\/help\/fonts\/[^']+)'\)/g)].map((m) => m[1]);
    expect(urls.length).toBe(10);
    for (const u of urls) expect(existsSync(resolve(root, 'public' + u)), u).toBe(true);
    expect(existsSync(resolve(root, 'public/help/fonts/OFL.txt'))).toBe(true);
  });
});
