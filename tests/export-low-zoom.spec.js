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
});
