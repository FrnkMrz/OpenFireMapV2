import test from "node:test";
import assert from "node:assert/strict";
import { parsePos, formatPos, clampPos, estimateSizes, defaultPos, rectsOverlap, blockRect, blockDims, BLOCKS, snapMap, estimateTitle, MAP_MARGIN, MAP_ANCHOR } from "./freelayout.js";
import { PAPER_MM, computeLayout } from "./layout.js";

test("parsePos/formatPos: Rundreise, Reihenfolge und Rundung", () => {
  const pos = { legend: { x: 0.71, y: 0.12 }, scale: { x: 0.7, y: 0.5 }, source: { x: 0.1, y: 0.9 }, north: { x: 0.9, y: 0.4 }, index: { x: 0.05, y: 0.6, w: 0.5, h: 0.3 } };
  const s = formatPos(pos);
  assert.equal(s, "l:0.71,0.12;s:0.7,0.5;q:0.1,0.9;n:0.9,0.4;i:0.05,0.6,0.5,0.3");
  assert.deepEqual(parsePos(s), pos);
});

test("parsePos: kaputte oder fremde Teile fallen weg, Reste bleiben", () => {
  assert.equal(parsePos(""), null);
  assert.equal(parsePos(null), null);
  assert.equal(parsePos("x:1,2"), null);
  assert.equal(parsePos("l:abc,2"), null);
  assert.equal(parsePos("l:0.5"), null);
  assert.equal(parsePos("i:0.1,0.1,0.2"), null);
  assert.deepEqual(parsePos("l:0.2,0.3;q:foo;s:0.4,0.5"), { legend: { x: 0.2, y: 0.3 }, scale: { x: 0.4, y: 0.5 } });
  assert.equal(parsePos("l:,"), null, "leere Zahlen sind keine Null");
});

test("clampPos: nichts ragt ueber das Papier, das Verzeichnis behaelt eine Mindestgroesse", () => {
  const c = clampPos({ legend: { x: -3, y: 9 }, index: { x: 0.9, y: 0.95, w: 0.5, h: 0.5 } });
  assert.equal(c.legend.x, 0);
  assert.ok(c.legend.y <= 0.98);
  assert.ok(c.index.x + c.index.w <= 1 + 1e-9 && c.index.y + c.index.h <= 1 + 1e-9);
  const tiny = clampPos({ index: { x: 0.1, y: 0.1, w: 0, h: -1 } });
  assert.ok(tiny.index.w >= 0.04 && tiny.index.h >= 0.04);
});

test("estimateSizes: ohne Legendenpunkte keine Legende", () => {
  assert.equal(estimateSizes({ lsym: false, lroad: false }).legend, null);
  const a = estimateSizes({ lsym: true, lroad: false }).legend, b = estimateSizes({ lsym: true, lroad: true }).legend;
  assert.ok(a.h > 0 && b.h > a.h);
});

test("defaultPos: alle Lagen und Papiere liefern gueltige Anteile, Bloecke liegen im Blatt", () => {
  for (const paper of Object.keys(PAPER_MM)) for (const side of ["right", "left", "top", "bottom", "none"]) for (const fmt of ["fill", "2:3"]) {
    const p = defaultPos({ paper, side, fmt });
    for (const name of BLOCKS) assert.ok(p[name], `${paper} ${side} ${fmt}: ${name}`);
    for (const b of Object.values(p)) assert.ok(b.x >= 0 && b.y >= 0 && b.x <= 1 && b.y <= 1);
    assert.ok(p.index.x + p.index.w <= 1 + 1e-9 && p.index.y + p.index.h <= 1 + 1e-9, `${paper} ${side}`);
  }
});

test("defaultPos: Seitenleiste rechts - Bloecke stehen untereinander rechts neben der Karte", () => {
  const p = defaultPos({ paper: "a3l", side: "right" });
  assert.equal(p.legend.x, p.scale.x);
  assert.ok(p.legend.y < p.scale.y && p.scale.y < p.source.y && p.source.y < p.index.y);
  assert.ok(p.legend.x > 0.6, "rechts");
});

test("defaultPos: oben/unten - Bloecke stehen nebeneinander", () => {
  const p = defaultPos({ paper: "a3l", side: "bottom" });
  assert.ok(p.legend.x < p.scale.x && p.scale.x < p.source.x && p.source.x < p.index.x);
});

test("defaultPos: ohne Legendenpunkte fehlt die Legende, der Rest rueckt auf", () => {
  const p = defaultPos({ paper: "a3l", side: "right", lsym: false, lroad: false });
  assert.equal(p.legend, undefined);
  assert.ok(p.scale && p.index);
});

test("defaultPos: ohne Seitenleiste liegen die Bloecke innen an der Kartenkante oder im freien Rand, nie ueber dem Kartenrand hinaus", () => {
  const full = defaultPos({ paper: "a2p", side: "none" });
  const [W] = PAPER_MM.a2p;
  assert.ok(full.legend.x * W + 62 * 1.4 <= W - 14 * 1.4 + 1e-6, "endet innerhalb der Karte");
  const narrow = defaultPos({ paper: "a2p", side: "none", fmt: "1:1" }); // Rand rechts neben der quadratischen Karte
  assert.ok(narrow.legend.x > full.legend.x - 1, "gueltige Lage");
});

test("rectsOverlap: Beruehren ist keine Ueberlappung", () => {
  assert.equal(rectsOverlap({ x: 0, y: 0, w: 1, h: 1 }, { x: 1, y: 0, w: 1, h: 1 }), false);
  assert.equal(rectsOverlap({ x: 0, y: 0, w: 1, h: 1 }, { x: 0.9, y: 0.9, w: 1, h: 1 }), true);
});

test("blockRect: Groesse aus der Schaetzung, Verzeichnis aus der Lage; fehlende Bloecke geben null", () => {
  const pos = { legend: { x: 0.1, y: 0.1 }, index: { x: 0.2, y: 0.3, w: 0.4, h: 0.5 } };
  assert.deepEqual(blockRect("index", pos), { x: 0.2, y: 0.3, w: 0.4, h: 0.5 });
  const r = blockRect("legend", pos, { ui: 1, W: 420, H: 297 });
  assert.ok(r.w > 0.1 && r.h > 0.1);
  assert.equal(blockRect("scale", pos), null);
  assert.equal(blockRect("legend", pos, { lsym: false, lroad: false }), null);
});

test("clampPos mit Groessen: der ganze Block bleibt im Papier, nicht nur seine Ecke", () => {
  const dims = blockDims({ ui: 1, W: 210, H: 297 });
  const c = clampPos({ source: { x: 0.98, y: 0.99 }, legend: { x: 1, y: 1 } }, dims);
  assert.ok(c.source.x + dims.source.w <= 1 + 1e-9 && c.source.y + dims.source.h <= 1 + 1e-9);
  assert.ok(c.legend.x + dims.legend.w <= 1 + 1e-9 && c.legend.y + dims.legend.h <= 1 + 1e-9);
  assert.deepEqual(clampPos({ source: { x: 0.1, y: 0.1 } }, dims).source, { x: 0.1, y: 0.1 }, "was passt, bleibt");
});

test("defaultPos: Legende, Massstab und Quellen ueberlappen sich in keiner Standardlage (alle Papiere, Lagen, Formate)", () => {
  for (const paper of Object.keys(PAPER_MM)) for (const side of ["right", "left", "top", "bottom", "none"]) for (const fmt of ["fill", "2:3", "1:1"]) {
    const [W, H] = PAPER_MM[paper];
    const ui = Math.max(1, Math.max(W, H) / 420);
    const pos = defaultPos({ paper, side, fmt });
    const rects = ["legend", "scale", "source", "north"].map((n) => [n, blockRect(n, pos, { ui, W, H })]);
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      assert.ok(!rectsOverlap(rects[i][1], rects[j][1]), `${paper} ${side} ${fmt}: ${rects[i][0]} / ${rects[j][0]}`);
    }
  }
});

test("defaultPos: oben/unten - das Verzeichnis ueberdeckt keinen anderen Block (auch A4 hoch)", () => {
  for (const paper of Object.keys(PAPER_MM)) for (const side of ["top", "bottom"]) {
    const [W, H] = PAPER_MM[paper];
    const ui = Math.max(1, Math.max(W, H) / 420);
    const pos = defaultPos({ paper, side });
    for (const n of ["legend", "scale", "source", "north"]) {
      assert.ok(!rectsOverlap(blockRect(n, pos, { ui, W, H }), pos.index), `${paper} ${side}: ${n} / index`);
    }
  }
});

test("defaultPos: die Legende hat Platz fuer alle moeglichen Eintraege, der Massstab steht darunter (A3 quer, Seitenleiste)", () => {
  const [W, H] = PAPER_MM.a3l;
  const worst = estimateSizes({ worst: true }).legend, typical = estimateSizes().legend;
  assert.ok(worst.h > typical.h);
  for (const side of ["right", "left", "none"]) {
    const p = defaultPos({ paper: "a3l", side });
    assert.ok(p.scale.y * H >= p.legend.y * H + worst.h, `${side}: Massstab beginnt unter der vollen Legende`);
  }
});

test("Nordpfeil ist ein eigener Block: steht in der Standardlage neben dem Massstab und kommt aus alten Adressen ohne n zurueck", () => {
  const p = defaultPos({ paper: "a3l", side: "right" });
  assert.ok(p.north && p.north.x > p.scale.x && Math.abs(p.north.y - p.scale.y) < 1e-9, "rechts neben dem Massstab, gleiche Hoehe");
  assert.deepEqual(parsePos("l:0.2,0.3;s:0.4,0.5;q:0.1,0.9"), { legend: { x: 0.2, y: 0.3 }, scale: { x: 0.4, y: 0.5 }, source: { x: 0.1, y: 0.9 } }, "alte Adresse ohne n bleibt gueltig");
  assert.deepEqual(parsePos("n:0.9,0.4"), { north: { x: 0.9, y: 0.4 } });
});

// ---- Titel und Karte ----
test("Titel und Karte: Adresse hin und zurueck, alte Adressen ohne t/m bleiben gueltig", () => {
  const p = parsePos("t:0.03,0.01;m:0.2,0.3;l:0.7,0.1");
  assert.deepEqual(p.title, { x: 0.03, y: 0.01 });
  assert.deepEqual(p.map, { x: 0.2, y: 0.3 });
  assert.deepEqual(parsePos(formatPos(p)), p);
  assert.deepEqual(parsePos("l:0.7,0.1"), { legend: { x: 0.7, y: 0.1 } }, "alte Adresse");
  assert.equal(parsePos("m:0.2"), null, "unvollstaendig faellt weg");
});

test("defaultPos: Titel steht links oben (in allen Lagen und Papieren), die Karte an ihrer Standardlage", () => {
  for (const paper of Object.keys(PAPER_MM)) for (const side of ["right", "left", "top", "bottom", "none"]) {
    const [W, H] = PAPER_MM[paper];
    const ui = Math.max(1, Math.max(W, H) / 420);
    const { frame } = computeLayout({ wMm: W, hMm: H, side, fmt: "fill" });
    const p = defaultPos({ paper, side });
    assert.ok(Math.abs(p.title.x * W - 14 * ui) < 1e-6 && Math.abs(p.title.y * H - 3.4 * ui) < 1e-6, `${paper}/${side}: Titel links oben`);
    assert.ok(Math.abs(p.map.x * W - frame.x) < 1e-6 && Math.abs(p.map.y * H - frame.y) < 1e-6, `${paper}/${side}: Karte an der Standardlage`);
  }
});

test("clampPos: die Karte bleibt ganz im Papier und haelt den Mindestrand, der Titel bleibt ganz im Papier", () => {
  const W = 420, H = 297, ui = 1, frame = { w: 200, h: 150 };
  const dims = blockDims({ ui, W, H, frame });
  const far = clampPos({ map: { x: 5, y: 5 }, title: { x: 5, y: 5 } }, dims);
  assert.ok(far.map.x * W + frame.w <= W - MAP_MARGIN * ui + 1e-9 && far.map.y * H + frame.h <= H - MAP_MARGIN * ui + 1e-9, "Karte unten rechts im Papier");
  assert.ok(far.title.x + dims.title.w <= 1 + 1e-9 && far.title.y + dims.title.h <= 1 + 1e-9, "Titel ganz im Papier");
  const near = clampPos({ map: { x: -1, y: -1 }, title: { x: -1, y: -1 } }, dims);
  assert.ok(Math.abs(near.map.x * W - MAP_MARGIN * ui) < 1e-9 && Math.abs(near.map.y * H - MAP_MARGIN * ui) < 1e-9, "Mindestrand fuer die Planquadrat-Buchstaben");
  assert.deepEqual(near.title, { x: 0, y: 0 });
  assert.deepEqual(clampPos({ map: { x: 0.2, y: 0.3 } }, dims).map, { x: 0.2, y: 0.3 }, "was passt, bleibt");
  // ein Kartenfenster, das breiter ist als das Papier abzueglich Rand, rutscht auf den Rand statt ueber ihn hinaus
  const wide = clampPos({ map: { x: 0.5, y: 0.5 } }, blockDims({ ui, W, H, frame: { w: 415, h: 290 } }));
  assert.ok(wide.map.x * W >= MAP_MARGIN - 1e-9 && wide.map.y * H >= MAP_MARGIN - 1e-9);
});

test("snapMap: nahe an den Randabstaenden springt die Karte darauf, sonst bleibt sie frei", () => {
  const o = { W: 420, H: 297, ui: 1, w: 200, h: 150 };
  const s = snapMap({ x: 16 / 420, y: 29 / 297 }, o); // 2 mm vom linken Rand (14) und 2 mm unter dem oberen (27)
  assert.ok(Math.abs(s.x * 420 - MAP_ANCHOR.left) < 1e-9 && Math.abs(s.y * 297 - MAP_ANCHOR.top) < 1e-9);
  const r = snapMap({ x: (420 - 14 - 200 - 3) / 420, y: (297 - 14 - 150 - 3) / 297 }, o); // 3 mm vor dem rechten/unteren Randabstand
  assert.ok(Math.abs(r.x * 420 - (420 - 14 - 200)) < 1e-9 && Math.abs(r.y * 297 - (297 - 14 - 150)) < 1e-9);
  const free = snapMap({ x: 100 / 420, y: 60 / 297 }, o);
  assert.deepEqual(free, { x: 100 / 420, y: 60 / 297 }, "weit weg von jedem Rand: unveraendert");
  const edge = snapMap({ x: 19 / 420, y: 60 / 297 }, o); // 5 mm: ausserhalb des Fangs (4 mm)
  assert.equal(edge.x, 19 / 420);
});

test("snapMap: jede Achse rastet einzeln, bei groesserem Papier gelten die ui-skalierten Randabstaende", () => {
  const o = { W: 594, H: 420, ui: 594 / 420, w: 300, h: 200 };
  const s = snapMap({ x: (14 * o.ui + 3) / 594, y: 100 / 420 }, o);
  assert.ok(Math.abs(s.x * 594 - 14 * o.ui) < 1e-9);
  assert.equal(s.y, 100 / 420);
});

test("blockRect: Titel und Karte haben eine Groesse (Karte aus dem Kartenfenster in mm), ohne frame keine Karte", () => {
  const pos = { title: { x: 0.03, y: 0.01 }, map: { x: 0.1, y: 0.2 } };
  const t = blockRect("title", pos, { ui: 1, W: 420, H: 297, title: "Plan", place: "Ort" });
  assert.ok(t.w > 0 && t.h > 0 && t.x === 0.03);
  assert.deepEqual(blockRect("map", pos, { W: 420, H: 297, frame: { w: 210, h: 148.5 } }), { x: 0.1, y: 0.2, w: 0.5, h: 0.5 });
  assert.equal(blockRect("map", pos, { W: 420, H: 297 }), null);
  assert.ok(estimateTitle({ title: "x".repeat(80), place: "" }).w <= 260, "Obergrenze");
  assert.ok(estimateTitle({}).w >= 40);
});
