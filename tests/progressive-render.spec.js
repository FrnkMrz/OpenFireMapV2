import { test, expect } from '@playwright/test';

// Hilfsfunktion: Wartet bis die App vollständig initialisiert ist
async function gotoReady(page, url = '/') {
  await page.goto(url);
  await page.waitForSelector('.leaflet-container');
  await page.waitForFunction(() => window.State && window.State.map);
}

test.describe('Progressives Rendern & State-Konsistenz E2E', () => {

  test('Szenario A -> B -> A -> Zoomwechsel: Hydranten von A bleiben vollständig sichtbar', async ({ page }) => {
    // Overpass-Route mocken (Paris außerhalb DACHLiLu für isolierten, kontrollierten Test)
    let requestCountB = 0;

    await page.route('**/api/interpreter', async (route) => {
      const postData = route.request().postData() || '';
      
      // Bereich B (ca. 48.89)
      if (postData.includes('48.89') || postData.includes('48.88')) {
        requestCountB++;
        // Verzögerte Antwort für B (simuliert langsame Netzwerkantwort)
        await new Promise(r => setTimeout(r, 1000));
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            elements: [
              { type: 'node', id: 201, lat: 48.8900, lon: 2.3900, tags: { emergency: 'fire_hydrant' } }
            ]
          })
        });
        return;
      }

      // Bereich A (ca. 48.85)
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          elements: [
            { type: 'node', id: 101, lat: 48.8566, lon: 2.3522, tags: { emergency: 'fire_hydrant' } },
            { type: 'node', id: 102, lat: 48.8570, lon: 2.3530, tags: { emergency: 'fire_hydrant' } }
          ]
        })
      });
    });

    // 1. Start bei A (Zoom 16)
    await gotoReady(page, '/?lang=de#16/48.8566/2.3522/voyager');

    // Warten bis A geladen und gerendert ist
    await expect.poll(async () => {
      return await page.evaluate(() => window.State?.cachedPoiElements?.length || 0);
    }, { timeout: 7000 }).toBe(2);

    await expect.poll(async () => {
      return await page.evaluate(() => document.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon').length);
    }, { timeout: 7000 }).toBeGreaterThan(0);

    // 2. Schneller Schwenk nach B
    await page.evaluate(() => {
      window.State.map.setView([48.8900, 2.3900], 16);
    });

    // Kurz warten, damit doFetch für B anläuft
    await page.waitForTimeout(200);

    // 3. Zurückschwenken nach A, während B noch lädt
    await page.evaluate(() => {
      window.State.map.setView([48.8566, 2.3522], 16);
    });

    // 4. Warten, bis B im Hintergrund fertig gewesen wäre (> 1000ms Delay)
    await page.waitForTimeout(1200);

    // 5. Zoomwechsel an Position A durchführen (z. B. auf Zoom 17)
    await page.evaluate(() => {
      window.State.map.setZoom(17);
    });

    // 6. Verifikation: Hydranten von A müssen weiterhin vollständig vorhanden sein
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const ids = (window.State?.cachedPoiElements || []).map(el => el.id);
        return ids.sort();
      });
    }, { timeout: 5000 }).toEqual([101, 102]);

    // Marker im DOM müssen sichtbar bleiben
    await expect.poll(async () => {
      return await page.evaluate(() => document.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon').length);
    }, { timeout: 5000 }).toBeGreaterThan(0);
  });

  test('Statusanzeige: zeigt nach "fertig" nicht wieder "wird geladen"', async ({ page }) => {
    // Route mit leichter Verzögerung mocken
    await page.route('**/api/interpreter', async (route) => {
      await new Promise(r => setTimeout(r, 600));
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          elements: [
            { type: 'node', id: 301, lat: 48.8566, lon: 2.3522, tags: { emergency: 'fire_hydrant' } }
          ]
        })
      });
    });

    await gotoReady(page, '/?lang=de#16/48.8566/2.3522/voyager');

    // Status-Historie per MutationObserver im Browser mitschneiden
    await page.evaluate(() => {
      window.__statusHistory = [];
      const statusEl = document.getElementById('hydrant-download-status');
      if (!statusEl) return;

      const record = () => {
        const text = statusEl.innerText?.trim();
        if (text && window.__statusHistory[window.__statusHistory.length - 1] !== text) {
          window.__statusHistory.push(text);
        }
      };
      record();

      const observer = new MutationObserver(record);
      observer.observe(statusEl, { childList: true, subtree: true, characterData: true });
    });

    // Warten bis Daten geladen sind
    await expect.poll(async () => {
      return await page.evaluate(() => window.State?.cachedPoiElements?.length || 0);
    }, { timeout: 7000 }).toBe(1);

    // Nach Erfolg noch 1 Sekunde beobachten
    await page.waitForTimeout(1000);

    const history = await page.evaluate(() => window.__statusHistory || []);
    console.log('[E2E Test] Status History:', history);

    // Finde ersten Eintrag mit Erfolgsmeldung (z.B. "1 Hydrant")
    const successIndex = history.findIndex(txt => txt.includes('Hydrant') && !txt.includes('werden geladen'));
    if (successIndex !== -1) {
      // Nach dem ersten Erfolg darf kein "werden geladen" mehr auftauchen
      const afterSuccess = history.slice(successIndex);
      const hasLoadingAfterSuccess = afterSuccess.some(txt => txt.includes('werden geladen'));
      expect(hasLoadingAfterSuccess).toBe(false);
    }
  });

  test('GPX-Download startet < 1 s nach Klick (bisher > 5 s Wartezeit)', async ({ page }) => {
    // Route mocken
    await page.route('**/api/interpreter', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          elements: [
            { type: 'node', id: 401, lat: 48.8566, lon: 2.3522, tags: { emergency: 'fire_hydrant' } }
          ]
        })
      });
    });

    await gotoReady(page, '/?lang=de#16/48.8566/2.3522/voyager');

    // Warten bis Daten geladen sind
    await expect.poll(async () => {
      return await page.evaluate(() => window.State?.cachedPoiElements?.length || 0);
    }, { timeout: 7000 }).toBe(1);

    // Export-Menü öffnen
    await page.click('#export-btn-trigger');
    await page.click('#gpx-btn');

    // Titel-Bestätigungsmodal erscheint
    await page.waitForSelector('#export-confirm-ok', { state: 'visible' });

    // Download-Startzeit messen
    const downloadPromise = page.waitForEvent('download');
    const t0 = Date.now();
    await page.click('#export-confirm-ok');
    const download = await downloadPromise;
    const elapsedMs = Date.now() - t0;

    expect(download.suggestedFilename()).toContain('.gpx');
    console.log(`[E2E Test] GPX-Download startete nach ${elapsedMs} ms`);
    expect(elapsedMs).toBeLessThan(1000);
  });

});
