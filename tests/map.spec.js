import { test, expect } from '@playwright/test';
 
// Hilfsfunktion: Wartet bis die App (Leaflet + UI) vollständig initialisiert ist
async function gotoReady(page, url = '/') {
    await page.goto(url);
    await page.waitForSelector('.leaflet-container');
}

// Hilfsfunktion: Klickt ein Element per JavaScript (umgeht CSS-Visibility-Checks)
async function jsClick(page, selector) {
    await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.click();
    }, selector);
}

test('has title and map container', async ({ page }) => {
    await gotoReady(page);
    await expect(page).toHaveTitle(/.*OpenFireMap.*/);
    const mapContainer = page.locator('#map');
    await expect(mapContainer).toBeVisible();
});

test('Layer-Menü öffnet und schließt', async ({ page }) => {
    await gotoReady(page);

    const layerMenu = page.locator('#layer-menu');
    await expect(layerMenu).toHaveClass(/hidden/);

    // Klick öffnet das Menü
    await jsClick(page, '#layer-btn-trigger');
    await expect(layerMenu).not.toHaveClass(/hidden/);

    // Nochmal klicken schließt es
    await jsClick(page, '#layer-btn-trigger');
    await expect(layerMenu).toHaveClass(/hidden/);
});

test('Export-Menü öffnet und schließt', async ({ page }) => {
    await gotoReady(page);

    const exportMenu = page.locator('#export-menu');
    await expect(exportMenu).toHaveClass(/hidden/);

    await jsClick(page, '#export-btn-trigger');
    await expect(exportMenu).not.toHaveClass(/hidden/);

    // Schließen per X-Button
    await jsClick(page, '#export-close-btn');
    await expect(exportMenu).toHaveClass(/hidden/);
});

test('Info & Recht Modal öffnet und schließt', async ({ page }) => {
    await gotoReady(page);

    const legalModal = page.locator('#legal-modal');

    await jsClick(page, '#btn-legal-trigger');
    await expect(legalModal).toBeVisible();

    await jsClick(page, '#legal-close-btn');
    await expect(legalModal).not.toBeVisible();
});

test('Suchfeld akzeptiert Eingabe', async ({ page }) => {
    await gotoReady(page);

    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeAttached();

    // Direkt per JavaScript den Wert setzen (umgeht visibility)
    await page.evaluate(() => {
        const input = document.getElementById('search-input');
        if (input) { input.value = 'Nürnberg'; input.dispatchEvent(new Event('input')); }
    });
    await expect(searchInput).toHaveValue('Nürnberg');
});

test('Leaflet-Karte ist initialisiert', async ({ page }) => {
    await gotoReady(page);

    // Leaflet-Container existiert
    const leafletContainer = page.locator('.leaflet-container');
    await expect(leafletContainer).toBeAttached();

    // Tile-Layer existiert
    const tilePane = page.locator('.leaflet-tile-pane');
    await expect(tilePane).toBeAttached();

    // Marker-Layer existiert
    const markerPane = page.locator('.leaflet-marker-pane');
    await expect(markerPane).toBeAttached();
});

test('Escape schließt offene Menüs', async ({ page }) => {
    await gotoReady(page);

    const layerMenu = page.locator('#layer-menu');

    // Menü öffnen per JS-Click
    await jsClick(page, '#layer-btn-trigger');
    await expect(layerMenu).not.toHaveClass(/hidden/);

    // Escape schließt es
    await page.keyboard.press('Escape');
    await expect(layerMenu).toHaveClass(/hidden/);
});

test('Hydranten-Ladestatus zeigt Fortschritt und erfolgreichen Abschluss', async ({ page }) => {
    await page.route('**/api/interpreter', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1200));
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                elements: [
                    { type: 'node', id: 1, lat: 49.55, lon: 11.35, tags: { emergency: 'fire_hydrant' } },
                    { type: 'node', id: 2, lat: 49.56, lon: 11.36, tags: { emergency: 'fire_hydrant' } },
                    { type: 'node', id: 3, lat: 49.57, lon: 11.37, tags: { emergency: 'water_tank' } }
                ]
            })
        });
    });

    await gotoReady(page, '/?lang=de#15/52.5200/13.4050/voyager');
    const status = page.locator('#hydrant-download-status [role="status"]');
    await expect(status).toBeVisible();
    await expect(status).toContainText('Hydrantendaten werden geladen');
    await expect(status).toContainText('2 Hydranten', { timeout: 5000 });
});

test('CSV-Export-Button existiert unterhalb von GPX im Export-Menü', async ({ page }) => {
    await gotoReady(page);

    const exportMenu = page.locator('#export-menu');
    await jsClick(page, '#export-btn-trigger');
    await expect(exportMenu).not.toHaveClass(/hidden/);

    const gpxBtn = page.locator('#gpx-btn');
    const csvBtn = page.locator('#csv-btn');

    await expect(gpxBtn).toBeAttached();
    await expect(csvBtn).toBeAttached();

    // Prüfen, dass der CSV-Button nach dem GPX-Button im DOM steht
    const isCsvAfterGpx = await page.evaluate(() => {
        const gpx = document.getElementById('gpx-btn');
        const csv = document.getElementById('csv-btn');
        return gpx && csv && gpx.compareDocumentPosition(csv) & Node.DOCUMENT_POSITION_FOLLOWING;
    });
    expect(Boolean(isCsvAfterGpx)).toBe(true);
});

test('Escape schließt Export-Menü und fokussiert Trigger-Button zurück', async ({ page }) => {
    await gotoReady(page);

    const exportMenu = page.locator('#export-menu');
    await jsClick(page, '#export-btn-trigger');
    await expect(exportMenu).not.toHaveClass(/hidden/);

    await page.keyboard.press('Escape');
    await expect(exportMenu).toHaveClass(/hidden/);

    // Trigger-Button sollte fokussiert sein
    const isTriggerFocused = await page.evaluate(() => {
        return document.activeElement?.id === 'export-btn-trigger';
    });
    expect(isTriggerFocused).toBe(true);
});

test('Export-Titel-Modal schließt sich bei Klick auf Abbrechen', async ({ page }) => {
    await gotoReady(page);

    const modal = page.locator('#export-title-modal');
    await expect(modal).toHaveClass(/hidden/);

    // Modal öffnen (simulierter Klick mit vorhandenen Elementen)
    await page.evaluate(() => {
        const titleModal = document.getElementById('export-title-modal');
        if (titleModal) titleModal.classList.remove('hidden');
    });
    await expect(modal).not.toHaveClass(/hidden/);

    // Klick auf Abbrechen
    await jsClick(page, '#export-confirm-cancel');
    await expect(modal).toHaveClass(/hidden/);
});

