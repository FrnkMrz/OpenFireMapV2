import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Ortsplan-Seiten (/ortsplan/, /ortsplan/blatt/): Zugang und Hinweise. Der Assistent selbst braucht die Basiskarte (nicht im CI),
// geprüft werden daher Sperre für Smartphones, Hinweis ohne Basiskarte, noindex und Barrierefreiheit der Hinweisseite.

const PAGES = ['/ortsplan/', '/ortsplan/blatt/'];
const MANIFEST = '**/basemap/de.json';

test.use({ locale: 'de-DE' });

for (const path of PAGES) {
    test(`${path}: Smartphone bekommt einen Hinweis statt des Assistenten`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'de-DE' });
        const page = await ctx.newPage();
        await page.goto(path);
        const notice = page.locator('#ortsplan-notice');
        await expect(notice).toBeVisible();
        await expect(notice.locator('h1')).toHaveText('Bitte am Computer öffnen');
        await expect(page.locator('[data-ortsplan-app]:visible')).toHaveCount(0);
        await expect(notice.getByRole('link', { name: /Zur Karte/ })).toHaveAttribute('href', '/');
        await ctx.close();
    });
}

test('/ortsplan/: ohne veröffentlichte Basiskarte erscheint ein Hinweis', async ({ page }) => {
    await page.route(MANIFEST, (route) => route.fulfill({ status: 404, body: 'nicht da' }));
    await page.goto('/ortsplan/');
    const notice = page.locator('#ortsplan-notice');
    await expect(notice.locator('h1')).toHaveText('Basiskarte noch nicht verfügbar');
    await expect(page.locator('[data-ortsplan-app]:visible')).toHaveCount(0);
});

test('/ortsplan/: Hinweise erscheinen auf Englisch, wenn der Browser nicht Deutsch spricht', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'en-GB' });
    const page = await ctx.newPage();
    await page.route(MANIFEST, (route) => route.fulfill({ status: 404, body: '' }));
    await page.goto('/ortsplan/');
    await expect(page.locator('#ortsplan-notice h1')).toHaveText('Base map not available yet');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await ctx.close();
});

for (const path of PAGES) {
    test(`${path}: nicht indexierbar, mit eigener Content-Security-Policy`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
        const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain('https://pipeline.openfiremap.org');
        expect(csp).not.toMatch(/unsafe-eval|https:\/\/\*/);
    });
}

test('Hinweisseite ist barrierefrei (axe)', async ({ page }) => {
    await page.route(MANIFEST, (route) => route.fulfill({ status: 404, body: '' }));
    await page.goto('/ortsplan/');
    await expect(page.locator('#ortsplan-notice')).toBeVisible();
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});

test('Impressum und Datenschutz sind von den Ortsplan-Seiten erreichbar und nennen den Ortsplan', async ({ page }) => {
    await page.route(MANIFEST, (route) => route.fulfill({ status: 404, body: '' }));
    await page.goto('/ortsplan/');
    await page.getByRole('link', { name: 'Impressum und Datenschutz' }).click();
    await expect(page).toHaveURL(/legal=1/);
    const modal = page.locator('#legal-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('section[lang="de"]').filter({ hasText: 'localStorage' })).toContainText('Ortsplan');
});
