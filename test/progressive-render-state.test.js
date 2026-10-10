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

    const hydrantStatusEl = document.createElement('div');
    hydrantStatusEl.id = 'hydrant-download-status';
    document.body.appendChild(hydrantStatusEl);

    const dataStatusEl = document.createElement('div');
    dataStatusEl.id = 'data-status';
    document.body.appendChild(dataStatusEl);

    // Reset State
    State.cachedPoiElements = [];
    State.cachedBoundaryElements = [];
    State.cachedElements = [];
    State.loadedPoiBounds = null;
    State.loadedBoundaryBounds = null;
    State.loadedPoiMode = null;
    State.loadedPoiSource = null;
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

    const mapEl = document.createElement('div');
    mapEl.id = 'map';
    document.body.appendChild(mapEl);

    const makeLayerGroup = () => ({
      addTo: () => {},
      clearLayers: () => {},
      addLayer: () => {},
      removeLayer: () => {},
      eachLayer: () => {}
    });

    // Mock Map in State (Nürnberg, DACHLiLu Bereich)
    const boundsObj = makeBounds(49.44, 11.06, 49.46, 11.08);
    const listeners = {};
    const mapObj = {
      getZoom: () => 16,
      getBounds: () => boundsObj,
      getCenter: () => boundsObj.getCenter(),
      hasLayer: () => true,
      eachLayer: (fn) => {},
      removeLayer: (layer) => {},
      on: (ev, fn) => {
        ev.split(' ').forEach(e => {
          listeners[e] = listeners[e] || [];
          listeners[e].push(fn);
        });
        return mapObj;
      },
      fire: (ev) => {
        (listeners[ev] || []).forEach(fn => fn());
        return mapObj;
      }
    };

    class MockTileLayer {
      addTo() { return this; }
    }

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
      }),
      layerGroup: makeLayerGroup,
      tileLayer: () => new MockTileLayer(),
      TileLayer: MockTileLayer,
      Polyline: class {},
      marker: () => ({
        addTo: () => ({ on: () => {} }),
        bindTooltip: () => {},
        unbindTooltip: () => {},
        openTooltip: () => {},
        closeTooltip: () => {}
      }),
      divIcon: () => ({}),
      map: () => mapObj
    };

    State.map = mapObj;
    State.markerLayer = makeLayerGroup();
    State.boundaryLayer = makeLayerGroup();
    State.rangeLayerGroup = makeLayerGroup();
    State.distanceLayerGroup = makeLayerGroup();

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
    let resolveBuffer;
    vi.spyOn(pipelineModule, 'fetchPipelineData').mockImplementation(async (bounds, mode, options) => {
      bufferCompleteCb = options.onBufferComplete;
      const bufferPromise = new Promise(r => { resolveBuffer = r; });
      State.pendingBufferFetches.add(bufferPromise);
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

  // =========================================================================
  // 7. pendingBufferFetches: Set-Verwaltung bei konkurrierenden Ringen
  // =========================================================================
  describe('7. pendingBufferFetches Set-Verwaltung', () => {
    it('POI-Ring läuft, Grenzen-Ring startet danach, POI wird zuerst fertig: Set behält Grenzen, danach leer', async () => {
      let resolvePoi;
      let resolveBoundary;
      const poiPromise = new Promise(r => { resolvePoi = r; });
      const boundaryPromise = new Promise(r => { resolveBoundary = r; });

      State.pendingBufferFetches.add(poiPromise);
      poiPromise.finally(() => {
        State.pendingBufferFetches.delete(poiPromise);
      });

      expect(State.pendingBufferFetches.size).toBe(1);
      expect(State.pendingBufferFetches.has(poiPromise)).toBe(true);

      // Grenzen-Ring startet danach
      State.pendingBufferFetches.add(boundaryPromise);
      boundaryPromise.finally(() => {
        State.pendingBufferFetches.delete(boundaryPromise);
      });

      expect(State.pendingBufferFetches.size).toBe(2);

      // POI-Ring wird zuerst fertig
      resolvePoi();
      await Promise.resolve(); // microtask

      expect(State.pendingBufferFetches.size).toBe(1);
      expect(State.pendingBufferFetches.has(boundaryPromise)).toBe(true);
      expect(State.pendingBufferFetches.has(poiPromise)).toBe(false);

      // Grenzen-Ring wird fertig
      resolveBoundary();
      await Promise.resolve(); // microtask

      expect(State.pendingBufferFetches.size).toBe(0);
      expect(State.pendingBufferFetch).toBeNull();
    });

    it('Grenzen-Ring wird zuerst fertig: Set behält POI, danach leer', async () => {
      let resolvePoi;
      let resolveBoundary;
      const poiPromise = new Promise(r => { resolvePoi = r; });
      const boundaryPromise = new Promise(r => { resolveBoundary = r; });

      State.pendingBufferFetches.add(poiPromise);
      poiPromise.finally(() => {
        State.pendingBufferFetches.delete(poiPromise);
      });

      State.pendingBufferFetches.add(boundaryPromise);
      boundaryPromise.finally(() => {
        State.pendingBufferFetches.delete(boundaryPromise);
      });

      expect(State.pendingBufferFetches.size).toBe(2);

      // Grenzen zuerst fertig
      resolveBoundary();
      await Promise.resolve();

      expect(State.pendingBufferFetches.size).toBe(1);
      expect(State.pendingBufferFetches.has(poiPromise)).toBe(true);

      // POI fertig
      resolvePoi();
      await Promise.resolve();

      expect(State.pendingBufferFetches.size).toBe(0);
      expect(State.pendingBufferFetch).toBeNull();
    });

    it('Nur ein Ring läuft: Nach Fertigstellung ist Set leer', async () => {
      let resolveSingle;
      const singlePromise = new Promise(r => { resolveSingle = r; });

      State.pendingBufferFetches.add(singlePromise);
      singlePromise.finally(() => {
        State.pendingBufferFetches.delete(singlePromise);
      });

      expect(State.pendingBufferFetches.size).toBe(1);
      resolveSingle();
      await Promise.resolve();

      expect(State.pendingBufferFetches.size).toBe(0);
      expect(State.pendingBufferFetch).toBeNull();
    });

    it('Abbruch (clear): Set wird sofort geleert', () => {
      const p1 = new Promise(() => {});
      const p2 = new Promise(() => {});
      State.pendingBufferFetches.add(p1);
      State.pendingBufferFetches.add(p2);

      expect(State.pendingBufferFetches.size).toBe(2);

      pipelineModule.clearPipelineCache();

      expect(State.pendingBufferFetches.size).toBe(0);
      expect(State.pendingBufferFetch).toBeNull();
      expect(State.activeFetchBounds).toBeNull();
    });
  });

  // =========================================================================
  // 8. Export-Wartezeit: Ohne Puffer sofort (< 300 ms)
  // =========================================================================
  describe('8. Export-Laufzeit', () => {
    it('Export ohne laufende Puffer startet sofort (< 300 ms)', async () => {
      State.cachedPoiElements = [{ id: 'h1', lat: 49.45, lon: 11.07, tags: { emergency: 'fire_hydrant' } }];
      State.isFetchingData = false;
      State.pendingBufferFetches.clear();

      const t0 = performance.now();
      await exportAsGPX();
      const elapsed = performance.now() - t0;

      expect(elapsed).toBeLessThan(300);
    });

    it('waitForPendingBuffers kehrt bei leerem Set sofort (0 ms) zurück', async () => {
      State.pendingBufferFetches.clear();
      const t0 = performance.now();
      await pipelineModule.waitForPendingBuffers({ timeoutMs: 5000 });
      const elapsed = performance.now() - t0;

      expect(elapsed).toBeLessThan(50);
    });
  });

  // =========================================================================
  // 9. Neu-Rendern bei Bewegung im geladenen Bereich vermeiden
  // =========================================================================
  describe('9. Vermeidung von DOM-Thrashing / Neu-Rendern bei Bewegung', () => {
    it('Bewegung im geladenen Bereich ohne laufenden Request ruft renderMarkers & renderBoundaries NICHT auf', async () => {
      const mapModule = await import('../src/js/map.js');
      mapModule.initMapLogic();

      const clearBoundariesSpy = vi.spyOn(State.boundaryLayer, 'clearLayers');

      // Geladener Bereich umfasst Nürnberg
      const bounds = State.map.getBounds();
      State.cachedPoiElements = [{ id: 'h1', lat: 49.45, lon: 11.07, tags: { emergency: 'fire_hydrant' } }];
      State.cachedBoundaryElements = [{ id: 'b1' }];
      State.loadedPoiBounds = bounds;
      State.loadedPoiMode = 'all';
      State.loadedBoundaryBounds = bounds;
      State.isFetchingData = false;
      State.controllers.fetch = null;
      State.controllers.boundaryFetch = null;

      clearBoundariesSpy.mockClear();

      // Bewegung im geladenen Bereich ausführen
      mapModule._testing.onViewChange();

      // ES DARF KEIN RE-RENDER STATTFINDEN!
      expect(clearBoundariesSpy).not.toHaveBeenCalled();

      clearBoundariesSpy.mockRestore();
    });

    it('Bewegung zurück in geladenen Bereich (Pan A -> B -> A) bei laufendem Request B bricht B ab und rendert sauber neu', async () => {
      const mapModule = await import('../src/js/map.js');
      mapModule.initMapLogic();

      const clearBoundariesSpy = vi.spyOn(State.boundaryLayer, 'clearLayers');

      const boundsA = State.map.getBounds();
      State.cachedPoiElements = [{ id: 'h_A', lat: 49.45, lon: 11.07, tags: { emergency: 'fire_hydrant' } }];
      State.cachedBoundaryElements = [{ id: 'b_A' }];
      State.loadedPoiBounds = boundsA;
      State.loadedPoiMode = 'all';
      State.loadedBoundaryBounds = boundsA;

      // Fremden Teildaten-Marker aus Request B im Cache simulieren
      State.markerCache.set('node:stale_B', { marker: { addTo: () => {} }, mode: 'all' });

      // Request B läuft gerade für ein ANDERES Gebiet
      const controllerB = new AbortController();
      State.controllers.fetch = controllerB;
      // activeFetchBounds deckt anderes Gebiet ab, NICHT boundsA
      State.activeFetchBounds = {
        contains: (b) => false // deckt boundsA nicht ab!
      };

      clearBoundariesSpy.mockClear();

      // Nutzer pannt zurück nach A (boundsA)
      mapModule._testing.onViewChange();

      // Request B MUSS abgebrochen worden sein!
      expect(controllerB.signal.aborted).toBe(true);
      expect(State.controllers.fetch).toBeNull();

      // Und Marker & Boundaries MÜSSEN sauber aus State neu gerendert worden sein!
      // 1. Boundary-Layer wurde geleert und neu gezeichnet
      expect(clearBoundariesSpy).toHaveBeenCalled();
      // 2. Der fremde Teildaten-Marker aus Request B wurde aus markerCache entfernt
      expect(State.markerCache.has('node:stale_B')).toBe(false);
      // 3. Der Marker von A ist im markerCache vorhanden
      expect(State.markerCache.has('node:h_A')).toBe(true);

      clearBoundariesSpy.mockRestore();
    });
  });

  // =========================================================================
  // 9b. Abdeckung hängt von der Datenquelle ab (Pipeline-Gebiet <-> Overpass)
  // =========================================================================
  describe('9b. Geladene Daten decken nur bei passender Quelle ab', () => {
    // Liefert, ob die geladenen Daten den aktuellen Ausschnitt abdecken. Ruft bewusst nur die Abdeckungsprüfung
    // auf, ohne initMapLogic(): das feuert sofort 'moveend' und startet echte Abrufe, die über das Testende
    // hinaus weiterlaufen und in späteren Tests die globale fetch-Mock mitzählen.
    const isCovered = async (source) => {
      const mapModule = await import('../src/js/map.js');

      const bounds = State.map.getBounds();
      State.loadedPoiBounds = bounds;
      State.loadedPoiMode = 'all';
      State.loadedPoiSource = source;
      return mapModule._testing.poiCoverageMatchesMode('all');
    };

    it('Pipeline-Daten decken einen Ausschnitt im Pipeline-Gebiet ab', async () => {
      expect(await isCovered('pipeline')).toBe(true);
    });

    it('Overpass-Daten decken einen Ausschnitt im Pipeline-Gebiet NICHT ab (Grenzbereich -> Cloudflare)', async () => {
      expect(await isCovered('overpass')).toBe(false);
    });

    it('Ist die Pipeline ausgefallen (Overpass-Ersatz), wird nicht bei jeder Bewegung neu versucht', async () => {
      expect(await isCovered('overpass-fallback')).toBe(true);
    });

    it('Pipeline-Daten decken einen Ausschnitt außerhalb des Pipeline-Gebiets NICHT ab', async () => {
      Config.pipeline.enabled = false; // Ausschnitt gilt als nicht im Pipeline-Gebiet
      expect(await isCovered('pipeline')).toBe(false);
    });

    it('Ohne bekannte Quelle bleibt das bisherige Verhalten (nur Bounds zählen)', async () => {
      expect(await isCovered(null)).toBe(true);
    });
  });

  // =========================================================================
  // 10. Pufferring wird bei kleiner Bewegung innerhalb activeFetchBounds NICHT abgebrochen
  // =========================================================================
  describe('10. Pufferring bei kleiner Bewegung', () => {
    it('Bewegung innerhalb activeFetchBounds bricht laufenden Puffer-Request NICHT ab', async () => {
      const mapModule = await import('../src/js/map.js');

      const boundsA = State.map.getBounds();
      State.cachedPoiElements = [{ id: 'h_A' }];
      State.loadedPoiBounds = boundsA;
      State.loadedPoiMode = 'all';
      State.loadedBoundaryBounds = boundsA;

      // Pufferring läuft im Hintergrund
      const controllerFetch = new AbortController();
      State.controllers.fetch = controllerFetch;
      let bufferResolved = false;
      const bufferPromise = new Promise(r => {
        setTimeout(() => {
          bufferResolved = true;
          r();
        }, 50);
      });
      State.pendingBufferFetches.add(bufferPromise);

      // activeFetchBounds deckt Nürnberg + Puffer ab (inkl. der neuen Position!)
      State.activeFetchBounds = {
        contains: (b) => true // deckt die neue Position voll ab!
      };

      mapModule.initMapLogic();

      // Nutzer bewegt sich leicht innerhalb des Pufferbereichs
      mapModule._testing.onViewChange();

      // Der Controller darf NICHT abgebrochen werden!
      expect(controllerFetch.signal.aborted).toBe(false);
      expect(State.controllers.fetch).toBe(controllerFetch);
      expect(State.pendingBufferFetches.size).toBe(1);
    });
  });

  // =========================================================================
  // 11. Controller-Cleanup und Vermeidung unnötiger Abbrüche (Teil A)
  // =========================================================================
  describe('11. Controller-Cleanup & Grenzen-Schutz bei Bewegung', () => {
    it('(a) Laden fertig -> erste kleine Bewegung -> kein Neu-Rendern (clearLayers wird nicht aufgerufen)', async () => {
      const mapModule = await import('../src/js/map.js');
      mapModule.initMapLogic();

      const clearBoundariesSpy = vi.spyOn(State.boundaryLayer, 'clearLayers');

      const bounds = State.map.getBounds();
      State.cachedPoiElements = [{ id: 'h1', lat: 49.45, lon: 11.07, tags: { emergency: 'fire_hydrant' } }];
      State.cachedBoundaryElements = [{ id: 'b1' }];
      State.loadedPoiBounds = bounds;
      State.loadedPoiMode = 'all';
      State.loadedBoundaryBounds = bounds;

      // Zustand nach regulärem Ladeabschluss:
      // Flags sind false, Controller sind durch finally auf null
      State.isFetchingData = false;
      State.isFetchingBoundaries = false;
      State.pendingBufferFetches.clear();
      State.controllers.fetch = null;
      State.controllers.boundaryFetch = null;
      State.activeFetchBounds = null;

      clearBoundariesSpy.mockClear();

      // Erste Bewegung nach dem Laden
      mapModule._testing.onViewChange();

      // Kein Re-Render!
      expect(clearBoundariesSpy).not.toHaveBeenCalled();

      clearBoundariesSpy.mockRestore();
    });

    it('(b) POIs fertig, Grenzen laufen noch, kleine Bewegung im selben Bereich -> Grenzen-Anfrage wird NICHT abgebrochen', async () => {
      const mapModule = await import('../src/js/map.js');
      mapModule.initMapLogic();

      const boundsA = State.map.getBounds();
      State.cachedPoiElements = [{ id: 'h_A' }];
      State.loadedPoiBounds = boundsA;
      State.loadedPoiMode = 'all';

      // POIs sind fertig, Grenzen laden noch
      State.isFetchingData = false;
      State.controllers.fetch = null;

      const boundaryController = new AbortController();
      State.controllers.boundaryFetch = boundaryController;
      State.isFetchingBoundaries = true;

      // activeFetchBounds umfasst aktuellen Viewport
      State.activeFetchBounds = {
        contains: () => true
      };

      // Kleine Bewegung im selben Bereich
      mapModule._testing.onViewChange();

      // Grenzen-Anfrage darf NICHT abgebrochen werden!
      expect(boundaryController.signal.aborted).toBe(false);
      expect(State.controllers.boundaryFetch).toBe(boundaryController);
      expect(State.isFetchingBoundaries).toBe(true);
    });

    it('(c) Controller-Cleanup: fetchOSMData und fetchBoundaryData nullen ihre Controller im finally wenn kein Puffer läuft', async () => {
      // Mock pipeline data
      vi.spyOn(pipelineModule, 'isPipelineEligible').mockReturnValue(true);
      vi.spyOn(pipelineModule, 'fetchPipelineData').mockResolvedValue([]);
      vi.spyOn(pipelineModule, 'fetchPipelineBoundaries').mockResolvedValue([]);

      State.map.getZoom = () => 16;
      State.pendingBufferFetches.clear();

      await fetchOSMData();
      expect(State.controllers.fetch).toBeNull();
      expect(State.isFetchingData).toBe(false);

      await fetchBoundaryData();
      expect(State.controllers.boundaryFetch).toBeNull();
      expect(State.isFetchingBoundaries).toBe(false);

      pipelineModule.isPipelineEligible.mockRestore();
      pipelineModule.fetchPipelineData.mockRestore();
      pipelineModule.fetchPipelineBoundaries.mockRestore();
    });
  });
  // =========================================================================
  // 11. Overpass-Änderungen (Delta) zum Pipeline-Stand
  // =========================================================================
  describe('11. Overpass-Delta auf den Pipeline-Daten', () => {
    beforeEach(async () => {
      // Laufende Pufferringe aus vorherigen Tests abwarten und Zustand zurücksetzen
      await new Promise((resolve) => setTimeout(resolve, 100));
      State.controllers.fetch?.abort?.();
      State.controllers.fetch = null;
      State.cachedPoiElements = [];
      State.pendingBufferFetches = new Set();
      State.activeFetchBounds = null;
      const { _testing } = await import('../src/js/api.js');
      _testing.resetOverpassState();
    });

    it('fragt den ganzen Pufferbereich ab und zeichnet nach dem Pufferring die Liste inklusive Delta', async () => {
      vi.spyOn(pipelineModule, 'isPipelineEligible').mockReturnValue(true);
      vi.spyOn(pipelineModule, 'getPipelineOsmDataUntil').mockReturnValue('2026-09-30T20:22:42Z');

      let bufferComplete = null;
      vi.spyOn(pipelineModule, 'fetchPipelineData').mockImplementation(async (bounds, mode, options) => {
        bufferComplete = options.onBufferComplete;
        const visible = [{ type: 'node', id: 1, lat: 49.45, lon: 11.07, tags: { emergency: 'fire_hydrant' } }];
        visible.loadedBounds = { id: 'visible_bounds' };
        visible.bufferBounds = { south: 49.4, west: 11.0, north: 49.5, east: 11.1 };
        return visible;
      });

      const overpassBodies = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
        overpassBodies.push(decodeURIComponent(String(options?.body || '').replace(/\+/g, ' ')));
        return { ok: true, json: async () => ({ elements: [
          { type: 'node', id: 2, lat: 49.451, lon: 11.071, tags: { emergency: 'fire_hydrant', ref: 'neu' } }
        ] }) };
      });

      const rendered = [];
      await fetchOSMData((items, isPartial) => rendered.push({ ids: items.map((e) => `${e.type}:${e.id}`), isPartial }));
      await vi.waitFor(() => expect(State.cachedPoiElements.map((e) => e.id)).toContain(2));

      // Abgefragt wurde der Pufferbereich, nicht nur der Bildausschnitt
      expect(overpassBodies).toHaveLength(1);
      expect(overpassBodies[0]).toContain('[bbox:49.40000,11.00000,49.50000,11.10000]');
      expect(overpassBodies[0]).toContain('(newer:"2026-09-30T20:22:42Z")');

      // Pufferring kommt nach dem Delta: gezeichnet wird die Liste MIT Delta
      bufferComplete([
        { type: 'node', id: 1, lat: 49.45, lon: 11.07, tags: { emergency: 'fire_hydrant' } },
        { type: 'node', id: 3, lat: 49.41, lon: 11.01, tags: { emergency: 'fire_hydrant' } }
      ], { id: 'full_bounds' });
      const last = rendered[rendered.length - 1];
      expect(last.isPartial).toBe(false);
      expect(last.ids).toEqual(['node:1', 'node:3', 'node:2']);
      expect(State.cachedPoiElements.map((e) => e.id)).toEqual([1, 3, 2]);
    });

    it('nutzt den Pufferbereich auch dann, wenn State.queryMeta noch aus dem Overpass-Pfad stammt', async () => {
      const { _testing } = await import('../src/js/api.js');
      State.queryMeta = { bbox: '48.00000,11.00000,48.10000,11.10000' }; // veraltet
      const els = [];
      els.bufferBounds = { south: 49.4, west: 11.0, north: 49.5, east: 11.1 };
      expect(_testing.deltaBBoxForPipeline(els, null)).toBe('49.40000,11.00000,49.50000,11.10000');
      const onlyVisible = [];
      onlyVisible.loadedBounds = { getSouth: () => 49.44, getWest: () => 11.06, getNorth: () => 49.46, getEast: () => 11.08 };
      expect(_testing.deltaBBoxForPipeline(onlyVisible, null)).toBe('49.44000,11.06000,49.46000,11.08000');
      expect(_testing.deltaBBoxForPipeline([], null)).toBeNull();
    });
  });

  // =========================================================================
  // 12. Marker-Cache: geänderte Objekte gleicher OSM-ID werden neu gezeichnet
  // =========================================================================
  describe('12. Marker-Cache bei geänderten Objekten', () => {
    it('zeichnet Marker neu, wenn sich Position oder Tags ändern, sonst nicht', async () => {
      const { renderMarkers } = await import('../src/js/map.js');
      State.markerCache = new Map();
      // Vollständiger Marker-Ersatz: jede Methode gibt den Marker zurück (Leaflet-Verkettung)
      vi.spyOn(globalThis.L, 'marker').mockImplementation(() => {
        const marker = {};
        for (const m of ['addTo', 'on', 'off', 'bindTooltip', 'unbindTooltip', 'openTooltip', 'closeTooltip', 'bindPopup', 'setZIndexOffset', 'setIcon', 'setLatLng']) {
          marker[m] = () => marker;
        }
        return marker;
      });
      const hydrant = (lat, tags) => ({ type: 'node', id: 4711, lat, lon: 11.07, tags });

      renderMarkers([hydrant(49.45, { emergency: 'fire_hydrant', ref: 'A' })], 17);
      const first = State.markerCache.get('node:4711');
      expect(first).toBeDefined();

      // Neues Objekt mit gleichem Inhalt (wie nach jedem Kachelabruf): Marker bleibt
      renderMarkers([hydrant(49.45, { emergency: 'fire_hydrant', ref: 'A' })], 17);
      expect(State.markerCache.get('node:4711').marker).toBe(first.marker);

      // Tag geändert (Delta): neu zeichnen
      renderMarkers([hydrant(49.45, { emergency: 'fire_hydrant', ref: 'B' })], 17);
      const second = State.markerCache.get('node:4711');
      expect(second.marker).not.toBe(first.marker);
      expect(second.tags.ref).toBe('B');

      // Verschoben (Delta): neu zeichnen
      renderMarkers([hydrant(49.451, { emergency: 'fire_hydrant', ref: 'B' })], 17);
      const third = State.markerCache.get('node:4711');
      expect(third.marker).not.toBe(second.marker);
      expect(third.lat).toBe(49.451);
    });

    it('zeichnet einen Hydranten-Cluster neu, wenn sich nur ein Mitglied ändert', async () => {
      const { renderMarkers } = await import('../src/js/map.js');
      State.markerCache = new Map();
      vi.spyOn(globalThis.L, 'marker').mockImplementation(() => {
        const marker = {};
        for (const m of ['addTo', 'on', 'off', 'bindTooltip', 'unbindTooltip', 'openTooltip', 'closeTooltip', 'bindPopup', 'setZIndexOffset', 'setIcon', 'setLatLng']) {
          marker[m] = () => marker;
        }
        return marker;
      });
      // Zwei Hydranten ~1 m auseinander: auf Zoom 17 ein Cluster mit Hauptobjekt node:100
      const pair = (refB) => [
        { type: 'node', id: 100, lat: 49.45, lon: 11.07, tags: { emergency: 'fire_hydrant', ref: 'A' } },
        { type: 'node', id: 200, lat: 49.45001, lon: 11.07, tags: { emergency: 'fire_hydrant', ref: refB } },
      ];

      renderMarkers(pair('B'), 17);
      const masterKey = [...State.markerCache.keys()].find((k) => State.markerCache.get(k).isHydrantCluster);
      expect(masterKey).toBeDefined();
      const first = State.markerCache.get(masterKey);

      // Gleicher Inhalt: Marker bleibt
      renderMarkers(pair('B'), 17);
      expect(State.markerCache.get(masterKey).marker).toBe(first.marker);

      // Nur das zweite Mitglied ändert sich (Delta): Cluster-Marker neu zeichnen
      renderMarkers(pair('B-neu'), 17);
      const second = State.markerCache.get(masterKey);
      expect(second.marker).not.toBe(first.marker);
      expect(second.clusterMembers.map((m) => m.tags.ref)).toContain('B-neu');
    });
  });
});
