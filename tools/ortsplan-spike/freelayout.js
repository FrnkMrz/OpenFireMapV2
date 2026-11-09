// Freie Anordnung von Titel, Karte, Legende, Massstab, Nordpfeil, Quellenangabe und Strassenverzeichnis (rein, ohne DOM, mit `node --test` pruefbar).
// Jeder Block hat eine Lage als Anteil des Papiers (0..1, linke obere Ecke); das Verzeichnis zusaetzlich Breite und Hoehe. So bleibt die
// Anordnung beim Wechsel des Papiers sinnvoll und passt in die Adresse: pos=t:0.03,0.01;m:0.03,0.09;l:0.71,0.12;s:0.71,0.5;q:0.71,0.62;n:0.9,0.5;i:0.05,0.8,0.6,0.15
// Titel (t) und Karte (m, Lage des Kartenfensters) sind verschiebbar; die Karte rastet nahe an den Randabstaenden ein (snapMap).
// z:b,h ist die eigene Groesse des Kartenfensters als Anteil des Papiers (fehlt sie, gilt das volle Fenster der Lage; Massstab bleibt, das Fenster zeigt mehr oder weniger Gebiet).
import { PAPER_MM, computeLayout, TOP_BAND } from "./layout.js";
import { stripWidth } from "./attribution.js";

export const BLOCKS = ["legend", "scale", "source", "north", "title", "map", "msize", "index"];
const SHORT = { l: "legend", s: "scale", q: "source", n: "north", t: "title", m: "map", z: "msize", i: "index" };
/** Mindestabstand des Kartenfensters zum Papierrand (Einheiten von ui): dort stehen noch die Planquadrat-Buchstaben. */
export const MAP_MARGIN = 6;
/** Normale Randabstaende des Kartenfensters (Einheiten von ui, wie in layout.js): hier rastet die Karte beim Ziehen ein. */
export const MAP_ANCHOR = { left: 14, right: 14, top: TOP_BAND, bottom: 14 };
/** Oberkante des Titels (Einheiten von ui): so steht die Ueberschrift in der bisherigen Hoehe (Grundlinie 8,4). */
export const TITLE_Y = 3.4;
const MIN_INDEX = 0.04; // kleinste Breite/Hoehe des Verzeichnisses als Anteil des Papiers

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Liest den Wert aus der Adresse; unbrauchbare Teile fallen weg. Rueckgabe: Objekt mit den gelesenen Bloecken oder null. */
export function parsePos(str) {
  if (!str) return null;
  const out = {};
  for (const part of String(str).split(";")) {
    const [k, v = ""] = part.split(":");
    const name = SHORT[k.trim()];
    if (!name) continue;
    const n = v.split(",").map((x) => (x.trim() === "" ? NaN : +x));
    const need = name === "index" ? 4 : 2;
    if (n.length !== need || n.some((x) => !Number.isFinite(x))) continue;
    out[name] = name === "index" ? { x: n[0], y: n[1], w: n[2], h: n[3] } : name === "msize" ? { w: n[0], h: n[1] } : { x: n[0], y: n[1] };
  }
  return Object.keys(out).length ? clampPos(out) : null;
}

/** Haelt die Bloecke im Papier: Lage 0..1; das Verzeichnis nie ueber den Rand hinaus und nie kleiner als MIN_INDEX.
 *  Mit dims (Groesse von Legende, Massstab und Quellen als Anteil des Papiers, siehe blockDims) bleibt auch der ganze Block im Papier,
 *  sonst nur seine linke obere Ecke. */
export function clampPos(pos, dims = null) {
  const out = {};
  for (const name of BLOCKS) {
    const b = pos?.[name];
    if (!b) continue;
    if (name === "index") {
      const w = clamp(b.w, MIN_INDEX, 1), h = clamp(b.h, MIN_INDEX, 1);
      out.index = { x: clamp(b.x, 0, 1 - w), y: clamp(b.y, 0, 1 - h), w, h };
    } else if (name === "msize") {
      out.msize = { w: clamp(b.w, MIN_INDEX, 1), h: clamp(b.h, MIN_INDEX, 1) }; // Groesse, keine Lage
    } else {
      const d = dims?.[name];
      // die Karte haelt zusaetzlich einen Mindestrand (Planquadrat-Buchstaben); sonst gilt: der ganze Block bleibt im Papier
      const mx = name === "map" && d ? d.mx || 0 : 0, my = name === "map" && d ? d.my || 0 : 0;
      out[name] = {
        x: clamp(b.x, mx, d ? Math.max(mx, 1 - d.w - mx) : 0.98),
        y: clamp(b.y, my, d ? Math.max(my, 1 - d.h - my) : 0.98),
      };
    }
  }
  return out;
}

const r4 = (v) => String(Math.round(v * 10000) / 10000);
export function formatPos(pos) {
  const p = clampPos(pos || {});
  return Object.entries(SHORT).filter(([, name]) => p[name]).map(([k, name]) => `${k}:${(name === "index" ? [p[name].x, p[name].y, p[name].w, p[name].h] : name === "msize" ? [p[name].w, p[name].h] : [p[name].x, p[name].y]).map(r4).join(",")}`).join(";");
}

/** Ueberlappen sich zwei Rechtecke {x,y,w,h}? (Beruehren zaehlt nicht.) */
export const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Rechteck eines Blocks als Anteil des Papiers: Lage aus pos, Groesse geschaetzt (Verzeichnis: aus pos). ui = Oberflaechen-Faktor, W/H = Papier in mm. */
export function blockRect(name, pos, { lsym = true, lroad = true, ui = 1, W = 420, H = 297, frame = null, title = "", place = "" } = {}) {
  const p = pos?.[name];
  if (!p) return null;
  if (name === "index") return { x: p.x, y: p.y, w: p.w, h: p.h };
  if (name === "map") return frame ? { x: p.x, y: p.y, w: frame.w / W, h: frame.h / H } : null; // Groesse des Kartenfensters in mm
  if (name === "title") { const t = estimateTitle({ title, place }); return { x: p.x, y: p.y, w: (t.w * ui) / W, h: (t.h * ui) / H }; }
  const sz = estimateSizes({ lsym, lroad, frameW: frame?.w, ui })[name];
  return sz ? { x: p.x, y: p.y, w: (sz.w * ui) / W, h: (sz.h * ui) / H } : null;
}

/** Groesse des Titels in "virtuellen mm" (geschaetzt aus der Textlaenge: Ueberschrift fett 6 mm, Ortsname fett 9 mm). Das Blatt misst den echten Text. */
export function estimateTitle({ title = "", place = "" } = {}) {
  const head = (title || "Orts- und Hydrantenplan").length * 3.5;
  const name = (place || "Ortsname").length * 5.3;
  return { w: Math.min(260, Math.max(40, head, name)), h: 18 };
}

/** Groesse von Titel, Legende, Massstab und Quellen als Anteil des Papiers (geschaetzt), fuer clampPos; mit frame {w, h} (mm) auch die der Karte samt Mindestrand. */
export function blockDims({ lsym = true, lroad = true, ui = 1, W = 420, H = 297, frame = null, title = "", place = "" } = {}) {
  const sz = estimateSizes({ lsym, lroad, frameW: frame?.w, ui });
  const out = {};
  for (const name of ["legend", "scale", "source", "north"]) if (sz[name]) out[name] = { w: (sz[name].w * ui) / W, h: (sz[name].h * ui) / H };
  const t = estimateTitle({ title, place });
  out.title = { w: (t.w * ui) / W, h: (t.h * ui) / H };
  if (frame) out.map = { w: frame.w / W, h: frame.h / H, mx: (MAP_MARGIN * ui) / W, my: (MAP_MARGIN * ui) / H };
  return out;
}

/**
 * Magnet fuer das Kartenfenster: liegt die linke/rechte Kante bzw. obere/untere Kante naeher als thr mm an den normalen Randabstaenden
 * (MAP_ANCHOR), springt sie darauf; sonst bleibt die Lage frei. Jede Achse einzeln. p = Lage als Anteil des Papiers, w/h = Kartenfenster in mm.
 */
export function snapMap(p, { W, H, ui = 1, w, h, thr = 4, home = null }) {
  const near = (v, anchors) => { for (const a of anchors) if (Math.abs(v - a) <= thr) return a; return v; };
  // home: Standardlage des Kartenfensters in mm (bei fester Leiste liegt sie nicht immer auf den normalen Randabstaenden); dorthin rastet die Karte auch
  return {
    x: near(p.x * W, [...(home ? [home.x] : []), MAP_ANCHOR.left * ui, W - MAP_ANCHOR.right * ui - w]) / W,
    y: near(p.y * H, [...(home ? [home.y] : []), MAP_ANCHOR.top * ui, H - MAP_ANCHOR.bottom * ui - h]) / H,
  };
}

/**
 * Bei fester Leiste wandern Kartenfenster und Leiste gemeinsam. Klemmt die Verschiebung (dx, dy in mm) so, dass das Kartenfenster den
 * Mindestrand (MAP_MARGIN, Planquadrat-Buchstaben) und die Leiste einen kleinen Rand (2 ui) zum Papier haelt. Passt die Gruppe gar nicht
 * (breiter als das Papier), bleibt sie stehen. frame/panel: {x,y,w,h} in mm an der Standardlage; panel.w = 0 heisst keine Leiste.
 */
export function clampGroupOffset({ frame, panel = null, W, H, ui = 1, dx, dy }) {
  const axis = (d, fLo, fLen, pLo, pLen, size) => {
    let lo = MAP_MARGIN * ui - fLo, hi = size - MAP_MARGIN * ui - (fLo + fLen);
    if (panel && panel.w > 0 && panel.h > 0) { lo = Math.max(lo, 2 * ui - pLo); hi = Math.min(hi, size - 2 * ui - (pLo + pLen)); }
    return lo <= hi ? clamp(d, lo, hi) : 0;
  };
  return {
    dx: axis(dx, frame.x, frame.w, panel?.x ?? 0, panel?.w ?? 0, W),
    dy: axis(dy, frame.y, frame.h, panel?.y ?? 0, panel?.h ?? 0, H),
  };
}

/** Grobe Groesse der Bloecke in "virtuellen mm" (mal ui = mm auf dem Papier). Nur fuer die Vorschau und die Standardlage; gezeichnet wird mit den echten Massen.
 *  worst: Legende mit allen moeglichen Eintraegen (16 Symbole, Gemeindegrenze, 5 Strassenarten); sie fuellt sich je nach Kartenausschnitt nur zum Teil.
 *  Die Standardlage reserviert diesen Platz, damit die Bloecke darunter nie in die Legende ragen; die Vorschau zeigt einen typischen Umfang. */
export function estimateSizes({ lsym = true, lroad = true, worst = false, frameW = 0, ui = 1 } = {}) {
  const rows = (lsym ? (worst ? 16 : 10) : 0) * 5.4 + (lroad ? (worst ? 5.4 + 5 * 4.86 : 6 * 4.9) : 0);
  const legend = lsym || lroad ? { w: 62, h: 5.6 + rows } : null;
  return { legend, scale: { w: 40, h: 20 }, north: { w: 10, h: 19 }, source: { w: stripWidth(frameW, ui), h: frameW > 0 && stripWidth(frameW, ui) < 150 ? 9.5 : 6.5 } }; // Quellenangabe: ein Streifen am Kartenrand (eine Zeile, bei schmaler Karte zwei)
}

/**
 * Standardlage der Bloecke fuer die gewaehlte Lage der Seitenleiste (dort stehen sie, solange man sie nicht verschiebt).
 * @returns {{legend?:{x,y}, scale:{x,y}, source:{x,y}, index:{x,y,w,h}}} Anteile des Papiers
 */
export function defaultPos({ paper = "a3l", side = "right", fmt = "fill", lsym = true, lroad = true } = {}) {
  const [W, H] = PAPER_MM[paper] || PAPER_MM.a3l;
  const { ui, frame, panel } = computeLayout({ wMm: W, hMm: H, side, fmt });
  const sz = estimateSizes({ lsym, lroad, worst: true, frameW: frame.w, ui });
  const gap = 6 * ui;
  const out = {};
  const put = (name, x, y) => { out[name] = { x: x / W, y: y / H }; };
  const NG = 4; // Abstand zwischen Massstab und Nordpfeil
  const northAt = (xScale, yy) => put("north", xScale + (sz.scale.w + NG) * ui, yy); // der Nordpfeil steht rechts neben dem Massstab
  if (side === "top" || side === "bottom") {
    const right = panel.x + panel.w;
    const legendW = sz.legend ? sz.legend.w * ui + gap : 0;
    const scaleW = sz.scale.w + NG + sz.north.w; // Massstab und Nordpfeil nebeneinander
    let x = panel.x;
    if (sz.legend) { put("legend", x, panel.y); x += legendW; }
    put("scale", x, panel.y);
    northAt(x, panel.y);
    x += scaleW * ui + gap;
    const w = Math.max(0.12 * W, right - x);
    out.index = { x: x / W, y: panel.y / H, w: w / W, h: panel.h / H };
  } else {
    const colW = side === "none" ? 62 * ui : panel.w;
    // ohne Seitenleiste: im Rand rechts von der Karte, wenn er breit genug ist, sonst innen an der rechten Kartenkante
    const margin = W - (frame.x + frame.w + 8 * ui) - 6 * ui;
    const x = side !== "none" ? panel.x : margin >= colW ? frame.x + frame.w + 8 * ui : frame.x + frame.w - colW - 4 * ui;
    const y0 = side === "none" ? frame.y + 4 * ui : panel.y;
    const bottom = H - 14 * ui;
    // Platz fuer die volle Legende reservieren; passt der Stapel so nicht aufs Blatt (kleine Papiere), gilt der typische Umfang
    const stack = (sizes) => { let yy = y0; const at = {}; for (const name of ["legend", "scale"]) { if (!sizes[name]) continue; at[name] = yy; yy += sizes[name].h * ui + gap; } return { at, end: yy }; };
    let st = stack(sz);
    if (st.end - gap > bottom) st = stack(estimateSizes({ lsym, lroad }));
    for (const [name, yy] of Object.entries(st.at)) put(name, x, yy);
    northAt(x, st.at.scale);
    const y = st.end;
    out.index = { x: x / W, y: y / H, w: colW / W, h: Math.max(30 * ui, bottom - y) / H };
  }
  // Quellenangabe: ein Streifen unter der Karte (im unteren Rand, unter den Planquadrat-Buchstaben), linksbuendig mit der Karte
  put("source", frame.x, frame.y + frame.h + 7 * ui);
  // Titel links oben (wie bisher in der Hoehe der Ueberschrift), Karte an ihrer Standardlage
  out.title = { x: (14 * ui) / W, y: (TITLE_Y * ui) / H };
  out.map = { x: frame.x / W, y: frame.y / H };
  return clampPos(out, blockDims({ lsym, lroad, ui, W, H, frame }));
}

/**
 * Eigene Groesse des Kartenfensters in mm aus pos.msize (Anteile des Papiers), nie groesser als das Fenster der Lage (base {w, h} in mm).
 * Bei festem Kartenformat (ratio = Breite / Hoehe) bleibt das Seitenverhaeltnis erhalten. Ohne msize: null (volles Fenster).
 */
export function mapSizeMm(msize, { W, H, base, ratio = null }) {
  if (!msize) return null;
  let w = Math.min(base.w, msize.w * W), h = Math.min(base.h, msize.h * H);
  if (ratio) { h = Math.min(h, w / ratio); w = h * ratio; }
  return { w, h };
}
