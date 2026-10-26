import test from "node:test";
import assert from "node:assert/strict";
import { arrowsAlong, rotationDeg, lengthM } from "./oneway.js";

const LAT = 49.5, LON = 11.3;
const mLon = 111320 * Math.cos((LAT * Math.PI) / 180), mLat = 110540;
const line = (dxM, dyM) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[LON, LAT], [LON + dxM / mLon, LAT + dyM / mLat]] } });
const fc = (...f) => ({ type: "FeatureCollection", features: f });

test("Drehwinkel: Osten 0, Norden -90, Westen 180, Sueden 90 (Grad im Uhrzeigersinn, Karte nach Norden)", () => {
  const A = [LON, LAT];
  assert.ok(Math.abs(rotationDeg(A, [LON + 0.001, LAT])) < 0.01);
  assert.ok(Math.abs(rotationDeg(A, [LON, LAT + 0.001]) + 90) < 0.01);
  assert.ok(Math.abs(Math.abs(rotationDeg(A, [LON - 0.001, LAT])) - 180) < 0.01);
  assert.ok(Math.abs(rotationDeg(A, [LON, LAT - 0.001]) - 90) < 0.01);
});

test("Linienlaenge in Metern", () => {
  assert.ok(Math.abs(lengthM(line(100, 0).geometry.coordinates) - 100) < 0.5);
  assert.ok(Math.abs(lengthM(line(30, 40).geometry.coordinates) - 50) < 0.5);
});

test("Pfeile zeigen in Fahrtrichtung der Koordinaten (Richtung der Linie, nicht Himmelsrichtung geraten)", () => {
  const east = arrowsAlong(fc(line(100, 0)), 1000).features;
  const west = arrowsAlong(fc(line(-100, 0)), 1000).features;
  assert.ok(east.every((f) => Math.abs(f.properties.rot) < 0.5));
  assert.ok(west.every((f) => Math.abs(Math.abs(f.properties.rot) - 180) < 0.5));
});

test("Anzahl: etwa ein Pfeil je Abstand (16 mm Papier), mindestens einer je Linie", () => {
  assert.equal(arrowsAlong(fc(line(100, 0)), 1000).features.length, 6); // 100 m / 16 m
  assert.equal(arrowsAlong(fc(line(100, 0)), 5000).features.length, 1); // 80 m Abstand: ein Pfeil in der Mitte
  assert.equal(arrowsAlong(fc(line(30, 0)), 5000).features.length, 1); // kurze Strasse bekommt einen Pfeil
});

test("zu kurze Linien (unter 3,5 mm Papier) bekommen keinen Pfeil", () => {
  assert.equal(arrowsAlong(fc(line(10, 0)), 5000).features.length, 0); // 10 m = 2 mm
  assert.equal(arrowsAlong(fc(line(20, 0)), 5000).features.length, 1); // 20 m = 4 mm
});

test("Pfeile liegen auf der Linie und gleichmaessig verteilt", () => {
  const pts = arrowsAlong(fc(line(160, 0)), 1000).features; // 10 Pfeile im Abstand 16 m, Mitte je Abschnitt
  assert.equal(pts.length, 10);
  const xs = pts.map((p) => (p.geometry.coordinates[0] - LON) * mLon);
  assert.ok(Math.abs(xs[0] - 8) < 0.3 && Math.abs(xs[9] - 152) < 0.3);
  assert.ok(pts.every((p) => Math.abs(p.geometry.coordinates[1] - LAT) < 1e-9));
});

test("Linie mit Knick: Pfeil im zweiten Abschnitt dreht mit", () => {
  const l = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[LON, LAT], [LON + 100 / mLon, LAT], [LON + 100 / mLon, LAT + 100 / mLat]] } };
  const pts = arrowsAlong(fc(l), 1000).features;
  assert.ok(pts.some((p) => Math.abs(p.properties.rot) < 0.5)); // erster Abschnitt: Osten
  assert.ok(pts.some((p) => Math.abs(p.properties.rot + 90) < 0.5)); // zweiter Abschnitt: Norden
});

test("leere und ungueltige Eingaben", () => {
  assert.equal(arrowsAlong(fc(), 1000).features.length, 0);
  assert.equal(arrowsAlong({ type: "FeatureCollection", features: [{ geometry: { type: "Point", coordinates: [0, 0] } }] }, 1000).features.length, 0);
});
