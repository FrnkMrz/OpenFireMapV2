import { test } from "vitest";
import assert from "node:assert/strict";
import { parsePos, formatPos, clampPos, estimateSizes, defaultPos, rectsOverlap, blockRect, blockDims, BLOCKS, snapMap, clampGroupOffset, mapSizeMm, sourceSize, snapToFrameInset, EDGE_INSET, EDGE_SNAP, estimateTitle, MAP_MARGIN, MAP_ANCHOR } from "../../src/js/ortsplan/freelayout.js";
import { PAPER_MM, computeLayout, MIN_FRAME_MM } from "../../src/js/ortsplan/layout.js";
import { attributionStrip } from "../../src/js/ortsplan/attribution.js";

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
    for (const name of BLOCKS.filter((n) => n !== "msize" && n !== "sourcew")) assert.ok(p[name], `${paper} ${side} ${fmt}: ${name}`); // msize (eigene Kartengroesse) fehlt in der Standardlage
    for (const b of Object.values(p)) assert.ok(b.x >= 0 && b.y >= 0 && b.x <= 1 && b.y <= 1);
    assert.ok(p.index.x + p.index.w <= 1 + 1e-9 && p.index.y + p.index.h <= 1 + 1e-9, `${paper} ${side}`);
  }
});

test("defaultPos: Seitenleiste rechts - Bloecke stehen untereinander rechts neben der Karte", () => {
  const p = defaultPos({ paper: "a3l", side: "right" });
  assert.equal(p.legend.x, p.scale.x);
  assert.ok(p.legend.y < p.scale.y && p.scale.y < p.index.y);
  assert.ok(p.legend.x > 0.6, "rechts");
  const { frame } = computeLayout({ wMm: 420, hMm: 297, side: "right" });
  assert.ok(Math.abs(p.source.x * 420 - frame.x) < 1e-9 && p.source.y * 297 >= frame.y + frame.h, "Quellenangabe: Streifen unter der Karte, linksbuendig mit ihr");
});

test("defaultPos: oben/unten - Bloecke stehen nebeneinander", () => {
  const p = defaultPos({ paper: "a3l", side: "bottom" });
  assert.ok(p.legend.x < p.scale.x && p.scale.x < p.index.x);
});

test("defaultPos: ohne Legendenpunkte fehlt die Legende, der Rest rueckt auf", () => {
  const p = defaultPos({ paper: "a3l", side: "right", lsym: false, lroad: false });
  assert.equal(p.legend, undefined);
  assert.ok(p.scale && p.index);
});

test("defaultPos: Auf der Karte (none) - Legende, Massstab und Nordpfeil liegen innen auf der Karte, nur das Verzeichnis ausserhalb (quer: Spalte rechts, hoch: Streifen unten)", () => {
  for (const paper of Object.keys(PAPER_MM)) for (const fmt of ["fill", "3:2", "1:1"]) {
    const [W, H] = PAPER_MM[paper];
    const ui = Math.max(1, Math.max(W, H) / 420);
    const { frame, panel } = computeLayout({ wMm: W, hMm: H, side: "none", fmt });
    const p = defaultPos({ paper, side: "none", fmt });
    const F = { x: frame.x / W, y: frame.y / H, w: frame.w / W, h: frame.h / H };
    for (const n of ["legend", "scale", "north"]) {
      const r = blockRect(n, p, { ui, W, H, frame });
      assert.ok(r.x >= F.x - 1e-9 && r.y >= F.y - 1e-9 && r.x + r.w <= F.x + F.w + 1e-9, `${paper} ${fmt}: ${n} liegt auf der Karte`);
    }
    assert.ok(!rectsOverlap(p.index, F), `${paper} ${fmt}: das Verzeichnis liegt ausserhalb der Karte`);
    assert.ok(Math.abs(p.index.x * W - panel.x) < 1e-9 && Math.abs(p.index.y * H - panel.y) < 1e-9, `${paper} ${fmt}: Verzeichnis in der Leiste`);
    if (W >= H) assert.ok(p.index.x * W >= frame.x + frame.w - 1e-9, `${paper} ${fmt}: quer - rechts neben der Karte`);
    else assert.ok(p.index.y * H >= frame.y + frame.h - 1e-9, `${paper} ${fmt}: hoch - unter der Karte`);
    assert.ok(p.source.y * H >= frame.y + frame.h, `${paper} ${fmt}: Quellenstreifen unter der Karte`);
  }
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
  assert.deepEqual(clampPos({ source: { x: 0.02, y: 0.1 } }, dims).source, { x: 0.02, y: 0.1 }, "was passt, bleibt");
});

test("defaultPos: Legende, Massstab und Quellen ueberlappen sich in keiner Standardlage (alle Papiere, Lagen, Formate)", () => {
  for (const paper of Object.keys(PAPER_MM)) for (const side of ["right", "left", "top", "bottom", "none"]) for (const fmt of ["fill", "2:3", "1:1"]) {
    const [W, H] = PAPER_MM[paper];
    const ui = Math.max(1, Math.max(W, H) / 420);
    const pos = defaultPos({ paper, side, fmt });
    // Die Quellenangabe ist ein Streifen unter der Karte. Bei Leiste oben/unten ist die Leiste oft niedriger als die Legende im Hoechstfall
    // (geschaetzt); dort wird die Legende nach oben geklemmt und kann den Streifen beruehren, das Blatt zeichnet die echte, kuerzere Legende.
    const smallBar = side === "top" || side === "bottom";
    const rects = ["legend", "scale", ...(smallBar ? [] : ["source"]), "north"].map((n) => [n, blockRect(n, pos, { ui, W, H, frame: computeLayout({ wMm: W, hMm: H, side, fmt }).frame })]);
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

test("snapMap mit home: rastet auch an der Standardlage ein (feste Leiste), sonst unveraendert", () => {
  const o = { W: 420, H: 297, ui: 1, w: 200, h: 150, home: { x: 100, y: 60 } };
  const s = snapMap({ x: 102 / 420, y: 58 / 297 }, o);
  assert.ok(Math.abs(s.x * 420 - 100) < 1e-9 && Math.abs(s.y * 297 - 60) < 1e-9);
  assert.equal(snapMap({ x: 110 / 420, y: 70 / 297 }, o).x, 110 / 420, "ausserhalb des Fangs");
});

test("clampGroupOffset: Karte und Leiste bleiben zusammen im Papier", () => {
  const W = 420, H = 297, ui = 1;
  // Leiste rechts, Karte oben links angelegt: rechts ist nichts frei, nach links kein Platz zum Rand
  const frame = { x: 14, y: 27, w: 300, h: 150 }, panel = { x: 320.5, y: 27, w: 90, h: 150 };
  const far = clampGroupOffset({ frame, panel, W, H, ui, dx: 500, dy: 500 });
  assert.ok(panel.x + far.dx + panel.w <= W - 2 * ui + 1e-9, "Leiste bleibt im Papier");
  assert.ok(frame.y + far.dy + frame.h <= H - MAP_MARGIN * ui + 1e-9, "Karte unten im Papier");
  const back = clampGroupOffset({ frame, panel, W, H, ui, dx: -500, dy: -500 });
  assert.ok(frame.x + back.dx >= MAP_MARGIN * ui - 1e-9 && frame.y + back.dy >= MAP_MARGIN * ui - 1e-9, "Mindestrand der Karte");
  assert.deepEqual(clampGroupOffset({ frame, panel, W, H, ui, dx: 3, dy: -2 }), { dx: 3, dy: -2 }, "was passt, bleibt");
  // ohne Leiste (panel.w = 0) zaehlt nur die Karte
  const alone = clampGroupOffset({ frame: { x: 14, y: 27, w: 200, h: 100 }, panel: { x: 400, y: 27, w: 0, h: 0 }, W, H, ui, dx: 500, dy: 0 });
  assert.ok(Math.abs(14 + alone.dx + 200 - (W - MAP_MARGIN)) < 1e-9);
  // eine Gruppe, die breiter ist als das Papier, bleibt stehen
  assert.deepEqual(clampGroupOffset({ frame: { x: 0, y: 27, w: 430, h: 100 }, panel: null, W, H, ui, dx: 10, dy: 0 }), { dx: 0, dy: 0 });
});

test("Kartengroesse: z:b,h hin und zurueck, geklemmt, alte Adressen ohne z unveraendert", () => {
  const p = parsePos("z:0.5,0.6;m:0.1,0.2");
  assert.deepEqual(p.msize, { w: 0.5, h: 0.6 });
  assert.deepEqual(parsePos(formatPos(p)), p);
  assert.deepEqual(clampPos({ msize: { w: 9, h: -1 } }).msize, { w: 1, h: 0.04 }, "Anteile des Papiers, nie ueber 1 und nie unter der Mindestgroesse");
  assert.equal(parsePos("z:0.5"), null, "unvollstaendig faellt weg");
  assert.ok(!("msize" in defaultPos({ paper: "a3l", side: "right" })), "ohne eigene Groesse gilt das volle Fenster");
});

test("computeLayout mit size: nie groesser als das Fenster der Lage, nie kleiner als MIN_FRAME_MM, linke obere Ecke und Leiste bleiben stimmig", () => {
  for (const side of ["right", "left", "top", "bottom", "none"]) {
    const base = computeLayout({ wMm: 420, hMm: 297, side });
    const big = computeLayout({ wMm: 420, hMm: 297, side, size: { w: 9999, h: 9999 } });
    assert.deepEqual(big.frame, base.frame, `${side}: zu gross = volles Fenster`);
    const tiny = computeLayout({ wMm: 420, hMm: 297, side, size: { w: 1, h: 1 } });
    assert.ok(tiny.frame.w === MIN_FRAME_MM && tiny.frame.h === MIN_FRAME_MM, `${side}: Mindestgroesse`);
    const half = computeLayout({ wMm: 420, hMm: 297, side, size: { w: base.frame.w / 2, h: base.frame.h / 2 } });
    assert.ok(half.frame.x === base.frame.x && half.frame.y === base.frame.y, `${side}: linke obere Ecke bleibt`);
    assert.ok(half.frame.w === base.frame.w / 2 && half.frame.h === base.frame.h / 2, `${side}: Groesse uebernommen`);
  }
  const r = computeLayout({ wMm: 420, hMm: 297, side: "right", size: { w: 200, h: 100 } });
  assert.ok(Math.abs(r.panel.x - (r.frame.x + 200 + 6.5)) < 1e-9, "rechts: die Leiste rueckt an die kleinere Karte");
  const b = computeLayout({ wMm: 420, hMm: 297, side: "bottom", size: { w: 200, h: 100 } });
  assert.ok(Math.abs(b.panel.y - (b.frame.y + 100 + 14)) < 1e-9, "unten: die Leiste rueckt unter die kleinere Karte");
  assert.deepEqual(computeLayout({ wMm: 420, hMm: 297, side: "right" }), computeLayout({ wMm: 420, hMm: 297, side: "right", size: null }), "ohne size unveraendert");
});

test("mapSizeMm: aus Anteilen in mm, nie groesser als das Fenster der Lage, festes Kartenformat bleibt erhalten", () => {
  const base = { w: 392, h: 256 };
  assert.deepEqual(mapSizeMm(null, { W: 420, H: 297, base }), null);
  assert.deepEqual(mapSizeMm({ w: 0.5, h: 0.5 }, { W: 420, H: 297, base }), { w: 210, h: 148.5 });
  assert.deepEqual(mapSizeMm({ w: 1, h: 1 }, { W: 420, H: 297, base }), base, "begrenzt auf das Fenster der Lage");
  const sq = mapSizeMm({ w: 0.5, h: 0.9 }, { W: 420, H: 297, base: { w: 256, h: 256 }, ratio: 1 });
  assert.ok(Math.abs(sq.w - sq.h) < 1e-9 && sq.w <= 210 + 1e-9, `quadratisch bleibt quadratisch: ${sq.w} x ${sq.h}`);
});

test("computeLayout mit size: das Mindestmass haelt das Seitenverhaeltnis (festes Format 3:2 bleibt 3:2)", () => {
  const l = computeLayout({ wMm: 420, hMm: 297, side: "none", fmt: "3:2", size: { w: 45, h: 30 } });
  assert.ok(Math.abs(l.frame.w / l.frame.h - 1.5) < 1e-9, `Verhaeltnis ${l.frame.w / l.frame.h}`);
  assert.ok(Math.min(l.frame.w, l.frame.h) >= MIN_FRAME_MM - 1e-9, "kuerzere Seite mindestens MIN_FRAME_MM");
  const wide = computeLayout({ wMm: 420, hMm: 297, side: "none", fmt: "3:2", size: { w: 9999, h: 6666 } });
  assert.ok(Math.abs(wide.frame.w / wide.frame.h - 1.5) < 1e-9, "zu gross: gemeinsam auf das Fenster der Lage, Verhaeltnis bleibt");
});

test("Quellenangabe: ein Streifen (eine Zeile) so breit wie der Text, bei schmaler Karte schmaler und zweizeilig", () => {
  const wide = estimateSizes({ frameW: 392, ui: 1 }).source, narrow = estimateSizes({ frameW: 120, ui: 1 }).source;
  assert.ok(wide.w <= 190 && wide.w > narrow.w && wide.h < narrow.h, `breit ${wide.w}x${wide.h}, schmal ${narrow.w}x${narrow.h}`);
  assert.ok(narrow.w >= 62, "nie schmaler als 62");
  assert.equal(estimateSizes().source.w, 190, "ohne Kartenbreite: Laenge der Zeile");
  assert.equal(attributionStrip("2026-11-08T21:21:00Z", "2026-11-09T00:00:00Z"), "© OpenStreetMap contributors (ODbL; https://www.openstreetmap.org/copyright) · Karte: Protomaps · Daten: OpenFireMap.org · Stand: Feuerwehr-Daten 08.11.2026 · Basiskarte 09.11.2026");
});

test("computeLayout mit size und sizeMax: bei freier Anordnung darf die Karte ueber das Fenster der Lage hinaus bis sizeMax wachsen", () => {
  const base = computeLayout({ wMm: 420, hMm: 297, side: "right" });
  const paper = { w: 420 - 12, h: 297 - 12 };
  const grown = computeLayout({ wMm: 420, hMm: 297, side: "right", size: { w: 9999, h: 9999 }, sizeMax: paper });
  assert.ok(grown.frame.w === paper.w && grown.frame.h === paper.h && grown.frame.w > base.frame.w, "bis zum Papier");
  const part = computeLayout({ wMm: 420, hMm: 297, side: "right", size: { w: base.frame.w + 40, h: base.frame.h }, sizeMax: paper });
  assert.ok(part.frame.w === base.frame.w + 40, "dazwischen: wie gewuenscht");
  const limited = computeLayout({ wMm: 420, hMm: 297, side: "right", size: { w: 9999, h: 9999 } });
  assert.deepEqual(limited.frame, base.frame, "ohne sizeMax: hoechstens das Fenster der Lage (feste Leiste)");
});

test("snapToFrameInset: Bloecke am Kartenrand rasten auf denselben Abstand ein (links/rechts/oben/unten), sonst bleibt die Lage", () => {
  const frame = { x: 14, y: 27, w: 300, h: 200 };
  const inset = 4, thr = 6;
  const xy = (r) => ({ x: r.x, y: r.y });
  // links oben: 2 mm daneben -> genau 4 mm vom Rand (kein Anker rechts/unten)
  const tl = snapToFrameInset({ x: 14 + 6, y: 27 + 3, w: 60, h: 40 }, frame, inset, thr);
  assert.deepEqual(xy(tl), { x: 14 + 4, y: 27 + 4 }); assert.equal(tl.ar, false); assert.equal(tl.ab, false);
  // rechts unten: die rechte/untere Kante soll 4 mm vom Rand stehen (Kantenabstand, nicht Ecke); der Block meldet die Anker
  const br = snapToFrameInset({ x: 14 + 300 - 4 - 60 - 3, y: 27 + 200 - 4 - 40 + 2, w: 60, h: 40 }, frame, inset, thr);
  assert.deepEqual(xy(br), { x: 14 + 300 - 4 - 60, y: 27 + 200 - 4 - 40 }); assert.equal(br.ar, true); assert.equal(br.ab, true);
  // zwei verschiedene Bloecke am selben Rand haben danach denselben Abstand (auch bei verschiedener Groesse)
  const a = snapToFrameInset({ x: 14 + 300 - 70, y: 100, w: 60, h: 30 }, frame, inset, thr), b = snapToFrameInset({ x: 14 + 300 - 45, y: 150, w: 38, h: 20 }, frame, inset, thr);
  assert.ok(Math.abs(frame.x + frame.w - (a.x + 60) - 4) < 1e-9 && Math.abs(frame.x + frame.w - (b.x + 38) - 4) < 1e-9, "rechter Abstand gleich");
  // weit weg vom Rand: unveraendert; ausserhalb der Karte (Mitte nicht auf der Karte): unveraendert
  assert.deepEqual(xy(snapToFrameInset({ x: 100, y: 100, w: 60, h: 40 }, frame, inset, thr)), { x: 100, y: 100 });
  assert.deepEqual(xy(snapToFrameInset({ x: 330, y: 30, w: 60, h: 40 }, frame, inset, thr)), { x: 330, y: 30 }, "ausserhalb der Karte");
  // ohne Abstand (null/negativ): kein Einrasten; Abstand 0 rastet buendig ein
  assert.deepEqual(xy(snapToFrameInset({ x: 16, y: 29, w: 60, h: 40 }, frame, -1, thr)), { x: 16, y: 29 });
  assert.deepEqual(xy(snapToFrameInset({ x: 16, y: 29, w: 60, h: 40 }, frame, 0, thr)), { x: 14, y: 27 });
  assert.equal(EDGE_INSET, 4); assert.ok(EDGE_SNAP > 0);
});

test("Anker rechts/unten (r, b) stehen im Link und bleiben beim Klemmen erhalten; alte Adressen ohne Anker bleiben gueltig", () => {
  const p = parsePos("l:0.2,0.3,rb;s:0.4,0.5,b;n:0.6,0.7,r;q:0.1,0.9");
  assert.deepEqual(p.legend, { x: 0.2, y: 0.3, ar: true, ab: true });
  assert.deepEqual(p.scale, { x: 0.4, y: 0.5, ab: true });
  assert.deepEqual(p.north, { x: 0.6, y: 0.7, ar: true });
  assert.deepEqual(p.source, { x: 0.1, y: 0.9 }, "ohne Anker wie bisher");
  assert.equal(formatPos(p), "l:0.2,0.3,rb;s:0.4,0.5,b;q:0.1,0.9;n:0.6,0.7,r");
  assert.deepEqual(parsePos(formatPos(p)), p, "hin und zurueck");
  assert.deepEqual(clampPos({ legend: { x: 0.3, y: 0.4, ar: true } }).legend, { x: 0.3, y: 0.4, ar: true }, "Klemmen behaelt den Anker");
  assert.equal(parsePos("l:0.2,0.3,x"), null, "unbekannter Anker: Teil faellt weg");
  assert.equal(parsePos("i:0.1,0.1,0.2,0.2,r"), null, "Verzeichnis kennt keine Anker");
  assert.equal(parsePos("t:0.1,0.1,r"), null, "Titel kennt keine Anker");
});

test("Quellenangabe als Kasten: eigene Breite (u) hin und zurueck, bricht in mehr Zeilen um, bleibt im Papier", () => {
  const p = parsePos("q:0.1,0.9;u:0.3");
  assert.deepEqual(p.sourcew, { w: 0.3 });
  assert.equal(formatPos(p), "q:0.1,0.9;u:0.3");
  assert.deepEqual(parsePos(formatPos(p)), p);
  assert.deepEqual(clampPos({ sourcew: { w: 5 } }).sourcew, { w: 1 }); assert.deepEqual(clampPos({ sourcew: { w: 0.001 } }).sourcew, { w: 0.08 });
  assert.equal(parsePos("u:0.3,0.4"), null, "u hat genau einen Wert");
  const line = sourceSize({ W: 420, H: 297, ui: 1 }), box = sourceSize({ sourcew: 0.2, W: 420, H: 297, ui: 1 }), narrow = sourceSize({ sourcew: 0.1, W: 420, H: 297, ui: 1 });
  assert.equal(line.lines, 1, "ohne Breite: eine Zeile");
  assert.ok(box.lines >= 2 && narrow.lines > box.lines && narrow.h > box.h && narrow.w < box.w, `Zeilen ${line.lines} / ${box.lines} / ${narrow.lines}`);
  assert.ok(Math.abs(box.w - 0.2) < 1e-9, "Breite wie gesetzt");
  assert.ok(sourceSize({ sourcew: 1, W: 420, H: 297, ui: 1 }).lines === 1, "breit genug: wieder eine Zeile");
  // blockRect und blockDims nutzen die eigene Breite
  assert.ok(Math.abs(blockRect("source", p, { W: 420, H: 297, ui: 1 }).w - 0.3) < 1e-9);
  assert.ok(blockDims({ W: 420, H: 297, ui: 1, sourcew: 0.2 }).source.h > blockDims({ W: 420, H: 297, ui: 1 }).source.h);
});
