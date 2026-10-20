import { test, expect } from '@playwright/test';
import { auditContrast } from './helpers/contrast.mjs';

// Kontraste der Panels über der Karte (WCAG 1.4.3 Text 4,5:1 bzw. 3:1 bei großer Schrift, 1.4.11 Symbole 3:1).
// axe wertet halbtransparente Flächen über Kartenkacheln nicht aus; darum rechnet tests/helpers/contrast.mjs selbst,
// mit der Karte als weißem bzw. schwarzem Untergrund (die beiden Extreme aller Kartenebenen).

const ELEMENTS = [
    { type: 'node', id: 101, lat: 40.7128, lon: -74.0060, tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'pillar', name: 'Testhydrant', operator: 'Stadt' } },
    { type: 'node', id: 301, lat: 40.7131, lon: -74.0050, tags: { amenity: 'fire_station', name: 'Testwache' } }
];

const BACKDROPS = ['#ffffff', '#000000'];

const format = (findings) => findings
    .map(f => `${f.kind} ${f.selector} "${f.text}" ${f.fg} auf ${f.bg} = ${f.ratio} (nötig ${f.required})`)
    .join('\n');

async function openMap(page, { lang = 'de' } = {}) {
    await page.route('**/api/interpreter', route => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ elements: ELEMENTS })
    }));
    await page.goto(`/?lang=${lang}#18/40.7129/-74.0055/voyager`);
    await page.waitForSelector('.leaflet-container');
    await page.waitForFunction(() => window.State && window.State.markerCache && window.State.markerCache.size >= 2);
}

// Prüft einen Zustand mit beiden Untergründen
async function expectContrast(page) {
    for (const backdrop of BACKDROPS) {
        const findings = await auditContrast(page, backdrop);
        expect(findings, `Untergrund ${backdrop}:\n${format(findings)}`).toEqual([]);
    }
}

// Hover-Zustände: jeder sichtbare Button/Link im Bereich muss auch unter der Maus lesbar sein
async function expectHoverContrast(page, scopeSelector) {
    // Gemessen werden die Endzustände: Farbübergänge beim Hover würden Zwischenfarben liefern und den Test unzuverlässig machen
    await page.addStyleTag({ content: 'button, a, select, button *, a * { transition: none !important; }' });
    const targets = await page.locator(`${scopeSelector} button:visible, ${scopeSelector} a:visible`).all();
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
        await target.evaluate(el => el.setAttribute('data-audit-target', '1'));
        await target.hover({ force: true });
        for (const backdrop of BACKDROPS) {
            const findings = await auditContrast(page, backdrop, { root: '[data-audit-target]' });
            expect(findings, `Hover, Untergrund ${backdrop}:\n${format(findings)}`).toEqual([]);
        }
        await target.evaluate(el => el.removeAttribute('data-audit-target'));
    }
}

test.describe('Kontraste', () => {
    test('Startansicht', async ({ page }) => {
        await openMap(page);
        await expectContrast(page);
        await expectHoverContrast(page, '#desktop-controls');
    });

    test('Ebenen-Menü', async ({ page }) => {
        await openMap(page);
        await page.locator('#layer-btn-trigger').click();
        await expectContrast(page);
        await expectHoverContrast(page, '#layer-menu');
    });

    test('Export-Menü', async ({ page }) => {
        await openMap(page);
        await page.locator('#export-btn-trigger').click();
        await expectContrast(page);
        await expectHoverContrast(page, '#export-menu');
    });

    test('Info & Recht', async ({ page }) => {
        await openMap(page);
        await page.locator('#btn-legal-trigger').click();
        await expectContrast(page);
        await expectHoverContrast(page, '#legal-modal');
    });

    test('Datenstand-Popover', async ({ page }) => {
        await openMap(page);
        await page.locator('#data-info-btn').click();
        await expectContrast(page);
        await expectHoverContrast(page, '#data-info-popover');
    });

    // Der Inhalt des Popovers und der Status-Box hängt vom Datenzustand ab (Farben je Zustand)
    const DATA_STATES = [
        { name: 'Pipeline, Live-Sync erfolgreich', ds: { loadPhase: 'ready', source: 'pipeline', deltaStatus: 'success', deltaCount: 3, baseTimestamp: '2026-10-08T20:20:21Z' } },
        { name: 'Pipeline, Live-Sync läuft', ds: { loadPhase: 'ready', source: 'pipeline', deltaStatus: 'loading', baseTimestamp: '2026-10-08T20:20:21Z' } },
        { name: 'Pipeline, Live-Sync fehlgeschlagen', ds: { loadPhase: 'ready', source: 'pipeline', deltaStatus: 'failed', baseTimestamp: '2026-10-08T20:20:21Z' } },
        { name: 'Pipeline, Live-Sync aus', ds: { loadPhase: 'ready', source: 'pipeline', deltaStatus: 'disabled', baseTimestamp: '2026-10-08T20:20:21Z' } },
        { name: 'Overpass', ds: { loadPhase: 'ready', source: 'overpass' } },
        { name: 'Cache', ds: { loadPhase: 'ready', source: 'cache', cacheTimestamp: Date.now() - 3600000 } },
        { name: 'Wartet', ds: { loadPhase: 'waiting' } },
        { name: 'Lädt', ds: { loadPhase: 'loading' } },
        { name: 'Bereit (Standby)', ds: { loadPhase: 'standby' } }
    ];

    for (const { name, ds } of DATA_STATES) {
        test(`Datenstand-Popover und Status-Box: ${name}`, async ({ page }) => {
            await openMap(page);
            await page.locator('#data-info-btn').click();
            await page.evaluate((state) => {
                Object.assign(window.State.dataStatus, state);
                window.dispatchEvent(new CustomEvent('ofm:langchange')); // rendert die Datenstand-Anzeige neu
            }, ds);
            await expectContrast(page);
        });
    }

    test('Export-Titel-Dialog', async ({ page }) => {
        await openMap(page);
        // Der Dialog öffnet sonst erst nach einem Export-Klick; hier reicht das Einblenden wie in ui.js
        await page.evaluate(() => document.getElementById('export-title-modal').classList.remove('hidden'));
        await expect(page.locator('#export-title-modal')).toBeVisible();
        await expectContrast(page);
        await expectHoverContrast(page, '#export-title-modal');
    });

    test('Marker-Details (Tooltip)', async ({ page }) => {
        await openMap(page);
        await page.locator('.leaflet-marker-icon[aria-label^="Hydrant"]').focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.leaflet-tooltip:not(.range-label)')).toBeVisible();
        await expectContrast(page);
    });

    // Meldungen über die echten Auslöser, damit Aufbau (Symbol + Text) und Farben je Typ wie im Betrieb sind
    const TOAST_TRIGGERS = {
        warning: async (page) => {
            await page.route('**/nominatim**', route => route.fulfill({ json: [] }));
            await page.locator('#search-input').fill('Zzzzzzqq');
            await page.locator('#search-btn').click();
        },
        error: async (page) => {
            await page.evaluate(() => {
                navigator.geolocation.getCurrentPosition = (ok, fail) => fail({ code: 1, message: 'denied' });
                navigator.geolocation.watchPosition = (ok, fail) => { fail({ code: 1, message: 'denied' }); return 0; };
            });
            await page.locator('#locate-btn').click();
        },
        success: async (page) => {
            await page.locator('#btn-legal-trigger').click();
            await page.locator('#cache-duration-select').selectOption('24');
        },
        info: async (page) => {
            await page.locator('#export-btn-trigger').click();
            await page.locator('#select-btn').click();
        }
    };

    for (const type of Object.keys(TOAST_TRIGGERS)) {
        test(`Meldung (${type})`, async ({ page }) => {
            await openMap(page);
            await TOAST_TRIGGERS[type](page);
            const box = page.locator('#notification-box');
            await expect(box).toHaveAttribute('data-type', type);
            await expect(box).toHaveCSS('opacity', '1'); // Einblend-Übergang abwarten
            await expect(box.locator('.notification-text')).not.toHaveText('');
            await expectContrast(page);
        });
    }

    test('Skip-Link bei Fokus', async ({ page }) => {
        await openMap(page);
        await page.keyboard.press('Tab');
        await expect(page.locator('#skip-to-map')).toBeFocused();
        await expectContrast(page);
    });

    test('Mobile Ansicht mit Burger-Menü', async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
        const page = await context.newPage();
        await openMap(page);
        await page.locator('#mobile-burger-btn').click();
        await expectContrast(page);
        await context.close();
    });

    test('Mobile Suche (Dialog mit Platzhalter)', async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
        const page = await context.newPage();
        await openMap(page);
        await page.locator('#mobile-burger-btn').click();
        await page.locator('#mobile-open-search').click();
        await expect(page.locator('#mobile-search-modal')).toBeVisible();
        await expect(page.locator('#mobile-search-input')).toHaveAttribute('placeholder', /.+/);
        await expectContrast(page);
        await expectHoverContrast(page, '#mobile-search-modal');
        await context.close();
    });

    for (const [name, opener, dialog] of [
        ['Info & Recht', '#mobile-open-legal', '#legal-modal'],
    ]) {
        test(`Mobil: ${name} aus dem Burger-Menü`, async ({ browser }) => {
            const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
            const page = await context.newPage();
            await openMap(page);
            await page.locator('#mobile-burger-btn').click();
            await page.locator(opener).click();
            await expect(page.locator(dialog)).toBeVisible();
            await expectContrast(page);
            await context.close();
        });
    }

    test('Untergrund der Karte wirkt auf Elemente in der Karte (Quellenangabe)', async ({ page }) => {
        await openMap(page);
        const attribution = '.leaflet-control-attribution';
        await expect(page.locator(attribution)).toBeVisible();
        // Weißer Untergrund liefert einen helleren Grund als schwarzer: die Messung muss davon abhängen
        const bgOf = async (backdrop) => {
            await page.evaluate(() => { document.querySelector('.leaflet-control-attribution a').style.color = '#cbd5e1'; });
            const f = await auditContrast(page, backdrop, { root: attribution });
            return f.find(x => x.selector === 'a')?.bg;
        };
        const onWhite = await bgOf('#ffffff');
        const onBlack = await bgOf('#000000');
        expect(onWhite).toBeTruthy();
        expect(onBlack).toBeTruthy();
        expect(onWhite).not.toBe(onBlack);
    });

    test('Der Messhelfer erfasst auch die sichtbare, für Screenreader stumme Meldung (Gegenprobe)', async ({ page }) => {
        await openMap(page);
        await TOAST_TRIGGERS.warning(page);
        await expect(page.locator('#notification-box')).toHaveCSS('opacity', '1');
        await expect(page.locator('#notification-box')).toHaveAttribute('aria-hidden', 'true');
        await page.evaluate(() => { document.querySelector('#notification-box .notification-text').style.color = '#64748b'; });
        const findings = await auditContrast(page, '#ffffff');
        expect(findings.some(f => f.selector.includes('notification-text'))).toBe(true);
    });

    test('Der Skip-Link wird nur gemessen, solange er fokussiert ist (Gegenprobe)', async ({ page }) => {
        await openMap(page);
        await page.evaluate(() => { document.getElementById('skip-to-map').style.color = '#64748b'; });
        expect((await auditContrast(page, '#ffffff')).some(f => f.text.includes('Karte'))).toBe(false);
        await page.keyboard.press('Tab');
        await expect(page.locator('#skip-to-map')).toBeFocused();
        expect((await auditContrast(page, '#ffffff')).some(f => f.text.includes('Karte'))).toBe(true);
    });

    test('Der Messhelfer erkennt zu schwache Kontraste (Gegenprobe)', async ({ page }) => {
        await openMap(page);
        await page.evaluate(() => {
            const el = document.getElementById('zoom-val');
            el.style.color = '#64748b';
        });
        const findings = await auditContrast(page, '#ffffff');
        expect(findings.some(f => f.selector === '#zoom-val')).toBe(true);
    });
});
