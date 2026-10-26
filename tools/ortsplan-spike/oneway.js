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
