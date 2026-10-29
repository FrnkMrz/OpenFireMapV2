// Rahmen auf der Auswahlkarte (rein, ohne DOM, mit `node --test` pruefbar).
// Fester Modus: Das Seitenverhaeltnis ist durch Papier, Lage und Kartenformat fest (layout.js), Ecke aufziehen aendert nur den Massstab.
// Freier Modus: Kanten und Ecken einzeln ziehen; das Kartenfenster des Blatts nimmt das Seitenverhaeltnis des Rahmens an.
import { NICE_SCALES } from "./layout.js";

const MIN_PX = 24; // kleinster Rahmen beim Aufziehen (Breite in Bildschirm-Pixeln)

/** Naechster Druckmassstab der Liste; Abstand im Verhaeltnis gemessen (4400 liegt naeher an 4000 als an 5000). */
export function snapScale(target, list = NICE_SCALES) {
  const t = Math.max(1, target);
  return list.reduce((best, s) => (Math.abs(Math.log(s / t)) < Math.abs(Math.log(best / t)) ? s : best), list[0]);
}

/**
 * Eine Rahmenecke ziehen: die gegenueberliegende Ecke (anchor) bleibt stehen, der Zeiger (pointer) bestimmt die neue Groesse.
 * @param {{x:number,y:number}} o.anchor   feste Ecke in Bildschirm-Pixeln
 * @param {{x:number,y:number}} o.pointer  Zeigerposition
 * @param {number} o.aspect     Breite / Hoehe des Rahmens
 * @param {number} o.mpp        Meter je Bildschirm-Pixel der Karte
 * @param {number} o.frameWmm   Breite des Kartenfensters auf dem Papier in mm
 * @returns {{scale:number,w:number,h:number,center:{x:number,y:number}}} neuer Massstab, Groesse und Mitte in Pixeln
 */
export function resizeFromCorner({ anchor, pointer, aspect, mpp, frameWmm, scales = NICE_SCALES }) {
  const dx = Math.abs(pointer.x - anchor.x), dy = Math.abs(pointer.y - anchor.y);
  const width = Math.max(dx, dy * aspect, MIN_PX);
  const scale = snapScale(((width * mpp) * 1000) / frameWmm, scales);
  const w = ((frameWmm * scale) / 1000) / mpp, h = w / aspect;
  const sx = pointer.x >= anchor.x ? 1 : -1, sy = pointer.y >= anchor.y ? 1 : -1;
  return { scale, w, h, center: { x: anchor.x + (sx * w) / 2, y: anchor.y + (sy * h) / 2 } };
}

/** Haelt die Mitte des Rahmens innerhalb der Ansicht, damit er sich nicht aus dem Bild schieben laesst. */
export function clampCenterPx(c, view) {
  return { x: Math.min(view.w, Math.max(0, c.x)), y: Math.min(view.h, Math.max(0, c.y)) };
}

export const RATIO_MIN = 0.25, RATIO_MAX = 4; // flachster und schmalster freier Rahmen (Breite / Hoehe)

/** Seitenverhaeltnis als Kartenformat fuer layout.js ("1.6234:1"). */
export function ratioFmt(ratio) {
  const r = Math.min(RATIO_MAX, Math.max(RATIO_MIN, ratio));
  return `${r.toFixed(4)}:1`;
}

/** Kartenformat "B:H" zurueck in ein Seitenverhaeltnis, nur fuer freie Formate: "1.6234:1" -> 1.6234, sonst null.
 *  Frei ist nur, was ratioFmt schreibt (immer mit Dezimalpunkt); der Listenwert "1:1" (Quadrat) bleibt ein fester Rahmen. */
export function parseRatioFmt(fmt) {
  const m = /^(\d{1,2}\.\d+):1$/.exec(fmt || "");
  return m && +m[1] >= RATIO_MIN && +m[1] <= RATIO_MAX ? +m[1] : null;
}

export const MIN_SCALE = NICE_SCALES[0]; // kleinster Massstab (1:1000): darunter passt die Massstabsleiste des Blatts (sheet.js, kleinste Leiste 20 m) nicht mehr in die Seitenleiste

/** Gewuenschten Massstab des freien Rahmens auf einen druckbaren abbilden: nie unter MIN_SCALE, sonst auf 10 aufgerundet (oder auf einen Standardmassstab). */
export function pickFreeScale(exact, round = false) {
  const e = Math.max(MIN_SCALE, exact);
  return round ? roundUpScale(e) : Math.ceil(e / 10) * 10;
}

/** Kleinster Standardmassstab, der mindestens den gezeichneten Ausschnitt zeigt; darueber hinaus aufgerundet auf 100. */
export function roundUpScale(exact, list = NICE_SCALES) {
  const e = exact * 0.9995; // Rundungsrauschen: 4000,0001 soll 4000 bleiben
  return list.find((s) => s >= e) ?? Math.ceil(exact / 100) * 100;
}

/**
 * Freien Rahmen an einer Kante oder Ecke ziehen. Die gegenueberliegende Kante bzw. Ecke bleibt stehen.
 * Der Massstab ergibt sich aus Papier und Rahmen: Das Kartenfenster auf dem Blatt hat das Seitenverhaeltnis des Rahmens.
 * @param {{l:number,t:number,r:number,b:number}} o.rect  Rahmen in Bildschirm-Pixeln
 * @param {string} o.handle   "n" "s" "e" "w" "nw" "ne" "sw" "se"
 * @param {{x:number,y:number}} o.pointer
 * @param {number} o.mpp  Meter je Bildschirm-Pixel
 * @param {(ratio:number)=>number} o.frameWmm  Breite des Kartenfensters auf dem Papier in mm bei diesem Seitenverhaeltnis
 * @param {(exact:number)=>number} o.pickScale  gewuenschten Massstab auf einen erlaubten abbilden (Runden)
 * @returns {{scale:number,ratio:number,w:number,h:number,center:{x:number,y:number}}}
 */
export function resizeFree({ rect, handle, pointer, mpp, frameWmm, pickScale }) {
  let { l, t, r, b } = rect;
  if (handle.includes("w")) l = Math.min(pointer.x, r - MIN_PX);
  if (handle.includes("e")) r = Math.max(pointer.x, l + MIN_PX);
  if (handle.includes("n")) t = Math.min(pointer.y, b - MIN_PX);
  if (handle.includes("s")) b = Math.max(pointer.y, t + MIN_PX);
  const w0 = r - l, h0 = b - t;
  const ratio = Math.min(RATIO_MAX, Math.max(RATIO_MIN, w0 / h0));
  const wMm = frameWmm(ratio);
  const scale = pickScale(((w0 * mpp) * 1000) / wMm);
  const w = ((wMm * scale) / 1000) / mpp, h = w / ratio;
  // Feste Kante bleibt stehen; wird nur die andere Achse gezogen, bleibt die Mitte dieser Achse
  const cx = handle.includes("w") ? rect.r - w / 2 : handle.includes("e") ? rect.l + w / 2 : (rect.l + rect.r) / 2;
  const cy = handle.includes("n") ? rect.b - h / 2 : handle.includes("s") ? rect.t + h / 2 : (rect.t + rect.b) / 2;
  return { scale, ratio, w, h, center: { x: cx, y: cy } };
}
