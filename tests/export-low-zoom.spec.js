import { test, expect } from '@playwright/test';

// Export bei Kartenzoom 14 (unter der Stufe, ab der Hydranten gezeichnet werden): die Daten für den Ausschnitt
// werden geladen und der Export schließt ab, statt bei "Lade Daten" stehen zu bleiben.

const HYDRANT = { type: 'node', id: 1, lat: 49.555, lon: 11.35, tags: { emergency: 'fire_hydrant' } };

async function prepare(page, overpass) {
    // Pipeline nicht erreichbar -> Overpass-Weg; Overpass über die Testantwort
    await page.route('**/pipeline.openfiremap.org/**', (route) => route.abort());
    await page.route('**/api/interpreter', overpass);
    await page.goto('/?lang=de#14/49.555/11.35/voyager');
    await page.waitForFunction(() => window.State && window.State.map);
    await page.locator('#export-btn-trigger').click();
    await page.locator('#select-view-btn').click();
    await page.locator('#zoom-15').click();
}

async function startPdf(page) {
    await page.locator('#pdf-btn').click();
    await page.locator('#export-confirm-ok').click();
}

test.describe('Export bei Zoom 14', () => {
    test('lädt Hydranten für den Ausschnitt und erzeugt das PDF', async ({ page }) => {
        const queries = [];
        await prepare(page, async (route) => {
            queries.push(route.request().postData() || '');
            await route.fulfill({ json: { elements: [HYDRANT] } });
        });
        expect(await page.evaluate(() => window.State.map.getZoom())).toBe(14);

        const download = page.waitForEvent('download', { timeout: 30000 });
        await startPdf(page);
        expect((await download).suggestedFilename()).toMatch(/\.pdf$/);

        // Export-Abfrage (Hydranten) ist gelaufen, obwohl die Karte auf Zoom 14 keine Hydranten lädt
        expect(queries.some((q) => decodeURIComponent(q).includes('fire_hydrant'))).toBe(true);
        await expect(page.locator('#export-progress')).toBeHidden();
    });

    test('zeigt eine Fehlermeldung, wenn die Daten nicht geladen werden können', async ({ page }) => {
        await prepare(page, (route) => route.fulfill({ status: 500, body: 'Fehler' }));
        await startPdf(page);
        await expect(page.locator('#notification-live-alert')).toContainText(/FEHLER/, { timeout: 30000 });
        // Das Fortschrittsfenster bleibt nicht endlos stehen
        await expect(page.locator('#export-progress')).toBeHidden({ timeout: 15000 });
    });

    test('„Vorgang abbrechen“ beendet das Warten', async ({ page }) => {
        await prepare(page, () => new Promise(() => { /* Server antwortet nie */ }));
        await startPdf(page);
        await expect(page.locator('#export-progress')).toBeVisible();
        await page.locator('#cancel-export-btn').click();
        await expect(page.locator('#export-progress')).toBeHidden({ timeout: 10000 });
    });

    for (const [name, button, ext, contains] of [['GPX', '#gpx-btn', 'gpx', '<wpt'], ['CSV', '#csv-btn', 'csv', 'fire_hydrant']]) {
        test(`${name} lädt Hydranten für den Ausschnitt selbst`, async ({ page }) => {
            await prepare(page, async (route) => route.fulfill({ json: { elements: [HYDRANT] } }));
            const download = page.waitForEvent('download', { timeout: 30000 });
            await page.locator(button).click();
            await page.locator('#export-confirm-ok').click();
            const file = await download;
            expect(file.suggestedFilename()).toMatch(new RegExp(`\\.${ext}$`));
            const path = await file.path();
            const text = (await import('node:fs')).readFileSync(path, 'utf8');
            expect(text).toContain(contains);
        });
    }
});

test.describe('Höchstgröße der Export-Fläche (10 × 10 km)', () => {
    const sizeKm = (page) => page.evaluate(() => {
        const b = window.State.selection.finalBounds;
        const lat = (b.getNorth() + b.getSouth()) / 2;
        return {
            w: (b.getEast() - b.getWest()) * 111.32 * Math.cos(lat * Math.PI / 180),
            h: (b.getNorth() - b.getSouth()) * 111.32
        };
    });

    test('„Sichtbaren Ausschnitt übernehmen“ wird auf 10 km begrenzt', async ({ page }) => {
        await page.route('**/pipeline.openfiremap.org/**', (route) => route.abort());
        await page.route('**/api/interpreter', (route) => route.fulfill({ json: { elements: [] } }));
        await page.goto('/?lang=de#12/49.555/11.35/voyager'); // sichtbar ca. 40 km breit
        await page.waitForFunction(() => window.State && window.State.map);
        await page.locator('#export-btn-trigger').click();
        await page.locator('#select-view-btn').click();
        await expect(page.locator('#selection-info')).toBeVisible(); // export.js wird beim ersten Klick nachgeladen
        const { w, h } = await sizeKm(page);
        expect(w).toBeLessThanOrEqual(10.05);
        expect(h).toBeLessThanOrEqual(10.05);
        expect(Math.max(w, h)).toBeGreaterThan(9.9);
        await expect(page.locator('#notification-live-status')).toContainText('10 × 10 km');
    });

    test('Export ohne Auswahl bei zu großem Ausschnitt meldet einen Fehler statt zu laden', async ({ page }) => {
        let overpassCalls = 0;
        await page.route('**/pipeline.openfiremap.org/**', (route) => route.abort());
        await page.route('**/api/interpreter', (route) => { overpassCalls++; return route.fulfill({ json: { elements: [HYDRANT] } }); });
        await page.goto('/?lang=de#12/49.555/11.35/voyager');
        await page.waitForFunction(() => window.State && window.State.map);
        await page.locator('#export-btn-trigger').click();
        await page.locator('#pdf-btn').click();
        await page.locator('#export-confirm-ok').click();
        await expect(page.locator('#notification-live-alert')).toContainText('10 × 10 km', { timeout: 10000 });
        const before = overpassCalls;
        await page.waitForTimeout(500);
        expect(overpassCalls).toBe(before); // der Export selbst hat nichts geladen
    });
});
