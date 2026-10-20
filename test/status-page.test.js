import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Config } from '../src/js/config.js';
import { loadPipelineData, PIPELINE_URL, MANIFEST_PATH, METADATA_PATH } from '../src/js/status/load.js';
import { COUNTRY_EN, LANGS, TEXTS, countryName, createFormatters, detectLang } from '../src/js/status/texts.js';
import population from '../src/data/status-population.json';
import snapshot from '../src/data/status-dach-snapshot.json';

const html = readFileSync(resolve(__dirname, '../status/index.html'), 'utf8');

describe('Statusseite: HTML und CSP', () => {
  const csp = {};
  for (const part of html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i)[1].split(';')) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) csp[name] = values;
  }

  it('lässt keine Inline-Skripte zu und lädt nur eigene Skripte', () => {
    expect(csp['script-src']).toEqual(["'self'"]);
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>\s*\S/);
  });

  it('erlaubt die Pipeline als einzige Fremdquelle für Daten', () => {
    expect(csp['connect-src']).toContain(Config.pipeline.url);
    expect(csp['connect-src'].filter((s) => s.startsWith('https://'))).toEqual([Config.pipeline.url]);
  });

  it('nutzt für jeden data-i18n-Schlüssel einen Text in beiden Sprachen', () => {
    const keys = [...html.matchAll(/data-i18n(?:-ph|-aria)?="([^"]+)"/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(20);
    for (const lang of LANGS) for (const k of keys) expect(TEXTS[lang][k], `${lang}:${k}`).toBeTruthy();
  });

  it('hat eine Seitensprache und main-Landmarke', () => {
    expect(html).toMatch(/<html lang="de">/);
    expect(html).toMatch(/<main id="main"/);
  });
});

describe('Statusseite: Texte', () => {
  it('Deutsch und Englisch haben dieselben Schlüssel', () => {
    expect(Object.keys(TEXTS.en).sort()).toEqual(Object.keys(TEXTS.de).sort());
  });

  it('jeder Text ist nicht leer', () => {
    for (const lang of LANGS) for (const [k, v] of Object.entries(TEXTS[lang])) expect(v.trim(), `${lang}:${k}`).not.toBe('');
  });

  it('Einwohnerzahlen und englische Namen decken dieselben Länder ab', () => {
    expect(Object.keys(population.populationM).sort()).toEqual(Object.keys(COUNTRY_EN).sort());
    for (const v of Object.values(population.populationM)) expect(v).toBeGreaterThan(0);
  });

  it('countryName: englischer Name, sonst Name aus dem Manifest', () => {
    expect(countryName({ id: 'poland', nameDe: 'Polen' }, 'en')).toBe('Poland');
    expect(countryName({ id: 'poland', nameDe: 'Polen' }, 'de')).toBe('Polen');
    expect(countryName({ id: 'neuland', nameDe: 'Neuland' }, 'en')).toBe('Neuland');
  });

  it('detectLang: URL vor Speicher vor Browser, sonst Deutsch', () => {
    expect(detectLang({ search: '?lang=en', stored: 'de', browser: 'de-DE' })).toBe('en');
    expect(detectLang({ stored: 'en', browser: 'de-DE' })).toBe('en');
    expect(detectLang({ stored: 'fr', browser: 'de-AT' })).toBe('de');
    expect(detectLang({ browser: 'fr-FR' })).toBe('en');
    expect(detectLang({})).toBe('de');
    expect(detectLang({ search: '?lang=xx', browser: '' })).toBe('de');
  });

  it('Formate: Zahlen und Zeiten je Sprache in UTC', () => {
    const de = createFormatters('de');
    const en = createFormatters('en');
    expect(de.int(1022616)).toBe('1.022.616');
    expect(en.int(1022616)).toBe('1,022,616');
    expect(de.dens(9.94)).toBe('9,94');
    expect(de.dens(12.34)).toBe('12,3');
    expect(de.dens(0.37)).toBe('0,37');
    expect(de.dens(0.0006)).toBe('0,001');
    const ms = Date.parse('2026-10-20T01:08:45Z');
    expect(de.dt(ms)).toBe('20.10.2026 01:08');
    expect(en.dt(ms)).toBe('Oct 20, 2026 01:08');
    expect(de.dtick(ms)).toBe('20.10.');
    expect(en.dtick(ms)).toBe('Oct 20');
    expect(de.dt('kein Datum')).toBe('—');
    expect(de.sec(603.1)).toBe('603 s');
  });
});

describe('Statusseite: Zählung der DACHLiLu-Länder', () => {
  it('enthält jede Ebene für alle fünf Länder', () => {
    for (const layer of ['hydrants', 'fire_stations', 'water_points', 'defibrillators']) {
      expect(Object.keys(snapshot[layer]).sort(), layer).toEqual(['austria', 'germany', 'liechtenstein', 'luxembourg', 'switzerland']);
      for (const v of Object.values(snapshot[layer])) expect(v).toBeGreaterThan(0);
    }
  });
});

describe('Statusseite: Laden', () => {
  const manifest = { version: 1, regions: { malta: { id: 'malta' } } };

  it('nutzt dieselbe Pipeline-Adresse wie die Karte', () => {
    expect(PIPELINE_URL).toBe(Config.pipeline.url);
    expect(MANIFEST_PATH).toBe(Config.pipeline.europe.manifestPath);
  });

  it('holt Manifest und metadata.json', async () => {
    const urls = [];
    const fetcher = async (url) => { urls.push(url); return url.endsWith(METADATA_PATH) ? { generated_at: 'x' } : manifest; };
    const out = await loadPipelineData(fetcher);
    expect(urls.sort()).toEqual([`${PIPELINE_URL}/${METADATA_PATH}`, `${PIPELINE_URL}/${MANIFEST_PATH}`].sort());
    expect(out).toMatchObject({ manifest, metadataFailed: false });
  });

  it('läuft ohne metadata.json weiter und meldet es', async () => {
    const fetcher = async (url) => { if (url.endsWith(METADATA_PATH)) throw new Error('HTTP 503'); return manifest; };
    const out = await loadPipelineData(fetcher);
    expect(out.metadata).toBeNull();
    expect(out.metadataFailed).toBe(true);
  });

  it('wirft, wenn das Manifest fehlt oder unbrauchbar ist', async () => {
    await expect(loadPipelineData(async (url) => { if (url.endsWith(MANIFEST_PATH)) throw new Error('HTTP 404'); return {}; })).rejects.toThrow('404');
    await expect(loadPipelineData(async () => ({ version: 1 }))).rejects.toThrow('regions');
    await expect(loadPipelineData(async () => null)).rejects.toThrow();
  });
});
