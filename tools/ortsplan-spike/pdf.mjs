// Ende-zu-Ende-Pruefung der PDF-Ausgabe: Blatt laden, "PDF speichern" klicken, Download pruefen.
// Aufruf: node pdf.mjs [query] [ausgabe.pdf]   (Server auf 5173 oder SPIKE_URL)
import { chromium } from "playwright-core";
import fs from "node:fs";
import { waitReady, SHEET, withArea } from "./testutil.mjs";

const query = process.argv[2] || "area=nuernberger-land&lat=49.5547&lon=11.3367&place=Schnaittach&sheet=1&scale=10000&paper=a3l&side=none&dpi=150";
const out = process.argv[3] || "shots/pdf/blatt.pdf";
const BASE = process.env.SPIKE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, acceptDownloads: true });
let failure = null;
page.on("pageerror", (e) => { failure = e.message; console.log("[pageerror]", e.message); });
await page.goto(`${BASE}${SHEET}?${withArea(query)}`);
await waitReady(page, { failure: () => failure });
const info = await page.evaluate(() => window.__sheetInfo);
const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click("#pdf")]);
fs.mkdirSync(out.split("/").slice(0, -1).join("/") || ".", { recursive: true });
await dl.saveAs(out);
const text = fs.readFileSync(out).toString("latin1");
const pages = (text.match(/\/Type\s*\/Page\b/g) || []).length;
const box = text.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
console.log("datei", dl.suggestedFilename(), fs.statSync(out).size, "Bytes");
console.log("seiten", pages, "erwartet", info.pages, "mediabox", box && `${(+box[1] / 72 * 25.4).toFixed(1)} x ${(+box[2] / 72 * 25.4).toFixed(1)} mm`);
const msg = await page.evaluate(() => document.getElementById("info").textContent);
await browser.close();
if (!text.startsWith("%PDF-") || pages !== info.pages || !box) { console.error("PDF-Pruefung FEHLGESCHLAGEN", msg); process.exit(1); }
if (/fehlgeschlagen/.test(msg)) { console.error(msg); process.exit(1); }
console.log("PDF ok");
