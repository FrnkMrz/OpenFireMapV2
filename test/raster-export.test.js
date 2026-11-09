import { afterEach, describe, expect, it, vi } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { zxyToTileId } from 'pmtiles';
import { buildRasterZip, planRasterTiles } from '../src/js/raster-export.js';

vi.mock('../src/js/config.js', () => ({
  Config: { rasterExport: {
    manifestUrl: 'https://raster.example/manifest.json',
    minZoom: 12, maxZoom: 18, maxTiles: 2000, maxPngBytes: 100000, parallel: 4,
  } },
}));

const area = { west: 11.318, south: 49.517, east: 11.319, north: 49.518 };
const archiveKey = `germany-${'a'.repeat(64)}.pmtiles`;
const png = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGNgAAIAAAUAAUeqocEAAAAASUVORK5CYII=', 'base64',
));

function varint(value) {
  const bytes = [];
  while (value >= 128) {
    bytes.push(128 + value % 128);
    value = Math.floor(value / 128);
  }
  return [...bytes, value];
}

function serveTestArchive(tile) {
  const directory = Uint8Array.from([1, ...varint(zxyToTileId(tile.z, tile.x, tile.y)), 1, png.length, 1]);
  const tileOffset = 127 + directory.length;
  const data = new Uint8Array(tileOffset + png.length);
  data.set([80, 77, 84, 105, 108, 101, 115, 3]);
  const view = new DataView(data.buffer);
  for (const [offset, value] of [[8, 127], [16, directory.length], [56, tileOffset],
    [64, png.length], [72, 1], [80, 1], [88, 1]]) {
    view.setBigUint64(offset, BigInt(value), true);
  }
  data.set([1, 1, 1, 2, 12, 18], 96);
  [5, 47, 16, 56].forEach((coordinate, index) => view.setInt32(102 + 4 * index, coordinate * 1e7, true));
  data.set(directory, 127);
  data.set(png, tileOffset);
  return vi.fn((url, request) => {
    if (String(url).endsWith('/manifest.json')) {
      return Promise.resolve(Response.json({
        schema_version: 1, file: archiveKey, published_at: '2026-11-09T12:00:00Z',
      }));
    }
    const range = new Headers(request.headers).get('range');
    if (!range) throw new Error('Das Archiv wurde ohne Range angefragt.');
    const [, from, to] = /^bytes=(\d+)-(\d+)$/.exec(range);
    const start = Number(from);
    const end = Math.min(Number(to), data.length - 1);
    return Promise.resolve(new Response(data.slice(start, end + 1), {
      status: 206,
      headers: { 'Content-Range': `bytes ${start}-${end}/${data.length}`, ETag: '"fixture"' },
    }));
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('Rasterexport', () => {
  it('schreibt den vorhandenen PNG-Inhalt und die Quellenangabe in ein ZIP und liest per Range', async () => {
    const selected = planRasterTiles(area, 12, 15, 2000);
    const tile = selected.find(({ z }) => z === 15);
    vi.stubGlobal('location', new URL('https://openfiremap.org'));
    const fetch = serveTestArchive(tile);
    vi.stubGlobal('fetch', fetch);

    const progress = vi.fn();
    const zip = await buildRasterZip(area, 15, new AbortController(), progress);
    const files = unzipSync(new Uint8Array(await zip.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual([`${tile.z}/${tile.x}/${tile.y}.png`, 'ATTRIBUTION.txt', 'selection.json']);
    expect(files[`${tile.z}/${tile.x}/${tile.y}.png`]).toEqual(png);
    expect(strFromU8(files['ATTRIBUTION.txt'])).toContain('© OpenStreetMap contributors');
    expect(progress).toHaveBeenLastCalledWith(selected.length, selected.length);
    expect(fetch.mock.calls).toHaveLength(3);
  });

  it('verwirft eine zu große Auswahl vor jeglichem Netzwerkzugriff', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(buildRasterZip({ west: 10, south: 49, east: 12, north: 51 }, 18,
      new AbortController(), vi.fn())).rejects.toThrow('raster_zip_limit');
    expect(fetch).not.toHaveBeenCalled();
  });
});
