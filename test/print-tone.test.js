import { describe, it, expect, vi } from 'vitest';
import {
  buildPrintToneLuts, applyPrintToneToPixels, applyPrintTone,
  buildMonochromeLut, applyMonochromeToPixels, monochromeToneFor,
} from '../src/js/print-tone.js';
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

function mono(rgb, layer = 'voyager') {
  const d = new Uint8ClampedArray([...rgb, 255]);
  const tone = Config.exportPrintTone[layer];
  if (tone) applyPrintToneToPixels(d, buildPrintToneLuts(tone));
  applyMonochromeToPixels(d, buildMonochromeLut(monochromeToneFor(Config.exportMonochrome, layer)));
  return [d[0], d[1], d[2]];
}

describe('Schwarz-Weiß-Druck', () => {
  it('Tabelle ist monoton, umgekehrt fallend', () => {
    const up = buildMonochromeLut({ blackPoint: 20, whitePoint: 245, gamma: 1.2 });
    const down = buildMonochromeLut({ blackPoint: 20, whitePoint: 245, gamma: 1.2, invert: true });
    expect([up[0], up[255], down[0], down[255]]).toEqual([0, 255, 255, 0]);
    for (let v = 1; v < 256; v++) {
      expect(up[v]).toBeGreaterThanOrEqual(up[v - 1]);
      expect(down[v]).toBeLessThanOrEqual(down[v - 1]);
    }
  });

  it('ergibt Grautöne, Alpha bleibt', () => {
    const d = new Uint8ClampedArray([200, 40, 40, 77, 30, 120, 200, 255]);
    applyMonochromeToPixels(d, buildMonochromeLut({ blackPoint: 0, whitePoint: 255, gamma: 1 }));
    expect(d[0]).toBe(d[1]);
    expect(d[1]).toBe(d[2]);
    expect(d[4]).toBe(d[6]);
    expect(d[3]).toBe(77);
    // Leuchtdichte: Grün zählt mehr als Rot und Blau
    expect(d[0]).toBe(Math.round(0.2126 * 200 + 0.7152 * 40 + 0.0722 * 40));
  });

  it('Voyager: Papierweiß bleibt weiß, Gebäude bleiben sichtbar', () => {
    expect(mono([250, 246, 240])).toEqual([255, 255, 255]);
    const bw = contrast(mono([250, 246, 240]), mono([243, 234, 220]));
    expect(bw).toBeGreaterThan(1.3);
  });

  it('fast weiße Flächen werden Papierweiß (Toner)', () => {
    expect(Config.exportPrintTone.topo).toBeUndefined();
    expect(mono([251, 251, 251], 'topo')).toEqual([255, 255, 255]);
  });

  it('Luftbilder bleiben neutral grau (keine Abdunklung)', () => {
    for (const key of ['satellite', 'bayern_dop']) {
      expect(Config.layers[key]).toBeDefined();
      expect(mono([120, 120, 120], key)).toEqual([120, 120, 120]);
    }
    expect(mono([120, 120, 120], 'topo')[0]).toBeLessThan(100);
  });

  it('dunkle Ebene wird umgekehrt: heller Grund, dunkle Straßen', () => {
    expect(monochromeToneFor(Config.exportMonochrome, 'dark').invert).toBe(true);
    expect(monochromeToneFor(Config.exportMonochrome, 'voyager').invert).toBe(false);
    const ground = mono([38, 38, 38], 'dark');
    const road = mono([90, 90, 90], 'dark');
    expect(ground[0]).toBeGreaterThan(180); // heller Grund statt schwarzer Fläche
    expect(road[0]).toBeLessThan(ground[0]);
    for (const key of Config.exportMonochrome.invertLayers) expect(Config.layers[key]).toBeDefined();
  });

  it('ohne Konfiguration keine S/W-Kurve', () => {
    expect(monochromeToneFor(undefined, 'voyager')).toBeNull();
  });

  it('applyPrintTone nimmt S/W auch für Ebenen ohne Farbkurve (Satellit)', () => {
    let last;
    const ctx = {
      getImageData: vi.fn((x, y, w, h) => {
        last = { data: new Uint8ClampedArray(w * h * 4).map((_, i) => (i % 4 === 0 ? 200 : 60)) };
        return last;
      }),
      putImageData: vi.fn(),
    };
    expect(Config.exportPrintTone.satellite).toBeUndefined();
    expect(applyPrintTone(ctx, 0, 0, 4, 4, undefined, monochromeToneFor(Config.exportMonochrome, 'satellite'))).toBe(true);
    expect(last.data[0]).toBe(last.data[1]);
    expect(last.data[1]).toBe(last.data[2]);
  });
});
