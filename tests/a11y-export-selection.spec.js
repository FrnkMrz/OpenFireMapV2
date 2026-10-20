import { test, expect } from '@playwright/test';

// Export-Ausschnitt ohne Maus: sichtbaren Ausschnitt übernehmen, Auswahlmodus mit Escape abbrechen.

async function openMap(page) {
    await page.goto('/?lang=de#17/48.1351/11.5820/voyager');
    await page.waitForSelector('.leaflet-container');
    await page.waitForFunction(() => window.State && window.State.map);
}

const selection = (page) => page.evaluate(() => {
    const s = window.State.selection;
    return { active: s.active, hasRect: !!s.rect, bounds: s.finalBounds ? s.finalBounds.toBBoxString() : null };
});

async function openExportByKeyboard(page) {
    const trigger = page.locator('#export-btn-trigger');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#export-menu')).toBeVisible();
}

test.describe('Export-Auswahl per Tastatur', () => {
    test('Sichtbaren Ausschnitt übernehmen: fixierte Auswahl, Hinweis, Rechteck auf der Karte', async ({ page }) => {
        await openMap(page);
        await openExportByKeyboard(page);
        await page.locator('#select-view-btn').focus();
        await page.keyboard.press('Enter');

        await expect(page.locator('#selection-info')).toBeVisible();
        await expect(page.locator('#notification-live-status')).toContainText('Sichtbarer Ausschnitt');
        const sel = await selection(page);
        expect(sel.active).toBe(false);
        expect(sel.hasRect).toBe(true);
        expect(sel.bounds).toBeTruthy();

        // Auswahl liegt innerhalb des sichtbaren Ausschnitts
        const inside = await page.evaluate(() => window.State.map.getBounds().contains(window.State.selection.finalBounds));
        expect(inside).toBe(true);
    });

    test('DIN-Formate erhalten das Seitenverhältnis (quer ca. 1,41, hoch ca. 0,71)', async ({ page }) => {
        await openMap(page);
        await openExportByKeyboard(page);
        for (const [fmt, expected] of [['a4l', 1.4142], ['a4p', 0.7071]]) {
            await page.locator(`#fmt-${fmt}`).click();
            await page.locator('#select-view-btn').click();
            const ratio = await page.evaluate(() => {
                const b = window.State.selection.finalBounds;
                const lngScale = Math.cos(((b.getNorth() + b.getSouth()) / 2) * Math.PI / 180);
                return ((b.getEast() - b.getWest()) * lngScale) / (b.getNorth() - b.getSouth());
            });
            expect(ratio).toBeGreaterThan(expected - 0.02);
            expect(ratio).toBeLessThan(expected + 0.02);
        }
    });

    test('Erneutes Übernehmen nach Verschieben ersetzt die Auswahl', async ({ page }) => {
        await openMap(page);
        await openExportByKeyboard(page);
        await page.locator('#select-view-btn').click();
        const first = (await selection(page)).bounds;
        await page.evaluate(() => window.State.map.setView([48.14, 11.60], 17, { animate: false }));
        await page.locator('#select-view-btn').click();
        const second = (await selection(page)).bounds;
        expect(second).not.toBe(first);
        expect(await page.evaluate(() => Object.values(window.State.map._layers).filter(l => l._latlngs && l.options.interactive === false && l.options.fillOpacity === 0.2).length)).toBe(1);
    });

    test('Escape bricht den Auswahlmodus ab und gibt das Verschieben der Karte frei', async ({ page }) => {
        await openMap(page);
        await openExportByKeyboard(page);
        await page.locator('#select-btn').click();
        await expect.poll(async () => (await selection(page)).active).toBe(true); // export.js wird beim ersten Klick nachgeladen
        expect(await page.evaluate(() => window.State.map.dragging.enabled())).toBe(false);

        // 1. Escape schließt den Dialog, 2. Escape bricht den Auswahlmodus ab
        await page.keyboard.press('Escape');
        await expect(page.locator('#export-menu')).toBeHidden();
        await page.keyboard.press('Escape');
        expect((await selection(page)).active).toBe(false);
        expect(await page.evaluate(() => window.State.map.dragging.enabled())).toBe(true);
        expect(await page.evaluate(() => document.getElementById('map').classList.contains('selection-mode'))).toBe(false);
        await expect(page.locator('#notification-live-status')).toContainText('Auswahl abgebrochen');
    });

    test('Eine schon fixierte Auswahl bleibt, wenn der Auswahlmodus danach nicht aktiv ist', async ({ page }) => {
        await openMap(page);
        await openExportByKeyboard(page);
        await page.locator('#select-view-btn').click();
        const before = await selection(page);
        await page.keyboard.press('Escape'); // schließt nur den Dialog
        await page.keyboard.press('Escape'); // kein Auswahlmodus aktiv: nichts zu tun
        expect(await selection(page)).toEqual(before);
    });
});
