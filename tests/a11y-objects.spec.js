import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Objektliste (Phase 2b, Teil 3): Textalternative zu den Markern. Overpass wird in New York gemockt.

const ELEMENTS = [
    { type: 'node', id: 101, lat: 40.7128, lon: -74.0060, tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'pillar', name: 'Testhydrant' } },
    { type: 'node', id: 102, lat: 40.7129, lon: -74.0056, tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'pillar', name: 'Zweiter' } },
    { type: 'node', id: 301, lat: 40.7131, lon: -74.0050, tags: { amenity: 'fire_station', name: 'Testwache' } }
];

async function openMap(page, zoom, { expectMarkers = 3 } = {}) {
    await page.route('**/api/interpreter', route => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ elements: ELEMENTS })
    }));
    await page.goto(`/?lang=de#${zoom}/40.7129/-74.0055/voyager`);
    await page.waitForSelector('.leaflet-container');
    await page.waitForFunction(() => window.State && window.State.map);
    if (expectMarkers) {
        await expect.poll(() => page.evaluate(() => window.State.markerCache.size), { timeout: 7000 }).toBeGreaterThanOrEqual(expectMarkers);
    }
}

const items = (page) => page.locator('#objects-list-items button');

async function openListByKeyboard(page) {
    const trigger = page.locator('#objects-btn-trigger');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#objects-list')).toBeVisible();
    return trigger;
}

test.describe('Objektliste', () => {
    test('Auslöser ist beschriftet und die Liste öffnet per Tastatur mit Fokus im Dialog', async ({ page }) => {
        await openMap(page, 18);
        const trigger = page.locator('#objects-btn-trigger');
        await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        expect(await trigger.getAttribute('aria-label')).toBeTruthy();

        await openListByKeyboard(page);
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await expect.poll(() => page.evaluate(() => document.getElementById('objects-list').contains(document.activeElement))).toBe(true);
        await expect(page.locator('#objects-list')).toHaveAttribute('role', 'dialog');
        await expect(page.locator('#objects-list')).toHaveAttribute('aria-labelledby', 'objects-list-title');
    });

    test('Einträge nennen Namen und Entfernung und sind nach Entfernung sortiert', async ({ page }) => {
        await openMap(page, 18);
        await openListByKeyboard(page);
        await expect(items(page)).toHaveCount(3);
        const texts = await items(page).allInnerTexts();
        expect(texts[0]).toContain('Hydrant: Zweiter');
        expect(texts.some(t => t.includes('Hydrant: Testhydrant'))).toBe(true);
        expect(texts.some(t => t.includes('Feuerwache: Testwache'))).toBe(true);
        const distances = texts.map(t => parseInt(/(\d+) m/.exec(t)[1], 10));
        expect(distances).toEqual([...distances].sort((a, b) => a - b));
        await expect(page.locator('#objects-list-summary')).toContainText('3 Objekte');
    });

    test('Tab-Falle, Rest inert, Escape schließt und der Fokus geht zum Auslöser zurück', async ({ page }) => {
        await openMap(page, 18);
        const trigger = await openListByKeyboard(page);
        expect(await page.evaluate(() => !!document.getElementById('map').closest('[inert]'))).toBe(true);
        for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');
            expect(await page.evaluate(() => document.getElementById('objects-list').contains(document.activeElement))).toBe(true);
        }
        await page.keyboard.press('Escape');
        await expect(page.locator('#objects-list')).toBeHidden();
        await expect(trigger).toBeFocused();
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(await page.evaluate(() => !!document.getElementById('map').closest('[inert]'))).toBe(false);
    });

    test('Auswahl schließt die Liste, fokussiert den Marker und öffnet seine Details', async ({ page }) => {
        await openMap(page, 18);
        await openListByKeyboard(page);
        await items(page).filter({ hasText: 'Testwache' }).focus();
        await page.keyboard.press('Enter');

        await expect(page.locator('#objects-list')).toBeHidden();
        const marker = page.locator('.leaflet-marker-icon[aria-label="Feuerwache: Testwache"]');
        await expect(marker).toBeFocused();
        await expect(page.locator('.leaflet-tooltip:not(.range-label)')).toContainText('Testwache');
    });

    test('Bei kleinem Zoom springt die Auswahl auf Symbol-Zoom und fokussiert den Marker', async ({ page }) => {
        await openMap(page, 16);
        await openListByKeyboard(page);
        await items(page).filter({ hasText: 'Testhydrant' }).focus();
        await page.keyboard.press('Enter');

        const marker = page.locator('.leaflet-marker-icon[aria-label="Hydrant: Testhydrant"]');
        await expect(marker).toBeFocused({ timeout: 8000 });
        expect(await page.evaluate(() => window.State.map.getZoom())).toBeGreaterThanOrEqual(17);
        await expect(page.locator('.leaflet-tooltip:not(.range-label)')).toContainText('Testhydrant');
    });

    test('Ohne Objekte erklärt die Liste, was zu tun ist', async ({ page }) => {
        await openMap(page, 11, { expectMarkers: 0 });
        await openListByKeyboard(page);
        await expect(items(page)).toHaveCount(0);
        await expect(page.locator('#objects-list-summary')).toContainText('Zoomstufe 15');
    });

    test('Liste mit Einträgen hat keine axe-Verstöße', async ({ page }) => {
        await openMap(page, 18);
        await openListByKeyboard(page);
        const { violations } = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .disableRules(['color-contrast']) // Phase 3
            .analyze();
        expect(violations, violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
    });

    test('Mobil: Liste aus dem Burger-Menü, Escape bringt den Fokus zum Burger-Button zurück', async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
        const page = await context.newPage();
        await page.route('**/api/interpreter', route => route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ elements: ELEMENTS })
        }));
        await page.goto('/?lang=de#18/40.7129/-74.0055/voyager');
        await page.waitForSelector('.leaflet-container');
        await page.locator('#mobile-burger-btn').click();
        await page.locator('#mobile-open-objects').click();
        await expect(page.locator('#objects-list')).toBeVisible();
        await expect(page.locator('#objects-list-items button').first()).toBeVisible({ timeout: 7000 });

        await page.keyboard.press('Escape');
        await expect(page.locator('#objects-list')).toBeHidden();
        await expect(page.locator('#mobile-burger-btn')).toBeFocused();
        await context.close();
    });
});
