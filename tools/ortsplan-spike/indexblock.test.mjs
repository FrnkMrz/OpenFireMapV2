import test from "node:test";
import assert from "node:assert/strict";
import { wrapName, wrapRefs, makeFitter, planBlock } from "./indexblock.js";

// Textbreite ohne Canvas: jedes Zeichen 0,5 em breit (Schrift 2,1 mm)
const FS = 2.1, lineH = 2.75;
const measure = (s) => s.length * 0.5 * FS;
const OPTS = { lineH, minColW: 17 * FS, idealColW: 26 * FS, maxColW: 40 * FS };

const names = ["Hauptstraße", "Am Bach", "Friedrich-von-Schiller-Straße", "Dr.-Gustav-Schickedanz-Straße", "Bahnhofstraße", "Ludwig-Thoma-Weg", "Kirchenweg", "Nürnberger Straße"];
const make = (n, cells = "A1, B2") => Array.from({ length: n }, (_, i) => ({ name: `${names[i % names.length]} ${i}`, cells }));
const setup = (entries, box, extra = {}) => {
  const fitW = makeFitter({ entries, measure, lineH });
  return { fitW, plan: planBlock({ total: entries.length, fitW, box, cont: { w: 186, h: 261 }, ...OPTS, ...extra }) };
};
const placedIndexes = (plan) => {
  const cols = [...(plan.first?.columns || []), ...(plan.rest?.pages.flat() || [])];
  const out = [];
  for (const [a, b] of cols) for (let i = a; i < b; i++) out.push(i);
  return out;
};
const expectAll = (plan, total) => assert.deepEqual(placedIndexes(plan), Array.from({ length: total }, (_, i) => i), "jeder Eintrag genau einmal, in Reihenfolge");

test("wrapName: bricht zuerst an Leerzeichen und Bindestrichen, nicht mitten im Wort", () => {
  const maxW = measure("Friedrich-von-Schiller-");
  const lines = wrapName("Friedrich-von-Schiller-Straße", maxW, measure);
  assert.deepEqual(lines, ["Friedrich-von-Schiller-", "Straße"]);
  assert.deepEqual(wrapName("Am Bach", 100, measure), ["Am Bach"]);
  assert.deepEqual(wrapName("Nürnberger Straße", measure("Nürnberger"), measure), ["Nürnberger", "Straße"]);
});

test("wrapName: ein zu langes Wort wird mit Trennstrich gebrochen und bleibt in der Breite", () => {
  const maxW = measure("Hauptstr-");
  const lines = wrapName("Hauptstraßenumgehung", maxW, measure);
  assert.ok(lines.length > 1);
  assert.ok(lines.slice(0, -1).every((l) => l.endsWith("-") && measure(l) <= maxW));
  assert.equal(lines.join("").replaceAll("-", ""), "Hauptstraßenumgehung");
});

test("wrapRefs: Planquadrate umbrechen, ein einzelner Eintrag steht immer ganz", () => {
  assert.deepEqual(wrapRefs("A1, B2, C3", 100, measure), ["A1, B2, C3"]);
  const lines = wrapRefs("A1, B2, C3, D4", measure("A1, B2,"), measure);
  assert.ok(lines.length >= 2 && lines.every((l) => measure(l) <= measure("A1, B2,") || !l.includes(",")));
  assert.deepEqual(wrapRefs("A1–F9", 1, measure), ["A1–F9"]);
});

test("Block: kein Eintrag, nichts zu zeichnen", () => {
  const { plan } = setup([], { w: 90, h: 150 });
  assert.equal(plan.first, null);
  assert.equal(plan.rest, null);
});

test("Block: ein einziger Eintrag nimmt nur eine Zeile und eine Spalte", () => {
  const { plan } = setup(make(1), { w: 90, h: 150 });
  assert.equal(plan.first.n, 1);
  assert.equal(plan.first.height, lineH);
  assert.ok(plan.first.width <= OPTS.maxColW);
  assert.equal(plan.rest, null);
});

test("Block: wenige Eintraege in breitem Bereich bleiben eine schmale, hoechstens maxColW breite Spalte", () => {
  const { plan } = setup(make(5), { w: 300, h: 100 });
  assert.equal(plan.first.n, 1);
  assert.ok(plan.first.width <= OPTS.maxColW + 1e-9, "der Block schrumpft, statt sich ueber die ganze Breite zu ziehen");
  assert.equal(plan.rest, null);
  expectAll(plan, 5);
});

test("Block: passt alles auf das Blatt, gilt die kleinste Spaltenzahl und die Spalten sind etwa gleich hoch", () => {
  const entries = make(60);
  const { plan, fitW } = setup(entries, { w: 300, h: 100 });
  expectAll(plan, 60);
  assert.equal(plan.rest, null);
  const n = plan.first.n;
  assert.ok(n > 1);
  // mit einer Spalte weniger waere es nicht gegangen
  const smaller = planBlock({ total: 60, fitW, box: { w: 300, h: 100 }, cont: { w: 186, h: 261 }, ...OPTS, cols: n - 1 });
  assert.ok(smaller.rest, "n-1 Spalten reichen nicht");
  const heights = plan.first.columns.map(([a, b]) => { let s = 0; for (let i = a; i < b; i++) s += fitW(i, plan.first.colW).h; return s; });
  assert.ok(Math.max(...heights) <= 100 + 1e-9);
  assert.ok(Math.max(...heights) - Math.min(...heights.slice(0, -1)) <= 4 * lineH, `Spalten ausgeglichen: ${heights}`);
  assert.ok(plan.first.height <= 100);
});

test("Block: sehr viele Eintraege in schmaler Seitenleiste - Spalten bleiben lesbar, der Rest steht auf Folgeseiten", () => {
  const entries = make(125);
  const { plan } = setup(entries, { w: 90, h: 150 });
  expectAll(plan, 125);
  assert.ok(plan.first.colW >= OPTS.minColW - 1e-9, `Spalte ${plan.first.colW} mm nicht schmaler als ${OPTS.minColW}`);
  assert.ok(plan.rest, "Rest auf Folgeseite");
  assert.ok(plan.rest.colW >= OPTS.minColW - 1e-9);
  assert.ok(plan.placedFirst > 8 && plan.placedFirst < 125);
  assert.ok(plan.first.height <= 150 + 1e-9);
});

test("Block: Tausende Eintraege - mehrere Folgeseiten, nichts geht verloren", () => {
  const { plan } = setup(make(2000), { w: 90, h: 150 });
  expectAll(plan, 2000);
  assert.ok(plan.rest.pages.length > 1);
  for (const page of plan.rest.pages) assert.ok(page.length <= plan.rest.n);
});

test("Block: kein Platz auf dem Blatt (oder nur fuer ein paar Eintraege) - alles steht auf Folgeseiten", () => {
  for (const box of [null, { w: 90, h: 1 }, { w: 90, h: 3 * lineH }]) {
    const { plan } = setup(make(40), box);
    assert.equal(plan.first, null, JSON.stringify(box));
    expectAll(plan, 40);
    assert.equal(plan.placedFirst, 0);
  }
});

test("Block: Bereich schmaler als eine Mindestspalte - eine Spalte in voller Breite des Bereichs", () => {
  const { plan } = setup(make(10), { w: 30, h: 150 });
  assert.equal(plan.first.n, 1);
  assert.ok(plan.first.colW <= 30 + 1e-9);
  expectAll(plan, 10);
});

test("Block: feste Spaltenzahl wird eingehalten", () => {
  const { plan } = setup(make(30), { w: 200, h: 200 }, { cols: 3 });
  assert.ok(plan.first.n === 3 && plan.first.columns.length <= 3);
  expectAll(plan, 30);
});

test("Block: Folgeseiten nutzen Spalten um idealColW, nie schmaler als minColW", () => {
  for (const w of [186, 396, 120, 60]) {
    const { plan } = setup(make(400), null, { cont: { w, h: 250 } });
    assert.ok(plan.rest.colW >= Math.min(OPTS.minColW, w) - 1e-9, `w=${w}`);
    const used = plan.rest.n * plan.rest.colW + (plan.rest.n - 1) * plan.rest.gap;
    assert.ok(used <= w + 1e-9, `Spalten passen in ${w} mm`);
  }
});

test("Fitter: Name und Planquadrate passen in die Spaltenbreite, Hoehe zaehlt die laengere Seite", () => {
  const entries = [{ name: "Friedrich-von-Schiller-Straße", cells: "A1, A2, A3, B1, B2, B3, C1, C2, C3" }];
  const fit = makeFitter({ entries, measure, lineH });
  const width = 40;
  const f = fit(0, width);
  assert.ok(f.refs.every((r) => measure(r) <= width * 0.5 || !r.includes(",")));
  assert.ok(f.lines.every((l) => measure(l) <= width - f.refW - 2 + 1e-9));
  assert.equal(f.h, Math.max(f.lines.length, f.refs.length) * lineH);
  assert.equal(fit(0, width), f, "zwischengespeichert");
});

test("Block: from - ein zweiter Bereich setzt dort fort, wo der erste aufgehoert hat, nichts geht verloren", () => {
  const entries = make(120);
  const fitW = makeFitter({ entries, measure, lineH });
  const common = { total: 120, fitW, cont: { w: 186, h: 261 }, ...OPTS };
  const a = planBlock({ ...common, box: { w: 90, h: 60 } });
  assert.ok(a.first && a.placedFirst > 8 && a.placedFirst < 120);
  const b = planBlock({ ...common, from: a.placedFirst, box: { w: 280, h: 100 } });
  assert.equal(b.first.columns[0][0], a.placedFirst, "beginnt beim ersten Eintrag ohne Platz");
  assert.equal(b.rest, null, "der grosse Bereich nimmt den Rest auf");
  assert.equal(b.placedFirst, 120);
  const idx = [...a.first.columns, ...b.first.columns].flatMap(([x, y]) => Array.from({ length: y - x }, (_, i) => x + i));
  assert.deepEqual(idx, Array.from({ length: 120 }, (_, i) => i));
});

test("Block: from - ein Bereich, in den kaum etwas passt, bleibt leer und der Rest wandert weiter", () => {
  const entries = make(50);
  const fitW = makeFitter({ entries, measure, lineH });
  const p = planBlock({ total: 50, from: 20, fitW, box: { w: 90, h: 3 * lineH }, cont: { w: 186, h: 261 }, ...OPTS });
  assert.equal(p.first, null);
  assert.equal(p.placedFirst, 20);
  assert.equal(p.rest.pages.flat().flatMap(([x, y]) => Array.from({ length: y - x }, (_, i) => x + i))[0], 20);
  assert.equal(planBlock({ total: 50, from: 50, fitW, box: { w: 90, h: 100 }, cont: { w: 186, h: 261 }, ...OPTS }).rest, null);
});

test("Block: letzte Folgeseite hat gleich hohe Spalten ueber die ganze Breite, nicht eine lange Spalte", () => {
  const entries = make(100);
  const { fitW, plan } = setup(entries, { w: 60, h: 100 });
  expectAll(plan, 100);
  const last = plan.rest.pages[plan.rest.pages.length - 1];
  assert.ok(plan.rest.n > 1 && last.length > 1, `mehrere Spalten statt einer (${last.length})`);
  const heights = last.map(([a, b]) => { let h = 0; for (let i = a; i < b; i++) h += fitW(i, plan.rest.colW).h; return h; });
  const lo = Math.min(...heights.slice(0, -1)), hi = Math.max(...heights);
  assert.ok(hi - lo <= 2 * lineH + 1e-9 || heights.length === 1, `Spaltenhoehen ${heights.map((h) => h.toFixed(1))}`);
  assert.ok(hi <= 261 + 1e-9);
});

test("Block: Folgeseiten ausser der letzten bleiben voll gefuellt", () => {
  const { plan } = setup(make(2000), { w: 90, h: 150 });
  expectAll(plan, 2000);
  const pages = plan.rest.pages;
  assert.ok(pages.length > 1);
  for (const page of pages.slice(0, -1)) assert.equal(page.length, plan.rest.n, "volle Seite nutzt alle Spalten");
});
