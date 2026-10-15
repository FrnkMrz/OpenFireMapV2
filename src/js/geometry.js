/**
 * ==========================================================================================
 * DATEI: geometry.js
 * ZWECK: Reine Geometrie-Hilfen für Abdeckungsprüfungen (Punkt-in-Polygon, Rechteck-in-Polygon).
 *
 * WARUM EIGENE DATEI:
 * - Aus pipeline.js herausgelöst, damit europe.js dieselben Prüfungen nutzen kann, ohne dass
 *   pipeline.js und europe.js sich gegenseitig importieren (Import-Zyklus).
 * - pipeline.js exportiert die Funktionen weiterhin unverändert (Tests und Aufrufer bleiben gleich).
 *
 * HINWEIS: Keine Abhängigkeiten, keine Konfiguration, kein State.
 * ==========================================================================================
 */

/**
 * Prüft mit dem Ray-Casting-Algorithmus (Jordan Curve Theorem), ob ein Punkt (lat, lon)
 * innerhalb eines geschlossenen Polygons liegt.
 * @param {number} lat Breitengrad
 * @param {number} lon Längengrad
 * @param {Array<[number, number]>} polygon Array von [lat, lon]-Koordinaten
 * @returns {boolean}
 */
export function isPointInPolygon(lat, lon, polygon) {
  if (!Array.isArray(polygon) || polygon.length === 0 || lat == null || lon == null) {
    return false;
  }
  // Unterstützt Multi-Polygone / Listen von Polygonen
  if (Array.isArray(polygon[0]) && Array.isArray(polygon[0][0])) {
    return polygon.some(subPoly => isPointInPolygon(lat, lon, subPoly));
  }
  if (polygon.length < 3) {
    return false;
  }
  let inside = false;
  const n = polygon.length;
  let j = n - 1;

  for (let i = 0; i < n; i++) {
    const yi = polygon[i][0];
    const xi = polygon[i][1];
    const yj = polygon[j][0];
    const xj = polygon[j][1];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
    j = i;
  }

  return inside;
}

/**
 * Prüft, ob sich zwei 2D-Liniensegmente AB und CD schneiden.
 * Nutzt Vorzeichenprüfung des Kreuzprodukts (CCW) inklusive Grenzfallprüfung.
 * A=(x1, y1), B=(x2, y2), C=(x3, y3), D=(x4, y4)
 * @private
 */
function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Schneller Bounding-Box Vorfilter für die beiden Einzelsegmente
  if (
    Math.max(x1, x2) < Math.min(x3, x4) ||
    Math.min(x1, x2) > Math.max(x3, x4) ||
    Math.max(y1, y2) < Math.min(y3, y4) ||
    Math.min(y1, y2) > Math.max(y3, y4)
  ) {
    return false;
  }

  const ccw = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

  const d1 = ccw(x1, y1, x2, y2, x3, y3);
  const d2 = ccw(x1, y1, x2, y2, x4, y4);
  const d3 = ccw(x3, y3, x4, y4, x1, y1);
  const d4 = ccw(x3, y3, x4, y4, x2, y2);

  // Echter Schnittpunkt (Vorzeichenwechsel bei beiden Linien)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  // Kollineare / Grenzfall-Prüfung (Punkt liegt auf Segment)
  const onSegment = (px, py, rx, ry, sx, sy) =>
    px >= Math.min(rx, sx) && px <= Math.max(rx, sx) &&
    py >= Math.min(ry, sy) && py <= Math.max(ry, sy);

  if (d1 === 0 && onSegment(x3, y3, x1, y1, x2, y2)) return true;
  if (d2 === 0 && onSegment(x4, y4, x1, y1, x2, y2)) return true;
  if (d3 === 0 && onSegment(x1, y1, x3, y3, x4, y4)) return true;
  if (d4 === 0 && onSegment(x2, y2, x3, y3, x4, y4)) return true;

  return false;
}

/**
 * Prüft, ob ein gegebenes geografisches Rechteck [south, west, north, east] vollständig
 * innerhalb eines geschlossenen Polygons liegt.
 * 
 * Bedingungen für 'true':
 * 1. Alle 4 Ecken des Rechtecks liegen innerhalb des Polygons (Jordan Curve Ray-Casting).
 * 2. Keine Kante des Polygons schneidet eine der 4 Kanten des Rechtecks (Segment-Schnitt-Test).
 * 
 * @param {number} south Südliche Grenze (Breitengrad min)
 * @param {number} west Westliche Grenze (Längengrad min)
 * @param {number} north Nördliche Grenze (Breitengrad max)
 * @param {number} east Östliche Grenze (Längengrad max)
 * @param {Array<[number, number]>} polygon Array von [lat, lon]-Koordinaten
 * @returns {boolean} true, wenn das gesamte Rechteck im Polygon liegt
 */
export function isRectInPolygon(south, west, north, east, polygon) {
  if (!Array.isArray(polygon) || polygon.length === 0) return false;
  if (south == null || west == null || north == null || east == null) return false;
  if (south > north || west > east) return false;

  // Unterstützt Multi-Polygone / Listen von Polygonen
  if (Array.isArray(polygon[0]) && Array.isArray(polygon[0][0])) {
    return polygon.some(subPoly => isRectInPolygon(south, west, north, east, subPoly));
  }
  if (polygon.length < 3) return false;

  // Bedingung 1: Alle 4 Ecken des Rechtecks müssen im Polygon liegen
  if (!isPointInPolygon(south, west, polygon)) return false; // Süd-West
  if (!isPointInPolygon(north, west, polygon)) return false; // Nord-West
  if (!isPointInPolygon(north, east, polygon)) return false; // Nord-Ost
  if (!isPointInPolygon(south, east, polygon)) return false; // Süd-Ost

  // Bedingung 2: Keine Polygonkante darf eine der 4 Rechteckkanten schneiden
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const nextIdx = (i + 1) % n;
    const lat1 = polygon[i][0];
    const lon1 = polygon[i][1];
    const lat2 = polygon[nextIdx][0];
    const lon2 = polygon[nextIdx][1];

    if (lat1 === lat2 && lon1 === lon2) continue;

    // Bounding-Box Vorfilter: Nur Kanten prüfen, die das Rechteck räumlich überlappen
    const edgeMinLat = lat1 < lat2 ? lat1 : lat2;
    const edgeMaxLat = lat1 > lat2 ? lat1 : lat2;
    const edgeMinLon = lon1 < lon2 ? lon1 : lon2;
    const edgeMaxLon = lon1 > lon2 ? lon1 : lon2;

    if (edgeMaxLat < south || edgeMinLat > north || edgeMaxLon < west || edgeMinLon > east) {
      continue;
    }

    // Exakter Schnitt-Test mit den 4 Kanten des Rechtecks
    // Süd-Kante (lon: west -> east, lat: south)
    if (segmentsIntersect(lon1, lat1, lon2, lat2, west, south, east, south)) return false;
    // Nord-Kante (lon: west -> east, lat: north)
    if (segmentsIntersect(lon1, lat1, lon2, lat2, west, north, east, north)) return false;
    // West-Kante (lat: south -> north, lon: west)
    if (segmentsIntersect(lon1, lat1, lon2, lat2, west, south, west, north)) return false;
    // Ost-Kante (lat: south -> north, lon: east)
    if (segmentsIntersect(lon1, lat1, lon2, lat2, east, south, east, north)) return false;
  }

  return true;
}
