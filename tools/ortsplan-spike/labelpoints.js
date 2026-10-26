// Ersatz-Beschriftung fuer Strassen, deren Name entlang der Linie nirgends Platz fand (rein, ohne DOM, mit `node --test` pruefbar).
// Typischer Fall: Eine Strasse besteht in den Kacheln aus lauter kurzen Linienstuecken; MapLibre beschriftet jedes Stueck fuer sich
// und lässt den Namen weg, wenn er auf kein Stueck passt. Hier wird stattdessen EIN Punkt in der Mitte des laengsten Stuecks
// mit der Richtung der Strasse gesetzt (Schrift immer lesbar, nie auf dem Kopf).
import { lengthM, rotationDeg } from "./oneway.js";

const dxdy = (a, b) => {
  const lat = (((a[1] + b[1]) / 2) * Math.PI) / 180;
  return [(b[0] - a[0]) * 111320 * Math.cos(lat), (b[1] - a[1]) * 110540];
};

/** Drehung so normalisieren, dass der Text von links nach rechts oder von unten nach oben liest: Bereich [-90, 90). */
export function upright(deg) {
  let d = deg;
  while (d >= 90) d -= 180;
  while (d < -90) d += 180;
  return d;
}

/** Punkt bei Anteil t (0..1) der Linienlaenge und Richtung des Stuecks dort. */
export function pointAt(line, t = 0.5) {
  const total = lengthM(line);
  let passed = 0;
  for (let i = 1; i < line.length; i++) {
    const len = Math.hypot(...dxdy(line[i - 1], line[i]));
    if (passed + len >= total * t || i === line.length - 1) {
      const u = len > 0 ? Math.min(1, Math.max(0, (total * t - passed) / len)) : 0;
      const a = line[i - 1], b = line[i];
      return { coord: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], rot: upright(rotationDeg(a, b)) };
    }
    passed += len;
  }
  return null;
}

/** Punkt in der Mitte einer Linie und Richtung des Stuecks dort. */
export const midpointOf = (line) => pointAt(line, 0.5);

const FRACTIONS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8];

/** Abstand in Metern zum naechsten Hindernis (Unendlich ohne Hindernisse). */
export function nearestM(coord, obstacles) {
  let best = Infinity;
  for (const o of obstacles) best = Math.min(best, Math.hypot(...dxdy(coord, o)));
  return best;
}

/**
 * Stelle auf der Linie waehlen, an der der Name nicht von einem Symbol (Hydrant, Wache ...) verdeckt wird: die erste Stelle
 * (Mitte zuerst, dann abwechselnd davor und dahinter), die mindestens clearanceM von jedem Hindernis entfernt ist,
 * sonst die mit dem groessten Abstand.
 */
export function placeAvoiding(line, obstacles = [], clearanceM = 0) {
  let best = null;
  for (const t of FRACTIONS) {
    const p = pointAt(line, t);
    if (!p) continue;
    const d = nearestM(p.coord, obstacles);
    if (d >= clearanceM) return p;
    if (!best || d > best.d) best = { ...p, d };
  }
  if (!best) return null;
  const { d, ...p } = best;
  return p;
}

/**
 * features: GeoJSON-Linien mit properties.name. Rueckgabe: Liste { name, coord, rot, lengthM } je Name,
 * jeweils fuer das laengste Linienstueck dieses Namens.
 */
export function streetLabelPoints(features, { obstacles = [], clearanceOf = () => 0 } = {}) {
  const best = new Map();
  for (const f of features) {
    const name = f.properties?.name;
    const g = f.geometry;
    if (!name || !g) continue;
    const lines = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
    for (const line of lines) {
      if (line.length < 2) continue;
      const len = lengthM(line);
      if (!best.has(name) || len > best.get(name).len) best.set(name, { len, line, kind: f.properties.kind });
    }
  }
  const out = [];
  for (const [name, { len, line, kind }] of best) {
    const mid = placeAvoiding(line, obstacles, clearanceOf(name, kind));
    if (mid) out.push({ name, kind, coord: mid.coord, rot: Math.round(mid.rot * 10) / 10, lengthM: Math.round(len) });
  }
  return out;
}
