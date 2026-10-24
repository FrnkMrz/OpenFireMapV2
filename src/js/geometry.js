/**
 * ==========================================================================================
 * DATEI: geometry.js
 * ZWECK: Reine Geometrie-Hilfen für Abdeckungsprüfungen (Punkt-in-Polygon, Rechteck-in-Polygon, Rechteck-Polygon-Schnitt).
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

/**
 * Prüft, ob sich ein geografisches Rechteck [south, west, north, east] und ein Polygon berühren oder überlappen
 * (irgendein gemeinsamer Punkt). Anders als isRectInPolygon reicht schon ein Teil des Rechtecks.
 * Wahr, wenn (1) ein Polygonpunkt im Rechteck liegt, (2) eine Rechteckecke im Polygon liegt (Rechteck ganz oder
 * teilweise darin, auch wenn das Polygon klein ist) oder (3) eine Polygonkante eine Rechteckkante schneidet.
 *
 * @param {number} south
 * @param {number} west
 * @param {number} north
 * @param {number} east
 * @param {Array<[number, number]>|Array<Array<[number, number]>>} polygon [lat, lon]-Ring oder Liste von Ringen
 * @returns {boolean}
 */
export function isRectIntersectingPolygon(south, west, north, east, polygon) {
  if (!Array.isArray(polygon) || polygon.length === 0) return false;
  if (south == null || west == null || north == null || east == null) return false;
  if (south > north || west > east) return false;

  if (Array.isArray(polygon[0]) && Array.isArray(polygon[0][0])) {
    return polygon.some((subPoly) => isRectIntersectingPolygon(south, west, north, east, subPoly));
  }
  if (polygon.length < 3) return false;

  const n = polygon.length;
  // (1) Ein Polygonpunkt im Rechteck
  for (let i = 0; i < n; i++) {
    const lat = polygon[i][0];
    const lon = polygon[i][1];
    if (lat >= south && lat <= north && lon >= west && lon <= east) return true;
  }
  // (2) Eine Rechteckecke im Polygon
  if (isPointInPolygon(south, west, polygon) || isPointInPolygon(north, west, polygon) ||
      isPointInPolygon(north, east, polygon) || isPointInPolygon(south, east, polygon)) return true;
  // (3) Eine Polygonkante schneidet eine Rechteckkante
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const lat1 = polygon[i][0];
    const lon1 = polygon[i][1];
    const lat2 = polygon[next][0];
    const lon2 = polygon[next][1];
    if (lat1 === lat2 && lon1 === lon2) continue;
    if (Math.max(lat1, lat2) < south || Math.min(lat1, lat2) > north || Math.max(lon1, lon2) < west || Math.min(lon1, lon2) > east) continue;
    if (segmentsIntersect(lon1, lat1, lon2, lat2, west, south, east, south) ||
        segmentsIntersect(lon1, lat1, lon2, lat2, west, north, east, north) ||
        segmentsIntersect(lon1, lat1, lon2, lat2, west, south, west, north) ||
        segmentsIntersect(lon1, lat1, lon2, lat2, east, south, east, north)) return true;
  }
  return false;
}

// Länge eines Breitengrads in km (Kugelnäherung, reicht für die Größenbegrenzung des Exports)
const KM_PER_DEGREE = 111.32;

/**
 * Seitenlängen eines Rechtecks in km (Breite entlang des Breitenkreises in der Mitte, Höhe entlang des Meridians).
 * @param {{south:number, west:number, north:number, east:number}} rect
 * @returns {{widthKm:number, heightKm:number}}
 */
export function rectSizeKm({ south, west, north, east }) {
  const midLat = (south + north) / 2;
  return {
    widthKm: Math.abs(east - west) * KM_PER_DEGREE * Math.cos((midLat * Math.PI) / 180),
    heightKm: Math.abs(north - south) * KM_PER_DEGREE
  };
}

/**
 * Prüft, ob beide Seiten eines Rechtecks höchstens `maxKm` lang sind (0,5 % Toleranz gegen Rundung).
 */
export function isRectWithinKm(rect, maxKm) {
  const { widthKm, heightKm } = rectSizeKm(rect);
  return widthKm <= maxKm * 1.005 && heightKm <= maxKm * 1.005;
}

/**
 * Verkleinert einen Versatz (Grad Breite, Grad Länge) bei `lat` so, dass keine Seite länger als `maxKm` ist.
 * Das Seitenverhältnis bleibt erhalten (wichtig für die DIN-Formate).
 * @returns {{dLat:number, dLng:number, clamped:boolean}}
 */
export function clampOffsetToKm(dLat, dLng, lat, maxKm) {
  const heightKm = Math.abs(dLat) * KM_PER_DEGREE;
  const widthKm = Math.abs(dLng) * KM_PER_DEGREE * Math.cos((lat * Math.PI) / 180);
  const longest = Math.max(heightKm, widthKm);
  if (longest <= maxKm) return { dLat, dLng, clamped: false };
  const f = maxKm / longest;
  return { dLat: dLat * f, dLng: dLng * f, clamped: true };
}
