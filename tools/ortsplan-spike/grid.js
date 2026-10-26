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

/** Spaltenbuchstabe: 0 -> A ... 25 -> Z, 26 -> AA. */
export function colLabel(i) {
  return i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26));
}

/**
 * Kurzschreibweise aller Planquadrate einer Strasse, ohne etwas wegzulassen:
 * je Spalte zusammenhaengende Zeilen als Bereich, z. B. [[3,3],[3,4],[3,5],[4,3]] -> "D4–6, E4".
 * cells: Liste [Spalte, Zeile] (0-basiert); die Ausgabe zaehlt Zeilen ab 1.
 */
export function formatCells(cells) {
  const byCol = new Map();
  for (const [c, r] of cells) {
    if (!byCol.has(c)) byCol.set(c, new Set());
    byCol.get(c).add(r);
  }
  const parts = [];
  for (const c of [...byCol.keys()].sort((a, b) => a - b)) {
    const rows = [...byCol.get(c)].sort((a, b) => a - b);
    let start = rows[0], prev = rows[0];
    const flush = () => parts.push(start === prev ? `${colLabel(c)}${start + 1}` : prev === start + 1 ? `${colLabel(c)}${start + 1}, ${colLabel(c)}${prev + 1}` : `${colLabel(c)}${start + 1}–${prev + 1}`);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] === prev + 1) { prev = rows[i]; continue; }
      flush(); start = prev = rows[i];
    }
    flush();
  }
  return parts.join(", ");
}
