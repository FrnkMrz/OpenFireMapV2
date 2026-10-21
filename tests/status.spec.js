import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Pipeline-Statusseite (/status/): Die Pipeline-Dateien werden abgefangen, damit der Test weder vom Netz
// noch vom aktuellen Datenstand abhängt.

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
const CORS = { 'access-control-allow-origin': '*' };

const region = (id, name, hydrants, fire, over = {}) => ({
    id, name, bounds: [0, 0, 1, 1], file: `eu/${id}-20261018T010000Z.pmtiles`, minzoom: 0, maxzoom: 14, size_bytes: 2_500_000,
    generated_at: '2026-10-18T01:00:00.123+00:00', osm_data_until: '2026-10-17T20:00:00Z',
    counts: { hydrants, fire_stations: fire, water_points: 2, defibrillators: 3, boundaries: 50 }, ...over
});
const MANIFEST = {
    version: 1,
    updated_at: '2026-10-20T01:08:45Z',
    regions: {
        poland: region('poland', 'Polen', 403193, 15461),
        france: region('france', 'Frankreich', 243903, 8057),
        italy: region('italy', 'Italien', 49180, 1701),
        hungary: region('hungary', 'Ungarn', 33346, 408),
        spain: region('spain', 'Spanien', 19944, 1114),
        malta: region('malta', 'Malta', 61, 16, { generated_at: '2026-10-19T01:00:00+00:00' })
    }
};
const extract = (name) => ({ name, size_mb: 100, mtime: '2026-10-19T00:30:00+00:00', osm_data_timestamp: '2026-10-18T20:25:06Z' });
const METADATA = {
    generated_at: '2026-10-19T05:59:26.477688+00:00',
    osm_data_until: '2026-10-18T20:25:06Z',
    extracts: {
        germany: extract('Deutschland'), austria: extract('Österreich'), switzerland: extract('Schweiz'),
        luxembourg: extract('Luxemburg'), liechtenstein: extract('Liechtenstein')
    },
    pmtiles: { file: 'openfiremap.pmtiles', size_mb: 182.5, minzoom: 12, maxzoom: 14, duration_sec: 156 },
    timings: { download_sec: 247, extraction_sec: 603, total_sec: 850 },
    features: {
        hydrants: { count: 1022616 }, fire_stations: { count: 42037 }, water_points: { count: 25548 },
        defibrillators: { count: 40815 }, boundaries: { count: 96998 }
    }
};

async function mockPipeline(page, { manifest = MANIFEST, metadata = METADATA, manifestStatus = 200 } = {}) {
    await page.route('https://pipeline.openfiremap.org/**', (route) => {
        const url = route.request().url();
        if (url.endsWith('/eu/regions.json')) {
            return manifestStatus === 200
                ? route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(manifest) })
                : route.fulfill({ status: manifestStatus, headers: CORS, body: 'x' });
        }
        if (url.endsWith('/metadata.json')) {
            return metadata
                ? route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(metadata) })
                : route.fulfill({ status: 503, headers: CORS, body: 'x' });
        }
        return route.abort();
    });
}

async function open(page, query = '?lang=de') {
    await page.goto(`/status/${query}`);
    await page.waitForSelector('#st-content:not([hidden])');
}

test.describe('Pipeline-Statusseite', () => {
    test('zeigt Kennzahlen, Diagramme und Tabellen auf Deutsch', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        await expect(page.locator('html')).toHaveAttribute('lang', 'de');
        await expect(page.locator('h1')).toHaveText('OpenFireMap Pipeline');
        await expect(page.locator('#st-kpis')).toContainText('Länder und Gebiete');
        await expect(page.locator('#st-timeline svg')).toBeVisible();
        await expect(page.locator('#st-density svg')).toBeVisible();
        await expect(page.locator('#st-table tbody tr')).toHaveCount(11);
    });

    test('sagt, wie oft aktualisiert wird und wann der letzte Lauf war', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        const card = page.locator('#st-cadence');
        await expect(card).toContainText('Täglich geprüft');
        await expect(card).toContainText('Einmal pro Woche');
        await expect(card).toContainText('Deutschland, Österreich, Schweiz, Luxemburg, Liechtenstein');
        const dach = card.locator('article').first();
        const eu = card.locator('article').nth(1);
        await expect(dach).toContainText('19.10.2026 05:59');                 // Upload des gemeinsamen Builds
        await expect(eu).toContainText('19.10.2026 01:00');                   // neueste Länder-Datei (Malta)
        await expect(eu).toContainText('18.10.2026 01:00');                   // älteste Länder-Datei
        await page.click('.st-lang button[data-lang="en"]');
        await expect(card).toContainText('Checked daily');
        await expect(card).toContainText('Once a week');
        await expect(dach).toContainText('Oct 19, 2026 05:59');
    });

    test('ohne metadata.json zeigt der Rhythmus für DACHLiLu keinen Zeitpunkt, bricht aber nicht', async ({ page }) => {
        await mockPipeline(page, { metadata: null });
        await open(page);
        await expect(page.locator('#st-cadence article').first()).toContainText('—');
        await expect(page.locator('#st-cadence article').nth(1)).toContainText('19.10.2026 01:00');
    });

    test('wertet nur je Land aus, ohne DACH-, LuLi- oder DACHLiLu-Summen', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        const body = await page.locator('#st-content').innerText();
        expect(body).not.toMatch(/\bLuLi\b/);
        expect(body).not.toMatch(/Top 5/);
        await expect(page.locator('#st-table tbody tr[data-key="dachlilu"], #st-runs tbody tr[data-key="dachlilu"]')).toHaveCount(0);
        await expect(page.locator('#st-table thead th')).toHaveCount(13);
    });

    test('Wachen stehen auch für die DACHLiLu-Länder in der Tabelle', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        for (const id of ['germany', 'austria', 'switzerland', 'luxembourg', 'liechtenstein']) {
            const cell = page.locator(`#st-table tbody tr[data-key="${id}"] td`).nth(2);
            await expect(cell).not.toHaveText('—');
        }
    });

    test('Umschalten auf Englisch ändert Texte, Ländernamen und Zahlenformat', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        await page.click('.st-lang button[data-lang="en"]');
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        await expect(page.locator('#st-kpis')).toContainText('Countries and regions');
        await expect(page.locator('#st-table tbody tr[data-key="germany"] td').first()).toHaveText('Germany');
        await expect(page.locator('#st-table tbody tr[data-key="poland"] td').nth(1)).toHaveText('403,193');
        await page.click('.st-lang button[data-lang="de"]');
        await expect(page.locator('#st-table tbody tr[data-key="poland"] td').nth(1)).toHaveText('403.193');
    });

    test('die Sprachwahl der Statusseite verstellt nicht die Sprache der Karte', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        await page.click('.st-lang button[data-lang="en"]');
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        // Die Karte hat keinen Sprachschalter: ein hier gespeichertes Englisch würde sie sonst festhalten
        expect(await page.evaluate(() => localStorage.getItem('ofm_lang'))).toBeNull();
        expect(await page.evaluate(() => localStorage.getItem('ofm_status_lang'))).toBe('en');
    });

    test('eine früher unter ofm_lang gespeicherte Sprachwahl wird übernommen und von der Karte entfernt', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        await page.evaluate(() => { localStorage.removeItem('ofm_status_lang'); localStorage.setItem('ofm_lang', 'de'); });
        // Der Testbrowser meldet en-US: Deutsch kann nur aus der übernommenen Wahl kommen
        await open(page, '');
        await expect(page.locator('html')).toHaveAttribute('lang', 'de');
        expect(await page.evaluate(() => localStorage.getItem('ofm_lang'))).toBeNull();
        expect(await page.evaluate(() => localStorage.getItem('ofm_status_lang'))).toBe('de');
    });

    test('Diagramm wechselt zwischen Hydranten, Wachen und Defibrillatoren je Einwohner', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        const svg = page.locator('#st-density svg');
        await expect(svg).toHaveAttribute('aria-label', /Hydranten je 1\.000/);
        await page.click('.st-seg button[data-metric="fireStations"]');
        await expect(page.locator('.st-seg button[data-metric="fireStations"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.st-seg button[data-metric="hydrants"]')).toHaveAttribute('aria-pressed', 'false');
        await expect(svg).toHaveAttribute('aria-label', /Wachen je 100\.000/);
        await expect(page.locator('#st-den-desc')).toContainText('Feuerwachen');
        await page.click('.st-seg button[data-metric="defibrillators"]');
        await expect(svg).toHaveAttribute('aria-label', /Defibrillatoren je 100\.000/);
        await page.click('.st-lang button[data-lang="en"]');
        await expect(svg).toHaveAttribute('aria-label', /Defibrillators per 100,000/);
        await expect(page.locator('#st-kpis')).toContainText('Stations per 100,000 inhabitants');
        await expect(page.locator('#st-kpis')).toContainText('Defibrillators per 100,000 inhabitants');
    });

    test('Tabelle sortiert nach Spalte und filtert per Suche', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        await page.click('#st-table th button[data-k="name"]');
        await expect(page.locator('#st-table th').first()).toHaveAttribute('aria-sort', 'ascending');
        await expect(page.locator('#st-table tbody tr').first()).toHaveAttribute('data-key', 'germany');
        await page.fill('#st-search', 'malta');
        await expect(page.locator('#st-table tbody tr')).toHaveCount(1);
    });

    test('Lauf-Tabelle je Gebiet nennt Datei, Zeiten und alle Ebenen', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        const rows = page.locator('#st-runs tbody tr');
        await expect(rows).toHaveCount(11);
        await expect(rows.first()).toHaveAttribute('data-key', 'germany');
        await expect(rows.first()).toContainText('openfiremap.pmtiles');
        await expect(page.locator('#st-runs tbody tr[data-key="poland"]')).toContainText('eu/poland-20261018T010000Z.pmtiles');
    });

    test('ohne metadata.json bleibt die Seite nutzbar und warnt', async ({ page }) => {
        await mockPipeline(page, { metadata: null });
        await open(page);
        await expect(page.locator('#st-warn')).toBeVisible();
        await expect(page.locator('#st-run-card')).toBeHidden();
        await expect(page.locator('#st-table tbody tr')).toHaveCount(6);
    });

    test('warnt bei leerem metadata.json statt die fünf Länder still wegzulassen', async ({ page }) => {
        await mockPipeline(page, { metadata: {} });
        await open(page);
        await expect(page.locator('#st-warn')).toBeVisible();
        await expect(page.locator('#st-run-card')).toBeHidden();
        await expect(page.locator('#st-table tbody tr')).toHaveCount(6);
    });

    test('warnt, wenn metadata.json einzelne DACHLiLu-Länder nicht enthält', async ({ page }) => {
        const metadata = JSON.parse(JSON.stringify(METADATA));
        delete metadata.extracts.austria;
        await mockPipeline(page, { metadata });
        await open(page);
        await expect(page.locator('#st-warn')).toContainText('DACHLiLu');
        await expect(page.locator('#st-table tbody tr[data-key="austria"]')).toHaveCount(0);
    });

    test('Summen nennen, wie viele Länder ohne Zählung fehlen', async ({ page }) => {
        const manifest = JSON.parse(JSON.stringify(MANIFEST));
        manifest.regions.malta.counts = { fire_stations: 16 };
        await mockPipeline(page, { manifest });
        await open(page);
        await expect(page.locator('#st-kpis')).toContainText('ohne 1 Länder ohne Angabe');
        await page.click('.st-lang button[data-lang="en"]');
        await expect(page.locator('#st-kpis')).toContainText('excluding 1 without data');
    });

    test('zeigt bei fehlendem Manifest eine Fehlermeldung mit Wiederholen', async ({ page }) => {
        await mockPipeline(page, { manifestStatus: 500 });
        await page.goto('/status/?lang=en');
        await expect(page.locator('#st-error')).toBeVisible();
        await expect(page.locator('#st-content')).toBeHidden();
        await page.unroute('https://pipeline.openfiremap.org/**');
        await mockPipeline(page);
        await page.click('#st-retry');
        await expect(page.locator('#st-content')).toBeVisible();
    });

    test('Sortieren per Tastatur behält den Fokus auf der Spaltenüberschrift', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        const button = page.locator('#st-table th button[data-k="hydrants"]');
        await button.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#st-table th').nth(1)).toHaveAttribute('aria-sort', 'ascending');
        await expect(page.locator('#st-table th button[data-k="hydrants"]')).toBeFocused();
        await page.keyboard.press('Space');
        await expect(page.locator('#st-table th').nth(1)).toHaveAttribute('aria-sort', 'descending');
        await expect(page.locator('#st-table th button[data-k="hydrants"]')).toBeFocused();
    });

    test('warnt, wenn eine spätere Aktualisierung scheitert, und nimmt die Warnung bei Erfolg zurück', async ({ page }) => {
        await page.clock.install();
        await mockPipeline(page);
        await open(page);
        await expect(page.locator('#st-warn')).toBeHidden();
        await page.unroute('https://pipeline.openfiremap.org/**');
        await mockPipeline(page, { manifestStatus: 500 });
        await page.clock.fastForward('10:30');
        await expect(page.locator('#st-warn')).toBeVisible();
        await expect(page.locator('#st-warn')).toContainText('Aktualisierung');
        await expect(page.locator('#st-table tbody tr')).toHaveCount(11);
        await page.unroute('https://pipeline.openfiremap.org/**');
        await mockPipeline(page);
        await page.clock.fastForward('10:30');
        await expect(page.locator('#st-warn')).toBeHidden();
    });

    test('die Karte verlinkt die Statusseite im Dialog "Info & Recht"', async ({ page }) => {
        const openLegal = async (lang) => {
            await page.evaluate((l) => localStorage.setItem('ofm_lang', l), lang);
            await page.reload();
            await page.waitForSelector('.leaflet-container');
            await page.evaluate(() => document.querySelector('#btn-legal-trigger').click());
            return page.locator('#legal-modal a[href="/status/"]');
        };
        await page.goto('/');
        await page.waitForSelector('.leaflet-container');
        await expect(await openLegal('de')).toHaveText('Pipeline-Status');
        const link = await openLegal('en');
        await expect(link).toBeVisible();
        await expect(link).toHaveText('Pipeline status');
        await Promise.all([page.waitForURL('**/status/**'), link.click()]);
        await expect(page.locator('h1')).toHaveText('OpenFireMap Pipeline');
    });

    test('hat keine axe-Verstöße (Deutsch und Englisch)', async ({ page }) => {
        await mockPipeline(page);
        await open(page);
        let { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(violations, JSON.stringify(violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(' | ')), null, 1)).toEqual([]);
        await page.click('.st-lang button[data-lang="en"]');
        ({ violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze());
        expect(violations, JSON.stringify(violations.map((v) => v.id), null, 1)).toEqual([]);
    });

    test('läuft auf dem Handy ohne waagerechtes Scrollen der Seite', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 800 });
        await mockPipeline(page);
        await open(page, '?lang=en');
        expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    });
});
