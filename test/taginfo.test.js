import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Prüft public/taginfo.json (Taginfo-Projektdatei, siehe https://taginfo.openstreetmap.org/projects)
// gegen das Taginfo-Schema und gegen die Tags, die Overpass-Abfragen und Pipeline tatsächlich filtern.

const root = resolve(__dirname, '..');
const taginfo = JSON.parse(readFileSync(resolve(root, 'public/taginfo.json'), 'utf8'));
const apiSource = readFileSync(resolve(root, 'src/js/api.js'), 'utf8');
const builderSource = readFileSync(resolve(root, 'pipeline/builder/build_features.py'), 'utf8');

const hasTag = (key, value) => taginfo.tags.some((t) => t.key === key && t.value === value);

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

  it('deckt alle Tags der Pipeline-Filter ab', () => {
    for (const [, key, values] of builderSource.matchAll(/"[nwr]+\/([\w:]+)=([^"]+)"/g)) {
      for (const value of values.split(',')) expect(hasTag(key, value), `${key}=${value} fehlt`).toBe(true);
    }
  });
});
