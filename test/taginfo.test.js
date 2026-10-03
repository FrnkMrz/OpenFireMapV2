import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Prüft public/taginfo.json (Taginfo-Projektdatei, siehe https://taginfo.openstreetmap.org/projects)
// gegen das Taginfo-Schema und gegen die Tags, die Overpass-Abfragen und Pipeline tatsächlich filtern.

const root = resolve(__dirname, '..');
const taginfo = JSON.parse(readFileSync(resolve(root, 'public/taginfo.json'), 'utf8'));
const apiSource = readFileSync(resolve(root, 'src/js/api.js'), 'utf8');
// Der Builder liegt im privaten Pipeline-Repo (FrnkMrz/openfiremap-dach-pipeline). Die Pipeline-Tests laufen,
// wenn ein Checkout daneben liegt (../openfiremap-dach-pipeline) oder PIPELINE_BUILDER auf die Datei zeigt;
// andernfalls (z. B. in der CI) werden sie übersprungen.
const builderPath = [process.env.PIPELINE_BUILDER, resolve(root, '../openfiremap-dach-pipeline/builder/build_features.py')]
  .find((p) => p && existsSync(p));
const builderSource = builderPath ? readFileSync(builderPath, 'utf8') : '';
const itPipeline = it.skipIf(!builderPath);

const hasTag = (key, value) => taginfo.tags.some((t) => t.key === key && t.value === value);

// Objekttypen, die eine Abfrage erfasst. 'area' steht in Taginfo für geschlossene Wege und
// Multipolygon-Relationen und ist daher bei Weg- und Relationsabfragen möglich.
const OVERPASS_TYPES = {
  nwr: ['node', 'way', 'relation', 'area'],
  node: ['node'],
  way: ['way', 'area'],
  rel: ['relation', 'area'],
};
const OSMIUM_TYPES = { n: ['node'], w: ['way', 'area'], r: ['relation', 'area'] };

// Jeder in taginfo.json genannte Objekttyp muss von der Abfrage tatsächlich erfasst werden.
// Engere Angaben (z. B. Hydranten nur als node trotz nwr-Abfrage) sind erlaubt.
const expectTypesCovered = (key, value, selectable, source) => {
  const tag = taginfo.tags.find((t) => t.key === key && t.value === value);
  for (const type of tag?.object_types || []) {
    expect(selectable.includes(type), `${key}=${value}: object_types enthält ${type}, ${source} erfasst nur ${selectable.join('/')}`).toBe(true);
  }
};

describe('taginfo.json', () => {
  it('erfüllt die Pflichtfelder des Taginfo-Schemas', () => {
    expect(taginfo.data_format).toBe(1);
    expect(taginfo.data_url).toBe('https://openfiremap.org/taginfo.json');
    expect(taginfo.data_updated).toMatch(/^20\d{6}T\d{6}Z$/);
    for (const field of ['name', 'description', 'project_url', 'contact_name', 'contact_email']) {
      expect(typeof taginfo.project[field]).toBe('string');
      expect(taginfo.project[field].length).toBeGreaterThan(0);
    }
    expect(Array.isArray(taginfo.tags)).toBe(true);
  });

  it('enthält nur gültige Tag-Einträge ohne Duplikate', () => {
    const allowedFields = new Set(['key', 'value', 'object_types', 'description', 'doc_url', 'icon_url']);
    const allowedTypes = new Set(['node', 'way', 'relation', 'area']);
    const seen = new Set();
    for (const tag of taginfo.tags) {
      expect(typeof tag.key).toBe('string');
      for (const field of Object.keys(tag)) expect(allowedFields.has(field)).toBe(true);
      for (const type of tag.object_types || []) expect(allowedTypes.has(type)).toBe(true);
      const id = `${tag.key}=${tag.value ?? '*'}`;
      expect(seen.has(id), `Duplikat: ${id}`).toBe(false);
      seen.add(id);
    }
  });

  it('deckt alle Tags der Overpass-Abfragen ab', () => {
    for (const [, key, op, values] of apiSource.matchAll(/\["([\w:]+)"(=|~)"([^"]+)"\]/g)) {
      const list = op === '~' ? values.split('|') : [values];
      for (const value of list) expect(hasTag(key, value), `${key}=${value} fehlt`).toBe(true);
    }
  });

  itPipeline('deckt alle Tags der Pipeline-Filter ab', () => {
    for (const [, key, values] of builderSource.matchAll(/"[nwr]+\/([\w:]+)=([^"]+)"/g)) {
      for (const value of values.split(',')) expect(hasTag(key, value), `${key}=${value} fehlt`).toBe(true);
    }
  });
  it('nennt nur Objekttypen, die die Overpass-Abfragen erfassen', () => {
    const statements = apiSource.matchAll(/\b(nwr|node|way|rel)((?:\["[\w:]+"(?:=|~)"[^"]+"\])+)/g);
    let checked = 0;
    for (const [, type, filters] of statements) {
      for (const [, key, op, values] of filters.matchAll(/\["([\w:]+)"(=|~)"([^"]+)"\]/g)) {
        for (const value of op === '~' ? values.split('|') : [values]) {
          expectTypesCovered(key, value, OVERPASS_TYPES[type], `Overpass ${type}[...]`);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  itPipeline('nennt nur Objekttypen, die die Pipeline-Filter erfassen', () => {
    let checked = 0;
    for (const [, letters, key, values] of builderSource.matchAll(/"([nwr]+)\/([\w:]+)=([^"]+)"/g)) {
      const selectable = [...new Set([...letters].flatMap((l) => OSMIUM_TYPES[l]))];
      for (const value of values.split(',')) {
        expectTypesCovered(key, value, selectable, `osmium ${letters}/`);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('Gemeindegrenzen: boundary/admin_level nur als Relation (Auswahl über Gemeinde-Relationen)', () => {
    for (const [key, value] of [['boundary', 'administrative'], ['admin_level', '8']]) {
      expect(taginfo.tags.find((t) => t.key === key && t.value === value)?.object_types).toEqual(['relation']);
    }
  });
});
