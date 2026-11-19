// Baut die Hilfe-Seiten (/help/) aus Layout, Seitenvorlagen und Texten je Sprache.
//
// Quellen (alle unter help/):
//   layout.html        Rahmen jeder Seite (Kopf, CSP, Kopfzeile, Fuß)
//   pages/<seite>.html Inhalt einer Seite
//   text/<sprache>.json Texte, flach mit Punkt-Schlüsseln ("hero.title"); Werte dürfen einfache Inline-Auszeichnung
//                      enthalten (<strong>, <kbd>, <a>), weil sie nur aus dem Repo kommen
//   shots.json         Hotspot-Positionen der Bildschirmfotos (help/screenshots.mjs)
//
// Platzhalter in Layout und Vorlagen:
//   {{schlüssel}}          Text aus text/<sprache>.json (fehlt er, bricht der Build ab)
//   {{@lang}}, {{@home}}, {{@altHome}}, {{@altLang}}, {{@content}}, {{@page}}
//   {{@img:desktop}}       Pfad des Bildschirmfotos dieser Sprache (desktop, mobile, mobile-menu)
//   {{@spot:desktop:search}} data-x/data-y (Prozent) für einen Hotspot
//
// Ausgabe: help/index.html (Deutsch) und help/en/index.html (Englisch), weitere Seiten unter help/[en/]<seite>/.
// Die erzeugten Dateien sind nicht versioniert (.gitignore); vite.config.mjs ruft buildHelpPages() vor jedem Lauf auf.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HELP_LANGS = ['de', 'en'];
export const HELP_DEFAULT_LANG = 'de';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** URL-Pfad einer Seite in einer Sprache ("index" ist die Startseite) */
export function helpUrl(lang, page = 'index') {
  const base = lang === HELP_DEFAULT_LANG ? '/help/' : `/help/${lang}/`;
  return page === 'index' ? base : `${base}${page}/`;
}

/** Dateipfad (relativ zum Repo) der erzeugten Seite */
export function helpOutFile(lang, page = 'index') {
  const parts = ['help'];
  if (lang !== HELP_DEFAULT_LANG) parts.push(lang);
  if (page !== 'index') parts.push(page);
  return join(...parts, 'index.html');
}

export function loadHelpText(root, lang) {
  return JSON.parse(readFileSync(join(root, 'help', 'text', `${lang}.json`), 'utf8'));
}

export function listHelpPages(root) {
  return readdirSync(join(root, 'help', 'pages'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, ''))
    .map((f) => (f === 'start' ? 'index' : f))
    .sort();
}

/** Setzt alle Platzhalter ein. Unbekannte Schlüssel sind ein Fehler, damit kein "{{…}}" ausgeliefert wird. */
export function renderTemplate(template, { text, vars, shots, lang, file }) {
  return template.replace(/\{\{\s*([@\w.:-]+)\s*\}\}/g, (_m, key) => {
    if (key.startsWith('@img:')) return `/help/img/${lang}-${key.slice(5)}.jpg`;
    if (key.startsWith('@spot:')) {
      const [, device, id] = key.split(':');
      const p = shots?.[lang]?.[device]?.[id];
      if (!p) throw new Error(`${file}: Hotspot ${device}:${id} fehlt in help/shots.json (${lang})`);
      // Als Datenattribute: help.js setzt die Lage per CSSOM (die CSP erlaubt keine style-Attribute)
      return `data-x="${p.x}" data-y="${p.y}"`;
    }
    if (key.startsWith('@')) {
      const name = key.slice(1);
      if (!(name in vars)) throw new Error(`${file}: unbekannte Variable ${key}`);
      return vars[name];
    }
    if (!(key in text)) throw new Error(`${file}: Text "${key}" fehlt in help/text/${lang}.json`);
    return text[key];
  });
}

/**
 * Erzeugt alle Hilfe-Seiten und gibt die Vite-Einstiege zurück ({ help: '/…/help/index.html', help_en: … }).
 * @param {{ root?: string, write?: boolean }} [options]
 */
export function buildHelpPages({ root = defaultRoot, write = true } = {}) {
  const layout = readFileSync(join(root, 'help', 'layout.html'), 'utf8');
  const shotsFile = join(root, 'help', 'shots.json');
  const shots = existsSync(shotsFile) ? JSON.parse(readFileSync(shotsFile, 'utf8')) : {};
  const inputs = {};
  const pages = {};

  for (const page of listHelpPages(root)) {
    const source = page === 'index' ? 'start' : page;
    const body = readFileSync(join(root, 'help', 'pages', `${source}.html`), 'utf8');
    for (const lang of HELP_LANGS) {
      const text = loadHelpText(root, lang);
      const altLang = HELP_LANGS.find((l) => l !== lang);
      const vars = {
        lang,
        altLang,
        page,
        home: helpUrl(lang),
        altHome: helpUrl(altLang),
        self: helpUrl(lang, page),
        alt: helpUrl(altLang, page),
        urlDe: helpUrl('de', page),
        urlEn: helpUrl('en', page),
        curDe: lang === 'de' ? 'aria-current="page"' : '',
        curEn: lang === 'en' ? 'aria-current="page"' : ''
      };
      const ctx = { text, shots, lang, file: `pages/${source}.html` };
      const content = renderTemplate(body, { ...ctx, vars });
      const html = renderTemplate(layout, { ...ctx, file: 'layout.html', vars: { ...vars, content } });
      const out = helpOutFile(lang, page);
      pages[out] = html;
      if (write) {
        mkdirSync(dirname(join(root, out)), { recursive: true });
        // Nur schreiben, wenn sich etwas geändert hat (sonst löst der Vite-Watcher endlos neu aus)
        const target = join(root, out);
        if (!existsSync(target) || readFileSync(target, 'utf8') !== html) writeFileSync(target, html);
      }
      inputs[`help${lang === HELP_DEFAULT_LANG ? '' : '_' + lang}${page === 'index' ? '' : '_' + page}`] = join(root, out);
    }
  }
  return { inputs, pages };
}

/** Vite-Plugin: baut die Seiten im Dev-Server neu, sobald sich eine Quelle unter help/ ändert */
export function helpPagesPlugin({ root = defaultRoot } = {}) {
  const sourceDir = join(root, 'help');
  const isSource = (file) => file.startsWith(sourceDir) && !file.endsWith('index.html');
  return {
    name: 'ofm-help-pages',
    configureServer(server) {
      server.watcher.add(sourceDir);
      server.watcher.on('change', (file) => {
        if (!isSource(file)) return;
        try {
          buildHelpPages({ root });
          server.ws.send({ type: 'full-reload' });
        } catch (err) {
          server.config.logger.error(`[help] ${err.message}`);
        }
      });
    }
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { inputs } = buildHelpPages();
  console.log('Hilfe-Seiten gebaut:', Object.values(inputs).map((p) => p.replace(defaultRoot + '/', '')).join(', '));
}
