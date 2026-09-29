import { test, expect } from '@playwright/test';

test('Pipeline Data & Boundaries load fast and deduplicated in Chromium', async ({ page }) => {
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
  await page.goto('/');
  await page.waitForSelector('.leaflet-container');

  // Wait until POIs are loaded
  await expect.poll(async () => {
    return await page.evaluate(() => window.State?.cachedPoiElements?.length || 0);
  }, {
    timeout: 10000,
    intervals: [250, 500]
  }).toBeGreaterThan(0);

  const durationMs = Date.now() - t0;
  console.log(`[Performance Test] POIs loaded in ${durationMs}ms`);

  // Wait until boundaries are also loaded
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

  // Assertions:
  // 1. metadata.json must be deduplicated (at most 1 request)
  expect(metadataRequests.length).toBeLessThanOrEqual(1);

  // 2. Range requests must be deduplicated and not exceed visible grid (<= 45 tiles)
  expect(rangeRequests.length).toBeLessThanOrEqual(45);

  // 3. Status indicator must be green and show local pipeline
  const statusText = await page.textContent('#data-status');
  expect(statusText).toContain('Lokal');
});
