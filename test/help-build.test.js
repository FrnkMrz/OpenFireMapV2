import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Marked } from 'marked';
import { buildHelpPages, helpOutFile, helpUrl, HELP_LANGS, jpegSize, listArticles, loadHelpText, parseFrontmatter, renderArticle, renderTemplate } from '../scripts/build-help.mjs';

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

  it('erzeugt Startseite und alle Anleitungen auf Deutsch und Englisch', () => {
    const slugs = listArticles(root);
    expect(slugs).toEqual(expect.arrayContaining(['data', 'export', 'layers', 'map', 'phone', 'town-plan']));
    const expected = ['help/index.html', 'help/en/index.html'];
    for (const slug of slugs) expected.push(`help/${slug}/index.html`, `help/en/${slug}/index.html`);
    expect(Object.keys(pages).sort()).toEqual(expected.sort());
  });

  for (const [file, html] of entries) {
    const lang = file.startsWith('help/en/') ? 'en' : 'de';
    const slug = file.replace(/^help\/(en\/)?/, '').replace(/index\.html$/, '').replace(/\/$/, '') || 'index';

    describe(file, () => {
      it('enthält keine offenen Platzhalter', () => {
        expect(html).not.toMatch(/\{\{|\}\}/);
      });

      it('hat Seitensprache, Sprachverweise und markiert die aktuelle Sprache', () => {
        expect(html).toMatch(new RegExp(`<html lang="${lang}">`));
        expect(html).toContain(`hreflang="de" href="https://openfiremap.org${helpUrl('de', slug)}"`);
        expect(html).toContain(`hreflang="en" href="https://openfiremap.org${helpUrl('en', slug)}"`);
        expect(html).toMatch(new RegExp(`lang="${lang}" hreflang="${lang}" aria-current="page"`));
      });

      it('ist für Suchmaschinen freigegeben und nennt die kanonische Adresse', () => {
        expect(html).not.toMatch(/name="robots"[^>]*noindex/);
        expect(html).toContain(`<link rel="canonical" href="https://openfiremap.org${helpUrl(lang, slug)}">`);
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

      it('jeder Link auf eine andere Hilfe-Seite führt zu einer erzeugten Seite', () => {
        const self = '/' + file.replace(/index\.html$/, '');
        for (const [, href] of html.matchAll(/href="([^"#]*)(?:#[^"]*)?"/g)) {
          let target = null;
          if (href.startsWith('/help/')) target = href;
          else if (href.startsWith('../')) target = new URL(href, 'https://x' + self).pathname;
          if (!target || /\.[a-z0-9]+$/.test(target)) continue; // Dateien (Schriften, Bilder) prüft ein anderer Test
          expect(Object.keys(pages).map((f) => '/' + f.replace(/index\.html$/, '')), `${file}: ${href}`).toContain(target);
        }
      });

      it('jeder Sprung innerhalb der Seite oder zur Startseite hat ein Ziel', () => {
        const idsOf = (h) => new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
        const own = idsOf(html);
        const home = helpUrl(lang);
        const start = idsOf(pages[helpOutFile(lang)]);
        const self = helpUrl(lang, slug);
        let count = 0;
        for (const [, h] of html.matchAll(/href="([^"]*#[^"]+)"/g)) {
          const abs = h.startsWith('../') ? new URL(h, 'https://x' + self).pathname + '#' + h.split('#')[1] : h;
          const [path, id] = abs.split('#');
          if (path === '' || path === self) { expect(own.has(id), h).toBe(true); count++; }
          else if (path === home) expect(start.has(id), h).toBe(true);
        }
        expect(count).toBeGreaterThan(0);
      });


      it('alle Bilder und Schriften gibt es', () => {
        const local = [...html.matchAll(/(?:src|href)="(\/help\/[^"#]+\.(?:jpg|woff2))"/g)].map((m) => m[1]);
        expect(local.length).toBeGreaterThanOrEqual(2);
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

describe('Hilfe: Anleitungen (Markdown)', () => {
  const marked = new Marked({ gfm: true });
  const read = (lang, slug) => parseFrontmatter(readFileSync(resolve(root, `help/content/${lang}/${slug}.md`), 'utf8'), slug);
  const ids = (body) => [...body.matchAll(/\{#([a-z0-9-]+)\}/g)].map((m) => m[1]);
  const figures = (body) => [...body.matchAll(/^:::figure ([^\n]+)$/gm)].map((m) => m[1]);

  for (const slug of listArticles(root)) {
    it(`${slug}: gleiche Abschnitte, Bilder und Reihenfolge in allen Sprachen`, () => {
      const de = read('de', slug);
      for (const lang of HELP_LANGS) {
        const other = read(lang, slug);
        expect(ids(other.body), lang).toEqual(ids(de.body));
        expect(figures(other.body), lang).toEqual(figures(de.body));
        expect(other.meta.order, lang).toBe(de.meta.order);
      }
    });
  }

  it('wandelt Blöcke, Überschriften-IDs und Bilder um', () => {
    const md = '## Titel {#t}\n\n:::tip Hinweis\nText **fett**\n:::\n\n:::figure export spots=png\nUnterschrift\n:::\n';
    const { html, toc } = renderArticle(md, { lang: 'de', shots, root, file: 't', marked });
    expect(toc).toEqual([{ id: 't', text: 'Titel' }]);
    expect(html).toContain('<h2 id="t">Titel</h2>');
    expect(html).toContain('<aside class="callout callout-tip"><p class="callout-title">Hinweis</p><p>Text <strong>fett</strong></p>');
    expect(html).toMatch(/<figure class="fig fig-plain">.*<img src="\/help\/img\/de-export\.jpg" alt="Unterschrift" width="\d+" height="\d+"/s);
    expect(html).toContain(`data-x="${shots.de.export.png.x}"`);
    expect(html).not.toContain('<!--block');
  });

  it('bricht bei unbekanntem Block, fehlendem Bild oder Hotspot ab', () => {
    const ctx = { lang: 'de', shots, root, file: 't', marked };
    expect(() => renderArticle(':::foo\nx\n:::\n', ctx)).toThrow(/unbekannter Block/);
    expect(() => renderArticle(':::figure gibtsnicht\nx\n:::\n', ctx)).toThrow(/fehlt/);
    expect(() => renderArticle(':::figure export spots=nix\nx\n:::\n', ctx)).toThrow(/Hotspot/);
  });

  it('liest JPEG-Größen', () => {
    expect(jpegSize(readFileSync(resolve(root, 'public/help/img/de-desktop.jpg')))).toEqual({ width: 1440, height: 900 });
  });
});
