// Misst, wie schnell das Blatt mit einer Grundkarte aus der Ferne (R2 hinter der Pipeline-Domain) entsteht, verglichen mit der lokalen Datei.
// Aufruf (auf der VM, Seite von localhost:5173, weil R2-CORS nur diese Herkunft erlaubt):
//   node r2bench.mjs lokal https://pipeline.openfiremap.org/ortsplan-test/klein.pmtiles ... [--runs=2]
// Je Quelle und Lauf ein neuer Browser-Kontext (kein HTTP-Cache). Ausgabe: Wartezeit bis das Blatt fertig ist, Zahl und Groesse der Bereichsanfragen an die
// Kartendatei, Dauer je Anfrage (Median, 95 %) und die Cache-Status der Kante (cf-cache-status).
import { chromium } from "playwright-core";
import { waitReady } from "./testutil.mjs";

const args = process.argv.slice(2);
const runs = +(args.find((a) => a.startsWith("--runs="))?.slice(7) || 2);
const sources = args.filter((a) => !a.startsWith("--"));
const QUERY = "area=nuernberger-land&lat=49.5547&lon=11.3367&place=Schnaittach&sheet=1&scale=5000&paper=a3l&dpi=96";
const BASE = process.env.SPIKE_URL || "http://localhost:5173";
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))] : 0; };

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const rows = [];
for (const src of sources) {
  for (let run = 1; run <= runs; run++) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await ctx.newPage();
    const reqs = [];
    const isMap = (u) => (src === "lokal" ? /\/nuernberger-land\.pmtiles/.test(u) : u.startsWith(src));
    const pending = [];
    page.on("response", (r) => {
      if (!isMap(r.url())) return;
      // Zeiten erst lesen, wenn die Antwort ganz da ist (responseEnd ist vorher -1): auf finished() warten und am Ende alle abwarten
      pending.push((async () => {
        await r.finished().catch(() => null);
        const t = r.request().timing();
        const h = r.headers();
        reqs.push({ status: r.status(), range: r.request().headers()["range"] || "-", bytes: +(h["content-length"] || 0), ttfb: t.responseStart - t.requestStart, total: t.responseEnd - t.requestStart, cache: h["cf-cache-status"] || "-" });
      })());
    });
    let failure = null;
    page.on("pageerror", (e) => { failure = e.message; });
    const t0 = Date.now();
    await page.goto(`${BASE}/?${QUERY}${src === "lokal" ? "" : `&base=${encodeURIComponent(src)}`}`);
    await waitReady(page, { failure: () => failure, timeout: 280000 });
    const wall = Date.now() - t0;
    const err = await page.evaluate(() => window.__error || null);
    await Promise.all(pending); // alle Antworten sind vollstaendig, bevor ausgewertet wird
    const cache = {};
    for (const q of reqs) cache[`${q.status}/${q.cache}`] = (cache[`${q.status}/${q.cache}`] || 0) + 1; // Status der Antwort / Cache-Status der Kante
    for (const q of reqs.filter((x) => x.status !== 206)) console.log("  nicht 206:", q.status, "Range:", q.range, "Bytes:", q.bytes, "Cache:", q.cache);
    rows.push({ quelle: src === "lokal" ? "lokal" : src.split("/").pop(), lauf: run, wartezeit_s: +(wall / 1000).toFixed(1), anfragen: reqs.length, MB: +(reqs.reduce((a, q) => a + q.bytes, 0) / 1e6).toFixed(1),
      ttfb_median_ms: Math.round(pct(reqs.map((q) => q.ttfb), 0.5)), ttfb_p95_ms: Math.round(pct(reqs.map((q) => q.ttfb), 0.95)), dauer_p95_ms: Math.round(pct(reqs.map((q) => q.total), 0.95)), cache, fehler: err || failure || null });
    await ctx.close();
  }
}
await browser.close();
console.table(rows.map((r) => ({ ...r, cache: JSON.stringify(r.cache) })));
console.log(JSON.stringify(rows));
