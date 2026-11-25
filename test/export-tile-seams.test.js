import { describe, it, expect } from 'vitest';
import { snapTileOrigin, drawExportTiles } from '../src/js/export.js';

// Helle Nähte im PNG/PDF-Export: Lag die Kachelkante zwischen zwei Geräte-Pixeln, glättete der Canvas beide Kacheln an
// der Kante und der weiße Untergrund schien durch (Zeile 268/524 im Export Nürnberg, Helligkeit 162 statt 85).

/**
 * Canvas-Attrappe: merkt sich die Rechtecke von drawImage in Geräte-Pixeln (wie ctx.scale(pixelRatio))
 * und rechnet für eine Spalte/Zeile aus, wie weit sie von Kacheln gedeckt ist.
 */
function fakeCanvas(pixelRatio) {
    const rects = [];
    return {
        rects,
        drawImage(_img, x, y, w, h) {
            rects.push({ x0: x * pixelRatio, y0: y * pixelRatio, x1: (x + w) * pixelRatio, y1: (y + h) * pixelRatio });
        },
        // Anteil Weiß im Geräte-Pixel `pixel` entlang einer Linie quer bei `at`: Kanten-Glättung wie im Browser
        // (jede Kachel deckt das Pixel anteilig, source-over: übrig bleibt das Produkt der Lücken)
        whiteShare(axis, pixel, at) {
            let white = 1;
            for (const r of rects) {
                const across = axis === 'x' ? [r.y0, r.y1] : [r.x0, r.x1];
                if (at < across[0] || at >= across[1]) continue;
                const a = axis === 'x' ? [r.x0, r.x1] : [r.y0, r.y1];
                const cover = Math.max(0, Math.min(pixel + 1, a[1]) - Math.max(pixel, a[0]));
                white *= 1 - cover;
            }
            return white;
        },
    };
}

/** Kachelraster wie in generateMapCanvas: Kacheln ab floor(start) über die Kartenbreite */
function tilesFor(startTileX, startTileY, mapW, mapH) {
    const tiles = [];
    for (let x = Math.floor(startTileX); x <= Math.floor(startTileX + mapW / 256); x++) {
        for (let y = Math.floor(startTileY); y <= Math.floor(startTileY + mapH / 256); y++) tiles.push({ x, y, img: {} });
    }
    return tiles;
}

/** Größter Weiß-Anteil über alle Geräte-Spalten und -Zeilen innerhalb der Karte */
function worstSeam(startTileX, startTileY, pixelRatio) {
    const left = 40, top = 210, mapW = 578, mapH = 600;
    const ctx = fakeCanvas(pixelRatio);
    drawExportTiles(ctx, tilesFor(startTileX, startTileY, mapW, mapH), { startTileX, startTileY, left, top });
    let worst = 0;
    const midY = (top + mapH / 2) * pixelRatio + 0.5;
    const midX = (left + mapW / 2) * pixelRatio + 0.5;
    for (let p = left * pixelRatio; p < (left + mapW) * pixelRatio; p++) worst = Math.max(worst, ctx.whiteShare('x', p, midY));
    for (let p = top * pixelRatio; p < (top + mapH) * pixelRatio; p++) worst = Math.max(worst, ctx.whiteShare('y', p, midX));
    return worst;
}

// Ausschnitt Nürnberg Altstadt, Zoom 17: Kachel-Ursprung mit gebrochenem Pixelanteil
const RAW_X = 69973.3127;
const RAW_Y = 44846.5412;

describe('Export: Kachelnähte', () => {
    it('Attrappe erkennt die Naht bei ungerundetem Ursprung', () => {
        expect(worstSeam(RAW_X, RAW_Y, 1)).toBeGreaterThan(0.05);
        expect(worstSeam(RAW_X + 0.3 / 512, RAW_Y + 0.3 / 512, 2)).toBeGreaterThan(0.05);
    });

    for (const pixelRatio of [1, 2]) {
        it(`eingerasteter Ursprung: keine Naht bei Pixeldichte ${pixelRatio}`, () => {
            for (const f of [0, 0.1, 0.25, 0.5, 0.7, 0.999]) {
                const x = snapTileOrigin(RAW_X + f / 256, pixelRatio);
                const y = snapTileOrigin(RAW_Y + f / 256, pixelRatio);
                expect(worstSeam(x, y, pixelRatio)).toBeLessThan(1e-6);
            }
        });
    }

    it('verschiebt höchstens ein halbes Geräte-Pixel', () => {
        for (const pixelRatio of [1, 2]) {
            const step = 256 * pixelRatio;
            for (const f of [0.1, 0.49, 0.5, 0.51, 0.9]) {
                const raw = RAW_X + f / step;
                expect(Math.abs(snapTileOrigin(raw, pixelRatio) - raw) * step).toBeLessThanOrEqual(0.5 + 1e-6);
            }
        }
    });
});
