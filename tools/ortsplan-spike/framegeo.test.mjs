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
