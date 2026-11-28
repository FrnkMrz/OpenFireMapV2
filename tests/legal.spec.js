import { existsSync } from 'node:fs';
import { test, expect, webkit } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Impressum (/impressum/) und Datenschutzerklärung (/datenschutz/), 28.11.2026: statische Seiten ohne Skript und ohne
// fremde Server, erreichbar aus „Info & Recht“ der Karte (neuer Tab), aus Hilfe, Kartenzeichen und Ortsplan.

test.use({ locale: 'de-DE' });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
const PAGES = [
    { path: '/impressum/', h1: 'Impressum', en: 'Legal notice' },
    { path: '/datenschutz/', h1: 'Datenschutzerklärung', en: 'Privacy policy' },
];

/** Sammelt Anfragen an fremde Hosts und CSP-Meldungen der Konsole. */
function watch(page, origin) {
    const foreign = [];
    const csp = [];
    page.on('request', (request) => {
        const url = new URL(request.url());
        if (!['http:', 'https:', 'ws:'].includes(url.protocol)) return;
        if (url.origin !== origin && url.hostname !== 'localhost') foreign.push(url.href);
    });
    page.on('console', (message) => {
        if (/Content[- ]Security[- ]Policy/i.test(message.text())) csp.push(message.text());
    });
    return { foreign, csp };
}

async function horizontalOverflow(page) {
    return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

for (const legal of PAGES) {
    test(`${legal.path} lädt statisch, ohne fremde Hosts und CSP-Verstöße, ist barrierefrei und läuft bei 320 px nicht über`, async ({ page, baseURL }) => {
        const seen = watch(page, new URL(baseURL).origin);
        await page.setViewportSize({ width: 320, height: 720 });
        const response = await page.goto(legal.path);
        expect(response?.status()).toBe(200);

        // Kein Rückfall auf die Karten-App (index.html) und keine Skripte der Seite selbst
        await expect(page.locator('h1').first()).toHaveText(legal.h1);
        await expect(page.locator('#map')).toHaveCount(0);
        await expect(page.locator('#en h1')).toHaveText(legal.en);
        await expect(page.locator('#en')).toHaveAttribute('lang', 'en');
        await expect(page.getByText('info@openfiremap.org').first()).toBeVisible();
        await expect(page.getByText('Stand / As of:')).toBeVisible();
        expect(await page.locator('script:not([src*="/@vite/client"])').count()).toBe(0);

        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

        // Dunkler Modus: ebenfalls ohne axe-Verstöße (Kontraste)
        for (const colorScheme of ['light', 'dark']) {
            await page.emulateMedia({ colorScheme });
            const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
            expect(results.violations.map((v) => `${colorScheme}: ${v.id}`)).toEqual([]);
        }

        expect(seen.foreign).toEqual([]);
        expect(seen.csp).toEqual([]);
    });
}

test('Impressum und Datenschutz laufen auch in WebKit bei 320 px nicht über', async ({ baseURL }) => {
    test.skip(!existsSync(webkit.executablePath()), 'WebKit ist hier nicht installiert (CI lädt nur Chromium)');
    const browser = await webkit.launch();
    try {
        const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
        for (const legal of PAGES) {
            const response = await page.goto(new URL(legal.path, baseURL).href);
            expect(response?.status()).toBe(200);
            await expect(page.locator('h1').first()).toHaveText(legal.h1);
            expect(await horizontalOverflow(page), legal.path).toBeLessThanOrEqual(0);
        }
    } finally {
        await browser.close();
    }
});

test('Info & Recht verlinkt beide Seiten auf Deutsch, in anderen Sprachen die englische Fassung', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.leaflet-container');
    await page.locator('#btn-legal-trigger').click();
    const modal = page.locator('#legal-modal');
    await expect(modal.getByRole('link', { name: 'Impressum', exact: true })).toHaveAttribute('href', '/impressum/');
    await expect(modal.getByRole('link', { name: 'Datenschutzerklärung' })).toHaveAttribute('href', '/datenschutz/');
    for (const id of ['#legal-imprint-link', '#legal-privacy-link']) {
        await expect(modal.locator(id)).toHaveAttribute('target', '_blank');
        await expect(modal.locator(id)).toHaveAttribute('rel', /noopener/);
    }

    await page.evaluate(() => localStorage.setItem('ofm_lang', 'pl'));
    await page.reload();
    await page.waitForSelector('.leaflet-container');
    await page.locator('#btn-legal-trigger').click();
    await expect(modal.getByRole('link', { name: 'Nota prawna' })).toHaveAttribute('href', '/impressum/#en');
    await expect(modal.getByRole('link', { name: 'Polityka prywatności' })).toHaveAttribute('href', '/datenschutz/#en');
});

test('Datenschutz aus der Karte öffnet einen neuen Tab, die Karte bleibt mit Auswahl und Dialog stehen', async ({ page, context }) => {
    await page.goto('/#16/49.55/11.36/voyager');
    await page.waitForSelector('.leaflet-container');
    await expect.poll(() => page.url()).toContain('49.55000'); // Permalink auf 5 Stellen normalisiert
    const startUrl = page.url();

    // Laufender Zustand: Export-Auswahl aus dem sichtbaren Ausschnitt (nur im Speicher)
    await page.locator('#export-btn-trigger').click();
    await page.locator('#select-view-btn').click();
    const bounds = () => page.evaluate(() => window.State.selection.finalBounds?.toBBoxString() ?? null);
    await expect.poll(bounds).not.toBeNull();
    const before = await bounds();
    // Export-Menü schließen (es sperrt den Rest per inert); die Auswahl bleibt bestehen
    await page.keyboard.press('Escape');
    await expect(page.locator('#export-menu')).toBeHidden();

    await page.locator('#btn-legal-trigger').click();
    const [legalPage] = await Promise.all([
        context.waitForEvent('page'),
        page.locator('#legal-privacy-link').click(),
    ]);
    await legalPage.waitForLoadState();
    await expect(legalPage.locator('h1').first()).toHaveText('Datenschutzerklärung');

    expect(page.url()).toBe(startUrl);
    await expect(page.locator('#legal-modal')).toBeVisible();
    expect(await bounds()).toBe(before);
});

test('Hilfe und Kartenzeichen verlinken Impressum und Datenschutz je nach Sprache', async ({ page }) => {
    await page.goto('/help/');
    await expect(page.locator('footer a[href="/impressum/"]')).toHaveCount(1);
    await expect(page.locator('footer a[href="/datenschutz/"]')).toHaveCount(1);
    await page.goto('/help/en/');
    await expect(page.locator('footer a[href="/impressum/#en"]')).toHaveCount(1);
    await expect(page.locator('footer a[href="/datenschutz/#en"]')).toHaveCount(1);

    await page.goto('/symbols/');
    await expect(page.locator('footer a[data-legal-href="/datenschutz/"]')).toHaveAttribute('href', /^\/datenschutz\/(#en)?$/);
    await page.locator('footer a[data-legal-href="/datenschutz/"]').click();
    await expect(page.locator('h1').first()).toHaveText('Datenschutzerklärung');
});
