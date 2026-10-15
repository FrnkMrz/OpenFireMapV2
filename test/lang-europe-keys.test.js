/**
 * Die Texte der Datenstand-Anzeige für Länder-Dateien (Europa-Erweiterung) müssen in jeder Sprache da und
 * übersetzt sein, sonst steht bei eingeschaltetem Schalter ein englischer oder gar kein Text im Popover.
 */
import { describe, it, expect } from 'vitest';

const modules = import.meta.glob('../src/js/lang/*.js', { eager: true });
const dictionaries = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [path.match(/\/([a-z]+)\.js$/)[1], mod.default || Object.values(mod)[0]])
);
const KEYS = ['data_source_pipeline_europe', 'data_base_sub_europe', 'data_info_hint_europe'];

describe('Europa-Texte der Datenstand-Anzeige in allen Sprachen', () => {
  it('es sind alle 30 Sprachdateien geladen', () => {
    expect(Object.keys(dictionaries).length).toBe(30);
  });

  it.each(Object.keys(dictionaries))('%s: alle drei Schlüssel sind vorhanden und nicht leer', (lang) => {
    for (const key of KEYS) {
      expect(typeof dictionaries[lang][key], `${lang}.${key}`).toBe('string');
      expect(dictionaries[lang][key].trim().length, `${lang}.${key}`).toBeGreaterThan(10);
    }
  });

  it.each(Object.keys(dictionaries).filter((l) => l !== 'en'))('%s: übersetzt (nicht der englische Text)', (lang) => {
    for (const key of KEYS) {
      expect(dictionaries[lang][key], `${lang}.${key}`).not.toBe(dictionaries.en[key]);
    }
  });

  it('die Europa-Herkunft nennt nirgends DACHLiLu (sie gilt ja gerade für andere Länder)', () => {
    for (const [lang, dict] of Object.entries(dictionaries)) {
      expect(dict.data_source_pipeline_europe, lang).not.toMatch(/DACHLiLu/i);
    }
  });

  it('die DACHLiLu-Herkunft bleibt unverändert benannt', () => {
    for (const [lang, dict] of Object.entries(dictionaries)) {
      expect(dict.data_source_pipeline, lang).toMatch(/DACHLiLu/);
    }
  });
});
