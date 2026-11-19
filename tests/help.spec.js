import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Hilfe-Bereich: Barrierefreiheit, Darstellung auf schmalen Bildschirmen und die kleinen
// Bedienelemente (Tabs, Erklärer, Themenmenü). Die Seiten laden nichts von fremden Servern.

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
const SLUGS = ['map', 'phone', 'layers', 'data', 'export', 'town-plan', 'contribute', 'accessibility', 'faq'];
const HELP_DEFAULT_LANG = 'de';
const HELP_LANGS = readdirSync(resolve(process.cwd(), 'help', 'text'))
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''));
const helpUrl = (lang, page = 'index') => {
    const base = lang === HELP_DEFAULT_LANG ? '/help/' : `/help/${lang}/`;
    return page === 'index' ? base : `${base}${page}/`;
};
const PAGES = HELP_LANGS.map((lang) => [lang, helpUrl(lang)]);
const ARTICLES = HELP_LANGS.flatMap((lang) => SLUGS.map((slug) => [lang, helpUrl(lang, slug)]));
const helpLangFor = (lang) => HELP_LANGS.includes(lang) ? lang : (lang === 'de' ? 'de' : 'en');
const htmlLangFor = (lang) => ({ fl: 'nl-BE', tw: 'zh-Hant' })[lang] || lang;

async function open(page, path) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(path);
    await page.waitForFunction(() => !document.querySelector('.spot') || document.querySelectorAll('.spot.is-placed').length > 0);
    await page.evaluate(() => document.fonts.ready);
    return errors;
}

for (const [lang, path] of PAGES) {
    test.describe(`Hilfe ${lang}`, () => {
        test('ohne Fehler, mit eigenen Schriften', async ({ page }) => {
            const errors = await open(page, path);
            expect(errors).toEqual([]);
            expect(await page.evaluate(() => document.documentElement.lang)).toBe(htmlLangFor(lang));
            expect(await page.evaluate(() => document.fonts.check('700 40px "Barlow Condensed"'))).toBe(true);
            expect(await page.evaluate(() => document.fonts.check('400 16px "Barlow"'))).toBe(true);
        });

        test('axe: keine WCAG-Verstöße (Desktop)', async ({ page }) => {
            await open(page, path);
            const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
            expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
        });

        test('axe: keine WCAG-Verstöße (Smartphone, Tab Smartphone offen)', async ({ page }) => {
            await page.setViewportSize({ width: 390, height: 844 });
            await open(page, path);
            await page.click('#tab-phone');
            const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
            expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
        });
    });
}

test('kein seitliches Scrollen bis 320 px', async ({ page }) => {
    for (const width of [320, 390, 768, 1024]) {
        await page.setViewportSize({ width, height: 800 });
        await open(page, '/help/');
        const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        expect(scroll, `Breite ${width}`).toBeLessThanOrEqual(inner);
    }
});

test('Tabs Computer/Smartphone per Klick und Pfeiltasten', async ({ page }) => {
    await open(page, '/help/');
    await expect(page.locator('#panel-desktop')).toBeVisible();
    await expect(page.locator('#panel-phone')).toBeHidden();

    await page.focus('#tab-desktop');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#tab-phone')).toBeFocused();
    await expect(page.locator('#tab-phone')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-phone')).toBeVisible();
    await expect(page.locator('#panel-desktop')).toBeHidden();

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#panel-desktop')).toBeVisible();
});

test('Erklärer: Eintrag und Nummer im Bild sind gekoppelt', async ({ page }) => {
    await open(page, '/help/');
    const panel = page.locator('#panel-desktop');
    const items = panel.locator('.legend button');
    const spots = panel.locator('.spot');
    await expect(spots).toHaveCount(await items.count());
    await expect(items.nth(0)).toHaveAttribute('aria-pressed', 'true');

    await items.nth(3).click();
    await expect(items.nth(3)).toHaveAttribute('aria-pressed', 'true');
    await expect(items.nth(0)).toHaveAttribute('aria-pressed', 'false');
    await expect(spots.nth(3)).toHaveClass(/active/);

    // Jede Nummer liegt im Bild
    const img = await panel.locator('img').boundingBox();
    for (let i = 0; i < await spots.count(); i++) {
        const b = await spots.nth(i).boundingBox();
        const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        expect(cx).toBeGreaterThanOrEqual(img.x);
        expect(cx).toBeLessThanOrEqual(img.x + img.width);
        expect(cy).toBeGreaterThanOrEqual(img.y);
        expect(cy).toBeLessThanOrEqual(img.y + img.height);
    }
});

test('Themenmenü auf schmalen Bildschirmen, Escape schließt', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/help/');
    const btn = page.locator('#menu-btn');
    await expect(page.locator('#nav')).toBeHidden();
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#nav')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(btn).toBeFocused();
});

test('Sprachwechsel führt zur Gegenseite', async ({ page }) => {
    await open(page, '/help/');
    await page.locator('.lang-picker summary').click();
    await page.click('.lang-picker a[lang="en"]');
    await expect(page).toHaveURL(/\/help\/en\/$/);
    await expect(page.locator('h1')).toContainText('Find fire water');
});

test('Karte: „Info & Recht“ verlinkt die Hilfe in der passenden Sprache', async ({ page }) => {
    await page.goto('/?lang=de');
    await expect(page.locator('[data-help-link]')).toHaveAttribute('href', '/help/');
    await page.goto('/?lang=fr');
    await expect(page.locator('[data-help-link]')).toHaveAttribute('href', helpUrl(helpLangFor('fr')));
});

for (const [lang, path] of ARTICLES) {
    test(`Anleitung ${path}: ohne Fehler, axe ohne Befund, kein seitliches Scrollen`, async ({ page }) => {
        const errors = await open(page, path);
        expect(errors).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.lang)).toBe(htmlLangFor(lang));
        // Alle Bilder vorhanden (lazy: einzeln anfordern) und alle Nummern im Bild platziert
        for (const src of await page.evaluate(() => [...new Set([...document.images].map((i) => i.getAttribute('src')))])) {
            expect((await page.request.get(src)).status(), src).toBe(200);
        }
        expect(await page.locator('.spot:not(.is-placed)').count()).toBe(0);
        const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
        await page.setViewportSize({ width: 320, height: 800 });
        const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        expect(scroll).toBeLessThanOrEqual(inner);
    });
}

test('Anleitung: Inhaltsverzeichnis führt zum Abschnitt, Kopfzeile markiert die Seite', async ({ page }) => {
    await open(page, '/help/export/');
    await expect(page.locator('.nav a[aria-current="page"]')).toHaveAttribute('href', '/help/export/');
    await page.click('.toc a[href="#grenzen"]');
    await expect(page).toHaveURL(/#grenzen$/);
    await expect(page.locator('#grenzen')).toBeInViewport();
    await page.click('.pager-link.next');
    await expect(page).toHaveURL(/\/help\/town-plan\/$/);
});

for (const lang of ['de', 'en', 'fr']) {
    test(`Kartenzeichen (${lang}): Hilfe-Stil, Karten mit Tags, axe ohne Befund, kein seitliches Scrollen`, async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        await page.goto(`/symbols/?lang=${lang}`);
        await expect(page.locator('#hydrant-symbols .sym-card')).toHaveCount(6);
        await expect(page.locator('#water-symbols .sym-card')).toHaveCount(6);
        await expect(page.locator('#other-symbols .sym-card')).toHaveCount(2);
        await expect(page.locator('.sym-card h3').first()).not.toBeEmpty();
        await expect(page.locator('[data-help-link]').first()).toHaveAttribute('href', helpUrl(helpLangFor(lang)));
        expect(await page.evaluate(() => document.fonts.check('700 40px "Barlow Condensed"'))).toBe(true);
        expect(errors).toEqual([]);
        const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
        await page.setViewportSize({ width: 320, height: 800 });
        const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        expect(scroll).toBeLessThanOrEqual(inner);
    });
}
