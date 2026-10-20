import { test, expect } from '@playwright/test';

// Beschriftungen für Screenreader folgen der Sprache (vorher blieben mehrere Buttons fest deutsch).

async function openMap(page, lang) {
    await page.goto(`/?lang=${lang}`);
    await page.waitForSelector('.leaflet-container');
}

test.describe('Beschriftungen folgen der Sprache', () => {
    test('Englisch: Bedienleiste, Gruppen und Dialoge', async ({ page }) => {
        await openMap(page, 'en');
        await expect(page.locator('#search-btn')).toHaveAttribute('aria-label', 'Search');
        await expect(page.locator('#locate-btn')).toHaveAttribute('aria-label', 'Find my location');
        await expect(page.locator('#share-btn-trigger')).toHaveAttribute('aria-label', 'Share Map View');
        await expect(page.locator('#layer-btn-trigger')).toHaveAttribute('aria-label', 'Open layer menu');
        await expect(page.locator('#export-btn-trigger')).toHaveAttribute('aria-label', 'Open export menu');
        await expect(page.locator('#export-menu [role="group"]').first()).toHaveAttribute('aria-label', 'Choose format');
        await expect(page.locator('#export-menu [role="group"]').nth(1)).toHaveAttribute('aria-label', 'Choose zoom level');
        await expect(page.locator('#legal-close-btn')).toHaveAttribute('aria-label', 'Close');
        await expect(page.locator('#export-close-btn')).toHaveAttribute('aria-label', 'Close');
        await expect(page.locator('#legal-title')).toContainText('Legal');
        await expect(page.locator('#export-confirm-cancel')).toHaveText('Cancel');
        await expect(page.locator('#export-confirm-ok')).toHaveText('Create');
        await expect(page.locator('#export-confirm-title')).toHaveAttribute('placeholder', 'Loading place name …');
    });

    test('Deutsch bleibt Deutsch', async ({ page }) => {
        await openMap(page, 'de');
        await expect(page.locator('#search-btn')).toHaveAttribute('aria-label', 'Suchen');
        await expect(page.locator('#locate-btn')).toHaveAttribute('aria-label', 'Meinen Standort bestimmen');
        await expect(page.locator('#legal-title')).toContainText('Rechtliches');
        await expect(page.locator('#export-confirm-ok')).toHaveText('Erstellen');
    });

    test('Das Symbol im Titel von Info & Recht bleibt nach dem Übersetzen erhalten', async ({ page }) => {
        await openMap(page, 'en');
        expect(await page.locator('#legal-title svg').count()).toBe(1);
    });

    test('Mobil, Englisch: Burger-Menü, Standort, Suchdialog', async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
        const page = await context.newPage();
        await openMap(page, 'en');
        await expect(page.locator('#mobile-burger-btn')).toHaveAttribute('aria-label', 'Open menu');
        await expect(page.locator('#mobile-locate-btn')).toHaveAttribute('aria-label', 'Find my location');
        await page.locator('#mobile-burger-btn').click();
        await page.locator('#mobile-open-search').click();
        await expect(page.locator('#mobile-search-close')).toHaveAttribute('aria-label', 'Close search');
        await expect(page.locator('#mobile-search-go')).toHaveText('Go');
        await expect(page.locator('#mobile-search-input')).toHaveAttribute('placeholder', /search location/i);
        await context.close();
    });

    test('Der Platzhalter des Export-Titels wird beim Öffnen in der Sprache gesetzt', async ({ page }) => {
        await openMap(page, 'en');
        // Der Dialog setzt den Platzhalter beim Öffnen (hier ohne Objekte nicht erreichbar: Zustand wie in ui.js nachstellen)
        await page.route('**/api/interpreter', route => route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ elements: [{ type: 'node', id: 1, lat: 40.7128, lon: -74.0060, tags: { emergency: 'fire_hydrant' } }] })
        }));
        await page.route('**/nominatim**', route => route.fulfill({ json: {} }));
        await page.goto('/?lang=en#18/40.7128/-74.0060/voyager');
        await page.waitForFunction(() => window.State && window.State.cachedElements && window.State.cachedElements.length > 0);
        await page.locator('#export-btn-trigger').click();
        await page.locator('#png-btn').click();
        await expect(page.locator('#export-title-modal')).toBeVisible();
        const placeholder = await page.locator('#export-confirm-title').getAttribute('placeholder');
        expect(['Loading place name …', 'Enter title']).toContain(placeholder);
    });
});
