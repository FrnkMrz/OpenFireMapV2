#!/usr/bin/env node
/**
 * measure_latency.mjs
 *
 * Baseline- und Vergleichs-Messskript für die OpenFireMap DACH Data Pipeline.
 * Misst Anfragenanzahl, Datenmenge, Time-to-First-Tile (TTFT) und Time-to-Last-Tile (TTLT)
 * für verschiedene Orte (Berlin, Nürnberg, Schnaittach), Viewports (Desktop, Mobil)
 * und Kartenzoomstufen (14, 15, 16).
 *
 * Nutzung:
 *   node pipeline/tools/measure_latency.mjs [--url <pipeline-url>] [--json <output-path>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PMTiles } from 'pmtiles';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parameter aus Argumenten
const args = process.argv.slice(2);
let BASE_URL = 'https://pipeline.openfiremap.org';
let JSON_OUT = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) {
    BASE_URL = args[++i].replace(/\/+$/, '');
  } else if (args[i] === '--json' && args[i + 1]) {
    JSON_OUT = args[++i];
  }
}

// Testorte gemäß Vorgabe
const LOCATIONS = [
  { name: 'Berlin', lat: 52.5200, lon: 13.4050 },
  { name: 'Nürnberg', lat: 49.4520, lon: 11.0770 },
  { name: 'Schnaittach', lat: 49.5550, lon: 11.3500 }
];

// Viewport-Größen
const VIEWPORTS = [
  { name: 'Desktop', width: 1440, height: 800 },
  { name: 'Mobil', width: 390, height: 750 }
];

// Zoomstufen
const ZOOM_LEVELS = [14, 15, 16];

// Hilfsfunktionen für Kachelberechnung (identisch zu src/js/pipeline.js)
function lon2tile(lon, z) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, z));
}

function lat2tile(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z)
  );
}

function tile2lat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/**
 * Berechnet Kacheln für ein gegebenes Zentrum (lat, lon), Kartenzoom und Viewport-Größe.
 */
function computeTiles(lat, lon, mapZoom, queryZoom, width, height, withBuffer = true) {
  const xc = ((lon + 180) / 360) * 256 * Math.pow(2, mapZoom);
  const rad = (lat * Math.PI) / 180;
  const yc =
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 256 * Math.pow(2, mapZoom);

  const west = ((xc - width / 2) / (256 * Math.pow(2, mapZoom))) * 360 - 180;
  const east = ((xc + width / 2) / (256 * Math.pow(2, mapZoom))) * 360 - 180;
  const north = tile2lat((yc - height / 2) / 256, mapZoom);
  const south = tile2lat((yc + height / 2) / 256, mapZoom);

  let minX = lon2tile(west, queryZoom);
  let maxX = lon2tile(east, queryZoom);
  let minY = lat2tile(north, queryZoom);
  let maxY = lat2tile(south, queryZoom);

  const rawTileCount = (maxX - minX + 1) * (maxY - minY + 1);
  let hasBuffer = false;

  // Frontend-Verhalten: Pufferring nur wenn rawTileCount <= 20
  if (withBuffer && rawTileCount <= 20) {
    minX -= 1;
    maxX += 1;
    minY -= 1;
    maxY += 1;
    hasBuffer = true;
  }

  const tiles = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      tiles.push({ x, y });
    }
  }

  return {
    rawTileCount,
    hasBuffer,
    totalTileCount: tiles.length,
    tiles
  };
}

/**
 * Worker-Pool mit begrenzter Parallelität (identisch zu processTilesWithPool)
 */
async function processTilesWithPool(tiles, workerFn, concurrency = 10) {
  if (!Array.isArray(tiles) || tiles.length === 0) return;
  let idx = 0;
  const numWorkers = Math.min(concurrency, tiles.length);

  const workers = Array.from({ length: numWorkers }, async () => {
    while (idx < tiles.length) {
      const tile = tiles[idx++];
      try {
        await workerFn(tile.x, tile.y);
      } catch (err) {
        // Fehler protokollieren
      }
    }
  });

  await Promise.all(workers);
}

/**
 * Tracking Source für PMTiles:
 * Fängt alle Range-Requests ab, misst Antwortzeiten, Bytes und cf-cache-status.
 */
class TrackingSource {
  constructor(url, onRequest) {
    this.url = url;
    this.onRequest = onRequest;
  }

  getKey() {
    return this.url;
  }

  async getBytes(offset, length, signal) {
    const t0 = performance.now();
    const res = await fetch(this.url, {
      headers: { Range: `bytes=${offset}-${offset + length - 1}` },
      signal
    });
    const cfCache = res.headers.get('cf-cache-status') || 'NONE';
    const contentRange = res.headers.get('content-range') || '';
    const buf = await res.arrayBuffer();
    const t1 = performance.now();

    const info = {
      offset,
      length,
      bytes: buf.byteLength,
      durationMs: Math.round(t1 - t0),
      cfCache,
      contentRange,
      status: res.status,
      timestamp: t1
    };

    if (this.onRequest) {
      this.onRequest(info);
    }

    return {
      data: buf,
      cacheControl: res.headers.get('cache-control'),
      expires: res.headers.get('expires')
    };
  }
}

async function runMeasurements() {
  console.log('='.repeat(80));
  console.log(`OpenFireMap Pipeline Latency Measurement`);
  console.log(`Target: ${BASE_URL}`);
  console.log('='.repeat(80));

  // 1. metadata.json abrufen
  const metaUrl = `${BASE_URL}/metadata.json`;
  console.log(`\n[1/3] Lade ${metaUrl}...`);
  const tMeta0 = performance.now();
  const metaRes = await fetch(metaUrl, { cache: 'no-cache' });
  const metaCfCache = metaRes.headers.get('cf-cache-status') || 'NONE';
  const metaText = await metaRes.text();
  const metaTimeMs = Math.round(performance.now() - tMeta0);

  let metadata = {};
  try {
    metadata = JSON.parse(metaText);
  } catch (e) {
    console.error('Fehler beim Parsen von metadata.json:', e);
  }

  const version = metadata?.generated_at ? String(metadata.generated_at) : '';
  const pmtilesMeta = metadata?.pmtiles || {};
  console.log(`  Version (generated_at): ${version || 'ohne Version'}`);
  console.log(`  metadata.json Latenz:   ${metaTimeMs} ms (cf-cache-status: ${metaCfCache})`);
  console.log(`  PMTiles aus Metadaten:  ${pmtilesMeta.file || 'openfiremap.pmtiles'} (${pmtilesMeta.size_mb || '?'} MB)`);

  const pmtilesFilename = pmtilesMeta.file || 'openfiremap.pmtiles';
  const pmtilesUrl = version
    ? `${BASE_URL}/${pmtilesFilename}?v=${encodeURIComponent(version)}`
    : `${BASE_URL}/${pmtilesFilename}`;

  console.log(`\n[2/3] Bereite PMTiles-Messungen vor: ${pmtilesUrl}`);

  // Einmal Header vorab prüfen, um minZoom/maxZoom und Dateigröße zu ermitteln
  let globalFileSizeMb = pmtilesMeta.size_mb || null;
  let headerMinZoom = 12;
  let headerMaxZoom = 16;

  {
    const initialRequests = [];
    const source = new TrackingSource(pmtilesUrl, (req) => initialRequests.push(req));
    const pmtiles = new PMTiles(source);
    const header = await pmtiles.getHeader();
    headerMinZoom = header.minZoom ?? 12;
    headerMaxZoom = header.maxZoom ?? 16;
    if (initialRequests[0]?.contentRange) {
      const match = initialRequests[0].contentRange.match(/\/(\d+)$/);
      if (match) {
        globalFileSizeMb = Math.round((parseInt(match[1], 10) / (1024 * 1024)) * 100) / 100;
      }
    }
    console.log(`  Header minZoom=${headerMinZoom}, maxZoom=${headerMaxZoom}, Dateigröße: ${globalFileSizeMb} MB`);
  }

  // 2. Messmatrix durchlaufen
  console.log(`\n[3/3] Starte Messmatrix (18 Szenarien: 3 Orte × 2 Viewports × 3 Zooms)...`);

  const results = [];

  for (const loc of LOCATIONS) {
    for (const vp of VIEWPORTS) {
      for (const mapZoom of ZOOM_LEVELS) {
        // Query-Zoom nach Header-Grenzen bestimmen (analog zum Frontend)
        const queryZoom = Math.min(Math.max(mapZoom, headerMinZoom), headerMaxZoom);

        // Kacheln ermitteln
        const tileInfo = computeTiles(loc.lat, loc.lon, mapZoom, queryZoom, vp.width, vp.height, true);

        // Kalt-Messung für dieses Szenario (simuliert initialen Seitenaufruf an dieser Position)
        const scenarioRequests = [];
        const source = new TrackingSource(pmtilesUrl, (req) => scenarioRequests.push(req));
        const pmtiles = new PMTiles(source);

        const tStart = performance.now();
        let firstTileTime = null;
        let lastTileTime = null;
        let tileBytes = 0;

        // Header laden
        await pmtiles.getHeader();

        // Kacheln mit Pool 10 laden
        await processTilesWithPool(tileInfo.tiles, async (x, y) => {
          const tile = await pmtiles.getZxy(queryZoom, x, y);
          const tNow = performance.now();
          if (tile?.data) {
            tileBytes += tile.data.byteLength;
            if (firstTileTime === null) {
              firstTileTime = tNow - tStart;
            }
            lastTileTime = tNow - tStart;
          }
        }, 10);

        const totalDuration = Math.round(performance.now() - tStart);
        const ttft = firstTileTime !== null ? Math.round(firstTileTime) : null;
        const ttlt = lastTileTime !== null ? Math.round(lastTileTime) : null;

        // Anfragen und Datenmengen summieren (inkl. metadata.json für die Kalt-Session)
        const totalRequests = scenarioRequests.length + 1; // +1 für metadata.json
        const totalBytes = scenarioRequests.reduce((sum, r) => sum + r.bytes, 0) + metaText.length;
        const totalKb = Math.round((totalBytes / 1024) * 10) / 10;

        // cf-cache-status sammeln
        const cfStatuses = new Set([metaCfCache, ...scenarioRequests.map(r => r.cfCache)]);
        const cfStatusStr = Array.from(cfStatuses).join('/');

        const entry = {
          location: loc.name,
          viewport: vp.name,
          viewportSize: `${vp.width}x${vp.height}`,
          mapZoom,
          queryZoom,
          rawTiles: tileInfo.rawTileCount,
          totalTiles: tileInfo.totalTileCount,
          hasBuffer: tileInfo.hasBuffer,
          httpRequests: totalRequests,
          totalBytes,
          totalKb,
          ttftMs: ttft,
          ttltMs: ttlt,
          totalDurationMs: totalDuration,
          cfCacheStatus: cfStatusStr,
          fileSizeMb: globalFileSizeMb
        };

        results.push(entry);

        const progressStr = `${loc.name} ${vp.name} z${mapZoom} -> qz${queryZoom} | ${entry.totalTiles} Kacheln | ${entry.httpRequests} Req | TTFT: ${entry.ttftMs}ms | TTLT: ${entry.ttltMs}ms (${entry.totalKb} KB)`;
        console.log(`  ✓ ${progressStr}`);
      }
    }
  }

  // 3. Ausgabe als Markdown-Tabelle
  console.log('\n' + '='.repeat(100));
  console.log('BASELINE-ERGEBNISSE (Tabelle für Bericht)');
  console.log('='.repeat(100));

  console.log('\n| Ort | Viewport | Kartenzoom | Kachel-z | Kacheln (Raw/Puffer) | Requests | Datenmenge | TTFT (1. Kachel) | TTLT (fertig) | cf-cache-status |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');

  for (const r of results) {
    const tilesStr = `${r.rawTiles}${r.hasBuffer ? ` (+${r.totalTiles - r.rawTiles})` : ''}`;
    const ttftStr = r.ttftMs !== null ? `${r.ttftMs} ms` : '-';
    const ttltStr = r.ttltMs !== null ? `${r.ttltMs} ms` : '-';
    console.log(`| ${r.location} | ${r.viewport} | z${r.mapZoom} | z${r.queryZoom} | ${tilesStr} | ${r.httpRequests} | ${r.totalKb} KB | ${ttftStr} | ${ttltStr} | ${r.cfCacheStatus} |`);
  }

  console.log('\nPMTiles-Dateigröße: ' + globalFileSizeMb + ' MB (Cloudflare Free Cache-Grenze: 512 MB -> Cache-Status: ' + results[0]?.cfCacheStatus + ')');

  // Falls gewünscht als JSON speichern
  if (JSON_OUT) {
    const resolvedPath = path.resolve(process.cwd(), JSON_OUT);
    fs.writeFileSync(resolvedPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      version,
      fileSizeMb: globalFileSizeMb,
      metadata,
      results
    }, null, 2), 'utf-8');
    console.log(`\nErgebnisse als JSON gespeichert in: ${resolvedPath}`);
  }
}

runMeasurements().catch((err) => {
  console.error('Fehler bei Messung:', err);
  process.exit(1);
});
