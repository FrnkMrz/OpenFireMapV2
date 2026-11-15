// Nimmt die Bilder für den Leitfaden von den Live-Seiten auf (Playwright, Chromium). Aufruf aus dem Repo-Wurzelordner:
//   node handouts/overlay-leitfaden/screenshots.mjs
// Erzeugt img/overlay-demo.jpg, img/kartenzeichen.jpg und img/beispielkacheln.png. Nach einer Änderung der Live-Seiten
// neu aufnehmen und das PDF neu bauen (npm run handout:build -- handouts/overlay-leitfaden).

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const out = join(dirname(fileURLToPath(import.meta.url)), 'img');
mkdirSync(out, { recursive: true });

// Kacheln für das Beispielbild: Zoom 17, 3 × 2 Kacheln in Nürnberg
const TILE_BASE = 'https://tiles.openfiremap.org/hytiles/17';
const TILES = { x0: 69567, y0: 44759, cols: 3, rows: 2 };

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 930 }, deviceScaleFactor: 1.5, locale: 'de-DE' });

  const overlay = await context.newPage();
  await overlay.goto('https://openfiremap.org/overlay/', { waitUntil: 'networkidle', timeout: 60000 });
  await overlay.waitForTimeout(6000); // Rasterdemo laden lassen
  await overlay.screenshot({ path: join(out, 'overlay-demo.jpg'), type: 'jpeg', quality: 86, clip: { x: 0, y: 223, width: 1280, height: 637 } });

  const symbols = await context.newPage();
  await symbols.goto('https://openfiremap.org/symbols/', { waitUntil: 'networkidle', timeout: 60000 });
  await symbols.waitForTimeout(2000);
  await symbols.screenshot({ path: join(out, 'kartenzeichen.jpg'), type: 'jpeg', quality: 86, clip: { x: 0, y: 267, width: 1280, height: 623 } });

  const grid = await context.newPage();
  const imgs = [];
  for (let j = 0; j < TILES.rows; j++) for (let i = 0; i < TILES.cols; i++) {
    imgs.push(`<img src="${TILE_BASE}/${TILES.x0 + i}/${TILES.y0 + j}.png" width="256" height="256">`);
  }
  await grid.setContent(`<style>body{margin:0}#g{display:grid;grid-template-columns:repeat(${TILES.cols},256px);width:${TILES.cols * 256}px;
    background-color:#f8fafc;background-image:linear-gradient(45deg,#eef1f5 25%,transparent 25%,transparent 75%,#eef1f5 75%),
    linear-gradient(45deg,#eef1f5 25%,transparent 25%,transparent 75%,#eef1f5 75%);background-size:32px 32px;background-position:0 0,16px 16px}
    img{display:block;outline:1px solid #cbd5e1;outline-offset:-1px}</style><div id="g">${imgs.join('')}</div>`);
  await grid.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0), null, { timeout: 60000 });
  await (await grid.$('#g')).screenshot({ path: join(out, 'beispielkacheln.png') });
} finally {
  await browser.close();
}
console.log('Bilder geschrieben nach', out);
