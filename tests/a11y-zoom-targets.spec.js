import { test, expect } from '@playwright/test';

// WCAG 1.4.10 (Reflow) / 2.1.1 bei 400 % Zoom (Fenster ca. 320 x 256 CSS-Pixel) und
// WCAG 2.5.8 (Zielgröße mindestens 24 x 24 CSS-Pixel).
// body hat overflow: hidden: Was unter der Fensterkante liegt und nicht in einem Menü scrollt, ist unerreichbar.

async function openMap(page) {
    await page.goto('/');
    await page.waitForSelector('.leaflet-container');
}

// Klickt per JavaScript, weil die Desktop-Buttons im Mobile-UI-Modus ausgeblendet sind (wie in a11y.spec.js)
async function jsClick(page, selector) {
    await page.evaluate((sel) => document.querySelector(sel)?.click(), selector);
}

// Prüft, dass jedes sichtbare bedienbare Element im Dialog nach dem Scrollen im Fenster liegt und
// dort wirklich getroffen wird (nichts davor, nichts abgeschnitten).
async function expectAllControlsReachable(page, dialogSelector) {
    const dialog = page.locator(dialogSelector);
    await expect(dialog).toBeVisible();

    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(box.x, `${dialogSelector} links im Fenster`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${dialogSelector} rechts im Fenster`).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y, `${dialogSelector} oben im Fenster`).toBeGreaterThanOrEqual(0);

    const controls = dialog.locator('button:visible, select:visible, input:visible, a[href]:visible');
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
        const control = controls.nth(i);
        await control.scrollIntoViewIfNeeded();
        const result = await control.evaluate((el) => {
            const r = el.getBoundingClientRect();
            // Mitte und vier Eckpunkte (leicht eingerückt): ein darüberliegendes Element verdeckt oft nur einen Teil
            const points = [[0.5, 0.5], [0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8]];
            const hit = points.every(([fx, fy]) => {
                const h = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
                return !!h && (h === el || el.contains(h) || h.contains(el));
            });
            return {
                id: el.id || el.textContent.trim().slice(0, 30),
                top: r.top,
                bottom: r.bottom,
                inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
                hit,
            };
        });
        expect(result.inViewport, `${result.id} liegt nach dem Scrollen im Fenster (${result.top}-${result.bottom})`).toBe(true);
        expect(result.hit, `${result.id} wird an allen Prüfpunkten getroffen (nichts liegt darüber)`).toBe(true);
    }
}

test.describe('Zoom 400 % (Fenster 320 x 256)', () => {
    test.use({ viewport: { width: 320, height: 256 } });

    test('Mobiles Menü: alle Einträge inklusive Info & Recht und Cache-Auswahl sind erreichbar', async ({ page }) => {
        await openMap(page);
        await page.locator('#mobile-burger-btn').click();
        await expect(page.locator('#mobile-menu')).toBeVisible();

        // Das Menü ist höher als das Fenster und scrollt darum selbst
        const scroll = await page.locator('#mobile-menu').evaluate((el) => ({
            overflowY: getComputedStyle(el).overflowY,
            scrollable: el.scrollHeight > el.clientHeight,
            bottom: el.getBoundingClientRect().bottom,
            vh: window.innerHeight,
        }));
        expect(scroll.overflowY).toBe('auto');
        expect(scroll.scrollable).toBe(true);
        expect(scroll.bottom).toBeLessThanOrEqual(scroll.vh);

        await expectAllControlsReachable(page, '#mobile-menu');
        await expect(page.locator('#mobile-open-legal')).toBeInViewport();
        await expect(page.locator('#mobile-cache-duration-select')).toBeInViewport();
    });

    test('Ebenenmenü (mobil geöffnet) liegt im Fenster und scrollt', async ({ page }) => {
        await openMap(page);
        await page.locator('#mobile-burger-btn').click();
        await page.locator('#mobile-open-layers').click();
        await expectAllControlsReachable(page, '#layer-menu');
    });

    test('Info & Recht liegt im Fenster, der Inhalt scrollt', async ({ page }) => {
        await openMap(page);
        await jsClick(page, '#btn-legal-trigger');
        await expectAllControlsReachable(page, '#legal-modal');
    });

    test('Mobile Suche liegt im Fenster', async ({ page }) => {
        await openMap(page);
        await page.locator('#mobile-burger-btn').click();
        await page.locator('#mobile-open-search').click();
        await expectAllControlsReachable(page, '#mobile-search-modal');
        await expect(page.locator('#mobile-search-input')).toBeInViewport();
    });
});

test.describe('Geringe Fensterhöhe in der Desktop-Oberfläche (Breite 1440 px)', () => {
    test.use({ viewport: { width: 1440, height: 300 } });

    test('Datenstand-Popover ragt nicht über den oberen Rand und scrollt', async ({ page }) => {
        await openMap(page);
        await page.locator('#data-info-btn').click();
        await expectAllControlsReachable(page, '#data-info-popover');
    });

    // Das Export-Menü gibt es nur in der Desktop-Oberfläche (ab 1370 px Fensterbreite); im mobilen Layout,
    // auch bei 400 % Zoom, hat das Menü bewusst keinen Export-Eintrag.
    test('Export-Menü liegt im Fenster und scrollt', async ({ page }) => {
        await openMap(page);
        await page.locator('#export-btn-trigger').click();
        await expectAllControlsReachable(page, '#export-menu');
    });
});

// Zoomen im geöffneten Browser: Das Fenster wird nach dem Laden schmal (1440 px / 4 = 360 px), die Seite lädt aber breit.
test.describe('Zoom nach dem Laden (Wechsel Desktop <-> mobile Oberfläche)', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('Breit geladen, dann auf 320 x 256 gezoomt: mobile Oberfläche mit scrollbarem Menü, und zurück', async ({ page }) => {
        await openMap(page);
        await expect(page.locator('#desktop-controls')).toBeVisible();
        await expect(page.locator('#mobile-burger-btn')).toBeHidden();

        // Zoomen: das Fenster wird schmal
        await page.setViewportSize({ width: 320, height: 256 });
        await expect(page.locator('#mobile-burger-btn')).toBeVisible();
        await expect(page.locator('#mobile-locate-btn')).toBeVisible();
        await expect(page.locator('#desktop-controls')).toBeHidden();
        await expect(page.locator('html')).toHaveClass(/ofm-mobile-ui/);

        await page.locator('#mobile-burger-btn').click();
        await expect(page.locator('#mobile-menu')).toBeVisible();
        const overflowY = await page.locator('#mobile-menu').evaluate((el) => getComputedStyle(el).overflowY);
        expect(overflowY).toBe('auto');
        await expectAllControlsReachable(page, '#mobile-menu');
        await page.locator('#mobile-open-legal').scrollIntoViewIfNeeded();
        await expect(page.locator('#mobile-open-legal')).toBeInViewport();
        await expect(page.locator('#mobile-cache-duration-select')).toBeInViewport();

        // Zurück auf Desktop-Breite: Desktop-Oberfläche wieder da, mobile Steuerelemente weg, Menü zu
        await page.setViewportSize({ width: 1440, height: 900 });
        await expect(page.locator('#desktop-controls')).toBeVisible();
        await expect(page.locator('#mobile-burger-btn')).toBeHidden();
        await expect(page.locator('#mobile-locate-btn')).toBeHidden();
        await expect(page.locator('#mobile-menu')).toBeHidden();
        await expect(page.locator('html')).not.toHaveClass(/ofm-mobile-ui/);

        // und noch einmal schmal: nichts doppelt gebunden, Burger öffnet und schließt wie gewohnt
        await page.setViewportSize({ width: 320, height: 256 });
        await expect(page.locator('#mobile-burger-btn')).toBeVisible();
        await page.locator('#mobile-burger-btn').click();
        await expect(page.locator('#mobile-menu')).toBeVisible();
        await page.locator('#mobile-burger-btn').click();
        await expect(page.locator('#mobile-menu')).toBeHidden();
    });

    test('Offenes Datenstand-Popover schließt beim Wechsel zur mobilen Oberfläche und kommt nicht von selbst wieder', async ({ page }) => {
        await openMap(page);
        await page.locator('#data-info-btn').click();
        await expect(page.locator('#data-info-popover')).toBeVisible();
        await expect(page.locator('#data-info-btn')).toHaveAttribute('aria-expanded', 'true');

        await page.setViewportSize({ width: 320, height: 256 });
        await expect(page.locator('#mobile-burger-btn')).toBeVisible();
        await expect(page.locator('#data-info-popover')).toHaveClass(/hidden/);
        await expect(page.locator('#data-info-btn')).toHaveAttribute('aria-expanded', 'false');
        // Der Fokus lag im Popover und ist nicht verloren, sondern auf einem sichtbaren Element
        await expect(page.locator('#mobile-burger-btn')).toBeFocused();

        await page.setViewportSize({ width: 1440, height: 900 });
        await expect(page.locator('#desktop-controls')).toBeVisible();
        await expect(page.locator('#data-info-popover')).toBeHidden();
        await expect(page.locator('#data-info-btn')).toHaveAttribute('aria-expanded', 'false');
        const inertCount = await page.evaluate(() => document.querySelectorAll('[inert]').length);
        expect(inertCount).toBe(0);
    });

    test('Offenes „Info & Recht“ schließt beim Wechsel zur Desktop-Oberfläche (kein inert, keine Fokus-Falle)', async ({ page }) => {
        await openMap(page);
        await page.setViewportSize({ width: 320, height: 256 });
        await page.locator('#mobile-burger-btn').click();
        await page.locator('#mobile-open-legal').click();
        await expect(page.locator('#legal-modal')).toBeVisible();

        await page.setViewportSize({ width: 1440, height: 900 });
        await expect(page.locator('#desktop-controls')).toBeVisible();
        await expect(page.locator('#legal-modal')).toBeHidden();
        await expect(page.locator('#btn-legal-trigger')).toHaveAttribute('aria-expanded', 'false');
        // registerDialog sperrt den Rest per inert, solange der Dialog offen ist
        await expect(page.locator('#desktop-controls')).not.toHaveAttribute('inert', /.*/);
        const inertCount = await page.evaluate(() => document.querySelectorAll('[inert]').length);
        expect(inertCount).toBe(0);

        // Der Dialog lässt sich auf Desktop wieder normal öffnen
        await page.locator('#btn-legal-trigger').click();
        await expect(page.locator('#legal-modal')).toBeVisible();
    });
});

test.describe('Zielgröße (WCAG 2.5.8)', () => {
    test('Datenstand-Details-Button ist auf dem Desktop mindestens 24 px hoch', async ({ page }) => {
        await openMap(page);
        const box = await page.locator('#data-info-btn').boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(24);
        expect(box.width).toBeGreaterThanOrEqual(24);
    });
});
