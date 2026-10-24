// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Export-Datenabruf bei niedrigem Kartenzoom: Pipeline zuerst, Overpass nur als Ersatz und mit Gesamtlimit.
// Vorher ging der Abruf immer an Overpass; vier Server mit je 25 s Timeout hielten den Export über eine Minute
// bei "Lade Daten" fest.

const pipeline = {
  isPipelineEligible: vi.fn(() => true),
  ensureEuropeReady: vi.fn(() => null),
  fetchPipelineData: vi.fn(),
  fetchPipelineBoundaries: vi.fn(),
  getPipelineOsmDataUntil: vi.fn(() => null),
  getPipelineGeneratedAt: vi.fn(() => null)
};
vi.mock('../src/js/pipeline.js', () => pipeline);
vi.mock('../src/js/ui.js', () => ({ showNotification: vi.fn(), hideNotification: vi.fn() }));

const bounds = {
  getSouth: () => 49.53, getWest: () => 11.3, getNorth: () => 49.57, getEast: () => 11.4
};
const hydrant = { type: 'node', id: 1, lat: 49.55, lon: 11.35, tags: { emergency: 'fire_hydrant' } };
const boundary = { type: 'way', id: 2, geometry: [{ lat: 49.5, lon: 11.3 }], tags: { boundary: 'administrative' } };

describe('fetchDataForExport', () => {
  let fetchDataForExport;
  let Config;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { ...globalThis.navigator, onLine: true });
    pipeline.isPipelineEligible.mockReset().mockReturnValue(true);
    pipeline.fetchPipelineData.mockReset().mockResolvedValue([hydrant]);
    pipeline.fetchPipelineBoundaries.mockReset().mockResolvedValue([boundary]);
    pipeline.getPipelineOsmDataUntil.mockReset().mockReturnValue(null);
    ({ fetchDataForExport } = await import('../src/js/api.js'));
    ({ Config } = await import('../src/js/config.js'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('nutzt die Pipeline (eigenständig, ohne Overpass) und liefert Hydranten samt Grenzen', async () => {
    const result = await fetchDataForExport(bounds, 15, new AbortController().signal);
    expect(result.elements).toEqual([hydrant, boundary]);
    expect(pipeline.fetchPipelineData).toHaveBeenCalledWith(bounds, 'all', expect.objectContaining({ standalone: true, zoom: 15 }));
    expect(pipeline.fetchPipelineBoundaries).toHaveBeenCalledWith(bounds, expect.objectContaining({ standalone: true }));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fällt bei Pipeline-Fehler auf Overpass zurück', async () => {
    pipeline.fetchPipelineData.mockRejectedValue(new Error('PMTiles kaputt'));
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ elements: [hydrant] }) }));
    const result = await fetchDataForExport(bounds, 15, new AbortController().signal);
    expect(result.elements).toEqual([hydrant]);
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it('hängende Pipeline (z. B. PMTiles-Header) beendet die Frist und fällt auf Overpass zurück', async () => {
    pipeline.fetchPipelineData.mockReturnValue(new Promise(() => { /* ohne Abbruchunterstützung */ }));
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ elements: [hydrant] }) }));
    const settled = fetchDataForExport(bounds, 15, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(Config.exportPipelineTimeoutMs + 1000);
    expect((await settled).elements).toEqual([hydrant]);
  });

  it('abgelaufenes Pipeline-Limit mit leerem Teilergebnis gilt nicht als Erfolg', async () => {
    // Die Kachelabrufe schlucken Abbrüche und liefern dann eine leere Liste
    pipeline.fetchPipelineData.mockImplementation(async (b, mode, { signal }) => {
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
      return [];
    });
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ elements: [hydrant] }) }));
    const settled = fetchDataForExport(bounds, 15, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(Config.exportPipelineTimeoutMs + 1000);
    const result = await settled;
    expect(result.elements).toEqual([hydrant]);
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it('mischt Overpass-Änderungen seit dem Pipeline-Stand ein (nach type:id)', async () => {
    const oldHydrant = { ...hydrant, tags: { emergency: 'fire_hydrant', note: 'alt' } };
    const newHydrant = { type: 'node', id: 7, lat: 49.56, lon: 11.36, tags: { emergency: 'fire_hydrant' } };
    pipeline.fetchPipelineData.mockResolvedValue([oldHydrant]);
    pipeline.getPipelineOsmDataUntil.mockReturnValue('2026-10-20T00:00:00Z');
    const changed = { ...hydrant, tags: { emergency: 'fire_hydrant', note: 'neu' } };
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ elements: [changed, newHydrant] }) }));
    const result = await fetchDataForExport(bounds, 15, new AbortController().signal);
    expect(decodeURIComponent(globalThis.fetch.mock.calls[0][1].body)).toContain('newer:"2026-10-20T00:00:00Z"');
    expect(result.elements).toContainEqual(changed);
    expect(result.elements).toContainEqual(newHydrant);
    expect(result.elements).not.toContainEqual(oldHydrant);
    expect(result.elements).toContainEqual(boundary);
  });

  it('Fehler beim Delta ist unkritisch: es gilt der Pipeline-Stand', async () => {
    pipeline.getPipelineOsmDataUntil.mockReturnValue('2026-10-20T00:00:00Z');
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500, statusText: 'x', text: async () => '', headers: new Headers() }));
    const settled = fetchDataForExport(bounds, 15, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(Config.exportPipelineTimeoutMs + 5000);
    expect((await settled).elements).toEqual([hydrant, boundary]);
  });

  it('lädt ohne Grenzen (GPX/CSV): keine Grenzabfrage in Pipeline und Overpass', async () => {
    await fetchDataForExport(bounds, 15, new AbortController().signal, { boundaries: false });
    expect(pipeline.fetchPipelineBoundaries).not.toHaveBeenCalled();

    pipeline.isPipelineEligible.mockReturnValue(false);
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ elements: [hydrant] }) }));
    await fetchDataForExport(bounds, 15, new AbortController().signal, { boundaries: false });
    expect(decodeURIComponent(globalThis.fetch.mock.calls[0][1].body)).not.toContain('admin_level');
  });

  it('geht direkt an Overpass, wenn der Ausschnitt nicht in der Pipeline liegt', async () => {
    pipeline.isPipelineEligible.mockReturnValue(false);
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ elements: [hydrant] }) }));
    await fetchDataForExport(bounds, 15, new AbortController().signal);
    expect(pipeline.fetchPipelineData).not.toHaveBeenCalled();
  });

  it('bricht hängendes Overpass nach dem Gesamtlimit mit TimeoutError ab (statt ewig zu warten)', async () => {
    pipeline.isPipelineEligible.mockReturnValue(false);
    // Server antworten nie; nur ein Abbruch beendet die Anfrage
    globalThis.fetch = vi.fn((url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    const settled = fetchDataForExport(bounds, 15, new AbortController().signal).then(() => ({}), (err) => ({ err }));
    await vi.advanceTimersByTimeAsync(Config.exportFetchTimeoutMs + 1000);
    const { err } = await settled;
    expect(err?.name).toBe('TimeoutError');
    expect(err.message).toBe('err_timeout');
  });

  it('Abbruch durch den Nutzer bleibt ein AbortError', async () => {
    pipeline.isPipelineEligible.mockReturnValue(false);
    globalThis.fetch = vi.fn((url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    const controller = new AbortController();
    const settled = fetchDataForExport(bounds, 15, controller.signal).then(() => ({}), (err) => ({ err }));
    await vi.advanceTimersByTimeAsync(1000);
    controller.abort();
    await vi.advanceTimersByTimeAsync(1000);
    const { err } = await settled;
    expect(err?.name).toBe('AbortError');
  });
});
