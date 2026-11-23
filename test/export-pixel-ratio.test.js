import { describe, it, expect } from 'vitest';
import { getExportPixelRatio } from '../src/js/export.js';
import { Config } from '../src/js/config.js';

// Export in doppelter Auflösung: nur Ebenen mit @2x-Kacheln, nur solange der Canvas überall sicher machbar ist
describe('Export: getExportPixelRatio', () => {
  it('CARTO-Ebenen bekommen doppelte Auflösung', () => {
    for (const key of ['voyager', 'positron', 'dark']) {
      expect(getExportPixelRatio(Config.layers[key], 1851, 1600)).toBe(2);
    }
  });

  it('Ebenen ohne @2x-Kacheln bleiben einfach', () => {
    for (const key of ['osm', 'osmde', 'topo', 'satellite', 'bayern', 'bayern_dop']) {
      expect(getExportPixelRatio(Config.layers[key], 1851, 1600)).toBe(1);
    }
    expect(getExportPixelRatio(undefined, 100, 100)).toBe(1);
  });

  it('großer Ausschnitt fällt auf einfache Auflösung zurück (Fläche > 4096²)', () => {
    expect(getExportPixelRatio(Config.layers.voyager, 2048, 2048)).toBe(2);
    expect(getExportPixelRatio(Config.layers.voyager, 2049, 2048)).toBe(1);
  });

  it('lange schmale Ausschnitte: Seitenlänge über 14000 px bleibt einfach', () => {
    expect(getExportPixelRatio(Config.layers.voyager, 7001, 100)).toBe(1);
  });
});
