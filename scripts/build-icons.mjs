// Erzeugt App-Icon und Favicons von OpenFireMap aus einer SVG-Quelle.
//
// Motiv: roter Hydrant auf heller Stadtplan-Kachel mit rotem, abgerundetem Rahmen.
// Die Geometrie steht hier im Skript, damit alle Varianten (groß, klein, Apple,
// maskable) aus denselben Formen entstehen. Gerastert wird mit Chromium aus
// Playwright (schon Entwicklungsabhängigkeit), keine weiteren Pakete.
//
// Aufruf: npm run icons   (schreibt nach public/favicons/)

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'favicons');

// Farben (flach, keine Verläufe)
const C = {
    frame: '#C8102E',     // Rahmen
    tile: '#F3F1EA',      // Kartengrund
    park: '#CFE6C1',      // Grünfläche
    water: '#BFDDF2',     // Wasser
    block: '#EFE2B8',     // Häuserblöcke
    street: '#FFFFFF',    // Nebenstraßen
    streetEdge: '#D0C9B9',
    road: '#F4CF5D',      // Hauptstraße
    hydrant: '#E2231A',   // Hydrant
    hydrantDark: '#A3141B',
    outline: '#FFFFFF',   // Freisteller um den Hydranten
};

// Hydrant in 512er-Koordinaten, Mitte x = 256
function hydrant({ detail = true } = {}) {
    const body = `
        <rect x="241" y="104" width="30" height="24" rx="6"/>
        <path d="M206 182 C206 146 228 124 256 124 C284 124 306 146 306 182 Z"/>
        <rect x="186" y="176" width="140" height="30" rx="10"/>
        <rect x="206" y="200" width="100" height="152"/>
        <rect x="160" y="236" width="56" height="48" rx="10"/>
        <rect x="296" y="236" width="56" height="48" rx="10"/>
        <rect x="190" y="346" width="132" height="34" rx="10"/>`;
    // Freisteller: dieselben Formen, breit weiß umrandet, dahinter
    const outline = `<g fill="${C.outline}" stroke="${C.outline}" stroke-width="${detail ? 22 : 34}" stroke-linejoin="round">${body}</g>`;
    const fill = `<g fill="${C.hydrant}">${body}</g>`;
    // Rechte Hälfte etwas dunkler: flacher Schatten statt Verlauf
    const shade = `<g fill="${C.hydrantDark}" opacity="0.16" clip-path="url(#right-half)">${body}</g>`;
    const details = detail ? `
        <g fill="${C.hydrantDark}">
            <rect x="186" y="198" width="140" height="8" rx="3"/>
            <rect x="190" y="344" width="132" height="8" rx="3"/>
            <rect x="160" y="236" width="10" height="48" rx="4"/>
            <rect x="342" y="236" width="10" height="48" rx="4"/>
        </g>
        <circle cx="256" cy="260" r="28" fill="${C.hydrantDark}"/>
        <circle cx="256" cy="260" r="13" fill="${C.hydrant}"/>` : `
        <circle cx="256" cy="260" r="24" fill="${C.hydrantDark}"/>`;
    return `${outline}${fill}${shade}${details}`;
}

// Stadtplan-Kachel, reduziert: Park, Wasser, Blöcke, wenige Straßen, eine Hauptstraße
function mapDetail({ detail = true } = {}) {
    if (!detail) {
        // Kleine Größen: nur Park und Hauptstraße, alles Feinere verschwimmt ohnehin
        return `
        <path d="M0 0 H230 C210 90 140 150 0 170 Z" fill="${C.park}"/>
        <path d="M300 512 L512 250" stroke="${C.road}" stroke-width="44" fill="none"/>`;
    }
    const blocks = [
        [330, 70, 60, 46], [400, 120, 56, 50], [350, 150, 44, 40],
        [60, 330, 70, 50], [70, 400, 50, 56], [140, 420, 60, 40],
        [380, 380, 64, 52], [420, 300, 50, 44],
    ].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`).join('');
    const streets = [
        'M0 300 L512 230', 'M150 0 L250 512', 'M0 440 L512 400', 'M330 0 L470 512', 'M0 120 L512 40',
    ];
    const streetPaths = (w, color) => streets.map(d => `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none"/>`).join('');
    return `
        <path d="M0 0 H250 C232 96 160 170 0 196 Z" fill="${C.park}"/>
        <path d="M512 470 C470 440 440 470 420 512 H512 Z" fill="${C.water}"/>
        <g fill="${C.block}">${blocks}</g>
        ${streetPaths(24, C.streetEdge)}
        ${streetPaths(16, C.street)}
        <path d="M280 512 L512 210" stroke="#E2B53E" stroke-width="40" fill="none"/>
        <path d="M280 512 L512 210" stroke="${C.road}" stroke-width="32" fill="none"/>`;
}

/**
 * Baut ein Icon-SVG (512er viewBox).
 * variant: 'full' (ab 48 px), 'small' (Favicons ≤ 36 px), 'apple' (vollflächig,
 * iOS rundet selbst), 'maskable' (Android, Inhalt im Sicherheitskreis r = 40 %).
 */
export function iconSvg(variant = 'full') {
    const small = variant === 'small';
    const detail = !small;
    const defs = `<defs>
        <clipPath id="right-half"><rect x="256" y="0" width="256" height="512"/></clipPath>
        <clipPath id="tile"><rect id="tile-shape" x="${small ? 52 : 40}" y="${small ? 52 : 40}" width="${small ? 408 : 432}" height="${small ? 408 : 432}" rx="${small ? 64 : 76}"/></clipPath>
    </defs>`;

    let frame;
    let tileClip = 'url(#tile)';
    let tileRect = small ? 'x="52" y="52" width="408" height="408" rx="64"' : 'x="40" y="40" width="432" height="432" rx="76"';
    let hydrantTransform = small ? 'translate(256 252) scale(1.32) translate(-256 -242)' : 'translate(0 12)';
    if (variant === 'apple') {
        frame = `<rect width="512" height="512" fill="${C.frame}"/>`;
    } else if (variant === 'maskable') {
        // Rahmen füllt alles, die Kachel bleibt im Sicherheitskreis
        frame = `<rect width="512" height="512" fill="${C.frame}"/>`;
        tileRect = 'x="96" y="96" width="320" height="320" rx="64"';
        hydrantTransform = 'translate(256 256) scale(0.86) translate(-256 -242)';
    } else {
        frame = `<rect width="512" height="512" rx="112" fill="${C.frame}"/>`;
    }
    const clipDef = variant === 'maskable'
        ? `<clipPath id="tile-m"><rect ${tileRect}/></clipPath>`
        : '';
    if (variant === 'maskable') tileClip = 'url(#tile-m)';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <title>OpenFireMap</title>
    ${defs.replace('</defs>', `${clipDef}</defs>`)}
    ${frame}
    <rect ${tileRect} fill="${C.tile}"/>
    <g clip-path="${tileClip}">${variant === 'maskable' ? `<g transform="translate(96 96) scale(0.625)">${mapDetail({ detail })}</g>` : mapDetail({ detail })}</g>
    <g${hydrantTransform ? ` transform="${hydrantTransform}"` : ''}>${hydrant({ detail })}</g>
</svg>
`;
}

// Zielgrößen: gleiche Dateinamen wie bisher
const TARGETS = [
    ...[36, 48, 72, 96, 144, 192, 512].map(s => [`android-icon-${s}x${s}.png`, s, s <= 36 ? 'small' : 'full']),
    ...[57, 60, 72, 76, 114, 120, 144, 152, 180].map(s => [`apple-icon-${s}x${s}.png`, s, 'apple']),
    ['apple-icon.png', 640, 'apple'],
    ['apple-icon-precomposed.png', 640, 'apple'],
    ...[70, 144, 150, 310].map(s => [`ms-icon-${s}x${s}.png`, s, 'full']),
    ['favicon-16x16.png', 16, 'small'],
    ['favicon-32x32.png', 32, 'small'],
    ['favicon-96x96.png', 96, 'full'],
    ['android-icon-maskable-192x192.png', 192, 'maskable'],
    ['android-icon-maskable-512x512.png', 512, 'maskable'],
];

export async function renderPng(page, svg, size) {
    await page.setViewportSize({ width: size, height: size });
    const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="${src}">`);
    await page.locator('img').evaluate(img => img.decode());
    return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

async function main() {
    await mkdir(outDir, { recursive: true });
    // SVG-Favicon für Browser-Tabs: die vereinfachte Variante (klein gut lesbar)
    await writeFile(path.join(outDir, 'favicon.svg'), iconSvg('small'));
    await writeFile(path.join(outDir, 'icon.svg'), iconSvg('full'));
    await writeFile(path.join(outDir, 'icon-maskable.svg'), iconSvg('maskable'));

    const browser = await chromium.launch();
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    const svgs = { full: iconSvg('full'), small: iconSvg('small'), apple: iconSvg('apple'), maskable: iconSvg('maskable') };
    for (const [name, size, variant] of TARGETS) {
        const png = await renderPng(page, svgs[variant], size);
        await writeFile(path.join(outDir, name), png);
        console.log(`${name} (${size} px, ${variant})`);
    }
    await browser.close();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(err => { console.error(err); process.exit(1); });
}
