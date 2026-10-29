// Rahmen auf der Auswahlkarte (rein, ohne DOM, mit `node --test` pruefbar): Ecke aufziehen aendert den Druckmassstab.
// Das Seitenverhaeltnis des Rahmens ist durch Papier, Lage und Kartenformat fest (layout.js); gross oder klein macht nur der Massstab.
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
