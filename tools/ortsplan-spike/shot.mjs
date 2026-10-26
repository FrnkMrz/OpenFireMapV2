// Rendert die Spike-Seite headless und speichert das Karten-Canvas als PNG.
// Aufruf: node shot.mjs "scale=5000&paper=a4l&dpi=150&mode=plan" ausgabe.png
import { chromium } from "playwright-core";
import fs from "node:fs";

const [query = "", out = "shots/shot.png"] = process.argv.slice(2);
const url = `${process.env.SPIKE_URL || "http://127.0.0.1:5173"}/?${query}`;

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) console.log("[browser]", m.text()); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(url);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const c = window.__map.getCanvas();
  return { w: c.width, h: c.height, gl: window.__map.painter?.context?.gl?.getParameter?.(window.__map.painter.context.gl.MAX_RENDERBUFFER_SIZE) };
});
console.log("canvas", info, "fire", await page.evaluate(() => window.__fire));
const err = await page.evaluate(() => window.__error || null);
if (err) { console.error("Fehler im Blatt:", err); await browser.close(); process.exit(1); }
const pages = await page.evaluate(() => window.__sheet || null);
if (pages) {
  console.log("sheet", JSON.stringify(await page.evaluate(() => window.__sheetInfo)));
  fs.mkdirSync(out.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  pages.forEach((u, i) => {
    const f = i === 0 ? out : out.replace(/\.png$/, `-${i + 1}.png`);
    fs.writeFileSync(f, Buffer.from(u.split(",")[1], "base64"));
    console.log("gespeichert:", f, fs.statSync(f).size, "Bytes");
  });
  await browser.close();
  process.exit(0);
}
const dataUrl = await page.evaluate(() => window.__map.getCanvas().toDataURL("image/png"));
fs.mkdirSync(out.split("/").slice(0, -1).join("/") || ".", { recursive: true });
fs.writeFileSync(out, Buffer.from(dataUrl.split(",")[1], "base64"));
console.log("gespeichert:", out, fs.statSync(out).size, "Bytes");
await browser.close();
