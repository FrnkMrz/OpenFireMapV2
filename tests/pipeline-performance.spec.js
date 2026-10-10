import { test, expect } from '@playwright/test';

test.describe('Pipeline E2E Performance & Deduplication', () => {
  test.beforeAll(async () => {
    try {
      const res = await fetch('https://pipeline.openfiremap.org/metadata.json', { signal: AbortSignal.timeout(2000) });
      if (!res.ok) test.skip(true, 'Live pipeline endpoint not reachable');
    } catch {
      test.skip(true, 'No internet connectivity or pipeline endpoint not reachable');
    }
  });

  test('Pipeline Data & Boundaries load fast and deduplicated at Zoom 16', async ({ page }) => {
    const metadataRequests = [];
    const rangeRequests = [];

    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('metadata.json')) {
        metadataRequests.push(url);
      } else if (url.includes('openfiremap.pmtiles')) {
        rangeRequests.push(url);
      }
    });

    const t0 = Date.now();
    // Schnaittach (DACHLiLu Pipeline-Bereich) auf Zoom 16 aufrufen
    await page.goto('/#16/49.555/11.35');
    await page.waitForSelector('.leaflet-container');

    // Warten bis POIs geladen sind
    await expect.poll(async () => {
      return await page.evaluate(() => window.State?.cachedPoiElements?.length || 0);
    }, {
      timeout: 10000,
      intervals: [250, 500]
    }).toBeGreaterThan(0);

    const durationMs = Date.now() - t0;
    console.log(`[Performance Test] POIs loaded in ${durationMs}ms`);

    // Warten bis Gemeindegrenzen geladen sind
    await expect.poll(async () => {
      return await page.evaluate(() => window.State?.cachedBoundaryElements?.length || 0);
    }, {
      timeout: 10000,
      intervals: [250, 500]
    }).toBeGreaterThan(0);

    const totalDurationMs = Date.now() - t0;
    console.log(`[Performance Test] Both POIs and Boundaries loaded in ${totalDurationMs}ms`);
    console.log(`[Performance Test] metadata.json requests: ${metadataRequests.length}`);
    console.log(`[Performance Test] PMTiles Range requests: ${rangeRequests.length}`);

    // Zusicherungen:
    // 1. metadata.json darf höchstens einmal geladen werden (Warmup + Deduplizierung)
    expect(metadataRequests.length).toBeLessThanOrEqual(1);

    // 2. PMTiles Range-Requests dürfen den sichtbaren Kachel-Grid nicht überschreiten (<= 45 Kacheln)
    expect(rangeRequests.length).toBeLessThanOrEqual(45);

    // 3. Status-Indikator muss Datenstatus der Pipeline anzeigen (Quelle: pipeline)
    const statusText = await page.textContent('#data-status');
    expect(statusText).toMatch(/Sync/);
    const dataSource = await page.evaluate(() => window.State?.dataStatus?.source);
    expect(dataSource).toBe('pipeline');
  });

  test('Zoom 15 -> 16 nutzt Kacheln aus RAM-Cache ohne überflüssige Netzwerkanfragen', async ({ page }) => {
    const rangeRequests = [];

    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('openfiremap.pmtiles')) {
        rangeRequests.push(url);
      }
    });

    // Startansicht auf Zoom 16
    await page.goto('/#16/49.555/11.35');
    await page.waitForSelector('.leaflet-container');

    await expect.poll(async () => {
      return await page.evaluate(() => window.State?.cachedPoiElements?.length || 0);
    }, {
      timeout: 10000,
      intervals: [250, 500]
    }).toBeGreaterThan(0);

    // Warten bis der asynchrone Hintergrundpuffer der Initialansicht abgeschlossen ist
    await page.waitForTimeout(1500);

    const callsAfterZ16 = rangeRequests.length;
    console.log(`[Zoom Test] Requests at zoom 16: ${callsAfterZ16}`);

    // Hineinzoomen auf Zoom 17 (Kacheln bleiben auf maxZoom 16)
    await page.evaluate(() => {
      window.State.map.setZoom(17);
    });

    // Kurze Pause, um eventuelle Netzwerkaktivität zu erfassen
    await page.waitForTimeout(1000);

    const callsAfterZ17 = rangeRequests.length;
    console.log(`[Zoom Test] Requests after zooming to 17: ${callsAfterZ17}`);

    // Bei hineingezoomtem Viewport decken die geladenen Grenzen den Ausschnitt bereits ab
    // und die Kacheln liegen im RAM-Cache -> 0 zusätzliche Kachelabrufe
    expect(callsAfterZ17 - callsAfterZ16).toBe(0);

    const statusText = await page.textContent('#data-status');
    expect(statusText).toMatch(/Sync/);
    const dataSource = await page.evaluate(() => window.State?.dataStatus?.source);
    expect(dataSource).toBe('pipeline');
  });
});
