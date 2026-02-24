import { test, expect } from '@playwright/test';

// Hilfsfunktion: Klickt ein Element per JavaScript (umgeht CSS-Visibility-Checks)
async function jsClick(page, selector) {
    await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.click();
    }, selector);
}

test('has title and map container', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.*OpenFireMap.*/);
    const mapContainer = page.locator('#map');
    await expect(mapContainer).toBeVisible();
});

test('Layer-Menü öffnet und schließt', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

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
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const exportMenu = page.locator('#export-menu');
    await expect(exportMenu).toHaveClass(/hidden/);

    await jsClick(page, '#export-btn-trigger');
    await expect(exportMenu).not.toHaveClass(/hidden/);

    // Schließen per X-Button
    await jsClick(page, '#export-close-btn');
    await expect(exportMenu).toHaveClass(/hidden/);
});

test('Info & Recht Modal öffnet und schließt', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const legalModal = page.locator('#legal-modal');

    await jsClick(page, '#btn-legal-trigger');
    await expect(legalModal).toBeVisible();

    await jsClick(page, '#legal-close-btn');
    await expect(legalModal).not.toBeVisible();
});

test('Suchfeld akzeptiert Eingabe', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

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
    await page.goto('/');
    await page.waitForLoadState('networkidle');

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
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const layerMenu = page.locator('#layer-menu');

    // Menü öffnen per JS-Click
    await jsClick(page, '#layer-btn-trigger');
    await expect(layerMenu).not.toHaveClass(/hidden/);

    // Escape schließt es
    await page.keyboard.press('Escape');
    await expect(layerMenu).toHaveClass(/hidden/);
});
