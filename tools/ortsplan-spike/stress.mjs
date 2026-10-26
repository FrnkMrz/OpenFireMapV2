// Belastungstest fuer das Straßenverzeichnis ohne Karte: viele und lange Namen. Aufruf: node stress.mjs ausgabe-prefix
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "shots/stress";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
const BASE = process.env.SPIKE_URL || "http://127.0.0.1:5173"; // Branch-Server: SPIKE_URL=http://127.0.0.1:5174
await page.goto(`${BASE}/?fire=0&scale=10000&paper=a4l&dpi=96`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
const res = await page.evaluate(async () => {
  const { composeSheet } = await import("/sheet.js");
  const names = [];
  for (let i = 0; i < 400; i++) names.push(i % 7 === 0 ? `Neunkirchener Straße ${i}` : i % 11 === 0 ? `Hauptmannsgrünbachstraßenerweiterung ${i}` : `Teststraße ${i}`);
  const feats = names.map((name, i) => ({ properties: { name, kind: "minor_road" }, geometry: { type: "LineString", coordinates: [[(i * 13) % 700, (i * 29) % 600], [((i * 13) % 700) + 300, ((i * 29) % 600) + 40]] } }));
  const fake = { querySourceFeatures: () => feats, project: ([x, y]) => ({ x, y }), getCanvas: () => document.createElement("canvas") };
  const r = await composeSheet({ map: fake, scale: 10000, dpi: 96, paperMm: [297, 210], frame: { x: 14, y: 14, w: 190, h: 182 }, meta: null, title: "Test", subtitle: ["a", "b"] });
  window.__stress = r.pages;
  // Zweiter Lauf: waagerechter Bereich unten, erzwungene Verkleinerung (panelFit < 1). Titel und Untertitel muessen genau EINMAL
  // auf die echte Seite gezeichnet werden (Fund aus dem Codex-Review: sie wurden vor der Verkleinerung schon einmal gezeichnet).
  const counts = { Test: 0, "Straßenverzeichnis: siehe Folgeseite": 0 };
  const orig = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (txt, ...rest) {
    if (this.canvas.width > 1000 && txt in counts) counts[txt]++; // nur echte Seiten, nicht die Wegwerf-Flaeche des Trockenlaufs
    return orig.call(this, txt, ...rest);
  };
  const r2 = await composeSheet({ map: fake, scale: 5000, dpi: 96, paperMm: [297, 210], frame: { x: 14, y: 14, w: 269, h: 110 }, meta: null, title: "Test", subtitle: ["a", "b"],
    side: "bottom", panel: { x: 14, y: 136, w: 269, h: 50 }, ui: 1 });
  CanvasRenderingContext2D.prototype.fillText = orig;
  if (!(r2.panelFit < 1)) throw new Error(`Verkleinerung nicht ausgeloest (panelFit ${r2.panelFit}), Test prueft nichts`);
  if (counts.Test !== 1) throw new Error(`Titel ${counts.Test}-mal gezeichnet statt einmal`);
  if (counts["Straßenverzeichnis: siehe Folgeseite"] !== 1) throw new Error(`Hinweis ${counts["Straßenverzeichnis: siehe Folgeseite"]}-mal gezeichnet statt einmal`);
  window.__stress2 = { panelFit: r2.panelFit, titel: counts.Test, hinweis: counts["Straßenverzeichnis: siehe Folgeseite"], pages: r2.pages.length };
  if (r.indexCount !== 400) throw new Error(`Verzeichnis unvollstaendig: ${r.indexCount} statt 400`);
  return { index: r.indexCount, pages: r.pages.length, panelFit: r.panelFit, verkleinert: window.__stress2 };
});
console.log(res);
const pages = await page.evaluate(() => window.__stress);
pages.forEach((u, i) => fs.writeFileSync(`${out}-${i + 1}.png`, Buffer.from(u.split(",")[1], "base64")));
await browser.close();
