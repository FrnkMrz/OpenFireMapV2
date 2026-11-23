import { describe, it, expect, vi } from 'vitest';
import { buildPrintToneLuts, applyPrintToneToPixels, applyPrintTone } from '../src/js/print-tone.js';
import { Config } from '../src/js/config.js';

// Relative Leuchtdichte und Kontrast nach WCAG
function lum([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function tone(rgb, luts) {
  const d = new Uint8ClampedArray([...rgb, 255]);
  applyPrintToneToPixels(d, luts);
  return [d[0], d[1], d[2]];
}

describe('Druckkurve', () => {
  it('Tabellen sind monoton und reichen von 0 bis 255', () => {
    for (const lut of buildPrintToneLuts({ blackPoint: 100, whitePoint: [250, 246, 240], gamma: 1.9 })) {
      expect(lut[0]).toBe(0);
      expect(lut[255]).toBe(255);
      for (let v = 1; v < 256; v++) expect(lut[v]).toBeGreaterThanOrEqual(lut[v - 1]);
    }
  });

  it('Voyager: Hintergrund wird Papierweiß, Gebäude heben sich deutlich ab', () => {
    const luts = buildPrintToneLuts(Config.exportPrintTone.voyager);
    const bg = [250, 246, 240];
    const building = [243, 234, 220];
    expect(tone(bg, luts)).toEqual([255, 255, 255]);
    expect(contrast(bg, building)).toBeLessThan(1.2); // Ausgangslage: kaum sichtbar
    // Gebäudefläche 1,11:1 → 1,39:1 (Umrisse und Straßenränder sind dunkler und gewinnen mehr)
    expect(contrast(tone(bg, luts), tone(building, luts))).toBeGreaterThan(1.3);
  });

  it('Alpha bleibt unverändert', () => {
    const luts = buildPrintToneLuts(Config.exportPrintTone.osmde);
    const d = new Uint8ClampedArray([200, 200, 200, 128]);
    applyPrintToneToPixels(d, luts);
    expect(d[3]).toBe(128);
    expect(d[0]).toBeLessThan(200);
  });

  it('Bild- und kontrastreiche Ebenen haben keine Kurve', () => {
    for (const key of ['satellite', 'bayern_dop', 'dark', 'topo', 'bayern']) {
      expect(Config.exportPrintTone[key]).toBeUndefined();
    }
    for (const key of Object.keys(Config.exportPrintTone)) {
      expect(Config.layers[key]).toBeDefined();
    }
  });

  it('applyPrintTone arbeitet streifenweise und lässt ohne Kurve alles unverändert', () => {
    const ctx = {
      getImageData: vi.fn((x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(240) })),
      putImageData: vi.fn(),
    };
    expect(applyPrintTone(ctx, 0, 0, 10, 10, undefined)).toBe(false);
    expect(ctx.getImageData).not.toHaveBeenCalled();

    expect(applyPrintTone(ctx, 40, 210, 20, 1100, Config.exportPrintTone.voyager)).toBe(true);
    expect(ctx.getImageData.mock.calls.map((c) => [c[1], c[3]])).toEqual([[210, 512], [722, 512], [1234, 76]]);
    expect(ctx.putImageData).toHaveBeenCalledTimes(3);
  });

  it('unlesbarer Canvas (ohne CORS) bricht den Export nicht ab', () => {
    const ctx = { getImageData: () => { throw new DOMException('tainted', 'SecurityError'); }, putImageData: vi.fn() };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(applyPrintTone(ctx, 0, 0, 10, 10, Config.exportPrintTone.voyager)).toBe(false);
  });
});
