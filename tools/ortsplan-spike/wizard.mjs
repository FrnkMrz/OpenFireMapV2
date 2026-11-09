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
// Lage der Legende gehoert zu Schritt 1: dorthin, waehlen, zurueck zu Schritt 2
const side = async (v) => { await page.click('.st[data-s="0"]'); await page.click(`#g-side button[data-v="${v}"]`); await page.click('.st[data-s="2"]'); };
// Inhalt (Schritt 2) kurz oeffnen, etwas einstellen und zurueck zum Anordnen (Schritt 3)
const inContent = async (fn) => { await page.click('.st[data-s="1"]'); await fn(); await page.click('.st[data-s="2"]'); };
const st = () => page.evaluate(() => window.__wizard.state());
const box = () => page.evaluate(() => window.__wizard.frameBox());
const center = async (sel) => { const r = await page.locator(sel).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };

try {
  // ---- Freier Rahmen: Kanten einzeln ziehen, das Seitenverhaeltnis folgt ----
  await page.goto(`${BASE}/pick.html?paper=a3l&scale=5000&side=right&fmt=1.5000:1`);
  await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
  await page.waitForTimeout(1500);
  const f0 = await box(), t0 = await st();
  check(t0.free === true && Math.abs(f0.w / f0.h - 1.5) < 0.01, `Freier Rahmen aus der Adresse (fmt=1.5:1): ${(f0.w / f0.h).toFixed(3)}`);
  check(await page.isVisible('.handle[data-c="e"]'), "Freier Rahmen: Kantengriffe sichtbar");
  const he = await center('.handle[data-c="e"]');
  await page.mouse.move(he.x, he.y); await page.mouse.down(); await page.mouse.move(he.x + 150, he.y, { steps: 8 }); await page.mouse.up();
  const f1 = await box(), t1 = await st();
  check(f1.w / f1.h > 1.7 && Math.abs(f1.h - f0.h) < 4, `Rechte Kante: breiter (${(f1.w / f1.h).toFixed(2)}), Hoehe bleibt (${Math.round(f0.h)} -> ${Math.round(f1.h)})`);
  check(Math.abs(f1.cx - f1.w / 2 - (f0.cx - f0.w / 2)) < 2, "Linke Kante bleibt stehen");
  check(Math.abs(t1.ratio - f1.w / f1.h) < 0.01, `Seitenverhaeltnis im Zustand: ${t1.ratio.toFixed(3)}`);
  const hs = await center('.handle[data-c="s"]');
  await page.mouse.move(hs.x, hs.y); await page.mouse.down(); await page.mouse.move(hs.x, hs.y - 120, { steps: 8 }); await page.mouse.up();
  const f2 = await box();
  check(f2.h < f1.h - 80 && Math.abs(f2.w - f1.w) < 4, `Untere Kante: niedriger (${Math.round(f1.h)} -> ${Math.round(f2.h)}), Breite bleibt`);
  const hc = await center('.handle[data-c="nw"]');
  await page.mouse.move(hc.x, hc.y); await page.mouse.down(); await page.mouse.move(hc.x + 60, hc.y - 40, { steps: 6 }); await page.mouse.up();
  const f3 = await box();
  check(Math.abs(f3.cx + f3.w / 2 - (f2.cx + f2.w / 2)) < 2 && Math.abs(f3.cy + f3.h / 2 - (f2.cy + f2.h / 2)) < 2, "Freie Ecke: Gegenecke unten rechts bleibt stehen");
  // Papier wechseln: der Ausschnitt in Metern bleibt, der Massstab folgt
  const g0 = (await box()); const ground0 = g0.w * g0.mpp, sc0 = (await st()).scale;
  await page.click('#g-size button[data-v="a4"]');
  const g1 = await box(), sc1 = (await st()).scale;
  check(Math.abs(g1.w * g1.mpp - ground0) / ground0 < 0.01 && sc1 > sc0, `Papier A4: Ausschnitt bleibt (${Math.round(ground0)} m), Massstab ${sc0} -> ${sc1}`);
  const fl = new URLSearchParams((await page.evaluate(() => window.__wizard.goLink())).split("?")[1]);
  check(/^\d\.\d+:1$/.test(fl.get("fmt")), `Link traegt das freie Format: ${fl.get("fmt")}`);
  await page.screenshot({ path: `${OUT}/0-frei.png` });
  // Runden auf Standardmassstab: rastet beim Loslassen ein
  await page.click('.st[data-s="0"]');
  await page.check("#c-round");
  check([1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000].includes((await st()).scale), `Runden: Massstab ${(await st()).scale} ist ein Standardmassstab`);
  const hr = await center('.handle[data-c="e"]');
  await page.mouse.move(hr.x, hr.y); await page.mouse.down(); await page.mouse.move(hr.x - 70, hr.y, { steps: 6 }); await page.mouse.up();
  check([1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000].includes((await st()).scale), `Nach dem Ziehen eingerastet: 1:${(await st()).scale}`);
  await page.evaluate(() => localStorage.clear());

  // Listenwert 1:1 (z. B. Rueckweg von einem quadratischen Blatt) ist ein fester Rahmen, kein freier mit Verhaeltnis 1
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/pick.html?paper=a3l&scale=5000&side=right&fmt=1:1`);
  await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
  const sq = await st();
  check(sq.free === false && sq.fmt === "1:1", `fmt=1:1 aus der Adresse: fester Rahmen (free=${sq.free}, fmt=${sq.fmt})`);
  const bq = await box();
  check(Math.abs(bq.w / bq.h - 1) < 0.01, "Rahmen ist quadratisch");
  await page.evaluate(() => localStorage.clear());

  // Kleinster Massstab 1:1000: eine Adresse mit scale=100 und ein stark zusammengezogener Rahmen bleiben darueber (Massstabsleiste des Blatts)
  await page.goto(`${BASE}/pick.html?paper=a4l&side=left&fmt=1.5000:1&scale=100`);
  await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
  check((await st()).scale >= 1000, `scale=100 aus der Adresse wird auf ${(await st()).scale} angehoben`);
  const hs2 = await center('.handle[data-c="se"]'); const hn2 = await center('.handle[data-c="nw"]');
  await page.mouse.move(hs2.x, hs2.y); await page.mouse.down(); await page.mouse.move(hn2.x + 6, hn2.y + 4, { steps: 8 }); await page.mouse.up();
  check((await st()).scale >= 1000, `Rahmen stark zusammengezogen: Massstab ${(await st()).scale} bleibt >= 1000`);
  await page.evaluate(() => localStorage.clear());

  // ---- Fester Rahmen (Seitenverhaeltnis des Blatts) ----
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

  // Tastatur (erst warten, bis die Karte nach dem Schieben ausgelaufen ist, sonst verschiebt ihr Nachlauf den Rahmen mit)
  await page.waitForTimeout(1500);
  await page.focus("#frame");
  const bk = await box();
  await page.keyboard.press("ArrowRight");
  check(Math.abs((await box()).cx - bk.cx - 20) < 2, "Pfeiltaste rechts verschiebt den Rahmen um 20 px");
  const sk = await st();
  await page.keyboard.press("+");
  check((await st()).scale > sk.scale, "Taste + macht den Rahmen groesser");

  // Papier und Ausrichtung gehoeren zu Schritt 1; bei Hoch steht die Legende standardmaessig unten (sonst wird das Kartenfenster schmal)
  await page.click('#g-size button[data-v="a2"]');
  await page.click('#g-orient button[data-v="p"]');
  check((await st()).size === "a2" && (await st()).orient === "p", "Schritt 1: A2 hoch gewaehlt");
  check((await st()).side === "bottom", `Hoch: Legende unten (${(await st()).side})`);
  await page.click('#g-orient button[data-v="l"]');
  check((await st()).side === "left", `Quer: Legende wieder links (${(await st()).side})`);
  await page.click('#g-orient button[data-v="p"]');
  const fillLabel = await page.evaluate(() => document.querySelector("#fmt option[value=fill]").textContent);
  check(/Verh.ltnis \d,\d\d\)/.test(fillLabel), `Papier fuellen nennt das Verhaeltnis: ${fillLabel}`);
  await page.screenshot({ path: `${OUT}/2-format.png` });
  check(await page.isVisible("#g-side") && !(await page.isVisible("#o-place")), "Schritt 1 enthaelt die Lage der Legende, die Texte erst Schritt 2");
  await side("top");

  // Schritt 2 (Inhalt)
  await page.click('.st[data-s="1"]');
  await page.uncheck("#c-sym");
  await page.uncheck("#c-index");
  check(await page.isVisible("#o-place") && await page.isVisible("#c-sym") && !(await page.isVisible("#stage")), "Schritt 2: Texte und Inhalt, noch ohne grosse Vorschau");
  await page.click('.st[data-s="2"]');
  await page.screenshot({ path: `${OUT}/3-legende.png` });
  const link = await page.evaluate(() => window.__wizard.goLink());
  const sp = new URLSearchParams(link.split("?")[1]);
  check(sp.get("side") === "top" && sp.get("lsym") === "0" && sp.get("index") === "0" && sp.get("lroad") === "1" && sp.get("paper") === "a2p", `Link traegt die Wahl: ${link}`);
  check(await page.isVisible("#go") && !(await page.isVisible("#next")), "Schritt 3: Knopf 'Ortsplan erstellen' statt 'Weiter'");
  // Die Vorschau nutzt den ganzen Platz neben dem Menue und passt sich der Fenstergroesse an (Papierverhaeltnis bleibt)
  {
    const geo = () => page.evaluate(() => { const s = document.getElementById("stage").getBoundingClientRect(), p = document.getElementById("prev").getBoundingClientRect(); return { sw: s.width, sh: s.height, pw: p.width, ph: p.height, ratio: p.width / p.height }; });
    const g1 = await geo();
    check(g1.pw > 450 && g1.pw <= g1.sw - 27 && g1.ph <= g1.sh - 27 && (Math.abs(g1.pw - (g1.sw - 28)) < 3 || Math.abs(g1.ph - (g1.sh - 28)) < 3), `Schritt 3: die Vorschau fuellt die Buehne (${Math.round(g1.pw)}x${Math.round(g1.ph)} px von ${Math.round(g1.sw)}x${Math.round(g1.sh)})`);
    check(Math.abs(g1.ratio - 420 / 594) < 0.01, `Papierverhaeltnis A2 hoch bleibt (${g1.ratio.toFixed(3)})`);
    await page.screenshot({ path: `${OUT}/3-anordnen.png` });
    await page.setViewportSize({ width: 1000, height: 640 });
    await page.waitForTimeout(300);
    const g2 = await geo();
    check(g2.pw < g1.pw && g2.pw <= g2.sw - 27 && g2.ph <= g2.sh - 27, `kleineres Fenster: die Vorschau passt sich an (${Math.round(g1.pw)} -> ${Math.round(g2.pw)} px)`);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(300);
  }

  // Freie Anordnung: "Auf der Karte" setzt Positionen, ein Kasten laesst sich ziehen, eine andere Lage setzt zurueck
  await side("none");
  const posOf = async () => new URLSearchParams((await page.evaluate(() => window.__wizard.goLink())).split("?")[1]).get("pos");
  check(await page.isChecked("#c-manual") && await page.isDisabled("#c-manual"), "Auf der Karte: Bloecke frei, Schalter fest an");
  const pos0 = await posOf();
  check(/^l:[\d.]+,[\d.]+;s:/.test(pos0 || ""), `Link traegt Positionen: ${pos0}`);
  check(/;n:[\d.]+,[\d.]+/.test(pos0 || "") && await page.isVisible("#pv-b-north") && await page.isVisible("#pv-b-scale"), "Nordpfeil und Massstab sind getrennte Kaesten");
  await inContent(() => page.check("#c-sym")); // Legende wieder an, sonst gibt es keinen Kasten
  const lb = await page.locator("#pv-b-scale").boundingBox();
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await page.mouse.down();
  await page.mouse.move(lb.x - 60, lb.y + 30, { steps: 6 });
  await page.mouse.up();
  const pos1 = await posOf();
  check(pos1 !== pos0 && pos1.split(";")[1] !== pos0.split(";")[1] && pos1.split(";")[0] === pos0.split(";")[0], `Maßstab-Kasten gezogen: ${pos1}`);
  await page.focus("#pv-b-source");
  const q0 = (await posOf()).split(";")[2];
  await page.keyboard.press("ArrowLeft");
  check((await posOf()).split(";")[2] !== q0, "Pfeiltaste verschiebt den Quellen-Kasten");
  // Titel und Karte: eigene Kaesten, Titel startet links oben, die Karte bleibt auf dem Blatt und rastet am Rand ein
  {
    const W = 420, H = 594, ui = 594 / 420; // A2 hoch (siehe oben)
    const mOf = async () => { const m = /;m:([\d.]+),([\d.]+)/.exec(await posOf()); return m ? { x: +m[1] * W, y: +m[2] * H } : null; };
    const tOf = async () => { const m = /;t:([\d.]+),([\d.]+)/.exec(await posOf()); return m ? { x: +m[1] * W, y: +m[2] * H } : null; };
    const inside = (sel) => page.evaluate((q) => { const a = document.querySelector(q).getBoundingClientRect(), b = document.getElementById("prev").getBoundingClientRect(); return a.left >= b.left - 1 && a.top >= b.top - 1 && a.right <= b.right + 1 && a.bottom <= b.bottom + 1; }, sel);
    await page.locator("#prev").scrollIntoViewIfNeeded();
    const t0 = await tOf(), m0 = await mOf();
    check(!!t0 && !!m0, `Link traegt Titel und Karte: t=${t0 && t0.x.toFixed(1)},${t0 && t0.y.toFixed(1)} m=${m0 && m0.x.toFixed(1)},${m0 && m0.y.toFixed(1)}`);
    check(t0 && Math.abs(t0.x - 14 * ui) < 0.1 && Math.abs(t0.y - 3.4 * ui) < 0.1, "Titel startet links oben (Randabstand 14, Oberkante 3,4)");
    check(await page.evaluate(() => document.getElementById("pv-title").classList.contains("mv") && document.getElementById("pv-map").classList.contains("mv")), "Titel und Karte sind bei freier Anordnung verschiebbar");
    // Karte mit der Tastatur: nie ueber das Blatt hinaus, nie naeher als der Mindestrand
    await page.focus("#pv-map");
    await page.keyboard.press("ArrowUp", { delay: 0 });
    for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowUp");
    const mTop = await mOf();
    check(Math.abs(mTop.y - 6 * ui) < 0.1 && await inside("#pv-map"), `Karte ganz nach oben: bleibt auf dem Blatt, Mindestrand 6 (${mTop.y.toFixed(1)} mm)`);
    for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowDown");
    check(await inside("#pv-map"), "Karte ganz nach unten: bleibt auf dem Blatt");
    // Magnet: von oben (Mindestrand) mit der Maus fast bis zum normalen Randabstand ziehen -> rastet genau ein
    for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowUp");
    const pr = await page.locator("#prev").boundingBox();
    const dy = (27 * ui - 6 * ui) * (pr.height / H) - 1.2; // knapp vor dem normalen oberen Abstand
    // Greifpunkt: ein Punkt, an dem wirklich die Karte oben liegt (Kaesten liegen teils darueber)
    const grab = await page.evaluate(() => {
      const r = document.getElementById("pv-map").getBoundingClientRect();
      for (let fy = 0.5; fy <= 0.95; fy += 0.05) for (let fx = 0.1; fx <= 0.9; fx += 0.1) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        if (document.elementFromPoint(x, y)?.closest("#pv-map")) return { x, y };
      }
      return null;
    });
    check(!!grab, "freier Greifpunkt auf der Karte gefunden");
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    await page.mouse.move(grab.x, grab.y + dy, { steps: 8 });
    await page.mouse.up();
    const mSnap = await mOf();
    check(Math.abs(mSnap.y - 27 * ui) < 0.1, `Karte rastet am normalen oberen Randabstand ein (${mSnap.y.toFixed(2)} mm, Ziel ${(27 * ui).toFixed(2)})`);
    // Titel mit der Maus weit nach unten rechts: bleibt ganz auf dem Blatt
    const tb = await page.locator("#pv-title").boundingBox();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
    check(await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest("#pv-title"), [tb.x + tb.width / 2, tb.y + tb.height / 2]), "Titel-Greifpunkt liegt auf dem Titel");
    await page.mouse.down();
    await page.mouse.move(pr.x + pr.width + 200, pr.y + pr.height + 200, { steps: 8 });
    await page.mouse.up();
    check(await inside("#pv-title"), "Titel weit ueber den Rand gezogen: bleibt ganz auf dem Blatt");
    // Kartengroesse: an der Ecke unten rechts ziehen -> kleiner, Massstab bleibt, das Fenster zeigt weniger Gebiet; nie groesser als das volle Fenster
    {
      const sizeInfo = async () => { const m = /Kartenfenster (\d+) × (\d+) mm/.exec(await page.textContent("#size-info")); return m ? { w: +m[1], h: +m[2] } : null; };
      const rectOf = (q) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, q);
      const full = await sizeInfo(), m0 = await rectOf("#pv-map"), sc0 = (await st()).scale;
      const rz = await page.locator("#pv-map-rz").boundingBox();
      await page.mouse.move(rz.x + rz.width / 2, rz.y + rz.height / 2); await page.mouse.down();
      await page.mouse.move(rz.x + rz.width / 2 - 70, rz.y + rz.height / 2 - 50, { steps: 8 }); await page.mouse.up();
      await page.waitForTimeout(300);
      const m1 = await rectOf("#pv-map"), z = /;z:([\d.]+),([\d.]+)/.exec((await posOf()) || ""), small = await sizeInfo();
      check(m1.w < m0.w - 20 && m1.h < m0.h - 20 && Math.abs(m1.x - m0.x) < 2 && Math.abs(m1.y - m0.y) < 2, `Karte an der Ecke kleiner gezogen (${Math.round(m0.w)}x${Math.round(m0.h)} -> ${Math.round(m1.w)}x${Math.round(m1.h)} px), linke obere Ecke bleibt`);
      check(!!z && +z[1] < 0.95 && +z[2] < 0.95, `Link traegt die Kartengroesse: ${z && z[0]}`);
      check(small && full && small.w < full.w && small.h < full.h && (await st()).scale === sc0, `Fenster ${full.w}x${full.h} -> ${small && small.w}x${small && small.h} mm, Massstab bleibt 1:${sc0}`);
      await page.mouse.move(rz.x - 70 + rz.width / 2, rz.y - 50 + rz.height / 2);
      const rz1 = await page.locator("#pv-map-rz").boundingBox();
      await page.mouse.move(rz1.x + rz1.width / 2, rz1.y + rz1.height / 2); await page.mouse.down();
      await page.mouse.move(rz1.x + 900, rz1.y + 900, { steps: 8 }); await page.mouse.up();
      await page.waitForTimeout(300);
      const big = await sizeInfo();
      // freie Anordnung: hoechstens das Papier abzueglich Mindestrand (A2 hoch: 420 x 594 mm, ui 1,414, Rand 2 x 6 ui)
      check(big && big.w <= 420 - 12 * 594 / 420 + 1 && big.h <= 594 - 12 * 594 / 420 + 1 && big.w >= small.w && await inside("#pv-map"), `weit aufgezogen: hoechstens das Papier abzueglich Rand (${big && big.w}x${big && big.h} mm), bleibt auf dem Blatt`);
      // klein ziehen, nach unten rechts schieben, dann aufziehen: die linke obere Ecke bleibt stehen (die Lage wird nicht nachgeschoben)
      const rz2 = await page.locator("#pv-map-rz").boundingBox();
      await page.mouse.move(rz2.x + rz2.width / 2, rz2.y + rz2.height / 2); await page.mouse.down();
      await page.mouse.move(rz2.x - 160, rz2.y - 130, { steps: 8 }); await page.mouse.up();
      await page.focus("#pv-map");
      for (let i = 0; i < 70; i++) await page.keyboard.press("ArrowRight");
      for (let i = 0; i < 70; i++) await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(300);
      const m2 = await rectOf("#pv-map"), rz3 = await page.locator("#pv-map-rz").boundingBox();
      await page.mouse.move(rz3.x + rz3.width / 2, rz3.y + rz3.height / 2); await page.mouse.down();
      await page.mouse.move(rz3.x + 140, rz3.y + 110, { steps: 8 }); await page.mouse.up();
      await page.waitForTimeout(300);
      const m3 = await rectOf("#pv-map");
      check(Math.abs(m3.x - m2.x) < 2 && Math.abs(m3.y - m2.y) < 2 && await inside("#pv-map"), `unten rechts aufziehen: linke obere Ecke bleibt (${Math.round(m2.x)},${Math.round(m2.y)} -> ${Math.round(m3.x)},${Math.round(m3.y)}), Karte bleibt auf dem Blatt`);
    }
  }
  await side("top");
  check(!(await posOf()) && !(await page.isChecked("#c-manual")), "andere Lage: wieder automatisch, keine Positionen");
  // Feste Leiste: Titel und Karte lassen sich trotzdem verschieben, die Leiste folgt der Karte; in der Adresse stehen nur t und m
  {
    await side("right");
    await page.click('.st[data-s="0"]');
    await page.click('#g-free button[data-v="0"]');
    await page.selectOption("#fmt", "1:1");
    await page.click('.st[data-s="2"]');
    await page.locator("#prev").scrollIntoViewIfNeeded();
    check(!(await posOf()), "feste Leiste ohne eigene Verschiebung: keine Positionen in der Adresse");
    check(await page.evaluate(() => document.getElementById("pv-map").classList.contains("mv") && document.getElementById("pv-title").classList.contains("mv")), "feste Leiste: Titel und Karte sind verschiebbar");
    const rectOf = (sel) => page.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);
    const prev = await rectOf("#prev"), map0 = await rectOf("#pv-map"), pan0 = await rectOf("#pv-panel");
    const grabOn = (sel) => page.evaluate((q) => {
      const r = document.querySelector(q).getBoundingClientRect();
      for (let fy = 0.5; fy <= 0.95; fy += 0.05) for (let fx = 0.1; fx <= 0.9; fx += 0.1) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        if (document.elementFromPoint(x, y)?.closest(q)) return { x, y };
      }
      return null;
    }, sel);
    const g = await grabOn("#pv-map");
    check(!!g, "feste Leiste: Greifpunkt auf der Karte gefunden");
    {
      const rz = await page.locator("#pv-map-rz").boundingBox();
      await page.mouse.move(rz.x + rz.width / 2, rz.y + rz.height / 2); await page.mouse.down();
      await page.mouse.move(rz.x + rz.width / 2 - 40, rz.y + rz.height / 2 - 10, { steps: 6 }); await page.mouse.up();
      await page.waitForTimeout(300);
      const mr = await rectOf("#pv-map");
      check(mr.w < map0.w - 10 && Math.abs(mr.w - mr.h) < 2, `fester Kartenformat 1:1: Ecke ziehen aendert die Groesse, das Verhaeltnis bleibt (${Math.round(mr.w)} x ${Math.round(mr.h)} px)`);
      await page.click("#pos-reset");
    }
    await page.mouse.move(g.x, g.y); await page.mouse.down(); await page.mouse.move(g.x + 400, g.y + 12, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(300);
    const map1 = await rectOf("#pv-map"), pan1 = await rectOf("#pv-panel");
    const pos1 = await posOf();
    check(map1.x > map0.x + 2 && Math.abs((pan1.x - pan0.x) - (map1.x - map0.x)) < 1 && Math.abs((pan1.y - pan0.y) - (map1.y - map0.y)) < 1, `Leiste folgt der Karte: Karte +${(map1.x - map0.x).toFixed(1)} px, Leiste +${(pan1.x - pan0.x).toFixed(1)} px`);
    check(pan1.x + pan1.w <= prev.x + prev.w + 1 && map1.y + map1.h <= prev.y + prev.h + 1, "Karte und Leiste bleiben ganz auf dem Blatt (weit nach rechts gezogen)");
    check(/^t:[\d.]+,[\d.]+;m:[\d.]+,[\d.]+$/.test(pos1 || ""), `Adresse traegt nur Titel und Karte: ${pos1}`);
    check(await page.isVisible("#pos-reset"), "Zuruecksetzen ist sichtbar, sobald etwas verschoben ist");
    const gt = await grabOn("#pv-title");
    await page.mouse.move(gt.x, gt.y); await page.mouse.down(); await page.mouse.move(gt.x + 60, gt.y + 20, { steps: 6 }); await page.mouse.up();
    const t1 = /t:([\d.]+),([\d.]+)/.exec((await posOf()) || "");
    check(!!t1 && (+t1[1] > 0.06 || +t1[2] > 0.03), `Titel bei fester Leiste verschoben: ${t1 && t1[0]}`);
    await page.click("#pos-reset");
    check(!(await posOf()), "Zuruecksetzen: wieder keine Positionen, Karte und Leiste an der Standardlage");
    await side("top");
    await page.click('.st[data-s="0"]'); await page.click('#g-free button[data-v="1"]'); await page.click('.st[data-s="2"]');
  }
  // Bloecke nicht auf der Karte (Standard): der Kasten laesst sich nicht ueber das Kartenfenster ziehen; erlaubt man es, geht es
  await side("right");
  await page.check("#c-manual");
  check(!(await page.isChecked("#c-onmap")), "Bloecke auf der Karte sind standardmaessig nicht erlaubt");
  const overlaps = () => page.evaluate(() => { const a = document.getElementById("pv-b-legend").getBoundingClientRect(), b = document.getElementById("pv-map").getBoundingClientRect(); return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1; });
  const dragLegendOverMap = async () => {
    await page.locator("#prev").scrollIntoViewIfNeeded(); // sonst liegt die Vorschau unter dem sichtbaren Bereich und der Zug ginge ins Leere
    const m = await page.locator("#pv-map").boundingBox();
    // Greifpunkt: ein Punkt, an dem wirklich die Legende oben liegt (andere Kaesten duerfen sie teilweise ueberdecken)
    const grab = await page.evaluate(() => {
      const r = document.getElementById("pv-b-legend").getBoundingClientRect();
      for (let fy = 0.5; fy <= 0.95; fy += 0.05) for (let fx = 0.1; fx <= 0.9; fx += 0.1) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        if (document.elementFromPoint(x, y)?.closest("#pv-b-legend")) return { x, y };
      }
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300); // die Vorschau zeichnet nach dem Loslassen verzoegert neu
  };
  await dragLegendOverMap();
  check(!(await overlaps()), "Legende bleibt neben dem Kartenfenster, wenn Bloecke nicht auf die Karte duerfen");
  await page.check("#c-onmap");
  await page.click('#g-obg button[data-v="clear"]');
  await dragLegendOverMap();
  check(await overlaps(), "mit Erlaubnis liegt die Legende auf der Karte");
  const sp2 = new URLSearchParams((await page.evaluate(() => window.__wizard.goLink())).split("?")[1]);
  check(sp2.get("onmap") === "1" && sp2.get("obg") === "clear", "Link traegt Erlaubnis und durchsichtigen Untergrund");
  await page.uncheck("#c-onmap");
  check(!(await overlaps()), "Erlaubnis zurueckgenommen: Legende wieder in der Standardlage");
  await side("top");
  await inContent(() => page.uncheck("#c-sym"));

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
  // Standardlage "Auf der Karte": auch das Verzeichnis (ausserhalb der Karte) laesst sich verschieben, Groesse aendern und bleibt gueltig
  {
    await page.goto(`${BASE}/pick.html?paper=a3l&scale=5000&side=none&index=1&lsym=1&lroad=1`);
    await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
    await page.click('.st[data-s="2"]'); await page.waitForTimeout(400);
    const iOf = async () => { const p = new URLSearchParams((await page.evaluate(() => window.__wizard.goLink())).split("?")[1]).get("pos") || ""; const m = /(?:^|;)i:([^;]*)/.exec(p); return m ? m[1].split(",").map(Number) : null; };
    const i0 = await iOf();
    check(!!i0 && i0.length === 4 && i0.every(Number.isFinite), `Verzeichnis in der Adresse: ${i0}`);
    const bb = await page.locator("#pv-b-index").boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2 - 140, bb.y + bb.height / 2 + 30, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
    const i1 = await iOf();
    check(!!i1 && i1.every(Number.isFinite) && Math.abs(i1[0] - i0[0]) > 0.02 && Math.abs(i1[2] - i0[2]) < 1e-6 && Math.abs(i1[3] - i0[3]) < 1e-6, `Verzeichnis mit der Maus verschoben, Groesse bleibt: ${i0} -> ${i1}`);
    const rz = await page.locator("#pv-b-index .rz").boundingBox();
    await page.mouse.move(rz.x + rz.width / 2, rz.y + rz.height / 2); await page.mouse.down(); await page.mouse.move(rz.x - 30, rz.y - 40, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(300);
    const i2 = await iOf();
    check(!!i2 && i2.every(Number.isFinite) && i2[2] < i1[2] - 0.001, `Verzeichnis an der Ecke kleiner gezogen: Breite ${i1 && i1[2]} -> ${i2 && i2[2]}`);
    await page.focus("#pv-b-index"); await page.keyboard.press("ArrowRight");
    const i3 = await iOf();
    check(!!i3 && i3.every(Number.isFinite) && i3[0] > i2[0], "Verzeichnis mit der Pfeiltaste verschoben");
  }

  // Am Kartenrand verankerte Bloecke (r/b) folgen dem Kartenfenster, auch wenn die Karte kleiner gezogen wird (Vorschau = Blatt)
  {
    await page.goto(`${BASE}/pick.html?paper=a3l&scale=5000&side=none&index=1&lsym=1&lroad=1&pos=s:0.4,0.3,b`);
    await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
    await page.click('.st[data-s="2"]'); await page.waitForTimeout(400);
    const sy = async () => { const p = new URLSearchParams((await page.evaluate(() => window.__wizard.goLink())).split("?")[1]).get("pos") || ""; const m = /(?:^|;)s:([\d.]+),([\d.]+)/.exec(p); return m ? +m[2] : null; };
    const y0 = await sy();
    check(y0 !== null && y0 > 0.6, `Massstab mit Anker unten sitzt am unteren Kartenrand, nicht bei der gespeicherten Lage 0,3 (${y0})`);
    await page.evaluate(() => document.getElementById("prev").scrollIntoView({ block: "center" }));
    const rz = await page.locator("#pv-map-rz").boundingBox();
    await page.mouse.move(rz.x + rz.width / 2, rz.y + rz.height / 2); await page.mouse.down(); await page.mouse.move(rz.x - 60, rz.y - 110, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
    const y1 = await sy();
    check(y1 !== null && y1 < y0 - 0.05, `Karte kleiner gezogen: der verankerte Massstab folgt dem unteren Kartenrand (${y0} -> ${y1})`);
  }

  // Abstand der Bloecke zum Kartenrand: Standard 4 mm, einstellbar, steht im Link (mi); der Wert bleibt beim Neuladen
  {
    await page.goto(`${BASE}/pick.html?paper=a3l&side=none&scale=5000`);
    await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
    await page.click('.st[data-s="2"]');
    const miOf = async () => new URLSearchParams((await page.evaluate(() => window.__wizard.goLink())).split("?")[1]).get("mi");
    check((await miOf()) === "4" && (await page.inputValue("#o-inset")) === "4", `Abstand zum Kartenrand: Standard 4 mm im Feld und im Link (${await miOf()})`);
    await page.fill("#o-inset", "7"); await page.dispatchEvent("#o-inset", "change");
    check((await miOf()) === "7", `Abstand 7 mm steht im Link (${await miOf()})`);
    await page.goto(`${BASE}/pick.html?paper=a3l&side=none&scale=5000&mi=2.5`);
    await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
    check((await page.evaluate(() => window.__wizard.state().inset)) === 2.5, "Abstand aus der Adresse (mi=2.5)");
  }

  // Adresse mit nur Titel und Karte (feste Leiste): beim Wiedereroeffnen bleibt die Leiste fest, die Adresse traegt weiter nur t und m
  await page.evaluate(() => { const k = "ofm_ortsplan_wizard"; const v = JSON.parse(localStorage.getItem(k) || "{}"); v.manual = true; localStorage.setItem(k, JSON.stringify(v)); }); // zuletzt benutzt: freie Bloecke
  await page.goto(`${BASE}/pick.html?paper=a3l&side=right&fmt=1:1&scale=5000&pos=t:0.1,0.02;m:0.12,0.2`);
  await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
  const sT = await st();
  const pT = new URLSearchParams((await page.evaluate(() => window.__wizard.goLink())).split("?")[1]).get("pos");
  check(sT.manual === false && sT.side === "right", `t/m-Adresse: feste Leiste bleibt (manual=${sT.manual}, side=${sT.side})`);
  check(/^t:[\d.]+,[\d.]+;m:[\d.]+,[\d.]+$/.test(pT || ""), `t/m-Adresse: Link traegt weiter nur Titel und Karte: ${pT}`);

  // Karte groesser machen: der Griff liegt ueber allen Kaesten (auch ueber dem Verzeichnis am Kartenrand); bei freier Anordnung waechst die Karte
  // ueber das Fenster der Lage hinaus bis zum Papier, bei fester Leiste nur bis zu diesem Fenster
  {
    const rectOf = (q) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, q);
    const handleFree = () => page.evaluate(() => { const r = document.getElementById("pv-map-rz").getBoundingClientRect(); return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("#pv-map-rz"); });
    const growBy = async (dx, dy) => { await page.evaluate(() => document.getElementById("prev").scrollIntoView({ block: "center" })); /* sonst liegt die Statusleiste unten ueber dem Griff */ const z = await page.locator("#pv-map-rz").boundingBox(); await page.mouse.move(z.x + z.width / 2, z.y + z.height / 2); await page.mouse.down(); await page.mouse.move(z.x + z.width / 2 + dx, z.y + z.height / 2 + dy, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300); };
    await page.goto(`${BASE}/pick.html?paper=a3l&side=none&scale=5000`);
    await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
    await page.click('.st[data-s="2"]'); await page.locator("#prev").scrollIntoViewIfNeeded();
    check(await handleFree(), "Ohne Leiste: der Griff zum Groessemachen liegt ueber dem Verzeichnis und ist erreichbar");
    await page.goto(`${BASE}/pick.html?paper=a3l&side=right&scale=5000&fmt=fill`);
    await waitReady(page, { key: "__pickReady", timeout: 60000, failure: () => failure });
    await page.click('.st[data-s="2"]'); await page.locator("#prev").scrollIntoViewIfNeeded();
    const f0 = await rectOf("#pv-map");
    await growBy(400, 300);
    const f1 = await rectOf("#pv-map");
    check(Math.abs(f1.w - f0.w) < 2 && Math.abs(f1.h - f0.h) < 2, `feste Leiste: nicht groesser als das Fenster der Lage (${Math.round(f0.w)}x${Math.round(f0.h)} -> ${Math.round(f1.w)}x${Math.round(f1.h)} px)`);
    await page.check("#c-manual");
    await page.locator("#prev").scrollIntoViewIfNeeded();
    const h0 = await rectOf("#pv-map");
    await growBy(400, 300);
    const h1 = await rectOf("#pv-map");
    const blk = await rectOf("#pv-b-legend");
    check(h1.x + h1.w <= blk.x + 2, `Bloecke im Weg und nicht auf der Karte erlaubt: die Karte waechst nicht ueber sie hinweg (rechte Kante ${Math.round(h1.x + h1.w)} <= Legende ${Math.round(blk.x)} px)`);
    await page.check("#c-onmap");
    await page.locator("#prev").scrollIntoViewIfNeeded();
    const rel = async () => { const m = await rectOf("#pv-map"), p = await rectOf("#prev"); return { x: m.x - p.x, y: m.y - p.y, w: m.w, h: m.h, pw: p.w, ph: p.h }; }; // relativ zum Blatt (die Seite scrollt beim Ziehen)
    const g0 = await rel();
    await growBy(400, 300);
    const g1 = await rel();
    check(g1.w > g0.w + 15 && Math.abs(g1.x - g0.x) < 2 && Math.abs(g1.y - g0.y) < 2 && g1.x + g1.w <= g1.pw + 1 && g1.y + g1.h <= g1.ph + 1, `freie Anordnung: Karte waechst ueber das Fenster der Lage hinaus (${Math.round(g0.w)} -> ${Math.round(g1.w)} px), Ecke bleibt, Karte bleibt auf dem Blatt`);
    const zz = /;z:([\d.]+),([\d.]+)/.exec(new URLSearchParams((await page.evaluate(() => window.__wizard.goLink())).split("?")[1]).get("pos") || "");
    check(!!zz && +zz[1] > 0.9, `Link traegt die grosse Kartengroesse: ${zz && zz[0]}`);
  }
} catch (e) {
  failed++;
  console.log("FEHLER ", String(e.message).slice(0, 300));
}
await browser.close();
if (failed) { console.log(`${failed} Pruefung(en) fehlgeschlagen`); process.exit(1); }
console.log("alles ok");
