import test from "node:test";
import assert from "node:assert/strict";
import { PAPER_MM, computeLayout, parseFormat, fitRatio, groundSizeM, boundsAround, metersPerPx, SIDES } from "./layout.js";

// Die bisherige Berechnung aus main.js, unveraendert uebernommen: die Auslagerung darf nichts veraendern.
function oldLayout(wMm, hMm, side) {
  const ui = Math.max(1, Math.max(wMm, hMm) / 420);
  const sidebarW = Math.min(92 * ui, Math.max(62, 0.24 * wMm));
  const panelH = Math.min(0.45 * hMm, Math.max(72 * ui, (wMm < hMm ? 0.36 : 0.28) * hMm));
  let frame, panel;
  if (side === "left") {
    panel = { x: 6 * ui, y: 14 * ui, w: sidebarW, h: hMm - 28 * ui };
    const fx = panel.x + sidebarW + 9 * ui;
    frame = { x: fx, y: 14 * ui, w: wMm - fx - 14 * ui, h: hMm - 28 * ui };
  } else if (side === "top") {
    panel = { x: 14 * ui, y: 6 * ui, w: wMm - 28 * ui, h: panelH };
    const fy = panel.y + panelH + 14 * ui;
    frame = { x: 14 * ui, y: fy, w: wMm - 28 * ui, h: hMm - fy - 14 * ui };
  } else if (side === "bottom") {
    const fh = hMm - 14 * ui - panelH - 20 * ui;
    frame = { x: 14 * ui, y: 14 * ui, w: wMm - 28 * ui, h: fh };
    panel = { x: 14 * ui, y: frame.y + fh + 14 * ui, w: wMm - 28 * ui, h: panelH };
  } else {
    frame = { x: 14 * ui, y: 14 * ui, w: wMm - 14 * ui - 6.5 * ui - sidebarW - 6 * ui, h: hMm - 28 * ui };
    panel = { x: frame.x + frame.w + 6.5 * ui, y: frame.y, w: sidebarW, h: frame.h };
  }
  return { ui, frame, panel };
}

test("Papier fuellen entspricht exakt der bisherigen Berechnung (alle Papiere, alle Lagen)", () => {
  for (const [name, [w, h]] of Object.entries(PAPER_MM)) for (const side of SIDES) {
    const n = computeLayout({ wMm: w, hMm: h, side, fmt: "fill" });
    const o = oldLayout(w, h, side);
    assert.deepEqual({ ui: n.ui, frame: n.frame, panel: n.panel }, o, `${name} ${side}`);
  }
});

test("parseFormat: Seitenverhaeltnisse und Standard", () => {
  assert.equal(parseFormat("fill"), null);
  assert.equal(parseFormat(undefined), null);
  assert.equal(parseFormat("1:1"), 1);
  assert.equal(parseFormat("3:2"), 1.5);
  assert.equal(parseFormat("2:3"), 2 / 3);
  assert.equal(parseFormat("4:3"), 4 / 3);
  assert.equal(parseFormat("quatsch"), null);
  assert.equal(parseFormat("0:1"), null);
  assert.equal(parseFormat("1:0"), null);
});

test("fitRatio: groesstes Rechteck im Seitenverhaeltnis, ausgerichtet", () => {
  const slot = { x: 10, y: 20, w: 300, h: 200 };
  const sq = fitRatio(slot, 1, 0, 0.5);
  assert.deepEqual(sq, { x: 10, y: 20, w: 200, h: 200 });
  const c = fitRatio(slot, 1, 0.5, 0.5);
  assert.equal(c.x, 60);
  const tall = fitRatio(slot, 2 / 3, 0.5, 0);
  assert.ok(Math.abs(tall.h - 200) < 1e-9 && Math.abs(tall.w - 400 / 3) < 1e-9);
  const wide = fitRatio({ x: 0, y: 0, w: 100, h: 200 }, 2, 0.5, 0.5); // Slot schmal: Breite begrenzt
  assert.deepEqual(wide, { x: 0, y: 75, w: 100, h: 50 });
});

test("Quadrat auf A3 quer: Fenster quadratisch, Bereich rueckt an die Karte, passt aufs Papier", () => {
  for (const side of SIDES) {
    const L = computeLayout({ wMm: 420, hMm: 297, side, fmt: "1:1" });
    assert.ok(Math.abs(L.frame.w - L.frame.h) < 1e-9, side);
    assert.ok(L.frame.x >= 0 && L.frame.y >= 0 && L.frame.x + L.frame.w <= 420 + 1e-9 && L.frame.y + L.frame.h <= 297 + 1e-9, side);
    assert.ok(L.panel.x >= 0 && L.panel.x + L.panel.w <= 420 + 1e-9, `${side} Bereich`);
  }
  const right = computeLayout({ wMm: 420, hMm: 297, side: "right", fmt: "1:1" });
  assert.ok(Math.abs(right.panel.x - (right.frame.x + right.frame.w + 6.5)) < 1e-9, "rechts: Bereich direkt neben der Karte");
  const bottom = computeLayout({ wMm: 420, hMm: 297, side: "bottom", fmt: "1:1" });
  assert.ok(Math.abs(bottom.panel.y - (bottom.frame.y + bottom.frame.h + 14)) < 1e-9, "unten: Bereich direkt unter der Karte");
});

test("Hoch- und Querformat zuschneiden: Seitenverhaeltnis stimmt", () => {
  const t = computeLayout({ wMm: 420, hMm: 297, side: "right", fmt: "2:3" });
  assert.ok(Math.abs(t.frame.w / t.frame.h - 2 / 3) < 1e-9);
  const w = computeLayout({ wMm: 297, hMm: 420, side: "right", fmt: "3:2" });
  assert.ok(Math.abs(w.frame.w / w.frame.h - 1.5) < 1e-9);
  assert.equal(computeLayout({ wMm: 420, hMm: 297, fmt: "2:3" }).ratio, 2 / 3);
});

test("unbekannte Lage und Format fallen auf die Standardwerte zurueck", () => {
  const a = computeLayout({ wMm: 420, hMm: 297, side: "irgendwo", fmt: "wirr" });
  const b = computeLayout({ wMm: 420, hMm: 297, side: "right", fmt: "fill" });
  assert.deepEqual(a, b);
});

test("Bodenmasse und Rechteck: A3 quer 1:5000 Standard", () => {
  const L = computeLayout({ wMm: 420, hMm: 297, side: "right" });
  const g = groundSizeM(L.frame, 5000);
  assert.ok(Math.abs(g.w - 301.5 * 5) < 1e-6 && Math.abs(g.h - 269 * 5) < 1e-6);
  const [w, s, e, n] = boundsAround(49.5, 11.3, 1000, 600);
  assert.ok(Math.abs((e - w) * 111320 * Math.cos((49.5 * Math.PI) / 180) - 1000) < 0.5);
  assert.ok(Math.abs((n - s) * 110540 - 600) < 0.5);
});

test("metersPerPx halbiert sich je Zoomstufe", () => {
  assert.ok(Math.abs(metersPerPx(15, 49.5) / metersPerPx(16, 49.5) - 2) < 1e-9);
  assert.ok(metersPerPx(15, 49.5) < metersPerPx(15, 0));
});
