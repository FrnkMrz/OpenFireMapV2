import { describe, it, expect } from 'vitest';
import { escapeCSV } from '../src/js/export.js';

// CSV-Export: Felder in Anführungszeichen und Schutz gegen Formel-Injection aus OSM-Werten
describe('CSV-Export: escapeCSV', () => {
  it('setzt Felder in Anführungszeichen und verdoppelt enthaltene', () => {
    expect(escapeCSV('Hydrant "Nord"')).toBe('"Hydrant ""Nord"""');
    expect(escapeCSV('a;b')).toBe('"a;b"');
    expect(escapeCSV(null)).toBe('""');
    expect(escapeCSV(undefined)).toBe('""');
    expect(escapeCSV('')).toBe('""');
  });

  it('entschärft Werte, die eine Tabellenkalkulation als Formel ausführen würde', () => {
    expect(escapeCSV('=HYPERLINK("http://x","klick")')).toBe('"\'=HYPERLINK(""http://x"",""klick"")"');
    expect(escapeCSV('+1+cmd')).toBe('"\'+1+cmd"');
    expect(escapeCSV('-2+3')).toBe('"\'-2+3"');
    expect(escapeCSV('@SUM(A1)')).toBe('"\'@SUM(A1)"');
    expect(escapeCSV('\t=1')).toBe('"\'\t=1"');
    expect(escapeCSV('\r=1')).toBe('"\'\r=1"');
  });

  it('lässt Zahlen und gewöhnliche Texte unverändert', () => {
    expect(escapeCSV(-3.70379)).toBe('"-3.70379"');
    expect(escapeCSV('-3.70379')).toBe('"-3.70379"');
    expect(escapeCSV('+49')).toBe('"+49"');
    expect(escapeCSV('-5')).toBe('"-5"');
    expect(escapeCSV('2,5')).toBe('"2,5"');
    expect(escapeCSV(49.555)).toBe('"49.555"');
    expect(escapeCSV('Feuerwehr Schnaittach')).toBe('"Feuerwehr Schnaittach"');
    expect(escapeCSV('Hauptstr. = Ecke')).toBe('"Hauptstr. = Ecke"');
  });
});
