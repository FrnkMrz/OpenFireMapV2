/**
 * Druckkurve für den Bild-/PDF-Export.
 *
 * Die Hintergrundkarten sind für den Bildschirm gestaltet und sehr hell (CARTO Voyager: Gebäude zu Hintergrund
 * ≈ 1,1:1). Auf Papier verschwinden Straßenränder und Gebäudeumrisse fast vollständig. Die Kurve dunkelt die
 * Kacheln vor dem Zeichnen der Marker ab: der Hintergrund der Ebene wird reines Papierweiß (Weißpunkt je Kanal),
 * helle Töne werden gespreizt (Schwarzpunkt + Gamma). Einstellungen je Ebene in `Config.exportPrintTone`;
 * Ebenen ohne Eintrag (Satellit, Luftbild, Dark, Topo, Bayern) bleiben unverändert.
 */

/** Zeilen pro Durchgang: begrenzt den Speicher bei großen Exporten (getImageData kopiert den Bereich). */
const STRIP_ROWS = 512;

/**
 * Baut je Farbkanal eine Nachschlagetabelle (256 Einträge).
 * @param {{ blackPoint: number, whitePoint: number[], gamma: number }} tone
 * @returns {Uint8ClampedArray[]} [rot, grün, blau]
 */
export function buildPrintToneLuts({ blackPoint, whitePoint, gamma }) {
  return whitePoint.map((wp) => {
    const lut = new Uint8ClampedArray(256);
    const range = Math.max(1, wp - blackPoint);
    for (let v = 0; v < 256; v++) {
      const t = Math.min(1, Math.max(0, (v - blackPoint) / range));
      lut[v] = Math.round(255 * Math.pow(t, gamma));
    }
    return lut;
  });
}

/** Wendet die Tabellen auf RGBA-Pixeldaten an (Alpha bleibt). */
export function applyPrintToneToPixels(data, luts) {
  const [r, g, b] = luts;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r[data[i]];
    data[i + 1] = g[data[i + 1]];
    data[i + 2] = b[data[i + 2]];
  }
}

/**
 * Wendet die Druckkurve der Ebene auf einen Canvas-Bereich an (streifenweise).
 * Liefert false, wenn die Ebene keine Kurve hat oder der Canvas nicht lesbar ist (dann bleibt das Bild unverändert).
 */
export function applyPrintTone(ctx, x, y, width, height, tone) {
  if (!tone || width <= 0 || height <= 0) return false;
  const luts = buildPrintToneLuts(tone);
  x = Math.round(x);
  y = Math.round(y);
  width = Math.round(width);
  height = Math.round(height);
  try {
    for (let row = 0; row < height; row += STRIP_ROWS) {
      const h = Math.min(STRIP_ROWS, height - row);
      const img = ctx.getImageData(x, y + row, width, h);
      applyPrintToneToPixels(img.data, luts);
      ctx.putImageData(img, x, y + row);
    }
    return true;
  } catch (e) {
    // Kachel ohne CORS macht den Canvas unlesbar: lieber blasser Export als gar keiner
    console.warn("Druckkurve übersprungen:", e);
    return false;
  }
}
