// Nimmt die Hydrantenjäger-Bilder für den Leitfaden auf (Playwright, Chromium, Handy-Ansicht). Aufruf aus dem Repo-Wurzelordner:
//   node handouts/feuerwehr-leitfaden/screenshots.mjs
// Standort und Kompass sind simuliert, die Kamera zeigt ein gezeichnetes Hinweisschild. Es wird nichts hochgeladen:
// Anfragen an die OSM-API werden abgefangen. Nach einer Änderung von Hydrantenjäger neu aufnehmen und das PDF neu bauen
// (npm run handout:build -- handouts/feuerwehr-leitfaden).

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'img');
mkdirSync(out, { recursive: true });

const APP = 'https://hydrantenjaeger.de/';
// Schnaittach (Landkreis Nürnberger Land), Ortsmitte
const POSITION = { latitude: 49.55905, longitude: 11.34236, accuracy: 4 };
const sign = readFileSync(join(here, '../feuerwehr-truppkarte/img/hydrantenschild.svg'), 'utf8');

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE',
    geolocation: POSITION, permissions: ['geolocation', 'camera'],
  });
  // Schreibende OSM-API-Aufrufe nie durchlassen
  await context.route('**/api/0.6/**', (route) => route.abort());
  await context.addInitScript(({ position, svg }) => {
    localStorage.setItem('language', 'de');
    const makePosition = () => ({ coords: { ...position, heading: null, altitude: null, altitudeAccuracy: null, speed: null }, timestamp: Date.now() });
    navigator.geolocation.getCurrentPosition = (ok) => ok(makePosition());
    navigator.geolocation.watchPosition = (ok) => { ok(makePosition()); setInterval(() => ok(makePosition()), 1000); return 1; };
    navigator.geolocation.clearWatch = () => {};
    // Kompass: Blick nach Nordost
    setInterval(() => {
      const ev = new Event('deviceorientationabsolute');
      Object.assign(ev, { alpha: 360 - 48, beta: 80, gamma: 0, absolute: true });
      window.dispatchEvent(ev);
      const ev2 = new Event('deviceorientation');
      Object.assign(ev2, { alpha: 360 - 48, beta: 80, gamma: 0, absolute: true, webkitCompassHeading: 48 });
      window.dispatchEvent(ev2);
    }, 200);
    // Kamera: gezeichnete Szene mit Hinweisschild an einer Hauswand
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 720; canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      const draw = () => {
        const wall = ctx.createLinearGradient(0, 0, 0, 900);
        wall.addColorStop(0, '#d9d2c3'); wall.addColorStop(1, '#c4bba9');
        ctx.fillStyle = wall; ctx.fillRect(0, 0, 720, 900);
        const ground = ctx.createLinearGradient(0, 900, 0, 1280);
        ground.addColorStop(0, '#8a8d91'); ground.addColorStop(1, '#5f6266');
        ctx.fillStyle = ground; ctx.fillRect(0, 900, 720, 380);
        ctx.fillStyle = '#6f7276'; ctx.fillRect(0, 892, 720, 12);
        if (img.complete && img.naturalWidth) ctx.drawImage(img, 230, 380, 260, 260 * img.naturalHeight / img.naturalWidth);
        requestAnimationFrame(draw);
      };
      draw();
      return canvas.captureStream(15);
    };
  }, { position: POSITION, svg: sign });

  const page = await context.newPage();
  await page.goto(APP, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(12000); // Karte und Hydranten laden lassen
  await page.screenshot({ path: join(out, 'hj-start.png') });

  await page.locator('#start-btn').click();
  await page.locator('#capture-btn').waitFor();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(out, 'hj-kamera.png') });

  await page.locator('#capture-btn').click();
  await page.locator('button[data-value="underground"]').waitFor({ timeout: 30000 });
  // Wie auf dem Schild: Unterflurhydrant im Gehweg, Schild vorhanden, Nennweite 100
  await page.locator('button[data-value="underground"]').click();
  await page.locator('.sign-option-btn[data-value="yes"]').click();
  await page.locator('button[data-value="sidewalk"]').click();
  await page.fill('#hydrant-diameter', '100');
  await page.evaluate(() => {
    document.activeElement?.blur();
    document.querySelector('.sign-option-btn').closest('div').parentElement.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, 'hj-formular.png') });
} finally {
  await browser.close();
}
console.log('Bilder geschrieben nach', out);
