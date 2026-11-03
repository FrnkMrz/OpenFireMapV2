// Freie Anordnung von Legende, Massstab (mit Nordpfeil), Quellenangabe und Strassenverzeichnis (rein, ohne DOM, mit `node --test` pruefbar).
// Jeder Block hat eine Lage als Anteil des Papiers (0..1, linke obere Ecke); das Verzeichnis zusaetzlich Breite und Hoehe. So bleibt die
// Anordnung beim Wechsel des Papiers sinnvoll und passt in die Adresse: pos=l:0.71,0.12;s:0.71,0.5;q:0.71,0.62;i:0.05,0.8,0.6,0.15
import { PAPER_MM, computeLayout } from "./layout.js";

export const BLOCKS = ["legend", "scale", "source", "index"];
const SHORT = { l: "legend", s: "scale", q: "source", i: "index" };
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
    out[name] = name === "index" ? { x: n[0], y: n[1], w: n[2], h: n[3] } : { x: n[0], y: n[1] };
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
    } else {
      const d = dims?.[name];
      out[name] = { x: clamp(b.x, 0, d ? Math.max(0, 1 - d.w) : 0.98), y: clamp(b.y, 0, d ? Math.max(0, 1 - d.h) : 0.98) };
    }
  }
  return out;
}

const r4 = (v) => String(Math.round(v * 10000) / 10000);
export function formatPos(pos) {
  const p = clampPos(pos || {});
  return Object.entries(SHORT).filter(([, name]) => p[name]).map(([k, name]) => `${k}:${(name === "index" ? [p[name].x, p[name].y, p[name].w, p[name].h] : [p[name].x, p[name].y]).map(r4).join(",")}`).join(";");
}

/** Ueberlappen sich zwei Rechtecke {x,y,w,h}? (Beruehren zaehlt nicht.) */
export const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Rechteck eines Blocks als Anteil des Papiers: Lage aus pos, Groesse geschaetzt (Verzeichnis: aus pos). ui = Oberflaechen-Faktor, W/H = Papier in mm. */
export function blockRect(name, pos, { lsym = true, lroad = true, ui = 1, W = 420, H = 297 } = {}) {
  const p = pos?.[name];
  if (!p) return null;
  if (name === "index") return { x: p.x, y: p.y, w: p.w, h: p.h };
  const sz = estimateSizes({ lsym, lroad })[name];
  return sz ? { x: p.x, y: p.y, w: (sz.w * ui) / W, h: (sz.h * ui) / H } : null;
}

/** Groesse von Legende, Massstab und Quellen als Anteil des Papiers (geschaetzt), fuer clampPos. */
export function blockDims({ lsym = true, lroad = true, ui = 1, W = 420, H = 297 } = {}) {
  const sz = estimateSizes({ lsym, lroad });
  const out = {};
  for (const name of ["legend", "scale", "source"]) if (sz[name]) out[name] = { w: (sz[name].w * ui) / W, h: (sz[name].h * ui) / H };
  return out;
}

/** Grobe Groesse der Bloecke in "virtuellen mm" (mal ui = mm auf dem Papier). Nur fuer die Vorschau und die Standardlage; gezeichnet wird mit den echten Massen. */
export function estimateSizes({ lsym = true, lroad = true } = {}) {
  const rows = (lsym ? 8 : 0) * 5.4 + (lroad ? 6 : 0) * 4.9;
  const legend = lsym || lroad ? { w: 62, h: 5.6 + rows } : null;
  return { legend, scale: { w: 40, h: 38 }, source: { w: 62, h: 17 } };
}

/**
 * Standardlage der Bloecke fuer die gewaehlte Lage der Seitenleiste (dort stehen sie, solange man sie nicht verschiebt).
 * @returns {{legend?:{x,y}, scale:{x,y}, source:{x,y}, index:{x,y,w,h}}} Anteile des Papiers
 */
export function defaultPos({ paper = "a3l", side = "right", fmt = "fill", lsym = true, lroad = true } = {}) {
  const [W, H] = PAPER_MM[paper] || PAPER_MM.a3l;
  const { ui, frame, panel } = computeLayout({ wMm: W, hMm: H, side, fmt });
  const sz = estimateSizes({ lsym, lroad });
  const gap = 6 * ui;
  const out = {};
  const put = (name, x, y) => { out[name] = { x: x / W, y: y / H }; };
  if (side === "top" || side === "bottom") {
    const minIndexW = 0.2 * W;
    const right = panel.x + panel.w;
    const legendW = sz.legend ? sz.legend.w * ui + gap : 0;
    const rowW = legendW + (sz.scale.w + sz.source.w) * ui + 2 * gap; // alles in einer Reihe
    // Reicht die Breite nicht fuer drei Bloecke und ein Verzeichnis, steht die Quellenangabe unter dem Massstab (zwei Spalten statt drei)
    const stacked = right - (panel.x + rowW) < minIndexW;
    let x = panel.x;
    if (sz.legend) { put("legend", x, panel.y); x += legendW; }
    put("scale", x, panel.y);
    if (stacked) {
      put("source", x, panel.y + (sz.scale.h * ui) + gap / 2);
      x += Math.max(sz.scale.w, sz.source.w) * ui + gap;
    } else {
      x += sz.scale.w * ui + gap;
      put("source", x, panel.y);
      x += sz.source.w * ui + gap;
    }
    const w = Math.max(0.12 * W, right - x);
    out.index = { x: x / W, y: panel.y / H, w: w / W, h: panel.h / H };
  } else {
    const colW = side === "none" ? 62 * ui : panel.w;
    // ohne Seitenleiste: im Rand rechts von der Karte, wenn er breit genug ist, sonst innen an der rechten Kartenkante
    const margin = W - (frame.x + frame.w + 8 * ui) - 6 * ui;
    const x = side !== "none" ? panel.x : margin >= colW ? frame.x + frame.w + 8 * ui : frame.x + frame.w - colW - 4 * ui;
    let y = side === "none" ? frame.y + 4 * ui : panel.y;
    for (const name of ["legend", "scale", "source"]) {
      if (!sz[name]) continue;
      put(name, x, y);
      y += sz[name].h * ui + gap;
    }
    const bottom = H - 14 * ui;
    out.index = { x: x / W, y: y / H, w: colW / W, h: Math.max(30 * ui, bottom - y) / H };
  }
  return clampPos(out, blockDims({ lsym, lroad, ui, W, H }));
}
