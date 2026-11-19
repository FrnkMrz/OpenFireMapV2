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

// Farben (flach, keine Verläufe; Licht und Schatten als feste Farbflächen)
const C = {
    frame: '#C8102E',     // Rahmen
    frameDark: '#9E0B22', // Außenkante des Rahmens
    tile: '#EEF0EA',      // Kartengrund
    park: '#CBE8BC',      // Grünfläche
    parkPath: '#F7FAF2',  // Wege im Park
    water: '#B9DCF2',     // Wasser
    building: '#F5E8B4',  // Gebäude
    buildingEdge: '#E4CE7C',
    street: '#FFFFFF',    // Nebenstraßen
    streetEdge: '#CFCFC7',
    road: '#F7D468',      // Hauptstraße
    roadEdge: '#DDB13C',
    hydrant: '#E3262B',   // Hydrant
    hydrantLight: '#FF6F61',
    hydrantShade: '#B71C22',
    hydrantDark: '#7E1016',
    outline: '#FFFFFF',   // Freisteller um den Hydranten
};

// Hydrant in 512er-Koordinaten, Mitte x = 256
function hydrant({ detail = true } = {}) {
    // Umriss aller Teile (für Freisteller, Schlagschatten und Grundfarbe)
    const body = `
        <rect x="240" y="96" width="32" height="22" rx="5"/>
        <rect x="228" y="112" width="56" height="14" rx="6"/>
        <path d="M200 188 C200 146 224 122 256 122 C288 122 312 146 312 188 Z"/>
        <rect x="182" y="180" width="148" height="28" rx="10"/>
        <path d="M210 204 H302 L298 344 H214 Z"/>
        <rect x="164" y="232" width="52" height="50" rx="8"/>
        <rect x="296" y="232" width="52" height="50" rx="8"/>
        <rect x="148" y="224" width="24" height="66" rx="7"/>
        <rect x="340" y="224" width="24" height="66" rx="7"/>
        <rect x="186" y="338" width="140" height="26" rx="8"/>
        <rect x="196" y="360" width="120" height="24" rx="7"/>`;
    const sw = detail ? 20 : 34;
    // Flacher Schlagschatten nach rechts unten, dann weißer Freisteller
    const drop = detail
        ? `<g transform="translate(7 9)" fill="#000" stroke="#000" stroke-width="${sw}" stroke-linejoin="round" opacity="0.14">${body}</g>`
        : '';
    const outline = `<g fill="${C.outline}" stroke="${C.outline}" stroke-width="${sw}" stroke-linejoin="round">${body}</g>`;
    const fill = `<g fill="${C.hydrant}">${body}</g>`;
    if (!detail) {
        return `${outline}${fill}
        <g fill="${C.hydrantShade}" clip-path="url(#right-half)">${body}</g>
        <circle cx="256" cy="262" r="26" fill="${C.hydrantDark}"/>`;
    }
    // Rechte Seite im Schatten, links ein Glanzstreifen
    const shade = `<g fill="${C.hydrantShade}" clip-path="url(#shade-side)">${body}</g>`;
    const light = `
        <g fill="${C.hydrantLight}">
            <path d="M216 186 C216 156 230 138 246 132 C236 146 232 164 232 186 Z"/>
            <path d="M220 212 H232 L230 336 H222 Z"/>
            <rect x="196" y="186" width="30" height="8" rx="4"/>
            <rect x="200" y="344" width="26" height="7" rx="3.5"/>
            <rect x="174" y="240" width="22" height="7" rx="3.5"/>
            <rect x="154" y="232" width="8" height="40" rx="4"/>
        </g>`;
    const dark = `
        <g fill="${C.hydrantDark}">
            <rect x="182" y="202" width="148" height="6" rx="3"/>
            <rect x="211" y="222" width="90" height="6" rx="3"/>
            <rect x="214" y="320" width="84" height="6" rx="3"/>
            <rect x="186" y="358" width="140" height="6" rx="3"/>
            <rect x="244" y="96" width="24" height="5" rx="2.5"/>
            <circle cx="160" cy="257" r="6"/>
            <circle cx="352" cy="257" r="6"/>
            <circle cx="206" cy="351" r="4"/><circle cx="236" cy="351" r="4"/>
            <circle cx="276" cy="351" r="4"/><circle cx="306" cy="351" r="4"/>
        </g>
        <circle cx="256" cy="268" r="36" fill="${C.hydrantDark}"/>
        <circle cx="256" cy="268" r="28" fill="${C.hydrant}"/>
        <path d="M256 240 A28 28 0 0 0 232 282 A28 28 0 0 1 256 248 Z" fill="${C.hydrantLight}"/>
        <path d="M245 262 L256 255 L267 262 L267 274 L256 281 L245 274 Z" fill="${C.hydrantDark}"/>`;
    return `${drop}${outline}${fill}${shade}${light}${dark}`;
}

// Kleiner deterministischer Zufall, damit die Karte bei jedem Lauf gleich ist
function rng(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

// Stadtplan-Kachel: schräges Straßenraster mit Gebäuden, Park mit Wegen, Teich,
// gelbe Hauptstraße. Koordinaten 0–512, wird auf die Kachel zugeschnitten.
function mapDetail({ detail = true } = {}) {
    if (!detail) {
        // Kleine Größen: Park, zwei Straßen, Hauptstraße; Feineres verschwimmt
        return `
        <path d="M0 0 H250 C226 100 150 168 0 190 Z" fill="${C.park}"/>
        <path d="M512 120 L0 420" stroke="${C.street}" stroke-width="30" fill="none"/>
        <path d="M290 512 L512 250" stroke="${C.road}" stroke-width="48" fill="none"/>`;
    }
    const rand = rng(7);
    const gap = 18;           // Straßenbreite im Raster
    // Unregelmäßiges Raster: verschiedene Blockbreiten wirken wie ein echter Ort
    const steps = [84, 104, 76, 112, 92, 80, 108, 88, 96, 100, 84, 92, 104];
    const lines = [-360];
    for (const st of steps) lines.push(lines[lines.length - 1] + st);
    const cols = lines;
    const rows = lines.map((v, i) => v + (i % 2 ? 14 : -10));
    const buildings = [];
    const greens = [];
    for (let i = 0; i < cols.length - 1; i++) {
        for (let j = 0; j < rows.length - 1; j++) {
            const x0 = cols[i] + gap / 2 + 5;
            const y0 = rows[j] + gap / 2 + 5;
            const w = cols[i + 1] - cols[i] - gap - 10;
            const h = rows[j + 1] - rows[j] - gap - 10;
            const r = rand();
            if (r < 0.12) {
                // kleine Grünfläche
                greens.push(`<rect x="${x0 - 3}" y="${y0 - 3}" width="${w + 6}" height="${h + 6}" rx="4"/>`);
            } else if (r < 0.55) {
                // Blockrandbebauung mit Hof
                const d = 18;
                const parts = [[0, 0, w, d], [0, h - d, w, d], [0, d + 4, d, h - 2 * d - 8], [w - d, d + 4, d, h - 2 * d - 8]];
                for (const [dx, dy, pw, ph] of parts) {
                    if (rand() < 0.25) continue;
                    buildings.push(`<rect x="${x0 + dx}" y="${y0 + dy}" width="${pw}" height="${ph}" rx="2"/>`);
                }
            } else {
                // Einzelhäuser in zwei Reihen
                const n = 2 + Math.floor(rand() * 2);
                const hw = (w - (n - 1) * 8) / n;
                for (let k = 0; k < n; k++) {
                    for (const dy of [4, h - 26]) {
                        if (rand() < 0.3) continue;
                        buildings.push(`<rect x="${x0 + k * (hw + 8) + 2}" y="${y0 + dy}" width="${hw - 4}" height="22" rx="2"/>`);
                    }
                }
            }
        }
    }
    const grid = [];
    for (const x of cols) grid.push(`M${x} -400 V900`);
    for (const y of rows) grid.push(`M-400 ${y} H900`);
    const gridPath = grid.join(' ');
    return `
        <g transform="rotate(-24 256 256)">
            <g fill="${C.park}">${greens.join('')}</g>
            <g fill="${C.building}" stroke="${C.buildingEdge}" stroke-width="2">${buildings.join('')}</g>
            <path d="${gridPath}" stroke="${C.streetEdge}" stroke-width="${gap + 4}" fill="none"/>
            <path d="${gridPath}" stroke="${C.street}" stroke-width="${gap - 4}" fill="none"/>
        </g>
        <path d="M-10 -10 H262 C250 70 214 118 160 150 C112 178 60 196 -10 214 Z" fill="${C.park}"/>
        <path d="M30 196 C70 150 120 140 150 96 C170 66 196 40 210 -10" stroke="${C.parkPath}" stroke-width="7" fill="none" stroke-linecap="round"/>
        <path d="M-10 92 C40 100 80 80 128 112" stroke="${C.parkPath}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <ellipse cx="78" cy="56" rx="34" ry="22" fill="${C.water}"/>
        <path d="M-10 470 C60 440 90 470 150 520 H-10 Z" fill="${C.park}"/>
        <path d="M-20 330 C90 300 150 360 250 330 S420 250 540 280" stroke="${C.streetEdge}" stroke-width="24" fill="none"/>
        <path d="M-20 330 C90 300 150 360 250 330 S420 250 540 280" stroke="${C.street}" stroke-width="16" fill="none"/>
        <path d="M262 530 L540 196" stroke="${C.roadEdge}" stroke-width="40" fill="none"/>
        <path d="M262 530 L540 196" stroke="${C.road}" stroke-width="30" fill="none"/>`;
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
        <clipPath id="shade-side"><rect x="272" y="0" width="240" height="512"/></clipPath>
        <clipPath id="tile"><rect id="tile-shape" x="${small ? 52 : 40}" y="${small ? 52 : 40}" width="${small ? 408 : 432}" height="${small ? 408 : 432}" rx="${small ? 64 : 76}"/></clipPath>
    </defs>`;

    let frame;
    let tileClip = 'url(#tile)';
    let tileRect = small ? 'x="52" y="52" width="408" height="408" rx="64"' : 'x="40" y="40" width="432" height="432" rx="76"';
    let hydrantTransform = small ? 'translate(256 254) scale(1.3) translate(-256 -240)' : 'translate(0 16)';
    if (variant === 'apple') {
        frame = `<rect width="512" height="512" fill="${C.frame}"/>`;
    } else if (variant === 'maskable') {
        // Rahmen füllt alles, die Kachel bleibt im Sicherheitskreis
        frame = `<rect width="512" height="512" fill="${C.frame}"/>`;
        tileRect = 'x="96" y="96" width="320" height="320" rx="64"';
        hydrantTransform = 'translate(256 256) scale(0.86) translate(-256 -240)';
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
    <rect ${tileRect} fill="${C.tile}"${small ? '' : ' stroke="#FFFFFF" stroke-width="12"'}/>
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
