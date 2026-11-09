// Misst, wie viele verschiedene Strassennamen im Bild stehen. Aufruf: node names.mjs "scale=5000&paper=a4l&dpi=96&lbl=avoid&lsp=20"
import { chromium } from "playwright-core";
import { SHEET, withArea } from "./testutil.mjs";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
for (const q of process.argv.slice(2)) {
  await page.goto(`${process.env.SPIKE_URL || "http://127.0.0.1:5173"}${SHEET}?${withArea(/(^|&)sheet=/.test(q) ? q : `${q}&sheet=0`)}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  console.log(q, "->", await page.evaluate(() => window.__names()), "Namen");
}
await browser.close();
