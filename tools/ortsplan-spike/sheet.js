// Planblatt: Rahmen, Planquadrate, Titel, Legende, Massstabsleiste, Nordpfeil, Strassenverzeichnis.
// Gezeichnet wird auf ein 2D-Canvas in MILLIMETERN (ctx.scale), das Karten-Canvas wird als Bild eingesetzt.
import { CSS_PX_PER_MM, ROAD_CLASSES } from "./style.js";
import { loadIcons } from "./icons.js";
import { cellsOfSegment, colLabel, formatCells } from "./grid.js";
import { paginate } from "./paginate.js";
import { planHorizontal } from "./panelplan.js";

const FONT = "'Noto Sans', 'Liberation Sans', Arial, sans-serif";
const NICE_CELLS_M = [100, 200, 250, 500, 1000, 2000, 5000];
const NICE_BAR_M = [20, 50, 100, 200, 250, 500, 1000, 2000, 5000];

function nearest(list, target, scale) {
  let best = list[0], bd = Infinity;
  for (const v of list) {
    const d = Math.abs((v / scale) * 1000 - target);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}
export const chooseCellM = (scale) => nearest(NICE_CELLS_M, 35, scale);

/** Planquadrat-Zuordnung aller benannten Strassen im Kartenausschnitt (Pixel -> mm -> Zelle). */
export function streetIndex(map, frame, cellMm) {
  const cols = Math.ceil(frame.w / cellMm), rows = Math.ceil(frame.h / cellMm);
  const byName = new Map();
  const roads = map.querySourceFeatures("p", { sourceLayer: "roads" });
  for (const f of roads) {
    const p = f.properties || {};
    if (!p.name || !["highway", "major_road", "minor_road"].includes(p.kind) || p.is_tunnel === true) continue;
    const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [];
    for (const line of lines) {
      // Alle Eckpunkte in mm im Kartenfenster; jede Teilstrecke wird auf den Rahmen geschnitten und Zelle fuer Zelle verfolgt.
      const mm = line.map(([lng, lat]) => {
        const pt = map.project([lng, lat]);
        return [pt.x / CSS_PX_PER_MM, pt.y / CSS_PX_PER_MM];
      });
      for (let i = 1; i < mm.length; i++) {
        for (const [c, r] of cellsOfSegment(mm[i - 1][0], mm[i - 1][1], mm[i][0], mm[i][1], cellMm, frame.w, frame.h)) {
          let set = byName.get(p.name);
          if (!set) byName.set(p.name, (set = new Set()));
          set.add(c * 1000 + r);
        }
      }
    }
  }
  const entries = [...byName.entries()].map(([name, set]) => ({
    name,
    cells: formatCells([...set].map((k) => [Math.floor(k / 1000), k % 1000])),
  }));
  entries.sort((a, b) => a.name.localeCompare(b.name, "de"));
  return { entries, cols, rows };
}

function iconToCanvas(data) {
  const c = document.createElement("canvas");
  c.width = data.width; c.height = data.height;
  c.getContext("2d").putImageData(data, 0, 0);
  return c;
}

const LEGEND = [
  { icon: "station", text: "Feuerwache / Feuerwehrhaus" },
  { icon: "underground", text: "Unterflurhydrant (U)" },
  { icon: "pillar", text: "Überflurhydrant (O)" },
  { icon: "wall", text: "Wandhydrant" },
  { icon: "wsh", text: "Schachthydrant WSH (W)" },
  { icon: "pipe", text: "Hydrant Typ Rohr (I)" },
  { icon: "dry_barrel", text: "Hydrant Typ Trockensäule (Ø)" },
  { icon: "plain", text: "Hydrant, Typ unbekannt" },
  { icon: "water", text: "Löschwasser (Tank, Zisterne, Teich, Saugstelle)" },
  { icon: "defibrillator", text: "Defibrillator (AED)" },
  { icon: "badge-2", text: "Objekte innerhalb 5 m (Zahl = Anzahl)" },
];

/**
 * Setzt das Blatt zusammen. opts: { map, scale, dpi, paperMm:[w,h], frame:{x,y,w,h} (mm, Kartenfenster),
 *   title, subtitle, meta:{osm_data_until}, cellM }
 * Rueckgabe: Liste von Daten-URLs (Seite 1 = Blatt, optional Seite 2 = Rest des Strassenverzeichnisses).
 */
export async function composeSheet(opts) {
  const { map, scale, dpi, paperMm, frame, title, subtitle, meta, warning } = opts;
  const side = opts.side || "right"; // Lage von Legende, Massstab und Verzeichnis: right | left | top | bottom
  const panel = opts.panel; // Bereich dafuer in mm auf dem Papier {x, y, w, h}
  const indexCols = opts.indexCols || 0; // Spaltenzahl des Verzeichnisses (0 = automatisch)
  const [W, H] = paperMm;
  const u = opts.ui || 1; // Oberflaechen-Faktor: A3 = 1, groessere Papiere skalieren Schrift und Seitenleiste mit
  const showIndex = opts.index !== false;
  const isz = opts.indexSize || 1;
  const cellM = opts.cellM || chooseCellM(scale);
  const cellMm = (cellM / scale) * 1000;
  const k = (dpi / 96) * CSS_PX_PER_MM; // Pixel je mm
  const mk = (scaleUi = 1) => {
    const c = document.createElement("canvas");
    c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext("2d");
    g.scale(k, k);
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.scale(scaleUi, scaleUi);
    g.textBaseline = "alphabetic";
    return [c, g];
  };
  const [c1, g] = mk();
  const text = (s, x, y, size, { bold = false, italic = false, align = "left", color = "#111" } = {}) => {
    g.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${size}px ${FONT}`; g.textAlign = align; g.fillStyle = color; g.fillText(s, x, y);
  };

  // Karte
  g.drawImage(map.getCanvas(), frame.x, frame.y, frame.w, frame.h);

  // Planquadrate
  const cols = Math.ceil(frame.w / cellMm), rows = Math.ceil(frame.h / cellMm);
  g.save();
  g.beginPath(); g.rect(frame.x, frame.y, frame.w, frame.h); g.clip();
  g.strokeStyle = "rgba(60,60,60,0.55)"; g.lineWidth = 0.13 * Math.sqrt(u);
  for (let i = 1; i < cols; i++) { g.beginPath(); g.moveTo(frame.x + i * cellMm, frame.y); g.lineTo(frame.x + i * cellMm, frame.y + frame.h); g.stroke(); }
  for (let j = 1; j < rows; j++) { g.beginPath(); g.moveTo(frame.x, frame.y + j * cellMm); g.lineTo(frame.x + frame.w, frame.y + j * cellMm); g.stroke(); }
  g.restore();
  g.strokeStyle = "#000"; g.lineWidth = 0.35 * Math.sqrt(u); g.strokeRect(frame.x, frame.y, frame.w, frame.h);
  const fs = 2.6 * u;
  for (let i = 0; i < cols; i++) {
    const cx = frame.x + Math.min((i + 0.5) * cellMm, (i * cellMm + frame.w) / 2);
    text(colLabel(i), cx, frame.y - 1.6 * u, fs, { bold: true, align: "center" });
    text(colLabel(i), cx, frame.y + frame.h + fs + 0.8 * u, fs, { bold: true, align: "center" });
  }
  for (let j = 0; j < rows; j++) {
    const cy = frame.y + Math.min((j + 0.5) * cellMm, (j * cellMm + frame.h) / 2) + fs * 0.35;
    text(String(j + 1), frame.x - 1.8 * u, cy, fs, { bold: true, align: "center" });
    text(String(j + 1), frame.x + frame.w + 1.8 * u, cy, fs, { bold: true, align: "center" });
  }

  // Bereich fuer Legende, Massstab und Verzeichnis (in "virtuellen mm": alles / u, damit Schrift und Abstaende auf grossen Papieren mitwachsen)
  g.save();
  g.scale(u, u);
  const Wv = W / u, Hv = H / u;
  const P = { x: panel.x / u, y: panel.y / u, w: panel.w / u, h: panel.h / u };
  const horizontal = side === "top" || side === "bottom";

  const wrap = (str, size, maxW) => {
    g.font = `${size}px ${FONT}`;
    const out = []; let cur = "";
    for (const w of str.split(" ")) {
      const t = cur ? `${cur} ${w}` : w;
      if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  };

  // Was ist im sichtbaren Kartenausschnitt wirklich vorhanden? Nur das kommt in die Legende.
  const canQuery = typeof map.queryRenderedFeatures === "function" && !!map.getLayer?.("bg");
  const present = (layerId) => (canQuery && map.getLayer(layerId) ? map.queryRenderedFeatures({ layers: [layerId] }).length > 0 : true);
  const usedIcons = new Set();
  if (canQuery && map.getLayer("fire-icons")) {
    for (const f of map.queryRenderedFeatures({ layers: ["fire-icons"] })) usedIcons.add(f.properties.icon);
    for (const id of [...usedIcons]) if (id.startsWith("badge-")) usedIcons.add("badge-2");
  }
  const legendItems = LEGEND.filter((l) => (canQuery ? usedIcons.has(l.icon) : true));
  const showOneway = canQuery && map.getLayer("oneway-arrows") ? map.queryRenderedFeatures({ layers: ["oneway-arrows"] }).length > 0 : false;
  if (showOneway) legendItems.push({ icon: "oneway", text: "Einbahnstraße (Pfeil = erlaubte Fahrtrichtung)" });
  const showBoundary = present("boundaries");
  const roadClasses = [...ROAD_CLASSES].reverse().filter((c) => present(`road-fill-${c.id}`) || present(`bridge-fill-${c.id}`));
  const icons = await loadIcons([...new Set(legendItems.map((l) => l.icon))]);

  // ---- Block 1: Titel, Untertitel, Warnung ----
  const headerBlock = (x0, y0, w) => {
    let y = y0;
    text(title, x0, y, 5.2, { bold: true }); y += 5.6;
    for (const line of subtitle) { text(line, x0, y, 2.5, { color: "#333" }); y += 3.3; }
    if (warning) {
      for (const l of wrap(warning, 2.4, w)) { text(l, x0, y, 2.4, { bold: true, color: "#b00020" }); y += 3.1; }
    }
    return y + 2.5;
  };

  // ---- Block 2: Legende (bei waagerechtem Bereich in mehreren Spalten) ----
  const ROW = 5.4, LEG_COL_W = 74;
  const legendEntries = [];
  for (const item of legendItems) legendEntries.push({ h: ROW, draw: (x, y) => { g.drawImage(iconToCanvas(icons.get(item.icon)), x, y - 4.0, 4.4, 4.4); text(item.text, x + 6.2, y - 0.6, 2.4); } });
  if (showBoundary) legendEntries.push({ h: ROW, draw: (x, y) => {
    g.save(); g.strokeStyle = "rgba(51,51,51,0.7)"; g.lineWidth = 0.35; g.setLineDash([2.6, 2.6]);
    g.beginPath(); g.moveTo(x, y - 2); g.lineTo(x + 4.4, y - 2); g.stroke(); g.restore();
    text("Gemeindegrenze", x + 6.2, y - 0.6, 2.4);
  } });
  for (const c of roadClasses) legendEntries.push({ h: ROW * 0.9, draw: (x, y) => {
    const w = Math.max((c.realM / scale) * 1000, c.minMm);
    g.lineCap = "butt";
    g.strokeStyle = c.casing; g.lineWidth = w + 0.44; g.beginPath(); g.moveTo(x, y - 1.7); g.lineTo(x + 4.4, y - 1.7); g.stroke();
    g.strokeStyle = c.fill; g.lineWidth = w; g.beginPath(); g.moveTo(x, y - 1.7); g.lineTo(x + 4.4, y - 1.7); g.stroke();
    text(c.label, x + 6.2, y - 0.6, 2.4);
  } });
  /** Zeichnet die Legende ab (x0, y0); maxH = verfuegbare Hoehe (Unendlich: eine Spalte). Rueckgabe: belegte Hoehe und Breite. */
  const legendBlock = (x0, y0, maxH, maxCols = Infinity) => {
    text("Legende", x0, y0, 3.4, { bold: true });
    const top = y0 + 2.2;
    // Spalten gleichmaessig fuellen (nicht eine volle und eine fast leere): Anzahl aus der Gesamthoehe, dann je Spalte etwa gleich viel
    const totalH = legendEntries.reduce((a, e) => a + e.h, 0);
    const nCols = Number.isFinite(maxH)
      ? Math.min(maxCols, Math.max(1, Math.ceil(totalH / Math.max(ROW, maxH - 2.2))))
      : Number.isFinite(maxCols) ? maxCols : 1;
    const cap = nCols > 1 ? Math.min(Number.isFinite(maxH) ? maxH - 2.2 : Infinity, totalH / nCols + ROW * 0.6) : Infinity;
    let col = 0, used = 0, maxUsed = 0;
    for (const e of legendEntries) {
      if (used > 0 && used + e.h > cap) { col++; used = 0; }
      used += e.h;
      maxUsed = Math.max(maxUsed, used);
      e.draw(x0 + col * LEG_COL_W, top + used);
    }
    return { h: 2.2 + maxUsed, w: (col + 1) * LEG_COL_W };
  };

  // ---- Block 3: Massstabsleiste, Nordpfeil, Datenstand ----
  const scaleBlock = (x0, y0, w) => {
    let y = y0;
    const barM = nearest(NICE_BAR_M, 28 * u, scale), barMm = (barM / scale) * 1000 / u; // Ziel: 28 "virtuelle" mm, also 28 mm auf A3 und 56 mm auf A1
    text(`Maßstab 1 : ${scale.toLocaleString("de-DE")}`, x0, y, 2.8, { bold: true }); y += 3.4;
    for (let i = 0; i < 2; i++) {
      g.fillStyle = i === 0 ? "#000" : "#fff";
      g.fillRect(x0 + (i * barMm) / 2, y, barMm / 2, 1.6);
    }
    g.strokeStyle = "#000"; g.lineWidth = 0.25; g.strokeRect(x0, y, barMm, 1.6);
    text("0", x0, y + 4.6, 2.2, { align: "center" });
    text(`${barM / 2} m`, x0 + barMm / 2, y + 4.6, 2.2, { align: "center" });
    text(`${barM} m`, x0 + barMm, y + 4.6, 2.2, { align: "center" });
    text(`Planquadrat = ${cellM} × ${cellM} m`, x0, y + 8.4, 2.2, { color: "#333" });
    y += 15;
    // Nordpfeil
    const nx = x0 + 5, ny = y + 8;
    g.fillStyle = "#000"; g.beginPath(); g.moveTo(nx, ny - 8); g.lineTo(nx + 3.2, ny + 3); g.lineTo(nx, ny + 1.2); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = 0.3;
    g.beginPath(); g.moveTo(nx, ny - 8); g.lineTo(nx - 3.2, ny + 3); g.lineTo(nx, ny + 1.2); g.closePath(); g.fill(); g.stroke();
    text("N", nx, ny - 9.4, 3.2, { bold: true, align: "center" });
    let ay = ny - 5;
    const stand = `Datenstand OSM: ${meta?.osm_data_until ? meta.osm_data_until.replace("T", " ").replace("Z", " UTC") : "unbekannt"}`;
    for (const l of [...wrap(stand, 2.1, w - 14), ...wrap("© OpenStreetMap-Mitwirkende (ODbL) · Karte: Protomaps · Feuerwehrdaten: OpenFireMap", 1.9, w - 14)]) {
      text(l, x0 + 14, ay, l === stand ? 2.1 : 1.9, { color: "#333" }); ay += 2.7;
    }
    return Math.max(ny + 9, ay + 2) - y0;
  };

  // ---- Block 4: Strassenverzeichnis ----
  const pages = [];
  let indexCount = 0;
  const lineH = 2.75 * isz, fsI = 2.1 * isz;
  const idx = showIndex ? streetIndex(map, frame, cellMm) : { entries: [] };
  indexCount = idx.entries.length;
  const nextCols = 4, nextTop = 24, gapCol = 9;
  const nextW = (Wv - 24 - gapCol * (nextCols - 1)) / nextCols;
  g.font = `${fsI}px ${FONT}`;
  const measure = (str) => g.measureText(str).width;
  const wrapName = (name, maxW) => {
    const out = [];
    let cur = "";
    for (const word of name.split(" ")) {
      const t = cur ? `${cur} ${word}` : word;
      if (measure(t) <= maxW) { cur = t; continue; }
      if (cur) { out.push(cur); cur = ""; }
      let w = word;
      while (measure(w) > maxW && w.length > 2) {
        let k = w.length - 1;
        while (k > 1 && measure(`${w.slice(0, k)}-`) > maxW) k--;
        out.push(`${w.slice(0, k)}-`);
        w = w.slice(k);
      }
      cur = w;
    }
    if (cur) out.push(cur);
    return out;
  };
  // Planquadrate: bei vielen Zellen mehrzeilig, rechtsbuendig, hoechstens halbe Spaltenbreite
  const wrapRefs = (refs, maxW) => {
    const out = [];
    let cur = "";
    for (const part of refs.split(", ")) {
      const t = cur ? `${cur}, ${part}` : part;
      if (measure(t) <= maxW || !cur) cur = t; else { out.push(`${cur},`); cur = part; }
    }
    if (cur) out.push(cur);
    return out;
  };
  const fitCache = new Map();
  const fitW = (i, width) => {
    const key = `${i}:${width.toFixed(2)}`;
    let v = fitCache.get(key);
    if (!v) {
      const e = idx.entries[i];
      g.font = `${fsI}px ${FONT}`;
      const refs = wrapRefs(e.cells, width * 0.5);
      const refW = Math.max(...refs.map(measure));
      const lines = wrapName(e.name, Math.max(8, width - refW - 2));
      v = { lines, refs, refW, h: Math.max(lines.length, refs.length) * lineH, width };
      fitCache.set(key, v);
    }
    return v;
  };
  // Eintrag zeichnen: Name links, Planquadrate rechts, dazwischen eine Punktlinie (Leitlinie), damit das Auge nicht springen muss
  const drawEntry = (gc, tf, f, x0, y) => {
    f.lines.forEach((l, k) => tf(l, x0, y + k * lineH, fsI));
    f.refs.forEach((l, k) => tf(l, x0 + f.width, y + k * lineH, fsI, { align: "right", color: "#333" }));
    gc.font = `${fsI}px ${FONT}`;
    const nameEnd = x0 + gc.measureText(f.lines[0]).width + 1.2;
    const refStart = x0 + f.width - gc.measureText(f.refs[0]).width - 1.2;
    if (f.lines.length === 1 && refStart - nameEnd > 2.5) {
      gc.save(); gc.strokeStyle = "#8c8c8c"; gc.lineWidth = 0.16 * isz; gc.lineCap = "round"; gc.setLineDash([0.01, 0.75 * isz]);
      gc.beginPath(); gc.moveTo(nameEnd, y - 0.45 * isz); gc.lineTo(refStart, y - 0.45 * isz); gc.stroke(); gc.restore();
    }
  };
  /** Zeichnet das Verzeichnis in den Bereich (x0, y0, w, h) auf Seite 1 und liefert die Aufteilung fuer Folgeseiten. */
  const indexBlock = (x0, y0, w, h) => {
    text(`Straßenverzeichnis (${idx.entries.length})`, x0, y0, 3.4, { bold: true });
    const top0 = y0 + 4, avail = Math.max(lineH, h - 4);
    // Spaltenzahl: moeglichst schmale Spalten (Ziel etwa 55 mm), damit Name und Planquadrate nahe beieinander stehen
    const targetCols = indexCols > 0 ? indexCols : Math.max(1, Math.round(w / 55));
    const widthN = (n) => (w - 3 * (n - 1)) / n;
    const planFor = (n) => {
      const wn = widthN(n);
      const heightOf = (i, first) => fitW(i, first ? wn : nextW).h;
      let sum = 0;
      for (let i = 0; i < idx.entries.length; i++) sum += fitW(i, wn).h;
      // ausgewogene Spalten: gleiche Hoehe, wenn alles auf die Seite passt
      const balanced = Math.min(avail, Math.ceil(sum / n / lineH) * lineH + lineH * 2);
      let lay = paginate(idx.entries.length, heightOf, Array(n).fill(balanced), Array(nextCols).fill(Hv - 12 - nextTop));
      if (lay.length > 1) lay = paginate(idx.entries.length, heightOf, Array(n).fill(avail), Array(nextCols).fill(Hv - 12 - nextTop));
      return { lay, n, wn };
    };
    let chosen = planFor(targetCols);
    if (indexCols === 0) for (let n = targetCols + 1; n <= targetCols + 2 && chosen.lay.length > 1; n++) chosen = planFor(n);
    chosen.lay[0].forEach(([from, to], ci) => {
      let yy = top0;
      for (let i = from; i < to; i++) { const f = fitW(i, chosen.wn); drawEntry(g, text, f, x0 + ci * (chosen.wn + 3), yy); yy += f.h; }
    });
    return chosen.lay;
  };

  // ---- Anordnung ----
  let layout = [[]];
  if (!horizontal) {
    let y = headerBlock(P.x, P.y + 5, P.w);
    y += legendBlock(P.x, y, Infinity).h + 9;
    y += scaleBlock(P.x, y, P.w);
    if (showIndex) layout = indexBlock(P.x, y, P.w, P.y + P.h - y);
  } else {
    // waagerecht: die Bloecke muessen zusammen in die Breite passen (siehe panelplan.js)
    const SCALE_W = 70, GAP = 6, MIN_INDEX_W = 55;
    const headH = headerBlock(P.x, P.y + 5, 70) - (P.y + 5);
    const totalLegH = legendEntries.reduce((a, e) => a + e.h, 0);
    const wantCols = Math.max(1, Math.ceil(totalLegH / Math.max(ROW, P.h - headH - 4 - 2.2)));
    const plan = planHorizontal({ panelW: P.w, legendCols: wantCols, legColW: LEG_COL_W, scaleW: SCALE_W, minIndexW: MIN_INDEX_W, gap: GAP, showIndex });
    if (plan.mode === "row") {
      legendBlock(P.x, P.y + 5 + headH, P.h - headH - 4, plan.legendCols);
      scaleBlock(P.x + plan.legendW + GAP, P.y + 5, SCALE_W - GAP);
      if (showIndex) layout = indexBlock(P.x + plan.legendW + GAP + SCALE_W + GAP, P.y + 5, plan.indexW, P.h - 5);
    } else {
      // zu schmal fuer nebeneinander: Titel und Legende oben, darunter der Massstab; das Verzeichnis steht auf den Folgeseiten
      const legend2 = legendBlock(P.x, P.y + 5 + headH, Infinity, plan.legendCols);
      const yScale = P.y + 5 + headH + legend2.h + 6;
      scaleBlock(P.x, yScale, Math.min(P.w, SCALE_W + 40));
      if (showIndex) {
        text("Straßenverzeichnis: siehe Folgeseite", P.x + plan.legendW + GAP, P.y + 5 + 3.4, 3.0, { bold: true });
        layout = paginate(idx.entries.length, (i) => fitW(i, nextW).h, [], Array(nextCols).fill(Hv - 12 - nextTop));
      }
    }
  }
  g.restore();
  pages.push(c1.toDataURL("image/png"));

  // Folgeseiten: vier Spalten, so viele Seiten wie noetig, damit kein Eintrag verloren geht
  for (let p = 1; p < layout.length; p++) {
    const [c2, g2] = mk(u);
    const t2 = (s, x, yv, size, o = {}) => { g2.font = `${o.bold ? "bold " : ""}${size}px ${FONT}`; g2.textAlign = o.align || "left"; g2.fillStyle = o.color || "#111"; g2.fillText(s, x, yv); };
    t2(`${title} – Straßenverzeichnis (Fortsetzung, Seite ${p + 1})`, 12, 14, 5, { bold: true });
    layout[p].forEach(([from, to], ci) => {
      let yy = nextTop;
      for (let i = from; i < to; i++) { const f = fitW(i, nextW); drawEntry(g2, t2, f, 12 + ci * (nextW + gapCol), yy); yy += f.h; }
    });
    pages.push(c2.toDataURL("image/png"));
  }
  return { pages, indexCount, cellM, cols, rows };
}
