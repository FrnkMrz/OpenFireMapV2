// Rauchtest: laedt die Seiten mit vielen Parameter-Kombinationen und bricht ab, wenn ein Skriptfehler auftritt oder die Seite nicht
// fertig wird. Faengt Startfehler (zum Beispiel "Cannot access ... before initialization"), die die Unit-Tests nicht sehen.
// Aufruf: SPIKE_URL=http://127.0.0.1:5173 node smoke.mjs
import { chromium } from "playwright-core";

const BASE = process.env.SPIKE_URL || "http://127.0.0.1:5173";
const cases = [
  { path: "/", q: "scale=5000&paper=a4l&dpi=96", ready: "__ready" },
  { path: "/", q: "sheet=1&scale=5000&paper=a3l&dpi=96", ready: "__ready" },
  ...["1:1", "3:2", "4:3", "2:3", "3:4", "fill", "wirr"].map((fmt) => ({ path: "/", q: `sheet=1&scale=5000&paper=a3l&dpi=96&fmt=${fmt}`, ready: "__ready" })),
  ...["right", "left", "top", "bottom"].map((side) => ({ path: "/", q: `sheet=1&scale=5000&paper=a4l&dpi=96&side=${side}&fmt=1:1`, ready: "__ready" })),
  { path: "/", q: "sheet=1&scale=5000&paper=a4p&dpi=96&index=0", ready: "__ready" },
  { path: "/pick.html", q: "paper=a3l&side=right&fmt=1:1&scale=5000", ready: "__pickReady" },
  { path: "/pick.html", q: "", ready: "__pickReady" },
];

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = 0;
for (const c of cases) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  let failure = null;
  page.on("pageerror", (e) => { failure = e.message; });
  await page.goto(`${BASE}${c.path}?${c.q}`);
  const failFast = new Promise((_, reject) => { const t = setInterval(() => { if (failure) { clearInterval(t); reject(new Error(failure)); } }, 200); });
  try {
    await Promise.race([page.waitForFunction((k) => window[k] === true, c.ready, { timeout: 60000 }), failFast]);
    const err = await page.evaluate(() => window.__error || null);
    if (err) throw new Error(String(err).split("\n")[0]);
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
