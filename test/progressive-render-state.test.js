// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { State } from '../src/js/state.js';
import { Config } from '../src/js/config.js';
import { fetchOSMData, fetchBoundaryData } from '../src/js/api.js';
import * as pipelineModule from '../src/js/pipeline.js';
import { exportAsGPX, exportAsCSV, exportPNG } from '../src/js/export.js';

describe('Progressives Rendern: Zustand, Status-Flackern & Export-Konsistenz', () => {
  let originalMap;
  let originalConfig;

  beforeEach(() => {
    originalMap = State.map;
    originalConfig = { ...Config.pipeline };

    document.body.replaceChildren();
    const box = document.createElement('div');
    box.id = 'notification-box';
    document.body.appendChild(box);

    const titleInput = document.createElement('input');
    titleInput.id = 'export-confirm-title';
    titleInput.value = 'Test Export';
    document.body.appendChild(titleInput);

    // Reset State
    State.cachedPoiElements = [];
    State.cachedBoundaryElements = [];
    State.cachedElements = [];
    State.loadedPoiBounds = null;
    State.loadedBoundaryBounds = null;
    State.loadedPoiMode = null;
    State.isFetchingData = false;
    State.pendingBufferFetch = null;
    State.controllers = {
      fetch: null,
      boundaryFetch: null,
      export: null
    };

    const makeBounds = (s, w, n, e) => ({
      getSouth: () => s,
      getNorth: () => n,
      getWest: () => w,
      getEast: () => e,
      getSouthWest: () => ({ lat: s, lng: w }),
      getNorthEast: () => ({ lat: n, lng: e }),
      contains: (other) => true,
      getNorthWest: () => ({ lat: n, lng: w }),
      getSouthEast: () => ({ lat: s, lng: e }),
      getCenter: () => ({ lat: (s + n) / 2, lng: (w + e) / 2 })
    });

    // Mock Leaflet L
    globalThis.L = {
      latLngBounds: (sw, ne) => {
        const south = Array.isArray(sw) ? sw[0] : (sw?.lat ?? sw);
        const west = Array.isArray(sw) ? sw[1] : (sw?.lng ?? sw?.lon ?? sw);
        const north = Array.isArray(ne) ? ne[0] : (ne?.lat ?? ne);
        const east = Array.isArray(ne) ? ne[1] : (ne?.lng ?? ne?.lon ?? ne);
        return makeBounds(south, west, north, east);
      },
      latLng: (lat, lon) => ({
        lat,
        lon,
        lng: lon
      })
    };

    // Mock Map in State (Nürnberg, DACHLiLu Bereich)
    const boundsObj = makeBounds(49.44, 11.06, 49.46, 11.08);

    State.map = {
      getZoom: () => 16,
      getBounds: () => boundsObj,
      getCenter: () => boundsObj.getCenter(),
      hasLayer: () => true
    };

    State.selection = {
      active: false,
      finalBounds: boundsObj
    };

    Config.pipeline = {
      ...Config.pipeline,
      enabled: true,
      url: 'https://pipeline.example.com',
      usePmtiles: true,
      geojsonFallback: false
    };
  });

  afterEach(() => {
    State.map = originalMap;
    Config.pipeline = originalConfig;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Zustand bei Zwischenmeldungen (cachedPoiElements bleibt unberührt)
  // =========================================================================
  it('1. Zustand bei Zwischenmeldungen: cachedPoiElements ändert sich während des Streamings nicht', async () => {
    const initialPoi = [{ id: 'old_hydrant', tags: { emergency: 'fire_hydrant' } }];
    State.cachedPoiElements = [...initialPoi];
    State.loadedPoiBounds = { id: 'old_bounds' };

    let capturedProgressCb = null;
    vi.spyOn(pipelineModule, 'isPipelineEligible').mockReturnValue(true);
    vi.spyOn(pipelineModule, 'fetchPipelineData').mockImplementation(async (bounds, mode, options) => {
      capturedProgressCb = options.onProgressData;

      // Kachel-Streaming Zwischenmeldung simulieren
      const chunk1 = [{ id: 'hydrant_1', tags: { emergency: 'fire_hydrant' } }];
      capturedProgressCb(chunk1, true, { phase: 'visible' });

      // State MUSS während des Streamings noch unverändert sein!
      expect(State.cachedPoiElements).toEqual(initialPoi);
      expect(State.loadedPoiBounds).toEqual({ id: 'old_bounds' });

      const chunk2 = [
        { id: 'hydrant_1', tags: { emergency: 'fire_hydrant' } },
        { id: 'hydrant_2', tags: { emergency: 'fire_hydrant' } }
      ];
      capturedProgressCb(chunk2, true, { phase: 'visible' });

      expect(State.cachedPoiElements).toEqual(initialPoi);

      // Rückgabe der sichtbaren Kacheln
      const finalVisible = [...chunk2];
      finalVisible.loadedBounds = { id: 'visible_bounds' };
      return finalVisible;
    });

    const rendered = [];
    await fetchOSMData((items) => {
      rendered.push(items);
    });

    // Erst nach Abschluss von fetchPipelineData ist State.cachedPoiElements gesetzt
    expect(State.cachedPoiElements.length).toBe(2);
    expect(State.cachedPoiElements.map(el => el.id)).toEqual(['hydrant_1', 'hydrant_2']);
    expect(State.loadedPoiBounds).toEqual({ id: 'visible_bounds' });
  });

  // =========================================================================
  // 2. Veraltete Anfrage (Request 1 wird ignoriert, sobald Request 2 startet)
  // =========================================================================
  it('2. Veraltete Anfrage: Request 1 darf State nicht mehr überschreiben, wenn Request 2 läuft', async () => {
    vi.spyOn(pipelineModule, 'isPipelineEligible').mockReturnValue(true);

    let finishRequest1;
    const req1Promise = new Promise((resolve) => {
      finishRequest1 = resolve;
    });

    let req1ProgressCb;
    let req2ProgressCb;

    vi.spyOn(pipelineModule, 'fetchPipelineData').mockImplementation(async (bounds, mode, options) => {
      if (!req1ProgressCb) {
        req1ProgressCb = options.onProgressData;
        const res = await req1Promise;
        if (options.signal?.aborted) {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          throw err;
        }
        return res;
      } else {
        req2ProgressCb = options.onProgressData;
        const res = [{ id: 'req2_hydrant', tags: { emergency: 'fire_hydrant' } }];
        res.loadedBounds = { id: 'req2_bounds' };
        return res;
      }
    });

    // Request 1 starten
    const p1 = fetchOSMData().catch(e => e);

    // Jetzt startet Request 2 vor Beendigung von Request 1
    const p2 = fetchOSMData();
    await p2;

    expect(State.cachedPoiElements.map(el => el.id)).toEqual(['req2_hydrant']);
    expect(State.loadedPoiBounds).toEqual({ id: 'req2_bounds' });

    // Request 1 versucht jetzt späte Zwischenmeldung und Abschluss zu liefern
    const req1Data = [{ id: 'req1_late_hydrant', tags: { emergency: 'fire_hydrant' } }];
    req1Data.loadedBounds = { id: 'req1_bounds' };
    req1ProgressCb(req1Data, true, { phase: 'visible' });

    // State darf nicht von req1 verändert worden sein!
    expect(State.cachedPoiElements.map(el => el.id)).toEqual(['req2_hydrant']);

    finishRequest1(req1Data);
    const err = await p1;
    expect(err?.name).toBe('AbortError');

    // State bleibt strikt bei Request 2!
    expect(State.cachedPoiElements.map(el => el.id)).toEqual(['req2_hydrant']);
    expect(State.loadedPoiBounds).toEqual({ id: 'req2_bounds' });
  });

  // =========================================================================
  // 3. Statusfolge (loading -> success, kein loading nach success)
  // =========================================================================
  it('3. Statusfolge: Pufferring meldet niemals loading nach bereits gemeldetem success', async () => {
    vi.spyOn(pipelineModule, 'isPipelineEligible').mockReturnValue(true);

    const statusHistory = [];
    const mockOnStatus = (status) => {
      statusHistory.push({ ...status });
    };

    vi.spyOn(pipelineModule, 'fetchPipelineData').mockImplementation(async (bounds, mode, options) => {
      // 1. Sichtbare Kacheln progressiv
      options.onProgressData([{ id: 'h1' }], true, { phase: 'visible' });
      options.onProgressData([{ id: 'h1' }, { id: 'h2' }], true, { phase: 'visible' });

      // Ende Phase 1
      const visibleResult = [{ id: 'h1' }, { id: 'h2' }];
      visibleResult.loadedBounds = { id: 'visBounds' };

      // Phase 2 Pufferring asynchron im Hintergrund
      setTimeout(() => {
        // Pufferkachel trifft ein (darf kein 'loading' melden!)
        options.onProgressData([{ id: 'h1' }, { id: 'h2' }, { id: 'h3_buffer' }], true, { phase: 'buffer' });
        // Pufferabschluss
        options.onBufferComplete(
          [{ id: 'h1' }, { id: 'h2' }, { id: 'h3_buffer' }],
          { id: 'fullBounds' }
        );
      }, 10);

      return visibleResult;
    });

    await fetchOSMData(null, mockOnStatus);

    // Auf asynchronen Puffer warten
    await new Promise((r) => setTimeout(r, 40));

    // Alle Zustandswechsel prüfen
    const states = statusHistory.map(s => s.state);
    expect(states[0]).toBe('loading');

    // Prüfen: Sobald 'success' einmal erreicht wurde, darf kein 'loading' mehr folgen!
    const firstSuccessIndex = states.indexOf('success');
    expect(firstSuccessIndex).toBeGreaterThan(-1);

    const statesAfterSuccess = states.slice(firstSuccessIndex);
    expect(statesAfterSuccess.includes('loading')).toBe(false);
    expect(statesAfterSuccess.every(s => s === 'success')).toBe(true);
  });

  // =========================================================================
  // 4. Pufferring-Abschluss (loadedPoiBounds erst nach Puffer gesetzt; Abort)
  // =========================================================================
  it('4. Pufferring-Abschluss: loadedPoiBounds auf fullBounds; bei AbortSignal kein Update', async () => {
    vi.spyOn(pipelineModule, 'isPipelineEligible').mockReturnValue(true);

    let bufferCompleteCb;
    vi.spyOn(pipelineModule, 'fetchPipelineData').mockImplementation(async (bounds, mode, options) => {
      bufferCompleteCb = options.onBufferComplete;
      const visible = [{ id: 'h1' }];
      visible.loadedBounds = { id: 'visBounds' };
      return visible;
    });

    await fetchOSMData();
    expect(State.loadedPoiBounds).toEqual({ id: 'visBounds' });

    // Pufferring schließt regulär ab
    bufferCompleteCb([{ id: 'h1' }, { id: 'h2_buf' }], { id: 'fullBounds' });
    expect(State.loadedPoiBounds).toEqual({ id: 'fullBounds' });
    expect(State.cachedPoiElements.length).toBe(2);

    // Jetzt Test mit Abbruch: Neuer Request startet
    const controller = State.controllers.fetch;
    controller.abort();
    // Simuliere Wechsel des Controllers
    State.controllers.fetch = new AbortController();

    // Veralteter Puffer-Callback aus Request 1 darf State nicht mehr überschreiben
    bufferCompleteCb([{ id: 'obsolete' }], { id: 'obsoleteBounds' });
    expect(State.loadedPoiBounds).toEqual({ id: 'fullBounds' });
    expect(State.cachedPoiElements.map(el => el.id)).not.toContain('obsolete');
  });

  // =========================================================================
  // 5. Entsprechende Tests für Gemeindegrenzen (fetchBoundaryData)
  // =========================================================================
  it('5. Gemeindegrenzen: Streaming berührt State nicht, veraltete Anfragen werden verworfen', async () => {
    vi.spyOn(pipelineModule, 'isPipelineEligible').mockReturnValue(true);

    const initialBoundaries = [{ id: 'b_old' }];
    State.cachedBoundaryElements = [...initialBoundaries];
    State.loadedBoundaryBounds = { id: 'b_old_bounds' };

    let capturedBoundaryProgress;
    let capturedBoundaryBufferComplete;

    vi.spyOn(pipelineModule, 'fetchPipelineBoundaries').mockImplementation(async (bounds, options) => {
      capturedBoundaryProgress = options.onProgressData;
      capturedBoundaryBufferComplete = options.onBufferComplete;

      // Streaming-Meldung simulieren
      capturedBoundaryProgress([{ id: 'b1' }], true, { phase: 'visible' });

      // State MUSS unverändert sein!
      expect(State.cachedBoundaryElements).toEqual(initialBoundaries);
      expect(State.loadedBoundaryBounds).toEqual({ id: 'b_old_bounds' });

      const visible = [{ id: 'b1' }];
      visible.loadedBounds = { id: 'b_visBounds' };
      return visible;
    });

    await fetchBoundaryData();

    // Erst nach Completion gesetzt
    expect(State.cachedBoundaryElements.map(el => el.id)).toEqual(['b1']);
    expect(State.loadedBoundaryBounds).toEqual({ id: 'b_visBounds' });

    // Pufferabschluss aktualisiert Grenzen
    capturedBoundaryBufferComplete([{ id: 'b1' }, { id: 'b2_buf' }], { id: 'b_fullBounds' });
    expect(State.cachedBoundaryElements.length).toBe(2);
    expect(State.loadedBoundaryBounds).toEqual({ id: 'b_fullBounds' });

    // Veralteter Controller-Wechsel:
    State.controllers.boundaryFetch = new AbortController();
    capturedBoundaryBufferComplete([{ id: 'b_stale' }], { id: 'b_stale_bounds' });
    expect(State.loadedBoundaryBounds).toEqual({ id: 'b_fullBounds' });
  });

  // =========================================================================
  // 6. Export während des Pufferrings (Export wartet auf pendingBufferFetch)
  // =========================================================================
  it('6. Export während Pufferring: Wartet auf pendingBufferFetch und arbeitet auf Snapshot', async () => {
    // 1. Initialzustand: Sichtbare Kacheln sind fertig, Pufferring läuft im Hintergrund
    State.cachedPoiElements = [{ id: 'h_vis_1', lat: 49.45, lon: 11.07, tags: { emergency: 'fire_hydrant' } }];
    State.cachedBoundaryElements = [];
    State.queryBounds = State.map.getBounds();

    let resolveBuffer;
    const bufferPromise = new Promise((resolve) => {
      resolveBuffer = resolve;
    });

    State.pendingBufferFetch = bufferPromise;

    // Asynchron nach 100ms den Puffer beenden
    setTimeout(() => {
      State.cachedPoiElements = [
        { id: 'h_vis_1', lat: 49.45, lon: 11.07, tags: { emergency: 'fire_hydrant' } },
        { id: 'h_buf_2', lat: 49.451, lon: 11.071, tags: { emergency: 'fire_hydrant' } }
      ];
      State.pendingBufferFetch = null;
      resolveBuffer();
    }, 100);

    // GPX-Export starten während pendingBufferFetch noch aktiv ist
    const gpxPromise = exportAsGPX();

    // Der Export wartet auf pendingBufferFetch
    await gpxPromise;

    // Nun verändern wir State.cachedPoiElements nachträglich
    State.cachedPoiElements = [{ id: 'changed_after_export' }];

    // Der Export hat sauber auf den Puffer gewartet und den vollständigen Datensatz genutzt!
    expect(State.pendingBufferFetch).toBeNull();
  });
});
