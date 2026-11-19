// Baut die Hilfe-Seiten (/help/) aus Layout, Seitenvorlagen und Texten je Sprache.
//
// Quellen (alle unter help/):
//   layout.html        Rahmen jeder Seite (Kopf, CSP, Kopfzeile, Fuß)
//   pages/<seite>.html Inhalt einer Seite
//   text/<sprache>.json Texte, flach mit Punkt-Schlüsseln ("hero.title"); Werte dürfen einfache Inline-Auszeichnung
//                      enthalten (<strong>, <kbd>, <a>), weil sie nur aus dem Repo kommen
//   shots.json         Hotspot-Positionen der Bildschirmfotos (help/screenshots.mjs)
//
//   content/<sprache>/<seite>.md Anleitungsseiten (Markdown mit Frontmatter und Blöcken, siehe renderArticle)
//   article.html       Rahmen einer Anleitungsseite (Kopf, Inhaltsverzeichnis, Blättern)
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
import { Marked } from 'marked';

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

/** Breite und Höhe eines JPEG aus dem SOF-Abschnitt (für width/height am <img>, gegen Layout-Sprünge) */
export function jpegSize(buffer) {
  let i = 2;
  while (i < buffer.length) {
    if (buffer[i] !== 0xff) { i++; continue; }
    const marker = buffer[i + 1];
    const len = buffer.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error('JPEG ohne Größenangabe');
}

/** Liest einfache Frontmatter ("schlüssel: wert" je Zeile) */
export function parseFrontmatter(src, file) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error(`${file}: Frontmatter fehlt`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  for (const k of ['title', 'description', 'eyebrow', 'lead', 'order']) {
    if (!meta[k]) throw new Error(`${file}: Frontmatter "${k}" fehlt`);
  }
  return { meta, body: src.slice(m[0].length) };
}

export function listArticles(root) {
  const dir = join(root, 'help', 'content', HELP_DEFAULT_LANG);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')).sort();
}

const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Wandelt eine Anleitungsseite (Markdown) in HTML. Zusätzlich zu Markdown:
 *   ## Überschrift {#id}          feste Anker-ID (gleich in allen Sprachen), landet im Inhaltsverzeichnis
 *   :::tip|note|warn [Titel]     Hinweiskasten
 *   :::figure bild frame=browser|phone|plain spots=a,b,c [set=name]
 *   Bildunterschrift
 *   :::                          Bildschirmfoto mit nummerierten Markierungen aus help/shots.json (<sprache>.<bild> bzw. <sprache>.<set>)
 *   :::steps                     die folgende nummerierte Liste als Schrittfolge
 */
export function renderArticle(md, { lang, shots, root, file, marked }) {
  const toc = [];
  const blocks = [];
  const hold = (html) => { blocks.push(html); return `\n\n<!--block:${blocks.length - 1}-->\n\n`; };

  const src = md.replace(/^:::(\w+)([^\n]*)\n([\s\S]*?)^:::\s*$/gm, (_m, kind, args, inner) => {
    args = args.trim();
    if (kind === 'figure') {
      const [name, ...rest] = args.split(/\s+/);
      const opts = Object.fromEntries(rest.map((r) => r.split('=')));
      const imgPath = `/help/img/${lang}-${name}.jpg`;
      const disk = join(root, 'public', imgPath);
      if (!existsSync(disk)) throw new Error(`${file}: Bild ${imgPath} fehlt`);
      const { width, height } = jpegSize(readFileSync(disk));
      const caption = marked.parseInline(inner.trim());
      const ids = opts.spots ? opts.spots.split(',') : [];
      const spots = ids.map((id, i) => {
        const set = opts.set || name;
        const p = shots?.[lang]?.[set]?.[id];
        if (!p) throw new Error(`${file}: Hotspot ${set}:${id} fehlt in help/shots.json (${lang})`);
        return `<span class="spot" aria-hidden="true" data-x="${p.x}" data-y="${p.y}">${i + 1}</span>`;
      }).join('');
      const frame = opts.frame || 'plain';
      // Alternativtext = Bildunterschrift ohne Markdown-Zeichen; escapeAttr macht ihn als Attribut sicher
      const alt = escapeAttr(inner.trim().replace(/[*_`]/g, ''));
      const img = `<div class="shot-canvas"><img src="${imgPath}" alt="${alt}" width="${width}" height="${height}" loading="lazy">${spots}</div>`;
      const framed = frame === 'browser'
        ? `<div class="browser"><div class="browser-bar"><i></i><i></i><i></i><span>openfiremap.org</span></div>${img}</div>`
        : frame === 'phone' ? `<div class="phone-big">${img}</div>` : `<div class="plain-shot">${img}</div>`;
      return hold(`<figure class="fig fig-${frame}">${framed}<figcaption>${caption}</figcaption></figure>`);
    }
    if (['tip', 'note', 'warn'].includes(kind)) {
      const title = args ? `<p class="callout-title">${marked.parseInline(args)}</p>` : '';
      return hold(`<aside class="callout callout-${kind}">${title}${marked.parse(inner)}</aside>`);
    }
    if (kind === 'steps') return hold(`<div class="md-steps">${marked.parse(inner)}</div>`);
    throw new Error(`${file}: unbekannter Block :::${kind}`);
  });

  let html = marked.parse(src);
  html = html.replace(/<h([23])>([\s\S]*?)\s*\{#([a-z0-9-]+)\}<\/h\1>/g, (_m, level, text, id) => {
    if (level === '2') toc.push({ id, text });
    return `<h${level} id="${id}">${text}</h${level}>`;
  });
  html = html.replace(/<p><!--block:(\d+)--><\/p>|<!--block:(\d+)-->/g, (_m, a, b) => blocks[Number(a ?? b)]);
  // Externe Links als solche kennzeichnen
  html = html.replace(/<a href="(https?:\/\/[^"]+)">/g, '<a href="$1" rel="noopener">');
  return { html, toc };
}

/**
 * Erzeugt alle Hilfe-Seiten und gibt die Vite-Einstiege zurück ({ help: '/…/help/index.html', help_en: … }).
 * @param {{ root?: string, write?: boolean }} [options]
 */
export function buildHelpPages({ root = defaultRoot, write = true } = {}) {
  const layout = readFileSync(join(root, 'help', 'layout.html'), 'utf8');
  const articleTpl = readFileSync(join(root, 'help', 'article.html'), 'utf8');
  const shotsFile = join(root, 'help', 'shots.json');
  const shots = existsSync(shotsFile) ? JSON.parse(readFileSync(shotsFile, 'utf8')) : {};
  const marked = new Marked({ gfm: true });
  const inputs = {};
  const pages = {};

  const emit = (lang, page, html) => {
    const out = helpOutFile(lang, page);
    pages[out] = html;
    if (write) {
      mkdirSync(dirname(join(root, out)), { recursive: true });
      // Nur schreiben, wenn sich etwas geändert hat (sonst löst der Vite-Watcher endlos neu aus)
      const target = join(root, out);
      if (!existsSync(target) || readFileSync(target, 'utf8') !== html) writeFileSync(target, html);
    }
    inputs[`help${lang === HELP_DEFAULT_LANG ? '' : '_' + lang}${page === 'index' ? '' : '_' + page}`] = join(root, out);
  };

  const baseVars = (lang, page) => {
    const altLang = HELP_LANGS.find((l) => l !== lang);
    return {
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
  };

  // Aktuelle Seite in der Kopf-Navigation markieren
  const markCurrent = (html, self) => html.replace(/(<nav class="nav"[\s\S]*?<\/nav>)/, (nav) =>
    nav.replace(`<a href="${self}">`, `<a href="${self}" aria-current="page">`));

  // 1) Seiten aus HTML-Vorlagen (Startseite)
  for (const page of listHelpPages(root)) {
    const source = page === 'index' ? 'start' : page;
    const body = readFileSync(join(root, 'help', 'pages', `${source}.html`), 'utf8');
    for (const lang of HELP_LANGS) {
      const text = loadHelpText(root, lang);
      const vars = { ...baseVars(lang, page), metaTitle: text['meta.title'], metaDescription: text['meta.description'] };
      const ctx = { text, shots, lang, file: `pages/${source}.html` };
      const content = renderTemplate(body, { ...ctx, vars });
      emit(lang, page, markCurrent(renderTemplate(layout, { ...ctx, file: 'layout.html', vars: { ...vars, content } }), vars.self));
    }
  }

  // 2) Anleitungsseiten aus Markdown (help/content/<sprache>/<seite>.md)
  const slugs = listArticles(root);
  for (const lang of HELP_LANGS) {
    const text = loadHelpText(root, lang);
    const articles = slugs.map((slug) => {
      const file = `content/${lang}/${slug}.md`;
      const full = join(root, 'help', file);
      if (!existsSync(full)) throw new Error(`${file} fehlt (gibt es auf Deutsch)`);
      const { meta, body } = parseFrontmatter(readFileSync(full, 'utf8'), file);
      return { slug, file, meta, body };
    }).sort((a, b) => Number(a.meta.order) - Number(b.meta.order));

    articles.forEach((a, i) => {
      const { html, toc } = renderArticle(a.body, { lang, shots, root, file: a.file, marked });
      const vars = baseVars(lang, a.slug);
      const prev = articles[i - 1], next = articles[i + 1];
      const pagerLink = (x, cls, label) => x
        ? `<a class="pager-link ${cls}" href="${helpUrl(lang, x.slug)}"><span>${label}</span><strong>${x.meta.title}</strong></a>`
        : '<span></span>';
      const articleVars = {
        ...vars,
        metaTitle: `${a.meta.title} – ${text['meta.suffix']}`,
        metaDescription: a.meta.description,
        eyebrow: a.meta.eyebrow,
        title: a.meta.title,
        lead: marked.parseInline(a.meta.lead),
        body: html,
        toc: toc.map((t) => `<li><a href="#${t.id}">${t.text}</a></li>`).join(''),
        pager: pagerLink(prev, 'prev', text['article.prev']) + pagerLink(next, 'next', text['article.next'])
      };
      const ctx = { text, shots, lang, file: 'article.html' };
      const content = renderTemplate(articleTpl, { ...ctx, vars: articleVars });
      emit(lang, a.slug, markCurrent(renderTemplate(layout, { ...ctx, file: 'layout.html', vars: { ...articleVars, content } }), vars.self));
    });
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
