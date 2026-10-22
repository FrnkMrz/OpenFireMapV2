import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Barrierefreiheits-Tests (WCAG 2.2 A/AA) mit axe-core plus gezielte Tastatur-/Bewegungs-Prüfungen.

// 'wcag22a' hat in axe-core derzeit keine Regeln (alle neuen 2.2-Regeln sind AA), bleibt aber drin,
// damit künftige Level-A-Regeln von 2.2 automatisch mitlaufen.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

// Bekannte, noch offene Funde: derzeit keine. Regeln hier nur vorübergehend und mit Begründung eintragen.
// Kontraste der Panels über wechselnden Karten prüft tests/a11y-contrast.spec.js (axe kann halbtransparente Flächen über Kacheln nicht auswerten).
const KNOWN_OPEN_RULES = [];

async function gotoReady(page, url = '/') {
    await page.goto(url);
    await page.waitForSelector('.leaflet-container');
}

// Hilfsfunktion: Klickt ein Element per JavaScript (wie in map.spec.js)
async function jsClick(page, selector) {
    await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.click();
    }, selector);
}

function axe(page) {
    return new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .disableRules(KNOWN_OPEN_RULES);
}

function formatViolations(violations) {
    return violations
        .map(v => `${v.id} (${v.impact}): ${v.help}\n` + v.nodes.map(n => `   ${n.target.join(' ')}`).join('\n'))
        .join('\n');
}

test.describe('Barrierefreiheit', () => {
    test('Startseite hat keine axe-Verstöße', async ({ page }) => {
        await gotoReady(page);
        const { violations } = await axe(page).analyze();
        expect(violations, formatViolations(violations)).toEqual([]);
    });

    test('Ebenen-Menü hat keine axe-Verstöße', async ({ page }) => {
        await gotoReady(page);
        await jsClick(page, '#layer-btn-trigger');
        await expect(page.locator('#layer-menu')).not.toHaveClass(/hidden/);
        const { violations } = await axe(page).analyze();
        expect(violations, formatViolations(violations)).toEqual([]);
    });

    test('Info-&-Recht-Dialog hat keine axe-Verstöße', async ({ page }) => {
        await gotoReady(page);
        await jsClick(page, '#btn-legal-trigger');
        await expect(page.locator('#legal-modal')).toBeVisible();
        const { violations } = await axe(page).analyze();
        expect(violations, formatViolations(violations)).toEqual([]);
    });

    test('Export-Menü hat keine axe-Verstöße', async ({ page }) => {
        await gotoReady(page);
        await jsClick(page, '#export-btn-trigger');
        await expect(page.locator('#export-menu')).not.toHaveClass(/hidden/);
        const { violations } = await axe(page).analyze();
        expect(violations, formatViolations(violations)).toEqual([]);
    });

    test('Mobile Ansicht mit geöffnetem Menü hat keine axe-Verstöße', async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
        const page = await context.newPage();
        await gotoReady(page);
        await jsClick(page, '#mobile-burger-btn');
        const { violations } = await axe(page).analyze();
        await context.close();
        expect(violations, formatViolations(violations)).toEqual([]);
    });

    test('Viewport sperrt das Zoomen nicht', async ({ page }) => {
        await gotoReady(page);
        const content = await page.locator('meta[name="viewport"]').getAttribute('content');
        expect(content).not.toMatch(/user-scalable\s*=\s*(no|0)/i);
        expect(content).not.toMatch(/maximum-scale/i);
    });

    test('Skip-Link ist erster Tab-Stopp und fokussiert die Karte, ohne den Permalink zu ändern', async ({ page }) => {
        await gotoReady(page);
        await page.keyboard.press('Tab');
        const skip = page.locator('#skip-to-map');
        await expect(skip).toBeFocused();
        // Fokussiert muss er im sichtbaren Bereich liegen
        const box = await skip.boundingBox();
        expect(box.y).toBeGreaterThanOrEqual(0);
        const hashBefore = new URL(page.url()).hash;
        await page.keyboard.press('Enter');
        // Fokus liegt auf der Karte, der Permalink (#zoom/lat/lon/layer) bleibt unverändert
        await expect(page.locator('#map')).toBeFocused();
        expect(new URL(page.url()).hash).toBe(hashBefore);
    });

    test('Tastaturfokus ist sichtbar (Outline vorhanden)', async ({ page }) => {
        await gotoReady(page);
        // Suchen-Button hatte vorher keinen Fokus-Ersatz
        await page.locator('#search-btn').focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(page.locator('#search-btn')).toBeFocused();
        const outline = await page.locator('#search-btn').evaluate(el => {
            const s = getComputedStyle(el);
            return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
        });
        expect(outline.style).not.toBe('none');
        expect(outline.width).toBeGreaterThanOrEqual(2);
    });

    test('Schriftgrößen in der Oberfläche sind mindestens 12 px', async ({ page }) => {
        await gotoReady(page);
        await jsClick(page, '#export-btn-trigger');
        const tooSmall = await page.evaluate(() => {
            const out = [];
            for (const el of document.querySelectorAll('#export-menu *, #desktop-controls *')) {
                if (!el.childNodes.length) continue;
                const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
                if (!hasText) continue;
                const px = parseFloat(getComputedStyle(el).fontSize);
                if (px < 12) out.push(`${el.tagName.toLowerCase()}#${el.id || ''} ${px}px`);
            }
            return out;
        });
        expect(tooSmall).toEqual([]);
    });

    test('Pfeiltasten verschieben die Karte bei reduzierter Bewegung ohne Animation', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await gotoReady(page);
        await page.locator('#map').focus();
        const readX = () => page.locator('.leaflet-map-pane').evaluate(el => {
            const m = /translate3d\((-?[\d.]+)px/.exec(el.style.transform || '');
            return { x: m ? parseFloat(m[1]) : 0, animating: el.classList.contains('leaflet-pan-anim') };
        });
        const before = await readX();
        await page.keyboard.press('ArrowRight');
        // Direkt nach dem Tastendruck, ohne Wartezeit: bei Animation läge x noch nahe am Startwert
        const after = await readX();
        expect(after.animating).toBe(false);
        expect(Math.abs(after.x - before.x)).toBeGreaterThanOrEqual(70);
    });

    test('Bei reduzierter Bewegung gibt es keine Übergänge/Animationen', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await gotoReady(page);
        const longest = await page.evaluate(() => {
            let max = 0;
            for (const el of document.querySelectorAll('body *')) {
                const s = getComputedStyle(el);
                const durations = [...s.transitionDuration.split(','), ...s.animationDuration.split(',')];
                for (const d of durations) {
                    const sec = d.trim().endsWith('ms') ? parseFloat(d) / 1000 : parseFloat(d);
                    if (!Number.isNaN(sec)) max = Math.max(max, sec);
                }
            }
            return max;
        });
        expect(longest).toBeLessThan(0.01);
    });
});

// Hilfen für die Dialog-Tests: liegt der Fokus (noch) innerhalb des Elements?
const focusInside = (page, selector) => page.evaluate(
    (sel) => !!document.querySelector(sel)?.contains(document.activeElement), selector
);

// Drückt Tab bzw. Shift+Tab mehrfach und prüft, dass der Fokus den Dialog nie verlässt
async function expectFocusStaysIn(page, selector, key, presses = 14) {
    for (let i = 0; i < presses; i++) {
        await page.keyboard.press(key);
        expect(await focusInside(page, selector), `Fokus nach ${key} #${i + 1} außerhalb von ${selector}`).toBe(true);
    }
}

const isInert = (page, selector) => page.evaluate((sel) => !!document.querySelector(sel)?.closest('[inert]'), selector);

test.describe('Menü- und Karten-Struktur', () => {
    test('Es gibt keine Menü-Rollen ohne Pfeiltasten-Verhalten', async ({ page }) => {
        await gotoReady(page);
        const count = await page.locator('[role="menu"], [role="menubar"], [role="menuitem"]').count();
        expect(count).toBe(0);
    });

    test('Ebenenauswahl ist eine beschriftete Gruppe aus Buttons mit aria-pressed', async ({ page }) => {
        await gotoReady(page);
        const menu = page.locator('#layer-menu');
        await expect(menu).toHaveAttribute('role', 'group');
        await expect(menu).toHaveAttribute('aria-labelledby', 'layer-menu-title');
        const buttons = menu.locator('button.layer-btn');
        expect(await buttons.count()).toBeGreaterThanOrEqual(7);
        for (const btn of await buttons.all()) {
            expect(['true', 'false']).toContain(await btn.getAttribute('aria-pressed'));
        }
        await expect(menu.locator('button[aria-pressed="true"]')).toHaveCount(1);

        // Auswahl wechselt den gedrückten Button
        await jsClick(page, '#layer-btn-trigger');
        await page.locator('#btn-osm').click();
        await expect(page.locator('#btn-osm')).toHaveAttribute('aria-pressed', 'true');
        await expect(menu.locator('button[aria-pressed="true"]')).toHaveCount(1);
    });

    test('Das mobile Menü ist eine Gruppe ohne Menü-Rollen', async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
        const page = await context.newPage();
        await gotoReady(page);
        const role = await page.locator('#mobile-menu').getAttribute('role');
        const popup = await page.locator('#mobile-burger-btn').getAttribute('aria-haspopup');
        await context.close();
        expect(role).toBe('group');
        expect(popup).toBeNull();
    });

    test('Die Karte ist eine Region mit Namen und Tastatur-Hinweis, keine Anwendung', async ({ page }) => {
        await gotoReady(page);
        const map = page.locator('#map');
        await expect(map).toHaveAttribute('role', 'region');
        await expect(map).not.toHaveAttribute('role', 'application');
        expect(await map.getAttribute('aria-label')).toBeTruthy();
        const hintId = await map.getAttribute('aria-describedby');
        expect(hintId).toBeTruthy();
        const hint = (await page.locator(`#${hintId}`).textContent()).trim();
        expect(hint.length).toBeGreaterThan(20);
        // Hinweis gehört nur Screenreadern und ist sichtbar nicht vorhanden
        const box = await page.locator(`#${hintId}`).boundingBox();
        expect(box.width).toBeLessThanOrEqual(1);
    });
});

test.describe('Dialoge: Fokus, Tab-Falle, Escape', () => {
    test('Info & Recht: Fokus rein, Tab-Falle, Rest inert, Escape schließt und gibt den Fokus zurück', async ({ page }) => {
        await gotoReady(page);
        const trigger = page.locator('#btn-legal-trigger');
        await trigger.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#legal-modal')).toBeVisible();

        // Fokus liegt im Dialog, der Auslöser meldet "geöffnet"
        await expect.poll(() => focusInside(page, '#legal-modal')).toBe(true);
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');

        // Rest der Seite ist inert, der Dialog nicht
        expect(await isInert(page, '#map')).toBe(true);
        expect(await isInert(page, '#desktop-controls')).toBe(true);
        expect(await isInert(page, '#legal-modal')).toBe(false);

        await expectFocusStaysIn(page, '#legal-modal', 'Tab');
        await expectFocusStaysIn(page, '#legal-modal', 'Shift+Tab');

        await page.keyboard.press('Escape');
        await expect(page.locator('#legal-modal')).toBeHidden();
        await expect(trigger).toBeFocused();
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(await isInert(page, '#map')).toBe(false);
        expect(await isInert(page, '#desktop-controls')).toBe(false);
    });

    test('Export-Menü: Tab-Falle, Karte bleibt bedienbar, Escape gibt den Fokus an den Auslöser zurück', async ({ page }) => {
        await gotoReady(page);
        const trigger = page.locator('#export-btn-trigger');
        await trigger.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#export-menu')).toBeVisible();
        await expect.poll(() => focusInside(page, '#export-menu')).toBe(true);

        // Die Karte bleibt ansprechbar (Ausschnitt wählen, Verschieben, Zoomen), alles andere ist gesperrt
        expect(await isInert(page, '#map')).toBe(false);
        expect(await isInert(page, '#desktop-controls')).toBe(true);
        expect(await isInert(page, '#status-box')).toBe(true);

        await expectFocusStaysIn(page, '#export-menu', 'Tab', 24);
        await expectFocusStaysIn(page, '#export-menu', 'Shift+Tab', 24);

        await page.keyboard.press('Escape');
        await expect(page.locator('#export-menu')).toBeHidden();
        await expect(trigger).toBeFocused();
        expect(await isInert(page, '#desktop-controls')).toBe(false);
    });

    test('Export-Titel-Dialog: Escape schließt, Fokus geht zurück zum Export-Auslöser', async ({ page }) => {
        await gotoReady(page);
        // Der Dialog öffnet erst mit Objekten auf der Karte; hier reicht das Einblenden wie in ui.js
        await page.evaluate(() => document.getElementById('export-title-modal').classList.remove('hidden'));
        await expect.poll(() => focusInside(page, '#export-title-modal')).toBe(true);
        expect(await isInert(page, '#map')).toBe(true);

        await expectFocusStaysIn(page, '#export-title-modal', 'Tab', 8);
        await expectFocusStaysIn(page, '#export-title-modal', 'Shift+Tab', 8);

        await page.keyboard.press('Escape');
        await expect(page.locator('#export-title-modal')).toBeHidden();
        await expect(page.locator('#export-btn-trigger')).toBeFocused();
        expect(await isInert(page, '#map')).toBe(false);
    });

    test('Ebenen-Menü: Fokus auf aktive Ebene, Escape schließt, Fokus zurück, Rest nicht gesperrt', async ({ page }) => {
        await gotoReady(page);
        const trigger = page.locator('#layer-btn-trigger');
        await trigger.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#layer-menu')).toBeVisible();
        await expect(page.locator('#layer-menu .layer-btn.active')).toBeFocused();
        expect(await isInert(page, '#map')).toBe(false);

        await page.keyboard.press('Escape');
        await expect(page.locator('#layer-menu')).toBeHidden();
        await expect(trigger).toBeFocused();
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('Datenstand-Popover: Fokus hinein, Escape schließt, Fokus zurück zum Button', async ({ page }) => {
        await gotoReady(page);
        const btn = page.locator('#data-info-btn');
        await btn.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#data-info-popover')).toBeVisible();
        await expect.poll(() => focusInside(page, '#data-info-popover')).toBe(true);
        await expect(page.locator('#data-info-status-link')).toHaveAttribute('href', '/status/');
        // Nicht modal: die Karte bleibt bedienbar
        expect(await isInert(page, '#map')).toBe(false);

        await page.keyboard.press('Escape');
        await expect(page.locator('#data-info-popover')).toBeHidden();
        await expect(btn).toBeFocused();
    });

    test('Mobil: Info & Recht aus dem Burger-Menü, Escape bringt den Fokus zum Burger-Button zurück', async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
        const page = await context.newPage();
        await gotoReady(page);
        await page.locator('#mobile-burger-btn').click();
        await page.locator('#mobile-open-legal').click();
        await expect(page.locator('#legal-modal')).toBeVisible();
        await expect.poll(() => focusInside(page, '#legal-modal')).toBe(true);

        await page.keyboard.press('Escape');
        await expect(page.locator('#legal-modal')).toBeHidden();
        await expect(page.locator('#mobile-burger-btn')).toBeFocused();
        await context.close();
    });

    test('Mobil: Tipp auf die Status-Box öffnet die Datenstand-Details mit Link zur Statusseite', async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
        const page = await context.newPage();
        await gotoReady(page);
        const box = page.locator('#status-box');
        const btn = page.locator('#data-info-btn');
        // Der Button liegt über der ganzen Box (Tipp-Fläche = Box), bleibt aber für Screenreader benannt
        const [b, t] = await Promise.all([box.boundingBox(), btn.boundingBox()]);
        expect(t.width).toBeGreaterThanOrEqual(b.width - 4);
        expect(t.height).toBeGreaterThanOrEqual(b.height - 4);
        await expect(btn).toHaveAccessibleName(/\S/);

        await box.tap();
        const popover = page.locator('#data-info-popover');
        await expect(popover).toBeVisible();
        await expect(btn).toHaveAttribute('aria-expanded', 'true');
        const link = page.locator('#data-info-status-link');
        await expect(link).toHaveAttribute('href', '/status/');
        await expect(link).toBeVisible();
        // Popover liegt komplett im Fenster und das Tippziel des Links ist mindestens 44 px hoch
        const pb = await popover.boundingBox();
        expect(pb.x).toBeGreaterThanOrEqual(0);
        expect(pb.x + pb.width).toBeLessThanOrEqual(375);
        expect(pb.y + pb.height).toBeLessThanOrEqual(812);
        expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);

        await page.keyboard.press('Escape');
        await expect(popover).toBeHidden();
        await expect(btn).toBeFocused();
        await box.tap();
        await expect(popover).toBeVisible();
        await box.tap();
        await expect(popover).toBeHidden();
        await context.close();
    });
});

test.describe('Live-Regionen', () => {
    test('Meldungen laufen über feste Regionen, der Toast ist stumm; Warnung landet in der status-Region', async ({ page }) => {
        await gotoReady(page);
        const toast = page.locator('#notification-box');
        await expect(toast).toHaveAttribute('aria-hidden', 'true');
        expect(await toast.getAttribute('role')).toBeNull();
        expect(await toast.getAttribute('aria-live')).toBeNull();

        // Rollen der Regionen sind fest
        await expect(page.locator('#notification-live-status')).toHaveAttribute('role', 'status');
        await expect(page.locator('#notification-live-alert')).toHaveAttribute('role', 'alert');

        // Suche ohne Treffer: Warnung (kein Fehler)
        await page.route('**/nominatim**', route => route.fulfill({ json: [] }));
        await page.locator('#search-input').fill('Zzzzzzqq');
        await page.locator('#search-btn').click();
        await expect(page.locator('#notification-live-status')).not.toHaveText('');
        await expect(page.locator('#notification-live-alert')).toHaveText('');
        await expect(toast).toHaveAttribute('data-type', 'warning');
    });

    test('Fehlermeldung landet in der alert-Region und lässt die status-Region leer', async ({ page }) => {
        await gotoReady(page);
        // Geolocation-Fehler erzeugen: API liefert sofort PERMISSION_DENIED
        await page.evaluate(() => {
            navigator.geolocation.getCurrentPosition = (ok, fail) => fail({ code: 1, message: 'denied' });
            navigator.geolocation.watchPosition = (ok, fail) => { fail({ code: 1, message: 'denied' }); return 0; };
        });
        await page.locator('#locate-btn').click();
        await expect(page.locator('#notification-live-alert')).not.toHaveText('');
        await expect(page.locator('#notification-live-status')).toHaveText('');
        await expect(page.locator('#notification-box')).toHaveAttribute('data-type', 'error');
        expect(await page.locator('#notification-box').getAttribute('role')).toBeNull();
    });

    test('Die Datenstand-Box ist keine Live-Region und sagt Kartenereignisse nicht an', async ({ page }) => {
        await gotoReady(page);
        const live = await page.evaluate(() => {
            const out = [];
            for (let el = document.getElementById('status-box'); el; el = el.parentElement) {
                const role = el.getAttribute('role');
                const l = el.getAttribute('aria-live');
                if ((l && l !== 'off') || role === 'status' || role === 'alert' || role === 'log') out.push(el.id || el.tagName);
            }
            return [...out, ...[...document.querySelectorAll('#status-box [aria-live], #status-box [role="status"], #status-box [role="alert"]')].map(e => e.id)];
        });
        expect(live).toEqual([]);
    });
});
