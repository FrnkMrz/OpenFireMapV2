// Barrierefreiheit der Ortsplan-Seiten im echten Browser: axe (WCAG 2.2 AA) und eigene Kontrastmessung (tests/helpers/contrast.mjs)
// für Assistent (3 Schritte) und Blatt. Braucht die lokalen Daten: SPIKE_URL=http://127.0.0.1:5173 node a11y.mjs [en]
import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import { auditContrast } from "../../tests/helpers/contrast.mjs";
import { SHEET, WIZARD, withArea } from "./testutil.mjs";

const BASE = process.env.SPIKE_URL || "http://127.0.0.1:5173";
const locale = process.argv[2] === "en" ? "en-GB" : "de-DE";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale });
const page = await ctx.newPage();
let bad = 0;

async function audit(name) {
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  for (const v of res.violations) { bad++; console.log(`AXE   ${name}: ${v.id} (${v.impact}) ${v.help}\n      ${v.nodes.slice(0, 6).map((n) => n.target.join(" ")).join("\n      ")}${v.nodes.length > 6 ? `\n      … ${v.nodes.length} Stellen` : ""}`); }
  for (const bg of ["#ffffff", "#000000"]) {
    const found = await auditContrast(page, bg);
    for (const f of found) { bad++; console.log(`KONTR ${name} [${bg}]: ${f.kind} ${f.selector} "${f.text}" ${f.fg} auf ${f.bg} = ${f.ratio} (nötig ${f.required})`); }
  }
  console.log(`geprüft: ${name}`);
}

await page.goto(`${BASE}${WIZARD}?${withArea("paper=a3l&scale=5000&side=right")}`);
await page.waitForFunction(() => window.__pickReady, null, { timeout: 90000 });
for (let s = 0; s < 3; s++) {
  await audit(`Assistent Schritt ${s + 1}`);
  if (s < 2) await page.click("#next");
}
await page.goto(`${BASE}${SHEET}?${withArea("sheet=1&scale=5000&paper=a3l&dpi=96&side=right")}`);
await page.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await audit("Blatt");
await browser.close();
console.log(bad ? `${bad} Befunde` : "alles ok");
