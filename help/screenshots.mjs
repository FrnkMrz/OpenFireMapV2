// Nimmt die Bildschirmfotos für die Hilfe von der Live-Karte auf (Playwright, Chromium) und misst dabei die Lage der
// erklärten Bedienelemente. Aufruf aus dem Repo-Wurzelordner:
//   node help/screenshots.mjs
// Schreibt je Sprache public/help/img/<sprache>-desktop.jpg, -mobile.jpg und -mobile-menu.jpg sowie help/shots.json
// (Hotspot-Positionen in Prozent). Nach einer Änderung der Oberfläche neu aufnehmen; die Nummern im Bild folgen dann
// von selbst, weil build-help.mjs die Positionen aus shots.json liest.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imgDir = join(root, 'public', 'help', 'img');
mkdirSync(imgDir, { recursive: true });

// Fester Ort: Nürnberger Altstadt, Zoom 17 (Symbole sichtbar), Hintergrund Standard (Voyager)
const BASE = process.env.HELP_SHOTS_URL || 'https://openfiremap.org/';
const HASH = '#17/49.45280/11.07700/voyager';
const LANGS = ['de', 'en'];

// Ankerpunkt eines Hotspots relativ zum Element: below = unter der Mitte, right = rechts innen, left = links oben
function anchor(box, where) {
  switch (where) {
    case 'below': return { x: box.x + box.width / 2, y: box.y + box.height + 14 };
    case 'right': return { x: box.x + box.width - 22, y: box.y + box.height / 2 };
    case 'outright': return { x: box.x + box.width + 16, y: box.y + box.height / 2 };
    case 'topleft': return { x: box.x + 4, y: box.y + 4 };
    default: return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
}

async function measure(page, spots, viewport) {
  const out = {};
  for (const [id, { selector, where, pick }] of Object.entries(spots)) {
    const el = pick ? await pick(page, viewport) : page.locator(selector).first();
    const box = el ? await el.boundingBox() : null;
    if (!box) throw new Error(`Hotspot ${id}: ${selector || 'pick'} nicht gefunden`);
    const p = anchor(box, where);
    out[id] = { x: +(100 * p.x / viewport.width).toFixed(2), y: +(100 * p.y / viewport.height).toFixed(2) };
  }
  return out;
}

// Ein gut sichtbarer Hydrant nahe einer festen Stelle (Mitte oben), damit der Hotspot nicht am Rand klebt
async function pickMarker(page, viewport) {
  const markers = page.locator('.leaflet-marker-icon');
  const n = await markers.count();
  let best = null, bestD = Infinity;
  for (let i = 0; i < n; i++) {
    const box = await markers.nth(i).boundingBox();
    if (!box) continue;
    const d = Math.hypot(box.x - viewport.width * 0.57, box.y - viewport.height * 0.36);
    if (d < bestD) { bestD = d; best = markers.nth(i); }
  }
  return best;
}

async function settle(page) {
  await page.waitForFunction(() => document.querySelectorAll('.leaflet-marker-icon').length > 30, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const desktopSpots = {
  search: { selector: '#desktop-controls input', where: 'below' },
  locate: { selector: '#locate-btn', where: 'below' },
  layers: { selector: '#layer-btn-trigger', where: 'below' },
  export: { selector: '#export-btn-trigger', where: 'below' },
  share: { selector: '#desktop-controls [data-i18n-aria-label="share_map"]', where: 'below' },
  marker: { pick: pickMarker, where: 'outright' },
  status: { selector: '#desktop-status-dock', where: 'topleft' },
  legal: { selector: '#btn-legal-trigger', where: 'outright' }
};
const mobileSpots = {
  menu: { selector: '#mobile-burger-btn', where: 'below' },
  status: { selector: '#status-box', where: 'below' },
  layers: { selector: '#mobile-open-layers', where: 'right' },
  share: { selector: '#mobile-open-share', where: 'right' },
  search: { selector: '#mobile-open-search', where: 'right' },
  legal: { selector: '#mobile-open-legal', where: 'right' },
  locate: { selector: '#mobile-locate-btn', where: 'outright' }
};

const result = {};
const browser = await chromium.launch();
try {
  for (const lang of LANGS) {
    const url = `${BASE}?lang=${lang}${HASH}`;
    result[lang] = {};

    const desk = await browser.newContext({ viewport: DESKTOP, locale: lang, deviceScaleFactor: 1 });
    const d = await desk.newPage();
    await d.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(d);
    await d.screenshot({ path: join(imgDir, `${lang}-desktop.jpg`), type: 'jpeg', quality: 74 });
    result[lang].desktop = await measure(d, desktopSpots, DESKTOP);
    await desk.close();

    const mob = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: lang });
    const m = await mob.newPage();
    await m.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(m);
    await m.screenshot({ path: join(imgDir, `${lang}-mobile.jpg`), type: 'jpeg', quality: 70 });
    await m.click('#mobile-burger-btn');
    await m.waitForTimeout(800);
    await m.screenshot({ path: join(imgDir, `${lang}-mobile-menu.jpg`), type: 'jpeg', quality: 70 });
    result[lang].mobile = await measure(m, mobileSpots, MOBILE);
    await mob.close();
  }
} finally {
  await browser.close();
}

writeFileSync(join(root, 'help', 'shots.json'), JSON.stringify({ taken: new Date().toISOString().slice(0, 10), ...result }, null, 2) + '\n');
console.log('Bilder geschrieben nach', imgDir);
