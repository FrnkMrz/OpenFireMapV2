// Blattgeometrie (rein, ohne DOM, mit `node --test` pruefbar): Papier, Lage des Bereichs fuer Legende/Massstab/Verzeichnis
// und Kartenformat. Alle Masse in Millimetern auf dem Papier.

export const PAPER_MM = {
  a4l: [297, 210], a4p: [210, 297], a3l: [420, 297], a3p: [297, 420],
  a2l: [594, 420], a2p: [420, 594], a1l: [841, 594], a1p: [594, 841],
};

export const SIDES = ["right", "left", "top", "bottom"];

/** Kartenformat: "fill" (Papier fuellen, Standard) oder ein Seitenverhaeltnis "B:H" wie "1:1", "3:2", "2:3". Rueckgabe: Breite/Hoehe oder null. */
export function parseFormat(fmt) {
  if (!fmt || fmt === "fill") return null;
  const m = /^(\d{1,2}(?:\.\d+)?):(\d{1,2}(?:\.\d+)?)$/.exec(fmt);
  if (!m) return null;
  const w = +m[1], h = +m[2];
  return w > 0 && h > 0 ? w / h : null;
}

/** Groesstes Rechteck mit Seitenverhaeltnis ratio (Breite/Hoehe) in slot {x,y,w,h}; ax/ay = Ausrichtung 0 (Anfang) .. 0.5 (Mitte) .. 1 (Ende). */
export function fitRatio(slot, ratio, ax = 0.5, ay = 0.5) {
  let w = slot.w, h = slot.h;
  if (w / h > ratio) w = h * ratio; else h = w / ratio;
  return { x: slot.x + (slot.w - w) * ax, y: slot.y + (slot.h - h) * ay, w, h };
}

/**
 * @param {{wMm:number,hMm:number,side?:string,fmt?:string}} o
 * @returns {{ui:number, frame:{x,y,w,h}, panel:{x,y,w,h}, ratio:number|null}}
 */
export function computeLayout({ wMm, hMm, side = "right", fmt = "fill" }) {
  const ui = Math.max(1, Math.max(wMm, hMm) / 420); // A3 = 1, A2 = 1,4, A1 = 2
  const sd = SIDES.includes(side) ? side : "right";
  const sidebarW = Math.min(92 * ui, Math.max(62, 0.24 * wMm));
  const panelH = Math.min(0.45 * hMm, Math.max(72 * ui, (wMm < hMm ? 0.36 : 0.28) * hMm)); // Hochformat hoeher: Legende und Massstab koennen untereinander stehen
  let frame, panel;
  if (sd === "left") {
    panel = { x: 6 * ui, y: 14 * ui, w: sidebarW, h: hMm - 28 * ui };
    const fx = panel.x + sidebarW + 9 * ui;
    frame = { x: fx, y: 14 * ui, w: wMm - fx - 14 * ui, h: hMm - 28 * ui };
  } else if (sd === "top") {
    panel = { x: 14 * ui, y: 6 * ui, w: wMm - 28 * ui, h: panelH };
    const fy = panel.y + panelH + 14 * ui;
    frame = { x: 14 * ui, y: fy, w: wMm - 28 * ui, h: hMm - fy - 14 * ui };
  } else if (sd === "bottom") {
    const fh = hMm - 14 * ui - panelH - 20 * ui;
    frame = { x: 14 * ui, y: 14 * ui, w: wMm - 28 * ui, h: fh };
    panel = { x: 14 * ui, y: frame.y + fh + 14 * ui, w: wMm - 28 * ui, h: panelH };
  } else {
    frame = { x: 14 * ui, y: 14 * ui, w: wMm - 14 * ui - 6.5 * ui - sidebarW - 6 * ui, h: hMm - 28 * ui };
    panel = { x: frame.x + frame.w + 6.5 * ui, y: frame.y, w: sidebarW, h: frame.h };
  }
  const ratio = parseFormat(fmt);
  if (ratio) {
    // Kartenfenster auf das Format zuschneiden; der Bereich fuer Legende usw. rueckt direkt an die Karte
    // Seitenleiste: der Bereich behaelt die volle Hoehe, auch wenn die Karte flach wird (breites Format); sonst liefen Legende
    // und Massstab unten aus dem Blatt. Die Karte sitzt oben buendig mit dem Bereich.
    if (sd === "right") {
      frame = fitRatio(frame, ratio, 0, 0);
      panel = { ...panel, x: frame.x + frame.w + 6.5 * ui };
    } else if (sd === "left") {
      frame = fitRatio(frame, ratio, 0, 0);
    } else if (sd === "top") {
      frame = fitRatio(frame, ratio, 0.5, 0);
    } else {
      frame = fitRatio(frame, ratio, 0.5, 0);
      panel = { ...panel, y: frame.y + frame.h + 14 * ui };
    }
  }
  return { ui, frame, panel, ratio };
}

/** Bodenmasse des Kartenfensters in Metern bei Druckmassstab 1:scale. */
export function groundSizeM(frame, scale) {
  return { w: (frame.w * scale) / 1000, h: (frame.h * scale) / 1000 };
}

/** Rechteck [west, sued, ost, nord] (Grad) mit Mitte (lat, lon) und Bodenmassen in Metern. */
export function boundsAround(lat, lon, wM, hM) {
  const dLat = hM / 2 / 110540;
  const dLon = wM / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
}

/** Meter je CSS-Pixel einer MapLibre-Karte (512-px-Kacheln) bei Zoom z und Breite lat. */
export function metersPerPx(zoom, lat) {
  return (78271.517 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

/** Sinnvolle Druckmassstaebe fuer die Auswahl. */
export const NICE_SCALES = [1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000];
