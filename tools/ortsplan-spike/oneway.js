// Einbahn-Pfeile als eigene Punkte entlang der Linien (rein, ohne DOM, mit `node --test` pruefbar).
// Warum nicht symbol-placement "line": MapLibre setzt dort den ersten Anker erst nach einem festen Abstand; kurze Linien
// (Strassen zwischen zwei Kreuzungen) bekommen dann gar keinen Pfeil.

const M_PER_DEG_LAT = 110540;
const M_PER_DEG_LON_EQ = 111320;

const dxdy = (a, b) => {
  const lat = (((a[1] + b[1]) / 2) * Math.PI) / 180;
  return [(b[0] - a[0]) * M_PER_DEG_LON_EQ * Math.cos(lat), (b[1] - a[1]) * M_PER_DEG_LAT];
};

/** Drehwinkel fuer icon-rotate: Grad im Uhrzeigersinn, 0 = nach Osten zeigend (Symbol zeigt im Bild nach rechts), Karte nach Norden. */
export function rotationDeg(a, b) {
  const [dx, dy] = dxdy(a, b);
  return -(Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Linienlaenge in Metern. */
export function lengthM(line) {
  let sum = 0;
  for (let i = 1; i < line.length; i++) sum += Math.hypot(...dxdy(line[i - 1], line[i]));
  return sum;
}

/**
 * Pfeil-Punkte fuer alle Linien (Koordinaten in Fahrtrichtung). Abstand und Mindestlaenge sind Papier-Millimeter:
 * Auf dem Blatt stehen die Pfeile etwa gleich dicht, egal bei welchem Massstab. Jede Linie ab Mindestlaenge bekommt
 * mindestens einen Pfeil in der Mitte.
 */
export function arrowsAlong(collection, scale, { spacingMm = 16, minLenMm = 3.5 } = {}) {
  const spacing = (spacingMm * scale) / 1000;
  const minLen = (minLenMm * scale) / 1000;
  const features = [];
  for (const f of collection.features || []) {
    const line = f.geometry?.type === "LineString" ? f.geometry.coordinates : null;
    if (!line || line.length < 2) continue;
    const total = lengthM(line);
    if (!(total >= minLen)) continue;
    const n = Math.max(1, Math.round(total / spacing));
    // Zielabstaende entlang der Linie, dann Segment suchen und interpolieren
    let seg = 1, passed = 0;
    for (let i = 0; i < n; i++) {
      const target = ((i + 0.5) * total) / n;
      for (;;) {
        const len = Math.hypot(...dxdy(line[seg - 1], line[seg]));
        if (passed + len >= target || seg === line.length - 1) {
          const t = len > 0 ? Math.min(1, Math.max(0, (target - passed) / len)) : 0;
          const a = line[seg - 1], b = line[seg];
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] },
            properties: { rot: Math.round(rotationDeg(a, b) * 10) / 10 },
          });
          break;
        }
        passed += len;
        seg++;
      }
    }
  }
  return { type: "FeatureCollection", features };
}

/** Strassenarten, auf denen Einbahn-Pfeile stehen: Gemeindestrassen (Wohn-, Spiel-/verkehrsberuhigte und Erschliessungsstrassen). */
export const ARROW_HIGHWAYS = new Set(["residential", "living_street", "service"]);

/** Nur Linien der Gemeindestrassen; Verbindungs-, Kreis-, Staats- und Bundesstrassen bekommen keine Pfeile. */
export function onlyLocalStreets(collection, allowed = ARROW_HIGHWAYS) {
  return { type: "FeatureCollection", features: (collection.features || []).filter((f) => allowed.has(f.properties?.hw)) };
}

// Nur Strassen fuer Kraftfahrzeuge; Autobahnen, Wege, Fussgaengerbereiche und Parkplatzgassen bleiben ohne Pfeil
const MOTOR_HIGHWAYS = new Set(["trunk", "trunk_link", "primary", "primary_link", "secondary", "secondary_link", "tertiary", "tertiary_link",
  "unclassified", "residential", "living_street", "service", "road"]);

/**
 * OSM-Weg (Overpass `out geom tags`) in ein Einbahn-Feature umwandeln oder null, wenn er keinen Pfeil bekommen soll.
 * Richtung = Knotenreihenfolge im Weg, bei oneway=-1 umgekehrt (Kreisverkehr: wie gemappt). Tunnel entfallen: der Stil zeichnet
 * sie nicht (NOT_TUNNEL in style.js), Pfeile stuenden sonst allein ueber der Flaeche.
 */
export function featureFromWay(w) {
  const t = w?.tags || {};
  if (!MOTOR_HIGHWAYS.has(t.highway) || t.service === "parking_aisle") return null;
  if (t.tunnel && t.tunnel !== "no") return null;
  let pts = (w.geometry || []).map((g) => [g.lon, g.lat]);
  if (pts.length < 2) return null;
  if (t.oneway === "-1") pts = pts.reverse();
  return { type: "Feature", geometry: { type: "LineString", coordinates: pts }, properties: { id: w.id, hw: t.highway } };
}
