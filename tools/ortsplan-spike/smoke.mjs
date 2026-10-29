// Rauchtest: laedt die Seiten mit vielen Parameter-Kombinationen und bricht ab, wenn ein Skriptfehler auftritt oder die Seite nicht
// fertig wird. Faengt Startfehler (zum Beispiel "Cannot access ... before initialization"), die die Unit-Tests nicht sehen.
// Aufruf: SPIKE_URL=http://127.0.0.1:5173 node smoke.mjs
import { chromium } from "playwright-core";
import { waitReady } from "./testutil.mjs";

const BASE = process.env.SPIKE_URL || "http://127.0.0.1:5173";
const cases = [
  { path: "/", q: "scale=5000&paper=a4l&dpi=96", ready: "__ready" },
  { path: "/", q: "sheet=1&scale=5000&paper=a3l&dpi=96", ready: "__ready" },
  ...["1:1", "3:2", "4:3", "2:3", "3:4", "fill", "wirr"].map((fmt) => ({ path: "/", q: `sheet=1&scale=5000&paper=a3l&dpi=96&fmt=${fmt}`, ready: "__ready" })),
  ...["right", "left", "top", "bottom"].map((side) => ({ path: "/", q: `sheet=1&scale=5000&paper=a4l&dpi=96&side=${side}&fmt=1:1`, ready: "__ready" })),
  { path: "/", q: "sheet=1&scale=5000&paper=a4p&dpi=96&index=0", ready: "__ready" },
  // Legende ganz abgewaehlt (Assistent, Schritt 3): auf jeder Seite weder Platz noch Ueberschrift dafuer, das Blatt entsteht trotzdem
  ...["right", "left", "top", "bottom"].map((side) => ({ path: "/", q: `sheet=1&scale=5000&paper=a3l&dpi=96&side=${side}&lsym=0&lroad=0`, ready: "__ready" })),
  { path: "/", q: "sheet=1&scale=5000&paper=a4p&dpi=96&side=top&lsym=0&lroad=1&index=1", ready: "__ready" },
  // Das Formular muss jeden Wert behalten, auch Massstaebe, die die Auswahlseite anbietet (7500) oder per Hand in der Adresse stehen (1234):
  // sonst bliebe das Feld leer und "Neu laden" faellt still auf 1:5000 zurueck (Fund aus dem Codex-Review)
  ...["7500", "1500", "20000", "1234"].map((s) => ({ path: "/", q: `sheet=1&scale=${s}&paper=a3l&dpi=96`, ready: "__ready", form: { scale: s } })),
  // "Neu laden" nach Aenderung eines anderen Felds: der Massstab bleibt erhalten (kein stiller Rueckfall auf 1:5000)
  { path: "/", q: "sheet=1&scale=7500&paper=a3l&dpi=96", ready: "__ready", reload: { change: ["side", "left"], keep: { scale: "7500", side: "left" } } },
  { path: "/", q: "scale=5000&paper=a4l&dpi=200&side=top&fmt=3:4", ready: "__ready", form: { scale: "5000", paper: "a4l", dpi: "200", side: "top", fmt: "3:4" } },
  { path: "/pick.html", q: "paper=a3l&side=right&fmt=1:1&scale=5000", ready: "__pickReady" },
  { path: "/", q: "sheet=1&scale=4350&paper=a3l&dpi=96&side=left&fmt=2.1000:1", ready: "__ready" },
  { path: "/", q: "sheet=1&scale=6200&paper=a4p&dpi=96&side=bottom&fmt=0.5000:1", ready: "__ready" },
  { path: "/", q: "sheet=1&scale=1500&paper=a4l&dpi=96&side=left&fmt=4.0000:1", ready: "__ready" },
  { path: "/", q: "sheet=1&scale=1500&paper=a4l&dpi=96&side=right&fmt=4.0000:1", ready: "__ready" },
  { path: "/pick.html", q: "paper=a3l&side=right&fmt=2.1000:1&scale=4350", ready: "__pickReady" },
  { path: "/pick.html", q: "", ready: "__pickReady" },
];

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = 0;
for (const c of cases) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  let failure = null;
  page.on("pageerror", (e) => { failure = e.message; });
  await page.goto(`${BASE}${c.path}?${c.q}`);
  try {
    await waitReady(page, { key: c.ready, timeout: 60000, failure: () => failure });
    const err = await page.evaluate(() => window.__error || null);
    if (err) throw new Error(String(err).split("\n")[0]);
    if (c.reload) {
      await page.selectOption(`#ctl [name=${c.reload.change[0]}]`, c.reload.change[1]);
      await Promise.all([page.waitForNavigation(), page.click("#ctl button[type=submit]")]);
      const sp = await page.evaluate(() => Object.fromEntries(new URLSearchParams(location.search)));
      for (const [k, v] of Object.entries(c.reload.keep)) if (sp[k] !== v) throw new Error(`Nach "Neu laden" steht ${k}=${sp[k]} in der Adresse statt ${v}`);
    }
    if (c.form) {
      const got = await page.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, document.querySelector(`#ctl [name=${k}]`).value])), Object.keys(c.form));
      for (const [k, v] of Object.entries(c.form)) if (got[k] !== v) throw new Error(`Formularfeld ${k} zeigt "${got[k]}" statt "${v}"`);
    }
    if (c.ready === "__pickReady") {
      // Auswahlkarte darf nicht drehen oder kippen: der Rahmen und das erzeugte Blatt sind nach Norden ausgerichtet (Fund aus dem Codex-Review)
      await page.evaluate(() => { window.__pickMap.setBearing(25); window.__pickMap.setPitch(40); });
      await page.waitForTimeout(400);
      const cam = await page.evaluate(() => ({ bearing: window.__pickMap.getBearing(), pitch: window.__pickMap.getPitch(), dragRotate: window.__pickMap.dragRotate.isEnabled(), touchPitch: window.__pickMap.touchPitch.isEnabled(), maxPitch: window.__pickMap.getMaxPitch() }));
      if (cam.bearing !== 0 || cam.pitch !== 0 || cam.dragRotate || cam.touchPitch || cam.maxPitch !== 0) throw new Error(`Auswahlkarte laesst Drehen/Kippen zu: ${JSON.stringify(cam)}`);
    }
    console.log("ok     ", `${c.path}?${c.q}`);
  } catch (e) {
    failed++;
    console.log("FEHLER ", `${c.path}?${c.q}`, "->", String(e.message).slice(0, 160));
  }
  await page.close();
}
await browser.close();
if (failed) { console.log(`${failed} von ${cases.length} Seiten fehlerhaft`); process.exit(1); }
console.log(`alle ${cases.length} Seiten laufen`);
