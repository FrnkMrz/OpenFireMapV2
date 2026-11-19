import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Marked } from 'marked';
import { articleLanguages, buildHelpPages, helpOutFile, stripOtherLanguages, helpUrl, HELP_LANGS, HELP_DEFAULT_LANG, HELP_X_DEFAULT_LANG, jpegSize, listArticles, listHelpLanguages, loadHelpText, parseFrontmatter, renderArticle, renderTemplate } from '../scripts/build-help.mjs';

// Hilfe-Seiten (/help/): Build aus help/ prüfen, ohne Dateien zu schreiben.

const root = resolve(__dirname, '..');
const { pages } = buildHelpPages({ root, write: false });
const texts = Object.fromEntries(HELP_LANGS.map((l) => [l, loadHelpText(root, l)]));
const shots = JSON.parse(readFileSync(resolve(root, 'help/shots.json'), 'utf8'));
const languageCatalog = JSON.parse(readFileSync(resolve(root, 'help/languages.json'), 'utf8'));

function readCsp(html) {
  const m = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i);
  const csp = {};
  for (const part of m[1].split(';')) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) csp[name] = values;
  }
  return csp;
}

// Sprachen je Anleitung (Frontmatter "languages" der deutschen Fassung, sonst alle)
const langsOf = (slug) => slug === 'index' ? HELP_LANGS
  : articleLanguages(parseFrontmatter(readFileSync(resolve(root, `help/content/de/${slug}.md`), 'utf8'), slug).meta, HELP_LANGS);

const tagsOf = (s) => [...String(s).matchAll(/<\/?([a-z]+)\b[^>]*>/g)].map((m) => m[1]).sort();
const hrefsOf = (s) => [...String(s).matchAll(/href="([^"]*)"/g)].map((m) => m[1]).sort();

describe('Hilfe: Texte', () => {
  it('führt nur katalogisierte Sprachen mit Textdatei auf', () => {
    const catalog = JSON.parse(readFileSync(resolve(root, 'help/languages.json'), 'utf8'));
    const catalogCodes = catalog.languages.map(({ code }) => code);
    const appCodes = readdirSync(resolve(root, 'src/js/lang')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, '')).sort();
    expect(new Set(catalogCodes).size).toBe(catalogCodes.length);
    expect([...catalogCodes].sort()).toEqual(appCodes);
    expect(catalogCodes).toEqual(expect.arrayContaining(['de', 'en', 'fr', 'es', 'tr', 'zh']));
    expect(listHelpLanguages(root)).toEqual(HELP_LANGS);
    expect(HELP_LANGS).toEqual(expect.arrayContaining([HELP_DEFAULT_LANG, HELP_X_DEFAULT_LANG]));
    for (const lang of HELP_LANGS) expect(catalogCodes).toContain(lang);
  });

  it('alle aktiven Sprachen haben dieselben Schlüssel wie Deutsch', () => {
    const de = Object.keys(texts.de).sort();
    for (const lang of HELP_LANGS) {
      expect(Object.keys(texts[lang]).sort(), lang).toEqual(de);
    }
  });

  it('kein Text ist leer', () => {
    for (const lang of HELP_LANGS) {
      for (const [k, v] of Object.entries(texts[lang])) expect(String(v).trim(), `${lang}:${k}`).not.toBe('');
    }
  });

  it('Auszeichnung und Links sind in allen aktiven Sprachen gleich', () => {
    for (const lang of HELP_LANGS) {
      for (const k of Object.keys(texts.de)) {
        expect(tagsOf(texts[lang][k]), `${lang}:${k}`).toEqual(tagsOf(texts.de[k]));
        expect(hrefsOf(texts[lang][k]), `${lang}:${k}`).toEqual(hrefsOf(texts.de[k]));
      }
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

  it('erzeugt Startseite und Anleitungen für jede aktive Sprache', () => {
    const slugs = listArticles(root);
    expect(slugs).toEqual(expect.arrayContaining(['data', 'export', 'layers', 'map', 'phone', 'town-plan']));
    const expected = [];
    for (const lang of HELP_LANGS) {
      expected.push(helpOutFile(lang));
      for (const slug of slugs) if (langsOf(slug).includes(lang)) expected.push(helpOutFile(lang, slug));
    }
    expect(Object.keys(pages).sort()).toEqual(expected.sort());
  });

  for (const [file, html] of entries) {
    const lang = HELP_LANGS.find((code) => file.startsWith(`help/${code}/`)) || HELP_DEFAULT_LANG;
    const prefix = lang === HELP_DEFAULT_LANG ? 'help/' : `help/${lang}/`;
    const slug = file.replace(prefix, '').replace(/index\.html$/, '').replace(/\/$/, '') || 'index';

    describe(file, () => {
      it('enthält keine offenen Platzhalter', () => {
        expect(html).not.toMatch(/\{\{|\}\}/);
      });

      it('hat Seitensprache, Sprachverweise und markiert die aktuelle Sprache', () => {
        const info = languageCatalog.languages.find((item) => item.code === lang);
        const htmlLang = info.hreflang || lang;
        const dir = info.dir || (['ar', 'ur'].includes(lang) ? 'rtl' : 'ltr');
        expect(html).toContain(`<html lang="${htmlLang}" dir="${dir}">`);
        const pageLangs = langsOf(slug);
        for (const alternate of HELP_LANGS) {
          const altInfo = languageCatalog.languages.find((item) => item.code === alternate);
          const alternateLink = `hreflang="${altInfo.hreflang || alternate}" href="https://openfiremap.org${helpUrl(alternate, slug)}"`;
          if (pageLangs.includes(alternate)) expect(html).toContain(alternateLink);
          else expect(html).not.toContain(alternateLink); // Sprachwechsel führt dort zur Startseite
        }
        const xDefault = `hreflang="x-default" href="https://openfiremap.org${helpUrl(HELP_X_DEFAULT_LANG, slug)}"`;
        if (pageLangs.includes(HELP_X_DEFAULT_LANG)) expect(html).toContain(xDefault);
        else expect(html).not.toContain('hreflang="x-default"');
        expect(html).toContain(`lang="${htmlLang}" hreflang="${htmlLang}" dir="auto" aria-current="page"`);
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
      for (const lang of articleLanguages(de.meta, HELP_LANGS)) {
        const other = read(lang, slug);
        expect(ids(other.body), lang).toEqual(ids(de.body));
        expect(figures(other.body), lang).toEqual(figures(de.body));
        expect(other.meta.order, lang).toBe(de.meta.order);
      }
    });
  }

  it('„Für Feuerwehren“ gibt es nur auf Deutsch und nur für Deutschland', () => {
    const de = read('de', 'fire-brigades');
    expect(articleLanguages(de.meta, HELP_LANGS)).toEqual(['de']);
    expect(de.body).toContain('Gilt nur für Deutschland');
    for (const lang of HELP_LANGS.filter((code) => code !== 'de')) {
      expect(existsSync(resolve(root, `help/content/${lang}/fire-brigades.md`)), lang).toBe(false);
      expect(pages[helpOutFile(lang)], lang).not.toContain('fire-brigades/');
    }
    expect(pages[helpOutFile('de')]).toContain('href="/help/fire-brigades/"');
  });

  it('languages im Frontmatter muss Deutsch enthalten, only-Blöcke gelten nur für die genannten Sprachen', () => {
    expect(articleLanguages({}, ['de', 'en'])).toEqual(['de', 'en']);
    expect(articleLanguages({ languages: 'de' }, ['de', 'en'])).toEqual(['de']);
    expect(() => articleLanguages({ languages: 'en' }, ['de', 'en'])).toThrow(/de/);
    const tpl = 'a<!--only:de-->B<!--/only-->c<!--only:de, en-->D<!--/only-->';
    expect(stripOtherLanguages(tpl, 'de')).toBe('aBcD');
    expect(stripOtherLanguages(tpl, 'en')).toBe('acD');
    expect(stripOtherLanguages(tpl, 'fr')).toBe('ac');
  });

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
