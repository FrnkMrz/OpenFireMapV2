import test from "node:test";
import assert from "node:assert/strict";
import { streetLabelPoints, midpointOf, upright, placeAvoiding, nearestM, clipLineToBox } from "./labelpoints.js";

const LAT = 49.5, LON = 11.3;
const mLon = 111320 * Math.cos((LAT * Math.PI) / 180), mLat = 110540;
const line = (...pts) => pts.map(([x, y]) => [LON + x / mLon, LAT + y / mLat]);
const feat = (name, ...lines) => ({ properties: { name }, geometry: lines.length === 1 ? { type: "LineString", coordinates: lines[0] } : { type: "MultiLineString", coordinates: lines } });

test("upright: Schrift nie auf dem Kopf, Bereich [-90, 90)", () => {
  assert.equal(upright(0), 0);
  assert.equal(upright(180), 0);
  assert.equal(upright(-180), 0);
  assert.equal(upright(90), -90);
  assert.equal(upright(-90), -90);
  assert.equal(upright(135), -45);
  assert.equal(upright(-135), 45);
});

test("Mitte einer geraden Linie, Richtung Osten", () => {
  const m = midpointOf(line([0, 0], [100, 0]));
  assert.ok(Math.abs((m.coord[0] - LON) * mLon - 50) < 0.2);
  assert.ok(Math.abs(m.rot) < 0.5);
});

test("entgegengesetzte Linienrichtung ergibt dieselbe lesbare Schrift", () => {
  const east = midpointOf(line([0, 0], [100, 0])).rot;
  const west = midpointOf(line([100, 0], [0, 0])).rot;
  assert.ok(Math.abs(east - west) < 0.5);
});

test("Linie mit Knick: Mitte liegt im richtigen Abschnitt", () => {
  // 100 m nach Osten, dann 100 m nach Norden: Mitte = Knick; Richtung des Stuecks dort (zweites Stueck, Norden = -90)
  const m = midpointOf(line([0, 0], [100, 0], [100, 100]));
  assert.ok(Math.abs((m.coord[0] - LON) * mLon - 100) < 0.5);
  const m2 = midpointOf(line([0, 0], [100, 0], [100, 300]));
  assert.ok(Math.abs(m2.rot + 90) < 0.5); // Mitte (200 m) liegt im Nordstueck
});

test("pro Name das laengste Stueck, auch aus MultiLineString", () => {
  const pts = streetLabelPoints([
    feat("Ringstraße", line([0, 0], [10, 0])),
    feat("Ringstraße", line([0, 50], [80, 50]), line([0, 100], [20, 100])),
    feat("Kurzweg", line([0, 0], [5, 5])),
  ]);
  assert.equal(pts.length, 2);
  const ring = pts.find((p) => p.name === "Ringstraße");
  assert.ok(Math.abs(ring.lengthM - 80) < 1);
  assert.ok(Math.abs((ring.coord[1] - LAT) * mLat - 50) < 0.5);
});

test("ohne Name oder ohne Linie: nichts", () => {
  assert.equal(streetLabelPoints([{ properties: {}, geometry: { type: "LineString", coordinates: line([0, 0], [1, 1]) } }]).length, 0);
  assert.equal(streetLabelPoints([{ properties: { name: "X" }, geometry: { type: "Point", coordinates: [0, 0] } }]).length, 0);
});

test("Hydrant mitten auf der Linie: der Name rutscht zur Seite (Ringstraße mit verdecktem ß)", () => {
  const l = line([0, 0], [100, 0]);
  const hydrant = [LON + 50 / mLon, LAT]; // genau in der Mitte
  const p = placeAvoiding(l, [hydrant], 12);
  assert.ok(nearestM(p.coord, [hydrant]) >= 12);
  assert.ok(Math.abs(p.rot) < 0.5);
});

test("ohne Hindernis bleibt es bei der Mitte", () => {
  const p = placeAvoiding(line([0, 0], [100, 0]), [], 12);
  assert.ok(Math.abs((p.coord[0] - LON) * mLon - 50) < 0.3);
});

test("Hindernisse ueberall: die Stelle mit dem groessten Abstand", () => {
  const l = line([0, 0], [100, 0]);
  const obs = [0, 20, 40, 50, 60, 80, 100].map((x) => [LON + x / mLon, LAT]);
  const p = placeAvoiding(l, obs, 500);
  const d = nearestM(p.coord, obs);
  assert.ok(d >= 9, `Abstand ${d}`); // Kandidaten liegen bei 20..80 m; beste Stelle hat etwa 10 m Abstand
});

test("streetLabelPoints nutzt Hindernisse und die Freiraum-Funktion je Name", () => {
  const f = [feat("Ringstraße", line([0, 0], [100, 0]))];
  const pts = streetLabelPoints(f, { obstacles: [[LON + 50 / mLon, LAT]], clearanceOf: (name) => (name === "Ringstraße" ? 12 : 0) });
  assert.ok(Math.abs((pts[0].coord[0] - LON) * mLon - 50) >= 10);
});

const BOX = [LON, LAT, LON + 100 / mLon, LAT + 100 / mLat]; // 100 m x 100 m
const sumLen = (pieces) => pieces.reduce((s, p) => s + Math.hypot((p[p.length - 1][0] - p[0][0]) * mLon, (p[p.length - 1][1] - p[0][1]) * mLat), 0);

test("clipLineToBox: Linie durchquert den Ausschnitt, beide Endpunkte ausserhalb (Fund aus dem Codex-Review)", () => {
  const pieces = clipLineToBox(line([-50, 50], [150, 50]), BOX);
  assert.equal(pieces.length, 1);
  assert.ok(Math.abs(sumLen(pieces) - 100) < 0.5);
});

test("clipLineToBox: Linie komplett ausserhalb ergibt nichts", () => {
  assert.equal(clipLineToBox(line([-50, -50], [-10, 200]), BOX).length, 0);
});

test("clipLineToBox: Linie, die den Ausschnitt verlaesst und wieder betritt, ergibt zwei Stuecke", () => {
  const pieces = clipLineToBox(line([10, 10], [10, 150], [60, 150], [60, 20]), BOX);
  assert.equal(pieces.length, 2);
});

test("Name an der Stelle im sichtbaren Teil: Mitte des geschnittenen Stuecks liegt im Ausschnitt (nicht die der ganzen Linie)", () => {
  // Linie 400 m lang, nur das erste Stueck liegt im Ausschnitt; Mitte der ganzen Linie waere ausserhalb
  const clipped = clipLineToBox(line([0, 50], [400, 50]), BOX);
  const pts = streetLabelPoints([{ properties: { name: "Weg" }, geometry: { type: "MultiLineString", coordinates: clipped } }]);
  assert.equal(pts.length, 1);
  const x = (pts[0].coord[0] - LON) * mLon;
  assert.ok(x > 0 && x < 100, `x=${x}`);
});
