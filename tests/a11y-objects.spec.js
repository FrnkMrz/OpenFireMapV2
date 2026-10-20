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

    test('Offene Liste folgt den Daten, wenn die Marker erst nach dem Öffnen geladen werden', async ({ page }) => {
        await page.route('**/api/interpreter', async route => {
            await new Promise(r => setTimeout(r, 1500));
            await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: ELEMENTS }) });
        });
        await page.goto('/?lang=de#18/40.7129/-74.0055/voyager');
        await page.waitForSelector('.leaflet-container');
        await page.waitForFunction(() => window.State && window.State.map);

        await openListByKeyboard(page);
        // Noch keine Daten: Ladehinweis statt "keine Objekte"
        await expect(items(page)).toHaveCount(0);
        await expect(page.locator('#objects-list-summary')).not.toContainText('Zoomstufe 15');

        // Ohne erneutes Öffnen erscheinen die Einträge, der Fokus bleibt im Dialog
        await expect(items(page)).toHaveCount(3, { timeout: 8000 });
        await expect(page.locator('#objects-list-summary')).toContainText('3 Objekte');
        expect(await page.evaluate(() => document.getElementById('objects-list').contains(document.activeElement))).toBe(true);
    });

    test('Liefert der laufende Abruf keine Objekte, wechselt der Ladehinweis zur Leer-Meldung', async ({ page }) => {
        await page.route('**/api/interpreter', async route => {
            await new Promise(r => setTimeout(r, 1500));
            await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: [] }) });
        });
        await page.goto('/?lang=de#18/40.7129/-74.0055/voyager');
        await page.waitForSelector('.leaflet-container');
        await page.waitForFunction(() => window.State && window.State.map);

        await openListByKeyboard(page);
        await expect(page.locator('#objects-list-summary')).not.toContainText('Zoomstufe 15');
        await expect(page.locator('#objects-list-summary')).toContainText('Zoomstufe 15', { timeout: 8000 });
        await expect(items(page)).toHaveCount(0);
    });

    test('Ändert sich ein Objekt unter gleicher ID (Live-Delta), übernimmt die offene Liste Name und Entfernung', async ({ page }) => {
        await openMap(page, 18);
        await openListByKeyboard(page);
        await expect(items(page).filter({ hasText: 'Testhydrant' })).toHaveCount(1);
        const before = await items(page).filter({ hasText: 'Testhydrant' }).innerText();

        await page.evaluate(() => {
            const entry = window.State.markerCache.get('node:101');
            entry.tags = { ...entry.tags, name: 'Umbenannt' };
            entry.lat += 0.0003;
            window.dispatchEvent(new CustomEvent('ofm:markerschange'));
        });
        await expect(items(page).filter({ hasText: 'Umbenannt' })).toHaveCount(1);
        await expect(items(page).filter({ hasText: 'Testhydrant' })).toHaveCount(0);
        const after = await items(page).filter({ hasText: 'Umbenannt' }).innerText();
        expect(/(\d+) m/.exec(after)[1]).not.toBe(/(\d+) m/.exec(before)[1]);
    });

    test('Ändert sich der Kartenausschnitt bei offener Liste, folgen Auswahl und Sortierung', async ({ page }) => {
        await openMap(page, 18);
        await openListByKeyboard(page);
        await expect(items(page).first()).toContainText('Zweiter');
        // Noch anstehende Aktualisierungen vom Laden abwarten (Bündelung 150 ms), damit nur die Ausschnitts-Änderung wirkt
        await page.waitForTimeout(500);

        // z. B. ein noch laufender Flug oder eine Größenänderung: Mitte wandert zur Wache, alle Daten sind schon geladen.
        // Marker-Ereignisse werden unterdrückt, damit nur die Ausschnitts-Aktualisierung die Liste ändern kann.
        await page.evaluate(() => window.addEventListener('ofm:markerschange', e => e.stopImmediatePropagation(), true));
        await page.evaluate(() => window.State.map.setView([40.7131, -74.0050], 18, { animate: false }));
        await expect(items(page).first()).toContainText('Testwache');
    });

    test('Verschwindet der fokussierte Eintrag beim Aktualisieren, bleibt der Fokus im Dialog', async ({ page }) => {
        await openMap(page, 18);
        await openListByKeyboard(page);
        await items(page).filter({ hasText: 'Testwache' }).focus();
        await page.evaluate(() => {
            window.State.markerCache.delete('node:301');
            window.dispatchEvent(new CustomEvent('ofm:markerschange'));
        });
        await expect(items(page)).toHaveCount(2);
        expect(await page.evaluate(() => document.getElementById('objects-list').contains(document.activeElement))).toBe(true);
        expect(await page.evaluate(() => document.activeElement.tagName)).toBe('BUTTON');

        // Verschwinden alle Einträge, landet der Fokus auf dem Schließen-Button
        await items(page).first().focus();
        await page.evaluate(() => {
            window.State.markerCache.clear();
            window.dispatchEvent(new CustomEvent('ofm:markerschange'));
        });
        await expect(items(page)).toHaveCount(0);
        await expect(page.locator('#objects-close-btn')).toBeFocused();
    });

    test('Der Fokus auf einem Eintrag bleibt beim Aktualisieren der Liste erhalten', async ({ page }) => {
        await openMap(page, 18);
        await openListByKeyboard(page);
        const second = items(page).nth(1);
        await second.focus();
        const id = await second.getAttribute('data-object-id');
        // Gleiche Daten: kein Neuaufbau, Fokus bleibt
        await page.evaluate(() => window.dispatchEvent(new CustomEvent('ofm:markerschange')));
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => document.activeElement?.dataset.objectId)).toBe(id);
    });
});


// Nahe Hydranten (< 5 m) werden ab Zoom 17 zu einem Cluster-Symbol gebündelt
test.describe('Objektliste und Clustering', () => {
    const NEAR = [
        { type: 'node', id: 201, lat: 40.71280, lon: -74.00600, tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'pillar', name: 'Eins' } },
        { type: 'node', id: 202, lat: 40.71281, lon: -74.00600, tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'pillar', name: 'Zwei' } }
    ];

    for (const name of ['Eins', 'Zwei']) {
        test(`Auswahl von "${name}" landet nach dem Zoomen im Cluster-Symbol`, async ({ page }) => {
            await page.route('**/api/interpreter', route => route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({ elements: NEAR })
            }));
            await page.goto('/?lang=de#16/40.7128/-74.0060/voyager');
            await page.waitForSelector('.leaflet-container');
            await page.waitForFunction(() => window.State && window.State.map);
            await expect.poll(() => page.evaluate(() => window.State.markerCache.size), { timeout: 7000 }).toBe(2);

            await openListByKeyboard(page);
            await items(page).filter({ hasText: name }).focus();
            await page.keyboard.press('Enter');

            const cluster = page.locator('.leaflet-marker-icon[aria-label$="Objekte innerhalb 5m"]');
            await expect(cluster).toBeFocused({ timeout: 8000 });
            await expect(page.locator('.leaflet-tooltip:not(.range-label)')).toContainText('Eins');
            await expect(page.locator('.leaflet-tooltip:not(.range-label)')).toContainText('Zwei');
        });
    }
});
