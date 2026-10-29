// Bedienprobe des Assistenten im echten Browser: Rahmen verschieben, Ecke ziehen, Karte schieben, drei Schritte, Blatt erzeugen.
// Aufruf: SPIKE_URL=http://127.0.0.1:5173 node wizard.mjs [ausgabeordner]   (Bilder je Schritt; Ende mit Exit-Code 1 bei Fehler)
import { chromium } from "playwright-core";
import fs from "node:fs";
import { waitReady } from "./testutil.mjs";

const BASE = process.env.SPIKE_URL || "http://127.0.0.1:5173";
const OUT = process.argv[2] || "shots/wizard";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
let failure = null;
page.on("pageerror", (e) => { failure = e.message; });
let failed = 0;
const check = (ok, msg) => { console.log(ok ? "ok     " : "FEHLER ", msg); if (!ok) failed++; };
const st = () => page.evaluate(() => window.__wizard.state());
const box = () => page.evaluate(() => window.__wizard.frameBox());
const center = async (sel) => { const r = await page.locator(sel).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };

try {
  await page.goto(`${BASE}/pick.html?paper=a3l&scale=5000&side=right&fmt=fill`);
  await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/1-ausschnitt.png` });

  // Ecke unten rechts nach aussen ziehen: Rahmen wird groesser, Massstab waechst, die Gegenecke (oben links) bleibt stehen
  const b0 = await box(), s0 = await st();
  const h = await center('.handle[data-c="se"]');
  await page.mouse.move(h.x, h.y); await page.mouse.down(); await page.mouse.move(h.x + 300, h.y + 225, { steps: 8 }); await page.mouse.up();
  const b1 = await box(), s1 = await st();
  check(s1.scale > s0.scale, `Ecke aufziehen: Massstab ${s0.scale} -> ${s1.scale}`);
  check(Math.abs(b1.cx - b1.w / 2 - (b0.cx - b0.w / 2)) < 2 && Math.abs(b1.cy - b1.h / 2 - (b0.cy - b0.h / 2)) < 2, "Gegenecke oben links bleibt stehen");

  // Ecke oben links nach innen ziehen: Rahmen wird kleiner
  const h2 = await center('.handle[data-c="nw"]');
  await page.mouse.move(h2.x, h2.y); await page.mouse.down(); await page.mouse.move(h2.x + 200, h2.y + 150, { steps: 6 }); await page.mouse.up();
  const s2 = await st();
  check(s2.scale < s1.scale, `Ecke zusammenziehen: Massstab ${s1.scale} -> ${s2.scale}`);

  // Leiste ziehen: der Rahmen wandert, die Karte bleibt
  const mapBefore = await page.evaluate(() => window.__pickMap.getCenter().toArray());
  const bg = await box();
  const g = await center("#grip");
  await page.mouse.move(g.x, g.y); await page.mouse.down(); await page.mouse.move(g.x + 80, g.y + 40, { steps: 6 }); await page.mouse.up();
  const bm = await box(), sm = await st();
  check(Math.abs(bm.cx - bg.cx - 80) < 3 && Math.abs(bm.cy - bg.cy - 40) < 3, `Leiste ziehen verschiebt den Rahmen um (80, 40): (${Math.round(bm.cx - bg.cx)}, ${Math.round(bm.cy - bg.cy)})`);
  check(JSON.stringify(mapBefore) === JSON.stringify(await page.evaluate(() => window.__pickMap.getCenter().toArray())), "Karte bleibt beim Verschieben des Rahmens stehen");
  check(sm.center.lng !== s2.center.lng, "Mitte des Rahmens in Grad hat sich geaendert");

  // Karte schieben (ausserhalb des Rahmens): der Rahmen bleibt am Ort (gleiche Grad), wandert aber auf dem Bildschirm
  const fcBefore = (await st()).center, bBefore = await box();
  await page.mouse.move(1000, 800); await page.mouse.down(); await page.mouse.move(930, 760, { steps: 6 }); await page.mouse.up();
  const fcAfter = (await st()).center, bAfter = await box();
  check(fcBefore.lng === fcAfter.lng && fcBefore.lat === fcAfter.lat, "Karte schieben: Rahmen bleibt am Ort");
  check(Math.abs(bAfter.cx - bBefore.cx) > 20, "Karte schieben: Rahmen wandert mit der Karte auf dem Bildschirm");

  // Tastatur
  await page.focus("#frame");
  const bk = await box();
  await page.keyboard.press("ArrowRight");
  check(Math.abs((await box()).cx - bk.cx - 20) < 2, "Pfeiltaste rechts verschiebt den Rahmen um 20 px");
  const sk = await st();
  await page.keyboard.press("+");
  check((await st()).scale > sk.scale, "Taste + macht den Rahmen groesser");

  // Schritt 2
  await page.click('.st[data-s="1"]');
  await page.click('#g-size button[data-v="a2"]');
  await page.click('#g-orient button[data-v="p"]');
  check((await st()).size === "a2" && (await st()).orient === "p", "Schritt 2: A2 hoch gewaehlt");
  await page.screenshot({ path: `${OUT}/2-format.png` });

  // Schritt 3
  await page.click('.st[data-s="2"]');
  await page.click('#g-side button[data-v="top"]');
  await page.uncheck("#c-sym");
  await page.uncheck("#c-index");
  await page.screenshot({ path: `${OUT}/3-legende.png` });
  const link = await page.evaluate(() => window.__wizard.goLink());
  const sp = new URLSearchParams(link.split("?")[1]);
  check(sp.get("side") === "top" && sp.get("lsym") === "0" && sp.get("index") === "0" && sp.get("lroad") === "1" && sp.get("paper") === "a2p", `Link traegt die Wahl: ${link}`);
  check(await page.isVisible("#go") && !(await page.isVisible("#next")), "Schritt 3: Knopf 'Ortsplan erstellen' statt 'Weiter'");

  // Einstellungen bleiben beim Neuladen (localStorage)
  await page.goto(`${BASE}/pick.html`); // ohne Adresse: zuletzt benutzte Wahl (eine Adresse mit Angaben haette Vorrang)
  await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
  const sr = await st();
  check(sr.side === "top" && sr.size === "a2" && sr.lsym === false && sr.index === false, "Neuladen: Wahl bleibt erhalten");

  // Blatt erzeugen
  await page.click('.st[data-s="2"]');
  await Promise.all([page.waitForNavigation(), page.click("#go")]);
  await waitReady(page, { key: "__ready", timeout: 120000, failure: () => failure });
  const info = await page.evaluate(() => ({ sheet: !!window.__sheet, info: window.__sheetInfo, err: window.__error || null, link: document.getElementById("pick-link").href }));
  check(info.sheet && !info.err && info.info.index === 0, `Blatt entsteht ohne Verzeichnis: ${JSON.stringify(info.info)}`);
  check(/lsym=0/.test(info.link) && /side=top/.test(info.link), "Rueckweg 'Ausschnitt waehlen' behaelt die Legende-Wahl");
  const png = await page.evaluate(() => window.__sheet[0]);
  fs.writeFileSync(`${OUT}/4-blatt.png`, Buffer.from(png.split(",")[1], "base64"));
} catch (e) {
  failed++;
  console.log("FEHLER ", String(e.message).slice(0, 300));
}
await browser.close();
if (failed) { console.log(`${failed} Pruefung(en) fehlgeschlagen`); process.exit(1); }
console.log("alles ok");
