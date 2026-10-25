// Planblatt: Rahmen, Planquadrate, Titel, Legende, Massstabsleiste, Nordpfeil, Strassenverzeichnis.
// Gezeichnet wird auf ein 2D-Canvas in MILLIMETERN (ctx.scale), das Karten-Canvas wird als Bild eingesetzt.
import { CSS_PX_PER_MM, ROAD_CLASSES } from "./style.js";
import { loadIcons } from "./icons.js";
import { cellsOfSegment } from "./grid.js";

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
const colLabel = (i) => (i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)));

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
  const entries = [...byName.entries()].map(([name, set]) => {
    const cells = [...set].sort((a, b) => a - b).map((k) => `${colLabel(Math.floor(k / 1000))}${(k % 1000) + 1}`);
    return { name, cells: cells.length > 4 ? `${cells.slice(0, 4).join(", ")} …` : cells.join(", ") };
  });
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
  const { map, scale, dpi, paperMm, frame, title, subtitle, meta } = opts;
  const [W, H] = paperMm;
  const cellM = opts.cellM || chooseCellM(scale);
  const cellMm = (cellM / scale) * 1000;
  const k = (dpi / 96) * CSS_PX_PER_MM; // Pixel je mm
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext("2d");
    g.scale(k, k);
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.textBaseline = "alphabetic";
    return [c, g];
  };
  const [c1, g] = mk();
  const text = (s, x, y, size, { bold = false, align = "left", color = "#111" } = {}) => {
    g.font = `${bold ? "bold " : ""}${size}px ${FONT}`; g.textAlign = align; g.fillStyle = color; g.fillText(s, x, y);
  };

  // Karte
  g.drawImage(map.getCanvas(), frame.x, frame.y, frame.w, frame.h);

  // Planquadrate
  const cols = Math.ceil(frame.w / cellMm), rows = Math.ceil(frame.h / cellMm);
  g.save();
  g.beginPath(); g.rect(frame.x, frame.y, frame.w, frame.h); g.clip();
  g.strokeStyle = "rgba(60,60,60,0.55)"; g.lineWidth = 0.13;
  for (let i = 1; i < cols; i++) { g.beginPath(); g.moveTo(frame.x + i * cellMm, frame.y); g.lineTo(frame.x + i * cellMm, frame.y + frame.h); g.stroke(); }
  for (let j = 1; j < rows; j++) { g.beginPath(); g.moveTo(frame.x, frame.y + j * cellMm); g.lineTo(frame.x + frame.w, frame.y + j * cellMm); g.stroke(); }
  g.restore();
  g.strokeStyle = "#000"; g.lineWidth = 0.35; g.strokeRect(frame.x, frame.y, frame.w, frame.h);
  const fs = 2.6;
  for (let i = 0; i < cols; i++) {
    const cx = frame.x + Math.min((i + 0.5) * cellMm, (i * cellMm + frame.w) / 2);
    text(colLabel(i), cx, frame.y - 1.6, fs, { bold: true, align: "center" });
    text(colLabel(i), cx, frame.y + frame.h + fs + 0.8, fs, { bold: true, align: "center" });
  }
  for (let j = 0; j < rows; j++) {
    const cy = frame.y + Math.min((j + 0.5) * cellMm, (j * cellMm + frame.h) / 2) + fs * 0.35;
    text(String(j + 1), frame.x - 1.8, cy, fs, { bold: true, align: "center" });
    text(String(j + 1), frame.x + frame.w + 1.8, cy, fs, { bold: true, align: "center" });
  }

  // Seitenleiste
  const sx = frame.x + frame.w + 6.5;
  const sw = W - sx - 6;
  let y = frame.y + 5;
  text(title, sx, y, 5.2, { bold: true }); y += 5.6;
  for (const line of subtitle) { text(line, sx, y, 2.5, { color: "#333" }); y += 3.3; }
  y += 2.5;

  // Legende
  text("Legende", sx, y, 3.4, { bold: true }); y += 2.2;
  const ids = [...new Set(LEGEND.map((l) => l.icon))];
  const icons = await loadIcons(ids);
  const row = 5.4;
  for (const item of LEGEND) {
    y += row;
    g.drawImage(iconToCanvas(icons.get(item.icon)), sx, y - 4.0, 4.4, 4.4);
    text(item.text, sx + 6.2, y - 0.6, 2.4);
  }
  // Gemeindegrenze
  y += row;
  g.save(); g.strokeStyle = "rgba(51,51,51,0.7)"; g.lineWidth = 0.35; g.setLineDash([2.6, 2.6]);
  g.beginPath(); g.moveTo(sx, y - 2); g.lineTo(sx + 4.4, y - 2); g.stroke(); g.restore();
  text("Gemeindegrenze", sx + 6.2, y - 0.6, 2.4);
  // Strassenklassen
  for (const c of [...ROAD_CLASSES].reverse()) {
    y += row * 0.9;
    const w = Math.max((c.realM / scale) * 1000, c.minMm);
    g.lineCap = "butt";
    g.strokeStyle = c.casing; g.lineWidth = w + 0.44; g.beginPath(); g.moveTo(sx, y - 1.7); g.lineTo(sx + 4.4, y - 1.7); g.stroke();
    g.strokeStyle = c.fill; g.lineWidth = w; g.beginPath(); g.moveTo(sx, y - 1.7); g.lineTo(sx + 4.4, y - 1.7); g.stroke();
    text(c.label, sx + 6.2, y - 0.6, 2.4);
  }
  y += 9;

  // Massstabsleiste
  const barM = nearest(NICE_BAR_M, 28, scale), barMm = (barM / scale) * 1000;
  text(`Maßstab 1 : ${scale.toLocaleString("de-DE")}`, sx, y, 2.8, { bold: true }); y += 3.4;
  for (let i = 0; i < 2; i++) {
    g.fillStyle = i === 0 ? "#000" : "#fff";
    g.fillRect(sx + (i * barMm) / 2, y, barMm / 2, 1.6);
  }
  g.strokeStyle = "#000"; g.lineWidth = 0.25; g.strokeRect(sx, y, barMm, 1.6);
  text("0", sx, y + 4.6, 2.2, { align: "center" });
  text(`${barM / 2} m`, sx + barMm / 2, y + 4.6, 2.2, { align: "center" });
  text(`${barM} m`, sx + barMm, y + 4.6, 2.2, { align: "center" });
  text(`Planquadrat = ${cellM} × ${cellM} m`, sx + barMm + 9, y + 1.4, 2.2, { color: "#333" });
  y += 11;

  // Nordpfeil
  const nx = sx + 5, ny = y + 8;
  g.fillStyle = "#000"; g.beginPath(); g.moveTo(nx, ny - 8); g.lineTo(nx + 3.2, ny + 3); g.lineTo(nx, ny + 1.2); g.closePath(); g.fill();
  g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = 0.3;
  g.beginPath(); g.moveTo(nx, ny - 8); g.lineTo(nx - 3.2, ny + 3); g.lineTo(nx, ny + 1.2); g.closePath(); g.fill(); g.stroke();
  text("N", nx, ny - 9.4, 3.2, { bold: true, align: "center" });
  const attrY = frame.y + frame.h; // Fusszeile am Boden der Leiste
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
  let ay = ny - 5;
  const stand = `Datenstand OSM: ${meta?.osm_data_until ? meta.osm_data_until.replace("T", " ").replace("Z", " UTC") : "unbekannt"}`;
  for (const l of [...wrap(stand, 2.1, sw - 14), ...wrap("© OpenStreetMap-Mitwirkende (ODbL) · Karte: Protomaps · Feuerwehrdaten: OpenFireMap", 1.9, sw - 14)]) {
    text(l, sx + 14, ay, l === stand ? 2.1 : 1.9, { color: "#333" }); ay += 2.7;
  }
  y = ny + 9;

  // Strassenverzeichnis
  const idx = streetIndex(map, frame, cellMm);
  const lineH = 2.75, fsI = 2.1, colW = (sw - 3) / 2;
  const bottom = attrY;
  text(`Straßenverzeichnis (${idx.entries.length})`, sx, y, 3.4, { bold: true }); y += 4;
  const top0 = y;
  let col = 0, yy = top0, i = 0;
  while (i < idx.entries.length) {
    if (yy + lineH > bottom) { col++; yy = top0; if (col > 1) break; }
    const e = idx.entries[i];
    text(e.name, sx + col * (colW + 3), yy, fsI);
    text(e.cells, sx + col * (colW + 3) + colW, yy, fsI, { align: "right", color: "#333" });
    yy += lineH; i++;
  }
  const pages = [c1.toDataURL("image/png")];

  // Rest des Verzeichnisses auf Seite 2
  if (i < idx.entries.length) {
    const [c2, g2] = mk();
    const t2 = (s, x, yv, size, o = {}) => { g2.font = `${o.bold ? "bold " : ""}${size}px ${FONT}`; g2.textAlign = o.align || "left"; g2.fillStyle = o.color || "#111"; g2.fillText(s, x, yv); };
    t2(`${title} – Straßenverzeichnis (Fortsetzung)`, 12, 14, 5, { bold: true });
    const n = 4, cw = (W - 24 - 3 * (n - 1) * 3) / n;
    let cc = 0, y2 = 24;
    for (; i < idx.entries.length; i++) {
      if (y2 + lineH > H - 12) { cc++; y2 = 24; if (cc >= n) break; }
      const e = idx.entries[i];
      const x0 = 12 + cc * (cw + 9);
      t2(e.name, x0, y2, fsI);
      t2(e.cells, x0 + cw, y2, fsI, { align: "right", color: "#333" });
      y2 += lineH;
    }
    pages.push(c2.toDataURL("image/png"));
  }
  return { pages, indexCount: idx.entries.length, cellM, cols, rows };
}
