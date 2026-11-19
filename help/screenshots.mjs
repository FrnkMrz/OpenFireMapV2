// Nimmt die Bildschirmfotos für die Hilfe von der Live-Karte auf (Playwright, Chromium) und misst dabei die Lage der
// erklärten Bedienelemente. Aufruf aus dem Repo-Wurzelordner:
//   node help/screenshots.mjs
// Schreibt je Sprache public/help/img/<sprache>-<bild>.jpg (Karte, Menüs, Export, Datenstand, Hydrant, Ortsplan-Assistent)
// sowie help/shots.json (Hotspot-Positionen in Prozent, Bildgrößen der Ausschnitte). Nach einer Änderung der Oberfläche neu aufnehmen; die Nummern im Bild folgen dann
// von selbst, weil build-help.mjs die Positionen aus shots.json liest.

import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
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
    case 'left': return { x: box.x - 16, y: box.y + box.height / 2 };
    default: return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
}

async function measure(page, spots, viewport, clip = { x: 0, y: 0, ...viewport }) {
  const out = {};
  for (const [id, { selector, where, pick }] of Object.entries(spots)) {
    const el = pick ? await pick(page, viewport) : page.locator(selector).first();
    const box = el ? await el.boundingBox() : null;
    if (!box) throw new Error(`Hotspot ${id}: ${selector || 'pick'} nicht gefunden`);
    const p = anchor(box, where);
    out[id] = { x: +(100 * (p.x - clip.x) / clip.width).toFixed(2), y: +(100 * (p.y - clip.y) / clip.height).toFixed(2) };
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


// Ausschnitt um ein Element mit Rand, auf das Fenster begrenzt
async function clipAround(page, selector, viewport, pad = { top: 24, right: 24, bottom: 24, left: 24 }) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} nicht sichtbar`);
  const x = Math.max(0, Math.floor(box.x - pad.left));
  const y = Math.max(0, Math.floor(box.y - pad.top));
  const right = Math.min(viewport.width, Math.ceil(box.x + box.width + pad.right));
  const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height + pad.bottom));
  return { x, y, width: right - x, height: bottom - y };
}

async function shot(page, name, lang, clip) {
  const path = join(imgDir, `${lang}-${name}.jpg`);
  await page.screenshot({ path, type: 'jpeg', quality: 78, ...(clip ? { clip } : {}) });
  return clip ? { w: clip.width, h: clip.height } : null;
}

const exportSpots = {
  format: { selector: '#fmt-free', where: 'left' },
  zoom: { selector: '#zoom-15', where: 'left' },
  select: { selector: '#select-btn', where: 'left' },
  view: { selector: '#select-view-btn', where: 'left' },
  png: { selector: '#png-btn', where: 'left' },
  gpx: { selector: '#gpx-btn', where: 'left' }
};

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

    // Kartenebenen-Menü
    await d.click('#layer-btn-trigger');
    await d.waitForTimeout(600);
    result[lang].sizes = {};
    result[lang].sizes.layers = await shot(d, 'layers', lang, await clipAround(d, '#layer-menu', DESKTOP, { top: 90, right: 40, bottom: 30, left: 30 }));
    await d.keyboard.press('Escape');
    await d.waitForTimeout(300);

    // Export-Menü mit Nummern
    await d.click('#export-btn-trigger');
    await d.waitForTimeout(600);
    const exportClip = await clipAround(d, '#export-menu', DESKTOP, { top: 30, right: 30, bottom: 30, left: 50 });
    result[lang].sizes.export = await shot(d, 'export', lang, exportClip);
    result[lang].export = await measure(d, exportSpots, DESKTOP, exportClip);

    // Titel-Dialog (Ortsname kommt von Nominatim)
    await d.click('#png-btn');
    await d.waitForTimeout(3500);
    result[lang].sizes.title = await shot(d, 'title', lang, await clipAround(d, '#export-title-modal', DESKTOP, { top: 40, right: 40, bottom: 40, left: 40 }));
    await d.keyboard.press('Escape');
    await d.waitForTimeout(400);

    // Datenstand-Popover: erst warten, bis die Live-Aktualisierung durch ist
    await d.waitForFunction(() => !/Sync…|LÄDT|LOADING/i.test(document.getElementById('data-status')?.textContent || ''), null, { timeout: 30000 }).catch(() => {});
    await d.waitForTimeout(2000);
    await d.click('#data-info-btn');
    await d.waitForTimeout(700);
    result[lang].sizes.data = await shot(d, 'data', lang, await clipAround(d, '#data-info-popover', DESKTOP, { top: 30, right: 30, bottom: 30, left: 30 }));
    await d.keyboard.press('Escape');

    // Hydrant mit Details und 100-m-Kreis (Zoom 18)
    await d.goto(`${BASE}?lang=${lang}#18/49.45280/11.07700/voyager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(d);
    const m18 = await pickMarker(d, DESKTOP);
    await m18.click();
    await d.waitForTimeout(800);
    await m18.hover(); // Details-Tooltip öffnet ab Zoom 18 beim Darüberfahren
    await d.waitForTimeout(900);
    const mb = await m18.boundingBox();
    const mclip = { x: Math.max(0, Math.round(mb.x - 360)), y: Math.max(0, Math.round(mb.y - 230)), width: 760, height: 470 };
    result[lang].sizes.marker = await shot(d, 'marker', lang, mclip);
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
    await m.click('#mobile-open-layers');
    await m.waitForTimeout(700);
    await m.screenshot({ path: join(imgDir, `${lang}-mobile-layers.jpg`), type: 'jpeg', quality: 70 });
    await mob.close();
  }

  // Ortsplan-Assistent (Oberfläche nur Deutsch): einmal aufnehmen, für jede Sprache ablegen
  const plan = await browser.newContext({ viewport: DESKTOP, locale: 'de', deviceScaleFactor: 1 });
  const pp = await plan.newPage();
  const ORT = `${BASE}ortsplan/?lat=49.45280&lon=11.07700`;
  await pp.goto(ORT, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pp.waitForTimeout(9000);
  const planShots = [];
  for (let step = 1; step <= 3; step++) {
    const file = join(imgDir, `de-plan-${step}.jpg`);
    await pp.screenshot({ path: file, type: 'jpeg', quality: 74 });
    planShots.push(file);
    if (step < 3) { await pp.click('#next'); await pp.waitForTimeout(2500); }
  }
  // „Ortsplan erstellen“ öffnet das Blatt (neuer Tab oder dieselbe Seite)
  const [popup] = await Promise.all([
    plan.waitForEvent('page', { timeout: 15000 }).catch(() => null),
    pp.click('#go', { noWaitAfter: true })
  ]);
  const sheet = popup || pp;
  await sheet.setViewportSize(DESKTOP);
  await sheet.waitForLoadState('domcontentloaded');
  await sheet.waitForTimeout(15000);
  await sheet.screenshot({ path: join(imgDir, 'de-plan-sheet.jpg'), type: 'jpeg', quality: 74 });
  await plan.close();
  for (const lang of LANGS.filter((l) => l !== 'de')) {
    for (const name of ['plan-1', 'plan-2', 'plan-3', 'plan-sheet']) copyFileSync(join(imgDir, `de-${name}.jpg`), join(imgDir, `${lang}-${name}.jpg`));
  }
} finally {
  await browser.close();
}

writeFileSync(join(root, 'help', 'shots.json'), JSON.stringify({ taken: new Date().toISOString().slice(0, 10), ...result }, null, 2) + '\n');
console.log('Bilder geschrieben nach', imgDir);
