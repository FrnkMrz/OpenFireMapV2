import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Barrierefreiheits-Tests (WCAG 2.2 A/AA) mit axe-core plus gezielte Tastatur-/Bewegungs-Prüfungen.

// 'wcag22a' hat in axe-core derzeit keine Regeln (alle neuen 2.2-Regeln sind AA), bleibt aber drin,
// damit künftige Level-A-Regeln von 2.2 automatisch mitlaufen.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

// Bekannte, noch offene Funde (Phase 2/3 des Barrierefreiheits-Plans).
// Jede Regel hier ist Schuld, die abgebaut wird – nicht erweitern, sondern Einträge entfernen.
const KNOWN_OPEN_RULES = [
    'color-contrast' // Phase 3: Kontrast der Panels auf wechselnden Kartenebenen messen und anpassen
];

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

function axe(page, extraOpenRules = []) {
    return new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .disableRules([...KNOWN_OPEN_RULES, ...extraOpenRules]);
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
        // Phase 2 (Punkt 7): role="menu" ohne passende Kinder/Pfeiltasten wird noch ersetzt
        const { violations } = await axe(page, ['aria-required-children']).analyze();
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
        // Phase 2 (Punkt 7): auch das mobile Menü nutzt role="menu" ohne passende Kinder
        const { violations } = await axe(page, ['aria-required-children']).analyze();
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
