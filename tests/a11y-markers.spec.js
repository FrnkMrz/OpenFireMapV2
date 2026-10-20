import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Barrierefreiheit der Marker (Phase 2b, Teil 1 und 2): Name, Tab-Stopp, Enter/Leertaste, Escape.
// Overpass wird mit zwei Objekten in New York gemockt (außerhalb von DACHLiLu und Europa).

const HYDRANT = { type: 'node', id: 101, lat: 40.7128, lon: -74.0060, tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'pillar', name: 'Testhydrant' } };
const STATION = { type: 'node', id: 301, lat: 40.7131, lon: -74.0050, tags: { amenity: 'fire_station', name: 'Testwache' } };

async function openMap(page, zoom) {
    await page.route('**/api/interpreter', route => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ elements: [HYDRANT, STATION] })
    }));
    await page.goto(`/?lang=de#${zoom}/40.7129/-74.0055/voyager`);
    await page.waitForSelector('.leaflet-container');
    await page.waitForFunction(() => window.State && window.State.map);
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon').length), { timeout: 7000 })
        .toBeGreaterThanOrEqual(2);
}

const hydrantMarker = (page) => page.locator('.leaflet-marker-icon[aria-label="Hydrant: Testhydrant"]');
const stationMarker = (page) => page.locator('.leaflet-marker-icon[aria-label="Feuerwache: Testwache"]');
// Details-Tooltips ohne das "100 m"-Label des Radius
const detailTooltips = (page) => page.locator('.leaflet-tooltip:not(.range-label)');
const rangeLayers = (page) => page.evaluate(() => window.State.rangeLayerGroup.getLayers().length);

test.describe('Marker per Tastatur', () => {
    test('Unter Zoom 17 sind die Hydranten-Punkte keine Tab-Stopps (Wachen haben schon Symbole)', async ({ page }) => {
        await openMap(page, 16);
        await expect(page.locator('.leaflet-marker-icon.hydrant-dot')).toHaveCount(1);
        await expect(page.locator('.leaflet-marker-icon.hydrant-dot[tabindex]')).toHaveCount(0);
        await expect(page.locator('.leaflet-marker-icon.hydrant-dot[role]')).toHaveCount(0);
    });

    test('Symbole haben Namen und sind per Tab erreichbar', async ({ page }) => {
        await openMap(page, 18);
        await expect(hydrantMarker(page)).toHaveAttribute('role', 'button');
        await expect(hydrantMarker(page)).toHaveAttribute('tabindex', '0');
        await expect(stationMarker(page)).toHaveAttribute('role', 'button');

        // Von der Karte aus per Tab landet der Fokus nach endlich vielen Schritten auf einem benannten Marker
        await page.locator('#map').focus();
        let reached = false;
        for (let i = 0; i < 12 && !reached; i++) {
            await page.keyboard.press('Tab');
            reached = await page.evaluate(() => document.activeElement?.classList.contains('leaflet-marker-icon')
                && !!document.activeElement.getAttribute('aria-label'));
        }
        expect(reached).toBe(true);
    });

    test('Enter öffnet Details und Radius, sagt die Details an, Escape schließt und der Fokus bleibt', async ({ page }) => {
        await openMap(page, 18);
        const marker = hydrantMarker(page);
        await marker.focus();
        await page.keyboard.press('Enter');

        await expect(page.locator('.leaflet-tooltip').filter({ hasText: 'Testhydrant' })).toBeVisible();
        expect(await rangeLayers(page)).toBeGreaterThan(0);
        await expect(page.locator('#notification-live-status')).toContainText('Testhydrant');
        await expect(page.locator('#notification-live-status')).toContainText('pillar');
        await expect(marker).toBeFocused();

        await page.keyboard.press('Escape');
        await expect(detailTooltips(page)).toHaveCount(0);
        expect(await rangeLayers(page)).toBe(0);
        await expect(marker).toBeFocused();
    });

    test('Escape entfernt auch die Distanz-Linie zum Standort', async ({ page }) => {
        await openMap(page, 18);
        // Standort-Marker setzen, damit Enter eine Linie zeichnet
        await page.evaluate(() => {
            window.State.userMarker = window.L.marker([40.7129, -74.0058]).addTo(window.State.map);
        });
        await hydrantMarker(page).focus();
        await page.keyboard.press('Enter');
        await expect.poll(() => page.evaluate(() => window.State.distanceLayerGroup.getLayers().length)).toBeGreaterThan(0);

        await page.keyboard.press('Escape');
        expect(await page.evaluate(() => window.State.distanceLayerGroup.getLayers().length)).toBe(0);
        expect(await page.evaluate(() => window.State.distanceTarget)).toBeNull();
        await expect(hydrantMarker(page)).toBeFocused();
    });

    test('Leertaste wirkt wie Enter und löst nur einmal aus', async ({ page }) => {
        await openMap(page, 18);
        await hydrantMarker(page).focus();
        await page.evaluate(() => { window.__rangeCalls = 0; const g = window.State.rangeLayerGroup; const orig = g.clearLayers.bind(g); g.clearLayers = () => { window.__rangeCalls++; return orig(); }; });
        await page.keyboard.press('Space');
        await expect(page.locator('.leaflet-tooltip').filter({ hasText: 'Testhydrant' })).toBeVisible();
        expect(await page.evaluate(() => window.__rangeCalls)).toBe(1);

        await page.evaluate(() => { window.__rangeCalls = 0; });
        await page.keyboard.press('Enter');
        expect(await page.evaluate(() => window.__rangeCalls)).toBe(1);
    });

    test('Per Tastatur öffnen die Details auch bei Zoom 17 (Hover erst ab 18)', async ({ page }) => {
        await openMap(page, 17);
        await hydrantMarker(page).focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.leaflet-tooltip').filter({ hasText: 'Testhydrant' })).toBeVisible();
        // bleibt nach einem Kartenereignis offen
        await page.evaluate(() => window.State.map.fire('moveend'));
        await expect(page.locator('.leaflet-tooltip').filter({ hasText: 'Testhydrant' })).toBeVisible();
    });

    test('Wache: Enter öffnet Details ohne 100-m-Radius', async ({ page }) => {
        await openMap(page, 18);
        await stationMarker(page).focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.leaflet-tooltip').filter({ hasText: 'Testwache' })).toBeVisible();
        expect(await rangeLayers(page)).toBe(0);
        await expect(page.locator('#notification-live-status')).toContainText('Testwache');
    });

    test('Nur ein Tooltip gleichzeitig, auch per Tastatur', async ({ page }) => {
        await openMap(page, 18);
        await hydrantMarker(page).focus();
        await page.keyboard.press('Enter');
        await stationMarker(page).focus();
        await page.keyboard.press('Enter');
        await expect(detailTooltips(page)).toHaveCount(1);
        await expect(detailTooltips(page)).toContainText('Testwache');
    });

    test('Escape im Dialog schließt den Dialog und lässt die Marker-Details unberührt', async ({ page }) => {
        await openMap(page, 18);
        await hydrantMarker(page).focus();
        await page.keyboard.press('Enter');
        await page.locator('#btn-legal-trigger').focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#legal-modal')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#legal-modal')).toBeHidden();
        await expect(page.locator('.leaflet-tooltip').filter({ hasText: 'Testhydrant' })).toBeVisible();
    });

    test('Karte mit Markern und offenen Details hat keine axe-Verstöße', async ({ page }) => {
        await openMap(page, 18);
        await hydrantMarker(page).focus();
        await page.keyboard.press('Enter');
        await expect(detailTooltips(page)).toBeVisible();
        const { violations } = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .disableRules(['color-contrast']) // Phase 3
            .analyze();
        expect(violations, violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
    });
});
