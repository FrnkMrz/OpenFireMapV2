/**
 * Druckkurve für den Bild-/PDF-Export.
 *
 * Die Hintergrundkarten sind für den Bildschirm gestaltet und sehr hell (CARTO Voyager: Gebäude zu Hintergrund
 * ≈ 1,1:1). Auf Papier verschwinden Straßenränder und Gebäudeumrisse fast vollständig. Die Kurve dunkelt die
 * Kacheln vor dem Zeichnen der Marker ab: der Hintergrund der Ebene wird reines Papierweiß (Weißpunkt je Kanal),
 * helle Töne werden gespreizt (Schwarzpunkt + Gamma). Einstellungen je Ebene in `Config.exportPrintTone`;
 * Ebenen ohne Eintrag (Satellit, Luftbild, Dark, Topo, Bayern) bleiben unverändert.
 *
 * Schwarz-Weiß (Export-Schalter „S/W“): Nach der Farbkurve wird jedes Pixel auf seine Leuchtdichte reduziert und
 * über eine eigene Kurve gespreizt (`Config.exportMonochrome`). Gedacht für Laserdrucker: Farbflächen, die in
 * Graustufen fast gleich hell wären, sollen sich trotzdem abheben, fast weiße Töne werden Papierweiß (spart
 * Toner). Dunkle Ebenen (Dark) werden dabei umgekehrt, sonst druckte die ganze Fläche schwarz.
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

/**
 * Tabelle Leuchtdichte (0–255) → Grauton für den S/W-Druck.
 * @param {{ blackPoint: number, whitePoint: number, gamma: number, invert?: boolean }} mono
 */
export function buildMonochromeLut({ blackPoint, whitePoint, gamma, invert = false }) {
  const lut = new Uint8ClampedArray(256);
  const range = Math.max(1, whitePoint - blackPoint);
  for (let v = 0; v < 256; v++) {
    const src = invert ? 255 - v : v;
    const t = Math.min(1, Math.max(0, (src - blackPoint) / range));
    lut[v] = Math.round(255 * Math.pow(t, gamma));
  }
  return lut;
}

/** Graustufen: Leuchtdichte nach Rec. 709 (auf den sRGB-Werten), dann die Tabelle (Alpha bleibt). */
export function applyMonochromeToPixels(data, lut) {
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    const v = lut[y];
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
}

/** S/W-Einstellungen für eine Ebene (umgekehrt für dunkle Ebenen), null ohne Konfiguration. */
export function monochromeToneFor(config, layerKey) {
  if (!config) return null;
  const { invertLayers = [], layerOverrides = {}, ...curve } = config;
  return { ...curve, ...layerOverrides[layerKey], invert: invertLayers.includes(layerKey) };
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
 * Wendet die Druckkurve der Ebene und optional S/W auf einen Canvas-Bereich an (streifenweise).
 * Liefert false, wenn nichts zu tun ist oder der Canvas nicht lesbar ist (dann bleibt das Bild unverändert).
 * @param {object|undefined} tone Farbkurve der Ebene (`Config.exportPrintTone[ebene]`)
 * @param {object|null} [mono] S/W-Kurve (`monochromeToneFor(...)`), null = farbig
 */
export function applyPrintTone(ctx, x, y, width, height, tone, mono = null) {
  if ((!tone && !mono) || width <= 0 || height <= 0) return false;
  const luts = tone ? buildPrintToneLuts(tone) : null;
  const monoLut = mono ? buildMonochromeLut(mono) : null;
  x = Math.round(x);
  y = Math.round(y);
  width = Math.round(width);
  height = Math.round(height);
  try {
    for (let row = 0; row < height; row += STRIP_ROWS) {
      const h = Math.min(STRIP_ROWS, height - row);
      const img = ctx.getImageData(x, y + row, width, h);
      if (luts) applyPrintToneToPixels(img.data, luts);
      if (monoLut) applyMonochromeToPixels(img.data, monoLut);
      ctx.putImageData(img, x, y + row);
    }
    return true;
  } catch (e) {
    // Kachel ohne CORS macht den Canvas unlesbar: lieber blasser Export als gar keiner
    console.warn("Druckkurve übersprungen:", e);
    return false;
  }
}
