// Reine Hilfen fuer das Planquadrat-Raster (ohne DOM, mit `node --test` pruefbar).

/** Schneidet eine Strecke auf das Rechteck [0,w] x [0,h] (Liang-Barsky). Gibt null zurueck, wenn nichts uebrig bleibt. */
export function clipSegment(x0, y0, x1, y1, w, h) {
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;
  const edges = [[-dx, x0], [dx, w - x0], [-dy, y0], [dy, h - y0]];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null; // parallel und ausserhalb
    } else {
      const t = q / p;
      if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; }
      else { if (t < t0) return null; if (t < t1) t1 = t; }
    }
  }
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
}

/**
 * Alle Planquadrate [Spalte, Zeile], die eine Strecke im Rahmen (w x h mm, Zellgroesse cellMm) beruehrt.
 * Die Strecke wird zuerst auf den Rahmen geschnitten, danach Zelle fuer Zelle durchlaufen (Amanatides-Woo).
 */
export function cellsOfSegment(x0, y0, x1, y1, cellMm, w, h) {
  const seg = clipSegment(x0, y0, x1, y1, w, h);
  if (!seg) return [];
  const cols = Math.ceil(w / cellMm), rows = Math.ceil(h / cellMm);
  const cell = (v, n) => Math.min(n - 1, Math.max(0, Math.floor(v / cellMm)));
  const [ax, ay, bx, by] = seg;
  let c = cell(ax, cols), r = cell(ay, rows);
  const cEnd = cell(bx, cols), rEnd = cell(by, rows);
  const dx = bx - ax, dy = by - ay;
  const stepC = Math.sign(dx), stepR = Math.sign(dy);
  let tMaxX = dx !== 0 ? ((stepC > 0 ? (c + 1) * cellMm : c * cellMm) - ax) / dx : Infinity;
  let tMaxY = dy !== 0 ? ((stepR > 0 ? (r + 1) * cellMm : r * cellMm) - ay) / dy : Infinity;
  const tDx = dx !== 0 ? cellMm / Math.abs(dx) : Infinity;
  const tDy = dy !== 0 ? cellMm / Math.abs(dy) : Infinity;
  const out = [[c, r]];
  for (let guard = cols + rows + 2; (c !== cEnd || r !== rEnd) && guard > 0; guard--) {
    if (tMaxX < tMaxY) { c += stepC; tMaxX += tDx; } else { r += stepR; tMaxY += tDy; }
    if (c < 0 || c >= cols || r < 0 || r >= rows) break;
    out.push([c, r]);
  }
  return out;
}
