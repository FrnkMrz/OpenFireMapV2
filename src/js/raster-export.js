import { FetchSource, PMTiles, TileType } from 'pmtiles';
import { strToU8, zipSync } from 'fflate';
import { Config } from './config.js';

export class RasterExportError extends Error {}

function tileX(lon, z) {
  return (lon + 180) / 360 * 2 ** z;
}

function tileY(lat, z) {
  return (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z;
}

export function planRasterTiles(rect, minZoom, maxZoom, maxTiles) {
  const { south, west, north, east } = rect;
  if (![south, west, north, east].every(Number.isFinite) ||
      south >= north || west >= east || south < -85 || north > 85 || west < -180 || east > 180) {
    throw new RasterExportError('raster_zip_coverage');
  }
  const tiles = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const x0 = Math.floor(tileX(west, z));
    const x1 = Math.ceil(tileX(east, z)) - 1;
    const y0 = Math.floor(tileY(north, z));
    const y1 = Math.ceil(tileY(south, z)) - 1;
    if (tiles.length + (x1 - x0 + 1) * (y1 - y0 + 1) > maxTiles) {
      throw new RasterExportError('raster_zip_limit');
    }
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) tiles.push({ z, x, y });
    }
  }
  return tiles;
}

async function openRasterArchive(manifestUrl, signal) {
  const url = new URL(manifestUrl, location.href);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new RasterExportError('raster_zip_unavailable');
  }
  const response = await fetch(url, { cache: 'no-store', redirect: 'error', signal });
  if (!response.ok) throw new RasterExportError('raster_zip_unavailable');
  const manifest = await response.json();
  if (manifest?.schema_version !== 1 || !/^germany-[0-9a-f]{64}\.pmtiles$/.test(manifest.file) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(manifest.published_at)) {
    throw new RasterExportError('raster_zip_unavailable');
  }

  const source = new FetchSource(new URL(manifest.file, url).href);
  // Der Abbruch gilt auch für Header und Verzeichnis, die PMTiles ohne Signal lädt.
  const archive = new PMTiles({
    getKey: () => source.getKey(),
    getBytes: (offset, length, _signal, etag) => source.getBytes(offset, length, signal, etag),
  });
  return { archive, manifest };
}

export async function buildRasterZip(rect, maxZoom, controller, onProgress) {
  const config = Config.rasterExport;
  const { signal } = controller;
  if (!Number.isInteger(maxZoom) || maxZoom < config.minZoom || maxZoom > config.maxZoom) {
    throw new RasterExportError('raster_zip_unavailable');
  }
  const tiles = planRasterTiles(rect, config.minZoom, maxZoom, config.maxTiles);
  const { archive, manifest } = await openRasterArchive(config.manifestUrl, signal);
  const header = await archive.getHeader();
  if (header.tileType !== TileType.Png || header.minZoom > config.minZoom || header.maxZoom < maxZoom) {
    throw new RasterExportError('raster_zip_unavailable');
  }
  if (rect.west < header.minLon || rect.east > header.maxLon ||
      rect.south < header.minLat || rect.north > header.maxLat) {
    throw new RasterExportError('raster_zip_coverage');
  }

  let next = 0;
  let checked = 0;
  let found = 0;
  let bytes = 0;
  const files = {};
  onProgress(0, tiles.length);
  try {
    await Promise.all(Array.from({ length: config.parallel }, async () => {
      while (next < tiles.length) {
        signal.throwIfAborted();
        const { z, x, y } = tiles[next++];
        const tile = await archive.getZxy(z, x, y, signal);
        if (tile) {
          bytes += tile.data.byteLength;
          if (bytes > config.maxPngBytes) throw new RasterExportError('raster_zip_limit');
          files[`${z}/${x}/${y}.png`] = new Uint8Array(tile.data);
          found++;
        }
        checked++;
        if (checked % 10 === 0 || checked === tiles.length) onProgress(checked, tiles.length);
      }
    }));
  } catch (error) {
    controller.abort(error);
    throw error;
  }
  signal.throwIfAborted();
  if (!found) throw new RasterExportError('raster_zip_empty');
  files['ATTRIBUTION.txt'] = strToU8(
    'OpenFireMap – transparent XYZ overlay\n' +
    '© OpenStreetMap contributors (ODbL)\nhttps://www.openstreetmap.org/copyright\n' +
    `Source: ${manifest.file}\nPublished: ${manifest.published_at}\nZoom: ${config.minZoom}–${maxZoom}\n`
  );
  files['selection.json'] = strToU8(JSON.stringify({
    scheme: 'xyz',
    format: 'png',
    bounds: [rect.west, rect.south, rect.east, rect.north],
    minzoom: config.minZoom,
    maxzoom: maxZoom,
    tiles: found,
    source: manifest.file,
    published_at: manifest.published_at,
  }, null, 2) + '\n');
  return new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' });
}
