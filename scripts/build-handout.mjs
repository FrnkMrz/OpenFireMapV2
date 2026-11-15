// Baut aus einer Markdown-Quelle ein PDF-Handout (A4).
//
//   npm run handout:build -- handouts/overlay-leitfaden
//
// Ordneraufbau: <ordner>/<Name>.md (Quelle mit Front Matter), <ordner>/style.css, <ordner>/img/ (Bilder).
// Ergebnis: <ordner>/<Name>.pdf. Markdown wird mit „marked“ in HTML gewandelt, das PDF rendert Chromium über
// Playwright (beide sind Entwicklungsabhängigkeiten, es gibt keinen Betrieb und keinen Eintrag im Browser-Bundle).
//
// Besonderheiten der Markdown-Quelle:
//   - Front Matter zwischen --- mit title, subtitle, meta und footer.
//   - Ein Codeblock mit der Sprache „url“ wird zum hervorgehobenen Adressfeld.
//   - <div class="cols two|three"> mit <div class="card ok|maybe|no|legacy|future|plain"> ergibt Spalten und Karten.
//   - <div class="pb"></div> erzwingt einen Seitenumbruch.
//   - Ein Bild mit Alternativtext erhält den Alternativtext als Bildunterschrift.

import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Marked } from 'marked';

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Liest „key: value“-Zeilen zwischen den ersten beiden ---. Gibt { data, body } zurück. */
export function parseFrontMatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { data: {}, body: text };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (pair) data[pair[1]] = pair[2].trim();
  }
  return { data, body: text.slice(match[0].length) };
}

function createMarked() {
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      code({ text, lang }) {
        const language = (lang || '').trim().split(/\s+/)[0];
        if (language === 'url') {
          return `<div class="urlbox"><span class="label">KACHEL-URL (HTTPS)</span><code>${escapeHtml(text)}</code></div>\n`;
        }
        return false; // Standarddarstellung
      },
      image({ href, title, text }) {
        const caption = text ? `<span class="cap">${escapeHtml(text)}</span>` : '';
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        return `<span class="fig"><img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttr}>${caption}</span>`;
      },
    },
  });
  return marked;
}

/**
 * Wandelt Markdown in ein vollständiges HTML-Dokument.
 * @param {string} markdown Quelltext mit optionalem Front Matter
 * @param {{css?: string}} [options] css wird eingebettet
 */
export function renderHandoutHtml(markdown, { css = '' } = {}) {
  const { data, body } = parseFrontMatter(markdown);
  const html = createMarked().parse(body);
  const title = data.title || 'Handout';
  const hero = `<header class="hero"><div class="mark"></div><div><h1>${escapeHtml(title)}</h1>`
    + (data.subtitle ? `<p class="sub">${escapeHtml(data.subtitle)}</p>` : '')
    + '</div></header>'
    + (data.meta ? `<p class="hero-meta">${escapeHtml(data.meta)}</p>` : '');
  const footerCss = data.footer
    ? `@page { @bottom-left { content: "${data.footer.replace(/["\\]/g, '')}"; font: 8px "Helvetica Neue", Arial, sans-serif; color: #6b7280; }`
      + ' @bottom-right { content: "openfiremap.org · Seite " counter(page) " von " counter(pages);'
      + ' font: 8px "Helvetica Neue", Arial, sans-serif; color: #6b7280; } }'
    : '';
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} – ${escapeHtml(data.subtitle || '')}</title>
<style>${css}
${footerCss}</style>
</head>
<body>
${hero}
${html}
</body>
</html>
`;
}

export async function buildHandout(directory) {
  const dir = resolve(directory);
  const source = readdirSync(dir).find((name) => name.endsWith('.md'));
  if (!source) throw new Error(`Keine Markdown-Datei in ${dir}`);
  const cssPath = join(dir, 'style.css');
  const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
  const html = renderHandoutHtml(readFileSync(join(dir, source), 'utf8'), { css });
  const htmlPath = join(dir, '.build.tmp.html');
  const pdfPath = join(dir, `${basename(source, '.md')}.pdf`);
  writeFileSync(htmlPath, html);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
    rmSync(htmlPath, { force: true });
  }
  return pdfPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const directory = process.argv[2];
  if (!directory) {
    console.error('Aufruf: node scripts/build-handout.mjs <ordner>');
    process.exit(2);
  }
  buildHandout(directory).then((pdf) => console.log(`geschrieben: ${pdf}`), (error) => {
    console.error(error);
    process.exit(1);
  });
}
