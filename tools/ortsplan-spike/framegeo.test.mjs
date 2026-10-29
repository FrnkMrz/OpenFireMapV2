import test from "node:test";
import assert from "node:assert/strict";
import { snapScale, resizeFromCorner, clampCenterPx } from "./framegeo.js";

test("snapScale: naechster Druckmassstab, gemessen im Verhaeltnis (nicht in Differenz)", () => {
  assert.equal(snapScale(4400), 4000);
  assert.equal(snapScale(4600), 5000);
  assert.equal(snapScale(1), 1000);
  assert.equal(snapScale(1e9), 20000);
});

const base = { aspect: 4 / 3, mpp: 1, frameWmm: 200 };

test("Ecke aufziehen: Gegenecke bleibt stehen, Massstab rastet ein", () => {
  const r = resizeFromCorner({ ...base, anchor: { x: 0, y: 0 }, pointer: { x: 200, y: 150 } });
  assert.equal(r.scale, 1000);
  assert.deepEqual([r.w, r.h], [200, 150]);
  assert.deepEqual(r.center, { x: 100, y: 75 });
});

test("Ecke aufziehen: zieht man vor allem in die Hoehe, bestimmt die Hoehe die Groesse (Seitenverhaeltnis bleibt)", () => {
  const r = resizeFromCorner({ ...base, anchor: { x: 0, y: 0 }, pointer: { x: 100, y: 300 } });
  assert.equal(r.scale, 2000);
  assert.equal(r.w / r.h, 4 / 3);
  assert.deepEqual(r.center, { x: 200, y: 150 });
});

test("Ecke nach links oben ziehen: Mitte liegt links oben von der Gegenecke", () => {
  const r = resizeFromCorner({ ...base, anchor: { x: 500, y: 500 }, pointer: { x: 300, y: 350 } });
  assert.equal(r.scale, 1000);
  assert.deepEqual(r.center, { x: 400, y: 425 });
});

test("sehr kleiner Rahmen: Massstab bleibt in der Liste, Groesse hat ein Minimum", () => {
  const r = resizeFromCorner({ ...base, anchor: { x: 10, y: 10 }, pointer: { x: 11, y: 11 } });
  assert.ok(r.scale >= 1000);
  assert.ok(r.w > 0 && r.h > 0);
});

test("clampCenterPx: Mitte des Rahmens bleibt in der Ansicht", () => {
  assert.deepEqual(clampCenterPx({ x: -50, y: 900 }, { w: 800, h: 600 }), { x: 0, y: 600 });
  assert.deepEqual(clampCenterPx({ x: 400, y: 300 }, { w: 800, h: 600 }), { x: 400, y: 300 });
});

import { resizeFree, ratioFmt, parseRatioFmt, roundUpScale, pickFreeScale, MIN_SCALE } from "./framegeo.js";

const wmm = () => 200; // Kartenfenster immer 200 mm breit
const free = { rect: { l: 100, t: 100, r: 300, b: 250 }, mpp: 1, frameWmm: wmm, pickScale: (x) => x };

test("Freie Kante rechts: nur die Breite aendert sich, linke Kante und Hoehe bleiben", () => {
  const r = resizeFree({ ...free, handle: "e", pointer: { x: 500, y: 999 } });
  assert.equal(Math.round(r.w), 400);
  assert.equal(Math.round(r.h), 150);
  assert.equal(Math.round(r.center.x - r.w / 2), 100);
  assert.equal(Math.round(r.center.y), 175);
  assert.equal(r.ratio.toFixed(3), (400 / 150).toFixed(3));
});

test("Freie Kante oben: Hoehe aendert sich, untere Kante bleibt", () => {
  const r = resizeFree({ ...free, handle: "n", pointer: { x: 0, y: 0 } });
  assert.equal(Math.round(r.h), 250);
  assert.equal(Math.round(r.center.y + r.h / 2), 250);
  assert.equal(Math.round(r.center.x), 200);
});

test("Freie Ecke oben links: untere rechte Ecke bleibt, Massstab folgt der Breite", () => {
  const r = resizeFree({ ...free, handle: "nw", pointer: { x: 0, y: 50 } });
  assert.equal(Math.round(r.center.x + r.w / 2), 300);
  assert.equal(Math.round(r.center.y + r.h / 2), 250);
  assert.equal(r.scale, (300 * 1000) / 200);
});

test("Freier Rahmen: nicht kleiner als Mindestgroesse, Seitenverhaeltnis begrenzt", () => {
  const r = resizeFree({ ...free, handle: "e", pointer: { x: 0, y: 0 } });
  assert.ok(r.w >= 24);
  const flat = resizeFree({ ...free, handle: "e", pointer: { x: 100000, y: 0 } });
  assert.equal(flat.ratio, 4);
});

test("Rundungsfunktion beim Ziehen: gerundeter Massstab bestimmt die Rahmengroesse", () => {
  const r = resizeFree({ ...free, handle: "e", pointer: { x: 400, y: 0 }, pickScale: roundUpScale });
  assert.equal(r.scale, 1500); // 300 px * 1000 / 200 mm = 1500
  assert.equal(Math.round(r.w), 300);
});

test("ratioFmt und parseRatioFmt: Hin und zurueck, Liste bleibt Liste", () => {
  assert.equal(ratioFmt(1.5), "1.5000:1");
  assert.equal(parseRatioFmt("1.5000:1"), 1.5);
  assert.equal(parseRatioFmt("3:2"), null);
  assert.equal(parseRatioFmt("1:1"), null); // Listenwert "Quadrat", kein freies Format (nur "1.0000:1" ist frei)
  assert.equal(parseRatioFmt(ratioFmt(1)), 1);
  assert.equal(parseRatioFmt("fill"), null);
  assert.equal(ratioFmt(99), "4.0000:1");
});

test("roundUpScale: naechster Standardmassstab, nie kleiner als gezeichnet", () => {
  assert.equal(roundUpScale(4010), 5000);
  assert.equal(roundUpScale(4000), 4000);
  assert.equal(roundUpScale(4000.1), 4000);
  assert.equal(roundUpScale(21111), 21200);
});

test("pickFreeScale: nie unter 1:1000 (Massstabsleiste), sonst auf 10 aufgerundet oder auf Standardmassstab", () => {
  assert.equal(MIN_SCALE, 1000);
  assert.equal(pickFreeScale(100), 1000);
  assert.equal(pickFreeScale(1), 1000);
  assert.equal(pickFreeScale(4351), 4360);
  assert.equal(pickFreeScale(4351, true), 5000);
  assert.equal(pickFreeScale(50, true), 1000);
});

test("Freier Rahmen zusammenziehen: Massstab bleibt bei mindestens 1:1000", () => {
  const r = resizeFree({ ...free, handle: "se", pointer: { x: 105, y: 105 }, pickScale: (x) => pickFreeScale(x) });
  assert.equal(r.scale, 1000);
});
