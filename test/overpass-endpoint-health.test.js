import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Config } from '../src/js/config.js';
import { _testing } from '../src/js/api.js';

const { epHealthyOrder, epMarkFail, epMarkOk, simulateReload, resetOverpassState, EP_HEALTH_KEY } = _testing;

// Einfacher localStorage-Ersatz (Vitest läuft hier in Node)
function makeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    _data: data
  };
}

describe('Overpass-Serverreihenfolge über ein Neuladen hinweg', () => {
  const [a, b, c, d] = Config.overpassEndpoints;
  let storage;

  beforeEach(() => {
    storage = makeStorage();
    vi.stubGlobal('localStorage', storage);
    resetOverpassState();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('merkt einen Fehler und sortiert den Server nach dem Neuladen hinten ein, ohne ihn zu sperren', () => {
    epMarkFail(a, 503, 1);                     // Cooldown läuft sofort ab
    expect(JSON.parse(storage.getItem(EP_HEALTH_KEY))).toHaveProperty(a);

    simulateReload();                           // neue Seitenladung: nur localStorage bleibt
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000);
    for (let i = 0; i < 20; i++) {
      const order = epHealthyOrder([a, b, c, d]);
      expect(order).toHaveLength(4);
      expect(order[3]).toBe(a);                 // zuletzt, aber weiterhin in der Liste und nicht im Cooldown
    }
  });

  it('läuft das Merken nach endpointDemoteMs ab, steht der Server wieder gleichberechtigt', () => {
    epMarkFail(a, 503, 1);
    simulateReload();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + Config.performance.endpointDemoteMs + 1000);
    const lastPositions = new Set();
    for (let i = 0; i < 200; i++) lastPositions.add(epHealthyOrder([a, b, c, d]).indexOf(a));
    expect(lastPositions.size).toBeGreaterThan(1);   // wieder zufällig verteilt
  });

  it('ein Erfolg löscht den Eintrag', () => {
    epMarkFail(a, 503, 1);
    epMarkOk(a);
    expect(storage.getItem(EP_HEALTH_KEY)).toBeNull();
    simulateReload();
    const positions = new Set();
    for (let i = 0; i < 200; i++) positions.add(epHealthyOrder([a, b, c, d]).indexOf(a));
    expect(positions.size).toBeGreaterThan(1);
  });

  it('ignoriert unbekannte Server und kaputte Einträge im localStorage', () => {
    storage.setItem(EP_HEALTH_KEY, JSON.stringify({ 'https://fremd.example/api': Date.now(), [a]: 'kaputt' }));
    simulateReload();
    expect(epHealthyOrder([a, b, c, d])).toHaveLength(4);
    storage.setItem(EP_HEALTH_KEY, '{kein json');
    simulateReload();
    expect(epHealthyOrder([a, b, c, d])).toHaveLength(4);
  });

  it('läuft ohne localStorage weiter', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => epMarkFail(a, 503, 1)).not.toThrow();
    simulateReload();
    expect(epHealthyOrder([a, b, c, d])).toHaveLength(4);
  });
});
