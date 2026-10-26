import test from "node:test";
import assert from "node:assert/strict";
import { planHorizontal } from "./panelplan.js";

const base = { legColW: 74, scaleW: 70, minIndexW: 55, gap: 6, showIndex: true };

test("A3 quer oben/unten (392 mm breit, einspaltige Legende): nebeneinander, Verzeichnis bekommt den Rest", () => {
  const p = planHorizontal({ ...base, panelW: 392, legendCols: 1 });
  assert.equal(p.mode, "row");
  assert.equal(p.indexOnContinuation, false);
  assert.ok(p.indexW >= 55);
  assert.equal(p.legendW + 6 + 70 + 6 + p.indexW, 392);
});

test("A4 hoch oben/unten (182 mm) mit zweispaltiger Legende (Fund aus dem Codex-Review): nichts ausserhalb des Blatts", () => {
  const p = planHorizontal({ ...base, panelW: 182, legendCols: 2 });
  assert.equal(p.mode, "stacked");
  assert.equal(p.indexOnContinuation, true);
  assert.equal(p.indexW, 0);
  assert.ok(p.legendW <= 182);
  assert.ok(p.legendCols >= 1);
});

test("Legende breiter als der Bereich: Spaltenzahl wird begrenzt", () => {
  const p = planHorizontal({ ...base, panelW: 100, legendCols: 3 });
  assert.equal(p.legendCols, 1);
  assert.ok(p.legendW <= 100);
});

test("ohne Verzeichnis zaehlt dessen Mindestbreite nicht", () => {
  const p = planHorizontal({ ...base, panelW: 160, legendCols: 1, showIndex: false });
  assert.equal(p.mode, "row");
  assert.equal(p.indexOnContinuation, false);
  assert.equal(p.indexW, 0);
});

test("jede Eingabe liefert eine Breite, die nie negativ ist", () => {
  for (const panelW of [40, 80, 120, 182, 260, 392, 800]) for (const legendCols of [1, 2, 3]) for (const showIndex of [true, false]) {
    const p = planHorizontal({ ...base, panelW, legendCols, showIndex });
    assert.ok(p.indexW >= 0 && p.legendW > 0 && p.legendCols >= 1, JSON.stringify({ panelW, legendCols, p }));
    if (p.mode === "row") assert.ok(p.legendW + 12 + 70 + p.indexW <= panelW + 1e-9);
  }
});
