import { describe, it, expect } from 'vitest';
import { getCsvSubtype } from '../src/js/export.js';

describe('CSV-Export: Untertyp', () => {
  it('liest fire_station:type bei Feuerwachen', () => {
    const tags = { amenity: 'fire_station', 'fire_station:type': 'volunteer', building: 'fire_station' };
    expect(getCsvSubtype(tags, true, false)).toBe('volunteer');
  });

  it('fällt bei Feuerwachen ohne fire_station:type auf building bzw. "Feuerwehr" zurück', () => {
    expect(getCsvSubtype({ amenity: 'fire_station', building: 'fire_station' }, true, false)).toBe('fire_station');
    expect(getCsvSubtype({ amenity: 'fire_station' }, true, false)).toBe('Feuerwehr');
  });

  it('liefert AED für Defibrillatoren', () => {
    expect(getCsvSubtype({ emergency: 'defibrillator' }, false, true)).toBe('AED');
  });

  it('nutzt fire_hydrant:type und erkennt WSH', () => {
    expect(getCsvSubtype({ emergency: 'fire_hydrant', 'fire_hydrant:type': 'pillar' }, false, false)).toBe('pillar');
    expect(getCsvSubtype({ emergency: 'fire_hydrant', 'fire_hydrant:type': 'underground', 'fire_hydrant:style': 'WSH' }, false, false))
      .toBe('WSH (Württembergischer Schachthydrant)');
    expect(getCsvSubtype({ emergency: 'cistern' }, false, false)).toBe('cistern');
  });
});
