// Planblatt: Rahmen, Planquadrate, Titel, Legende, Massstabsleiste, Nordpfeil, Strassenverzeichnis.
// Gezeichnet wird auf ein 2D-Canvas in MILLIMETERN (ctx.scale), das Karten-Canvas wird als Bild eingesetzt.
import { CSS_PX_PER_MM, ROAD_CLASSES } from "./style.js";
import { loadIcons } from "./icons.js";
import { cellsOfSegment, colLabel, formatCells } from "./grid.js";
import { makeFitter, planBlock, drawColumns } from "./indexblock.js";
import { fitText } from "./fittext.js";
import { planHorizontal } from "./panelplan.js";
import { ATTRIBUTION_LINES, OSM_NOTICE, SRC_SIZE, SRC_STEP, SRC_FOOT_SIZE, standLine, attributionStrip } from "./attribution.js";

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
  { icon: "water_tank", text: "Löschwasserbehälter" },
  { icon: "closed_water_tank", text: "Löschwasserbehälter, abgedeckt" },
  { icon: "open_water", text: "Offenes Löschwasser (Teich, Becken)" },
  { icon: "suction_point", text: "Saugstelle" },
  { icon: "groundwater_pipe", text: "Rohrhydrant, Grundwasser (I)" },
  { icon: "defibrillator", text: "Defibrillator (AED)" },
  { icon: "badge-2", text: "Objekte innerhalb 5 m (Zahl = Anzahl)" },
];

/**
 * Setzt das Blatt zusammen. opts: { map, scale, dpi, paperMm:[w,h], frame:{x,y,w,h} (mm, Kartenfenster),
 *   title, subtitle, meta:{osm_data_until}, cellM }
 * Rueckgabe: Liste von Daten-URLs (Seite 1 = Blatt, optional Seite 2 = Rest des Strassenverzeichnisses).
 */
export async function composeSheet(opts) {
  const { map, scale, dpi, paperMm, frame, title, place = "", meta, warning } = opts;
  const placeText = place; // Ortsname
  const side = opts.side || "right"; // Lage von Legende, Massstab und Verzeichnis: right | left | top | bottom
  const indexCols = opts.indexCols || 0; // Spaltenzahl des Verzeichnisses (0 = automatisch)
  const overClear = opts.overBg === "clear"; // Bloecke ueber der Karte: durchsichtig (Schrift mit weissem Rand) statt heller Untergrund
  const pos = opts.pos || null; // freie Lage der Bloecke (Anteile des Papiers, siehe freelayout.js); ohne Angabe ordnet das Blatt sie nach `side` an
  const [W, H] = paperMm;
  const u = opts.ui || 1; // Oberflaechen-Faktor: A3 = 1, groessere Papiere skalieren Schrift und Seitenleiste mit
  // Bereich fuer Legende, Massstab und Verzeichnis in mm auf dem Papier {x, y, w, h}. Ohne Angabe: Seitenleiste rechts neben der Karte
  // (so rufen auch aeltere Aufrufer wie stress.mjs composeSheet ohne diese Option auf).
  const rightX = frame.x + frame.w + 6.5 * u;
  const panel = opts.panel || { x: rightX, y: frame.y, w: Math.max(40, W - rightX - 6 * u), h: frame.h };
  const showIndex = opts.index !== false;
  const legendSymbols = opts.legendSymbols !== false; // Legende: Feuerwehr-Symbole und Einbahnpfeil
  const legendRoads = opts.legendRoads !== false; // Legende: Strassenarten und Gemeindegrenze
  const isz = opts.indexSize || 1;
  const indexAuto = opts.indexAuto !== false; // Schrift des Verzeichnisses wird groesser, solange alles auf das Blatt passt
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
  const [c1, g1] = mk();
  let g = g1; // beim Trockenlauf (dry) kurzzeitig durch eine Wegwerf-Zeichenflaeche ersetzt
  const dry = (fn) => {
    const saved = g;
    g = document.createElement("canvas").getContext("2d");
    g.textBaseline = "alphabetic";
    try { return fn(); } finally { g = saved; }
  };
  let halo = false; // Schrift mit weissem Rand: fuer durchsichtige Bloecke ueber der Karte
  const text = (s, x, y, size, { bold = false, italic = false, align = "left", color = "#111" } = {}) => {
    g.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${size}px ${FONT}`; g.textAlign = align;
    if (halo) { g.save(); g.strokeStyle = "rgba(255,255,255,0.92)"; g.lineWidth = size * 0.3; g.lineJoin = "round"; g.strokeText(s, x, y); g.restore(); }
    g.fillStyle = color; g.fillText(s, x, y);
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
  const legendItems = legendSymbols ? LEGEND.filter((l) => (canQuery ? usedIcons.has(l.icon) : true)) : [];
  const showOneway = legendSymbols && canQuery && map.getLayer("oneway-arrows") ? map.queryRenderedFeatures({ layers: ["oneway-arrows"] }).length > 0 : false;
  if (showOneway) legendItems.push({ icon: "oneway", text: "Einbahnstraße (Pfeil = erlaubte Fahrtrichtung)" });
  const showBoundary = legendRoads && present("boundaries");
  const roadClasses = !legendRoads ? [] : [...ROAD_CLASSES].reverse().filter((c) => present(`road-fill-${c.id}`) || present(`bridge-fill-${c.id}`));
  const icons = await loadIcons([...new Set(legendItems.map((l) => l.icon))]);

  // ---- Block 1: Hinweise (Warnung, Verweis auf Folgeseite); der Titel steht in der Titelzeile ueber der Karte ----
  const headerBlock = (x0, y0, w, extra = "") => {
    let y = y0;
    if (extra) { text(extra, x0, y, 2.5, { bold: true, color: "#333" }); y += 3.3; }
    if (warning) {
      for (const l of wrap(warning, 2.4, w)) { text(l, x0, y, 2.4, { bold: true, color: "#b00020" }); y += 3.1; }
    }
    return y > y0 ? y + 2.5 : y0;
  };

  // ---- Block 2: Legende (bei waagerechtem Bereich in mehreren Spalten) ----
  const ROW = 5.4, LEG_COL_W = 74;
  const legendEntries = [];
  const tw = (str) => { g.font = `2.4px ${FONT}`; return g.measureText(str).width + 6.2; }; // Breite einer Zeile samt Symbol
  for (const item of legendItems) legendEntries.push({ h: ROW, tw: tw(item.text), draw: (x, y) => { g.drawImage(iconToCanvas(icons.get(item.icon)), x, y - 4.0, 4.4, 4.4); text(item.text, x + 6.2, y - 0.6, 2.4); } });
  if (showBoundary) legendEntries.push({ h: ROW, tw: tw("Gemeindegrenze"), draw: (x, y) => {
    g.save(); g.strokeStyle = "rgba(51,51,51,0.7)"; g.lineWidth = 0.35; g.setLineDash([2.6, 2.6]);
    g.beginPath(); g.moveTo(x, y - 2); g.lineTo(x + 4.4, y - 2); g.stroke(); g.restore();
    text("Gemeindegrenze", x + 6.2, y - 0.6, 2.4);
  } });
  for (const c of roadClasses) legendEntries.push({ h: ROW * 0.9, tw: tw(c.label), draw: (x, y) => {
    const w = Math.max((c.realM / scale) * 1000, c.minMm);
    g.lineCap = "butt";
    g.strokeStyle = c.casing; g.lineWidth = w + 0.44; g.beginPath(); g.moveTo(x, y - 1.7); g.lineTo(x + 4.4, y - 1.7); g.stroke();
    g.strokeStyle = c.fill; g.lineWidth = w; g.beginPath(); g.moveTo(x, y - 1.7); g.lineTo(x + 4.4, y - 1.7); g.stroke();
    text(c.label, x + 6.2, y - 0.6, 2.4);
  } });
  /** Zeichnet die Legende ab (x0, y0); maxH = verfuegbare Hoehe (Unendlich: eine Spalte). Rueckgabe: belegte Hoehe und Breite. */
  const legendBlock = (x0, y0, maxH, maxCols = Infinity) => {
    if (!legendEntries.length) return { h: 0, w: 0, tw: 0 }; // Legende abgewaehlt: weder Ueberschrift noch Platz
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
    return { h: 2.2 + maxUsed, w: (col + 1) * LEG_COL_W, cols: col + 1, tw: Math.max(...legendEntries.map((e) => e.tw)) };
  };

  // ---- Block 3: Massstabsleiste und Nordpfeil; Block 3b: Datenstand und Quellenangabe ----
  // fit < 1: der Block wird verkleinert gezeichnet; die Leiste wird dafuer entsprechend laenger gezeichnet, damit sie auf dem Papier
  // ihre echte Laenge behaelt (sonst stimmte die Beschriftung 50 m / 100 m nicht mehr mit der Karte).
  const sourceBlock = (x0, y0, w) => {
    let ay = y0;
    const lines = [...ATTRIBUTION_LINES, standLine(meta?.osm_data_until, meta?.basemap_until)].flatMap((t) => wrap(t, SRC_SIZE, w));
    for (const l of lines) { text(l, x0, ay, SRC_SIZE, { color: "#333" }); ay += SRC_STEP; }
    return ay;
  };
  /** Massstabsleiste mit Beschriftung und Planquadrat-Angabe ab Grundlinie y0. Rueckgabe: belegte Hoehe und Breite. */
  const scaleBar = (x0, y0, fit = 1) => {
    let y = y0;
    const barM = nearest(NICE_BAR_M, 28 * u, scale), barMm = (barM / scale) * 1000 / u / fit; // Ziel: 28 "virtuelle" mm, also 28 mm auf A3 und 56 mm auf A1
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
    return { h: 3.4 + 8.4 + 1.2, w: Math.max(barMm + 6, 38) }; // Breite von Leiste und Beschriftung
  };
  /** Nordpfeil mit "N" ab y0 (Oberkante des Buchstabens). Rueckgabe: belegte Hoehe und Breite. */
  const northArrow = (x0, y0) => {
    const nx = x0 + 5, ny = y0 + 12.6;
    g.fillStyle = "#000"; g.beginPath(); g.moveTo(nx, ny - 8); g.lineTo(nx + 3.2, ny + 3); g.lineTo(nx, ny + 1.2); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = 0.3;
    g.beginPath(); g.moveTo(nx, ny - 8); g.lineTo(nx - 3.2, ny + 3); g.lineTo(nx, ny + 1.2); g.closePath(); g.fill(); g.stroke();
    text("N", nx, ny - 9.4, 3.2, { bold: true, align: "center" });
    return { h: ny + 3 - y0, w: 10 };
  };
  /** Massstab mit Nordpfeil daneben (ist die Breite zu knapp, darunter) und (source) die Quellenangabe darunter. Rueckgabe: belegte Hoehe ab y0 und Breite. */
  const scaleParts = (x0, y0, w, fit = 1, source = true) => {
    const sc = scaleBar(x0, y0, fit);
    const beside = sc.w + 3 + 10 <= w || !source; // ohne Quelle kommt es auf die Breite nicht an
    const nr = northArrow(beside ? x0 + sc.w + 3 : x0, beside ? y0 : y0 + sc.h + 2);
    const h = beside ? Math.max(sc.h, nr.h) : sc.h + 2 + nr.h;
    if (!source) return { h, w: sc.w + 3 + nr.w };
    return { h: sourceBlock(x0, y0 + h + 3, w) + 2 - y0, w };
  };
  const scaleBlock = (x0, y0, w, fit = 1) => scaleParts(x0, y0, w, fit, true).h;

  // ---- Block 4: Strassenverzeichnis (indexblock.js: der Block plant Spalten, Breite und Folgeseiten selbst) ----
  const pages = [];
  const idx = showIndex ? streetIndex(map, frame, cellMm) : { entries: [] };
  const indexCount = idx.entries.length;
  const nextTop = 24;
  /** Schrift, Zeilenhoehe, Spaltenregeln und Zeilenumbruch fuer den Groessenfaktor f (1 = Grundgroesse isz). */
  const indexSetup = (f) => {
    const lineH = 2.75 * isz * f, fsI = 2.1 * isz * f;
    const measure = (str) => { g.font = `${fsI}px ${FONT}`; return g.measureText(str).width; };
    const fitW = makeFitter({ entries: idx.entries, measure, lineH });
    const opts = {
      total: indexCount, fitW, lineH, cols: indexCols,
      cont: { w: Wv - 24, h: Hv - 12 - nextTop }, // Folgeseite: Rand 12 mm, Titelzeile darueber
      minColW: 17 * fsI, idealColW: 26 * fsI, maxColW: 40 * fsI, // etwa 36 / 55 / 84 mm bei Standardschrift
    };
    return { f, lineH, fsI, fitW, opts };
  };
  let setup = indexSetup(1);
  let plan = planBlock({ ...setup.opts, box: null });
  let indexParts = []; // belegte Bereiche des Blatts: { region, plan }
  const headOff = (fsI) => 1.6 + 1.1 * fsI; // Abstand von der Ueberschrift bis zur ersten Zeile: waechst mit der Schrift
  /** Fuellt die Bereiche der Reihe nach (jeder bekommt so viele Eintraege wie hineinpassen, der letzte gleich hohe Spalten). Ein Bereich, in den
   *  kaum etwas passt, bleibt leer. Rueckgabe: belegte Bereiche, der Rest fuer die Folgeseiten und die Nummer des ersten Eintrags ohne Platz. */
  const planRegions = (cand, regions) => {
    const parts = [];
    let from = 0;
    let last = null;
    for (const region of regions) {
      last = planBlock({ ...cand.opts, from, box: { w: region.w, h: region.h - headOff(cand.fsI) } }); // Platz unter der Ueberschrift
      if (last.first) parts.push({ region, plan: last });
      from = last.placedFirst;
    }
    return { parts, rest: last ? last.rest : plan.rest, end: from };
  };
  /** Plant und zeichnet das Verzeichnis. `sets` sind Bereichsfolgen in Reihenfolge der Vorliebe (z. B. nur Seitenleiste, Seitenleiste und freie
   *  Flaeche unter der Karte). Mit Automatik wird die Schrift groesser (bis Faktor 1,5), solange noch alles auf das Blatt passt; je Schriftgroesse
   *  gilt die erste Bereichsfolge, die alles aufnimmt. Passt es auch in Grundgroesse nicht, gilt die Folge mit den meisten Eintraegen
   *  auf dem Blatt und der Rest steht auf Folgeseiten. */
  const indexBlock = (sets, bg = null) => {
    let best = null;
    outer: for (const f of indexAuto ? [1.5, 1.3, 1.15, 1] : [1]) {
      const cand = indexSetup(f);
      for (const regions of sets) {
        const r = planRegions(cand, regions);
        if (!r.rest) { best = { cand, ...r }; break outer; }
        if (f === 1 && (!best || r.end > best.end)) best = { cand, ...r };
      }
    }
    if (!best) return;
    setup = best.cand;
    indexParts = best.parts;
    plan = { first: best.parts[0]?.plan.first || null, rest: best.rest, placedFirst: best.end };
    best.parts.forEach(({ region, plan: p }, k) => {
      // Ueberschrift in die Breite des Bereichs passen (erst kleiner, dann gekuerzt), damit sie auch bei schmalem Verzeichnis am Papierrand nicht abgeschnitten wird
      const measureHead = (str, size) => { g.font = `bold ${size}px ${FONT}`; return g.measureText(str).width; };
      const head = fitText({ text: k === 0 ? `Straßenverzeichnis (${indexCount})` : "Straßenverzeichnis (Fortsetzung)", size: 3.4, minSize: 2.2, maxW: Math.max(8, region.w), measure: measureHead });
      if (bg) { // frei platziert: liegt das Verzeichnis ueber der Karte, bekommt es einen hellen Untergrund
        bg({ x: region.x - 2, y: region.y - 4.6, w: Math.max(p.first.width, measureHead(head.text, head.size)) + 4, h: headOff(setup.fsI) + p.first.height + 4.6 + 1.5 });
      }
      text(head.text, region.x, region.y, head.size, { bold: true });
      drawColumns({ gc: g, tf: text, fitW: setup.fitW, columns: p.first.columns, colW: p.first.colW, gap: p.first.gap, x0: region.x, y0: region.y + headOff(setup.fsI), fsI: setup.fsI, isz: isz * setup.f, lineH: setup.lineH });
    });
  };

  // ---- Gemeinsame Helfer fuer frei gelegte Bloecke und den Titel ----
  // Ein Block steht an seiner Lage (linke obere Ecke, Anteil des Papiers); ragt er in die Karte, bekommt er einen hellen Untergrund
  const F = { x: frame.x / u, y: frame.y / u, w: frame.w / u, h: frame.h / u };
  const overMap = (r) => r.x < F.x + F.w && r.x + r.w > F.x && r.y < F.y + F.h && r.y + r.h > F.y;
  const box = (r) => {
    halo = false;
    if (!overMap(r)) return;
    if (overClear) { halo = true; return; }
    g.save(); g.fillStyle = "rgba(255,255,255,0.93)"; g.strokeStyle = "rgba(0,0,0,0.4)"; g.lineWidth = 0.25;
    g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 1.2); g.fill(); g.stroke(); g.restore();
  };
  /** Mass ({w, h} ab der linken oberen Ecke) im Trockenlauf, Untergrund, dann der Block selbst. p = Lage als Anteil des Papiers. */
  const placeAt = (p, draw) => {
    if (!p) return;
    const sz = dry(() => draw(0, 0)); // das Mass haengt nicht von der Lage ab
    // Ein Block bleibt mit seinem echten Mass ganz im Papier (die Lage im Assistenten beruht auf einer Schaetzung)
    const x = Math.max(0, Math.min(p.x * Wv, Wv - sz.w - 2)), y = Math.max(0, Math.min(p.y * Hv, Hv - sz.h - 2));
    box({ x: x - 2, y: y - 1.5, w: sz.w + 4, h: sz.h + 3 });
    draw(x, y);
    halo = false;
  };
  const placeBlock = (name, draw) => placeAt(pos?.[name], draw);
  // Titel: Ueberschrift (6 mm) und Ortsname (9 mm), beide fett, linksbuendig; erst verkleinert, dann gekuerzt, damit sie bis zum Blattrand passen
  // (fittext.js). Oberkante des Blocks y, Grundlinien 5 und 15,4 mm darunter (bisherige Hoehe bei y = 3,4).
  const titleBlock = (x, y) => {
    const availW = Wv - x - 2;
    const m = (str, size) => { g.font = `bold ${size}px ${FONT}`; return g.measureText(str).width; };
    const head = fitText({ text: title, size: 6, minSize: 3.4, maxW: availW, measure: m });
    text(head.text, x, y + 5, head.size, { bold: true });
    const name = fitText({ text: placeText, size: 9, minSize: 4.5, maxW: availW, measure: m });
    if (name.text) text(name.text, x, y + 15.4, name.size, { bold: true });
    return { w: Math.max(m(head.text, head.size), name.text ? m(name.text, name.size) : 0), h: 18 };
  };
  const titleAt = pos?.title || opts.titlePos || null; // eigene Lage (frei oder bei fester Leiste); ohne sie wie bisher ueber der Karte
  if (titleAt) placeAt(titleAt, titleBlock);
  else {
    const availW = Wv - F.x - 6;
    const m = (str, size) => { g.font = `bold ${size}px ${FONT}`; return g.measureText(str).width; };
    const head = fitText({ text: title, size: 6, minSize: 3.4, maxW: availW, measure: m });
    text(head.text, F.x, 8.4, head.size, { bold: true });
    const name = fitText({ text: placeText, size: 9, minSize: 4.5, maxW: availW, measure: m });
    if (name.text) text(name.text, F.x, 18.8, name.size, { bold: true });
  }

  // ---- Anordnung ----
  let panelFit = 1; // 1 = Bereich voll genutzt ohne Verkleinerung; kleiner = gestapelter Bereich musste verkleinert werden
  if (pos) {
    if (warning) {
      const w = Math.min(130, F.w - 8), h = dry(() => headerBlock(F.x + 4, F.y + 7, w)) - (F.y + 7);
      box({ x: F.x + 2, y: F.y + 2, w: w + 4, h: h + 2 });
      headerBlock(F.x + 4, F.y + 7, w);
      halo = false;
    }
    placeBlock("legend", (x, y) => {
      // Liegt der Massstab oder Nordpfeil unter der Legende (und ueberlappt sie seitlich), bricht die Legende in Spalten um, statt sie zu verdecken
      // (auf kleinen Kartenfenstern reicht die Hoehe fuer alle moeglichen Eintraege nicht). Die Grenze folgt aus den Lagen, nicht aus x und y: Trockenlauf und Zeichnen stimmen.
      const lp = pos.legend;
      let maxH = Infinity;
      for (const n of ["scale", "north"]) {
        const b = pos[n];
        if (b && lp && b.y * Hv > lp.y * Hv + 12 && b.x * Wv < lp.x * Wv + LEG_COL_W && (n === "scale" ? b.x * Wv + 40 : b.x * Wv + 10) > lp.x * Wv) maxH = Math.min(maxH, b.y * Hv - lp.y * Hv - 3.2 - 3);
      }
      const r = legendBlock(x, y + 3.2, maxH);
      return { w: r.cols > 1 ? r.w : r.tw, h: 3.2 + r.h };
    });
    placeBlock("scale", (x, y) => { const r = scaleBar(x, y + 2.8, 1); return { w: r.w, h: 2.8 + r.h }; });
    placeBlock("north", (x, y) => { const r = northArrow(x, y); return { w: r.w, h: r.h }; });
    // Quellenangabe frei gelegt: ein Streifen, eine Zeile so breit wie der Text (hoechstens so breit wie die Karte, sonst mehrzeilig)
    placeBlock("source", (x, y) => {
      const full = attributionStrip(meta?.osm_data_until, meta?.basemap_until);
      g.font = `${SRC_SIZE}px ${FONT}`;
      const w = Math.min(g.measureText(full).width + 0.5, Math.max(62, F.w - 8));
      let ay = y + 2.2;
      for (const l of wrap(full, SRC_SIZE, w)) { text(l, x, ay, SRC_SIZE, { color: "#333" }); ay += SRC_STEP; }
      return { w, h: ay - y };
    });
    if (showIndex && pos.index) {
      const r = pos.index;
      // 2 mm Luft unten: der helle Untergrund ragt 1,5 mm ueber den Text hinaus und soll nicht ueber den Rand des gewaehlten Rechtecks (z. B. den Kartenrahmen) laufen
      indexBlock([[{ x: r.x * Wv, y: r.y * Hv + 3.4, w: r.w * Wv, h: r.h * Hv - 3.4 - 2 }]], box);
      halo = false;
    }
  } else if (!horizontal) {
    let y = headerBlock(P.x, P.y + 5, P.w);
    const lg = legendBlock(P.x, y, Infinity);
    if (lg.h) y += lg.h + 9;
    y += scaleBlock(P.x, y, P.w);
    if (showIndex) {
      // Hat die Karte ein festes Seitenverhaeltnis, bleibt unter ihr Platz frei: dorthin laeuft das Verzeichnis weiter (ueber die ganze Breite)
      const F = { x: frame.x / u, y: frame.y / u, w: frame.w / u, h: frame.h / u };
      const stripY = Math.max(F.y + F.h + 10, y + 4); // unter den Planquadrat-Buchstaben und unter dem, was die Seitenleiste schon belegt (flache Karten)
      const strip = { x: Math.min(P.x, F.x), y: stripY, w: Math.max(P.x + P.w, F.x + F.w) - Math.min(P.x, F.x), h: Hv - 10 - stripY };
      const hasStrip = strip.h >= 25;
      const sidebar = { x: P.x, y, w: P.w, h: P.y + P.h - y }; // volle Hoehe: gilt, wenn das Verzeichnis allein in die Seitenleiste passt
      const sidebarCut = { ...sidebar, h: Math.min(P.y + P.h, F.y + F.h) - y }; // bis zur Unterkante der Karte, darunter beginnt der Streifen
      indexBlock(hasStrip ? [[sidebar], [sidebarCut, strip], [strip]] : [[sidebar]]);
    }
  } else {
    // waagerecht: die Bloecke muessen zusammen in die Breite passen (siehe panelplan.js)
    const SCALE_W = 70, GAP = 6, MIN_INDEX_W = 55;
    // nur messen: gezeichnet wird der Titel erst im gewaehlten Zweig (sonst stuende er im gestapelten Fall doppelt im Bild)
    const headH = dry(() => headerBlock(P.x, P.y + 5, 70)) - (P.y + 5);
    const totalLegH = legendEntries.reduce((a, e) => a + e.h, 0);
    const wantCols = Math.max(1, Math.ceil(totalLegH / Math.max(ROW, P.h - headH - 4 - 2.2))); // mindestens eine Spalte: darin steht auch der Titel
    const horizPlan = planHorizontal({ panelW: P.w, legendCols: wantCols, legColW: LEG_COL_W, scaleW: SCALE_W, minIndexW: MIN_INDEX_W, gap: GAP, showIndex });
    if (horizPlan.mode === "row") {
      headerBlock(P.x, P.y + 5, 70);
      legendBlock(P.x, P.y + 5 + headH, P.h - headH - 4, horizPlan.legendCols);
      scaleBlock(P.x + horizPlan.legendW + GAP, P.y + 5, SCALE_W - GAP);
      if (showIndex) indexBlock([[{ x: P.x + horizPlan.legendW + GAP + SCALE_W + GAP, y: P.y + 5, w: horizPlan.indexW, h: P.h - 5 }]]);
    } else {
      // zu schmal fuer nebeneinander: Titel und Massstab in einer Zeile, darunter die Legende ueber die ganze Breite;
      // das Verzeichnis steht auf den Folgeseiten. Vorher per Trockenlauf messen, ob alles in die Hoehe passt.
      const note = showIndex ? "Straßenverzeichnis: siehe Folgeseite" : "";
      const drawStacked = (fit = 1) => {
        const y0 = P.y + 5;
        const sw = Math.max(SCALE_W, Math.min(150, P.w - 60));
        const sH = scaleBlock(P.x, y0, sw, fit);
        const nx = P.x + sw + 2 * GAP;
        const hH = headerBlock(nx, y0, Math.max(40, P.x + P.w - nx), note) - y0;
        const top = y0 + Math.max(hH, sH) + 4;
        const maxCols = Math.max(1, Math.floor(P.w / LEG_COL_W));
        const room = Math.max(ROW * 3, P.y + P.h - top - 2.2);
        const cols = Math.min(maxCols, Math.max(1, Math.ceil(totalLegH / room)));
        const leg = legendBlock(P.x, top, Infinity, cols);
        return top + leg.h - P.y;
      };
      const need = dry(drawStacked);
      // reicht die Hoehe nicht, wird der gesamte Block gleichmaessig verkleinert (nie unter 70 %); sonst unveraendert
      panelFit = Math.max(0.7, Math.min(1, P.h / need));
      if (panelFit < 1) { g.save(); g.translate(P.x, P.y); g.scale(panelFit, panelFit); g.translate(-P.x, -P.y); }
      drawStacked(panelFit);
      if (panelFit < 1) g.restore();
    }
  }
  g.restore();
  pages.push(c1.toDataURL("image/png"));

  // Folgeseiten: so viele wie noetig, damit kein Eintrag verloren geht
  (plan.rest?.pages || []).forEach((columns, p) => {
    const [c2, g2] = mk(u);
    const t2 = (s, x, yv, size, o = {}) => { g2.font = `${o.bold ? "bold " : ""}${size}px ${FONT}`; g2.textAlign = o.align || "left"; g2.fillStyle = o.color || "#111"; g2.fillText(s, x, yv); };
    t2(`${title} – Straßenverzeichnis (Fortsetzung, Seite ${p + 2})`, 12, 14, 5, { bold: true });
    drawColumns({ gc: g2, tf: t2, fitW: setup.fitW, columns, colW: plan.rest.colW, gap: plan.rest.gap, x0: 12, y0: nextTop, fsI: setup.fsI, isz: isz * setup.f, lineH: setup.lineH });
    t2(OSM_NOTICE, 12, Hv - 6, SRC_FOOT_SIZE, { color: "#333" }); // Strassennamen stammen aus OSM: Quellenangabe auch auf den Folgeseiten
    pages.push(c2.toDataURL("image/png"));
  });
  // Seite, auf der das Strassenverzeichnis beginnt: 1 = auf dem Blatt, 2 = erst auf der Folgeseite, null = ausgeschaltet oder leer
  const indexPage = !showIndex || !indexCount ? null : plan.first ? 1 : 2;
  const indexLayout = plan.first ? { size: setup.f, cols: plan.first.columns.length, colW: plan.first.colW, width: plan.first.width, height: plan.first.height, onSheet: plan.placedFirst, regions: indexParts.length } : null;
  return { pages, indexCount, cellM, cols, rows, panelFit, indexPage, indexLayout };
}
