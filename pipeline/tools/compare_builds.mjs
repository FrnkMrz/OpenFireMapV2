#!/usr/bin/env node
/**
 * compare_builds.mjs
 *
 * Lokaler Test und Nachweis für Teil C:
 * 1. Lädt einen kleinen Extrakt (Mittelfranken, ~95 MB)
 * 2. Extrahiert GeoJSON-Features mit osmium
 * 3. Baut:
 *    - Alten Stand (z16)
 *    - Neuen Stand z14 (Standard Detail 12)
 *    - Neuen Stand z14 (Detail 14)
 *    - Geteilte Builds (POIs z14 + Boundaries z14)
 * 4. Analysiert:
 *    - Feature-Vollständigkeit (PMTiles vs. GeoJSON)
 *    - Genauigkeit / Positionsabweichung (max. & mittlere Abweichung in Metern)
 *    - Dateigrößen-Vergleich
 *    - Hochrechnung auf den DACHLiLu-Gesamtdatensatz (< 512 MB Analyse)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const WORK_DIR = path.join(ROOT_DIR, 'pipeline', 'data', 'test_extract');
const PBF_URL = 'https://download.geofabrik.de/europe/germany/bayern/mittelfranken-latest.osm.pbf';
const PBF_FILE = path.join(WORK_DIR, 'mittelfranken-latest.osm.pbf');

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function run(cmd, cwd = WORK_DIR) {
  return execSync(cmd, { cwd, stdio: ['ignore', 'ignore', 'ignore'], maxBuffer: 100 * 1024 * 1024 });
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

async function main() {
  fs.makedirs = (dir) => fs.mkdirSync(dir, { recursive: true });
  fs.makedirs(WORK_DIR);

  log('================================================================================');
  log('Teil C: Lokaler Build-Vergleich & Genauigkeits-Nachweis (Mittelfranken)');
  log('================================================================================');

  // 1. PBF herunterladen, falls nicht vorhanden
  if (!fs.existsSync(PBF_FILE) || fs.statSync(PBF_FILE).size < 10000000) {
    log(`[1/5] Lade ${PBF_URL} herunter...`);
    run(`curl -L -o "${PBF_FILE}" "${PBF_URL}"`);
  }
  const pbfMb = Math.round((fs.statSync(PBF_FILE).size / (1024 * 1024)) * 10) / 10;
  log(`  PBF bereit: ${PBF_FILE} (${pbfMb} MB)`);

  // 2. Features filtern & GeoJSON exportieren
  log(`[2/5] Filtere Features mit osmium tags-filter & export...`);

  const layers = [
    {
      name: 'hydrants',
      filter: ['nwr/emergency=fire_hydrant'],
      types: 'point',
      geojson: path.join(WORK_DIR, 'hydrants.geojson')
    },
    {
      name: 'fire_stations',
      filter: ['nwr/amenity=fire_station', 'nwr/building=fire_station'],
      types: 'point,polygon',
      geojson: path.join(WORK_DIR, 'fire_stations.geojson')
    },
    {
      name: 'water_points',
      filter: ['nwr/emergency=water_tank,suction_point,fire_water_pond,cistern'],
      types: 'point,polygon',
      geojson: path.join(WORK_DIR, 'water_points.geojson')
    },
    {
      name: 'defibrillators',
      filter: ['n/emergency=defibrillator'],
      types: 'point',
      geojson: path.join(WORK_DIR, 'defibrillators.geojson')
    },
    {
      name: 'boundaries',
      filter: ['w/boundary=administrative'],
      types: 'linestring',
      geojson: path.join(WORK_DIR, 'boundaries.geojson')
    }
  ];

  const geojsonCounts = {};

  for (const layer of layers) {
    const partPbf = path.join(WORK_DIR, `${layer.name}.pbf`);
    if (!fs.existsSync(layer.geojson)) {
      run(`osmium tags-filter "${PBF_FILE}" ${layer.filter.join(' ')} -o "${partPbf}" --overwrite`);
      run(`osmium export "${partPbf}" --add-unique-id=type_id --geometry-types=${layer.types} -o "${layer.geojson}" --overwrite`);
    }
    const data = JSON.parse(fs.readFileSync(layer.geojson, 'utf-8'));
    geojsonCounts[layer.name] = data.features?.length || 0;
    const kb = Math.round((fs.statSync(layer.geojson).size / 1024) * 10) / 10;
    log(`  ${layer.name}: ${geojsonCounts[layer.name]} Features (${kb} KB)`);
  }

  // 3. PMTiles bauen:
  //    A. Alt (z16, hydrants 15-16, stations 12-16, boundaries 12-16)
  //    B. Neu (z14, detail 12, hydrants 14-14, stations 12-14, boundaries 12-14)
  //    C. Neu (z14, detail 14, hydrants 14-14, stations 12-14, boundaries 12-14)
  //    D. POIs only (z14, detail 12)
  //    E. Boundaries only (z14, detail 12)
  log(`[3/5] Erzeuge PMTiles-Varianten mit tippecanoe...`);

  const pmtilesOld = path.join(WORK_DIR, 'old_z16.pmtiles');
  const pmtilesNewD12 = path.join(WORK_DIR, 'new_z14_d12.pmtiles');
  const pmtilesNewD14 = path.join(WORK_DIR, 'new_z14_d14.pmtiles');
  const pmtilesPois = path.join(WORK_DIR, 'pois_z14.pmtiles');
  const pmtilesBoundaries = path.join(WORK_DIR, 'boundaries_z14.pmtiles');

  const oldArgs = [
    `-L`, JSON.stringify({ file: layers[1].geojson, layer: 'fire_stations', minzoom: 12, maxzoom: 16 }),
    `-L`, JSON.stringify({ file: layers[0].geojson, layer: 'hydrants', minzoom: 15, maxzoom: 16 }),
    `-L`, JSON.stringify({ file: layers[2].geojson, layer: 'water_points', minzoom: 15, maxzoom: 16 }),
    `-L`, JSON.stringify({ file: layers[3].geojson, layer: 'defibrillators', minzoom: 15, maxzoom: 16 }),
    `-L`, JSON.stringify({ file: layers[4].geojson, layer: 'boundaries', minzoom: 12, maxzoom: 16 })
  ];

  const newArgsD12 = [
    `-L`, JSON.stringify({ file: layers[1].geojson, layer: 'fire_stations', minzoom: 12, maxzoom: 14 }),
    `-L`, JSON.stringify({ file: layers[0].geojson, layer: 'hydrants', minzoom: 14, maxzoom: 14 }),
    `-L`, JSON.stringify({ file: layers[2].geojson, layer: 'water_points', minzoom: 14, maxzoom: 14 }),
    `-L`, JSON.stringify({ file: layers[3].geojson, layer: 'defibrillators', minzoom: 14, maxzoom: 14 }),
    `-L`, JSON.stringify({ file: layers[4].geojson, layer: 'boundaries', minzoom: 12, maxzoom: 14 })
  ];

  const poisArgs = [
    `-L`, JSON.stringify({ file: layers[1].geojson, layer: 'fire_stations', minzoom: 12, maxzoom: 14 }),
    `-L`, JSON.stringify({ file: layers[0].geojson, layer: 'hydrants', minzoom: 14, maxzoom: 14 }),
    `-L`, JSON.stringify({ file: layers[2].geojson, layer: 'water_points', minzoom: 14, maxzoom: 14 }),
    `-L`, JSON.stringify({ file: layers[3].geojson, layer: 'defibrillators', minzoom: 14, maxzoom: 14 })
  ];

  const boundariesArgs = [
    `-L`, JSON.stringify({ file: layers[4].geojson, layer: 'boundaries', minzoom: 12, maxzoom: 14 })
  ];

  log('  Erzeuge Build A: old_z16.pmtiles (maxZoom 16)...');
  run(`tippecanoe -o "${pmtilesOld}" --force -z 16 --generate-ids --no-feature-limit --no-tile-size-limit ${oldArgs.map(a => `'${a}'`).join(' ')}`);

  log('  Erzeuge Build B: new_z14_d12.pmtiles (maxZoom 14, Detail 12)...');
  run(`tippecanoe -o "${pmtilesNewD12}" --force -z 14 --generate-ids --no-feature-limit --no-tile-size-limit ${newArgsD12.map(a => `'${a}'`).join(' ')}`);

  log('  Erzeuge Build C: new_z14_d14.pmtiles (maxZoom 14, Detail 14)...');
  run(`tippecanoe -o "${pmtilesNewD14}" --force -z 14 -d 14 --generate-ids --no-feature-limit --no-tile-size-limit ${newArgsD12.map(a => `'${a}'`).join(' ')}`);

  log('  Erzeuge Build D: pois_z14.pmtiles (POIs z14)...');
  run(`tippecanoe -o "${pmtilesPois}" --force -z 14 --generate-ids --no-feature-limit --no-tile-size-limit ${poisArgs.map(a => `'${a}'`).join(' ')}`);

  log('  Erzeuge Build E: boundaries_z14.pmtiles (Boundaries z14)...');
  run(`tippecanoe -o "${pmtilesBoundaries}" --force -z 14 --generate-ids --no-feature-limit --no-tile-size-limit ${boundariesArgs.map(a => `'${a}'`).join(' ')}`);

  const sizeOld = fs.statSync(pmtilesOld).size;
  const sizeNewD12 = fs.statSync(pmtilesNewD12).size;
  const sizeNewD14 = fs.statSync(pmtilesNewD14).size;
  const sizePois = fs.statSync(pmtilesPois).size;
  const sizeBoundaries = fs.statSync(pmtilesBoundaries).size;

  log(`\n  Dateigrößen (Mittelfranken):`);
  log(`    Alt (z16):            ${(sizeOld / 1024 / 1024).toFixed(2)} MB (100.0%)`);
  log(`    Neu z14 (Detail 12):  ${(sizeNewD12 / 1024 / 1024).toFixed(2)} MB (${((sizeNewD12 / sizeOld) * 100).toFixed(1)}%)`);
  log(`    Neu z14 (Detail 14):  ${(sizeNewD14 / 1024 / 1024).toFixed(2)} MB (${((sizeNewD14 / sizeOld) * 100).toFixed(1)}%)`);
  log(`    POIs z14 separat:     ${(sizePois / 1024 / 1024).toFixed(2)} MB`);
  log(`    Boundaries z14 sep.:  ${(sizeBoundaries / 1024 / 1024).toFixed(2)} MB`);

  // 4. Feature-Vollständigkeit & Kacheln dekodieren
  log(`\n[4/5] Dekodiere Kacheln und prüfe Feature-Vollständigkeit...`);

  class FileSource {
    constructor(filePath) {
      this.fd = fs.openSync(filePath, 'r');
      this.key = filePath;
    }
    getKey() { return this.key; }
    async getBytes(offset, length) {
      const buf = Buffer.alloc(length);
      fs.readSync(this.fd, buf, 0, length, offset);
      return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
    }
    close() { fs.closeSync(this.fd); }
  }

  async function decodeAllTiles(filePath) {
    const src = new FileSource(filePath);
    const pmtiles = new PMTiles(src);
    const header = await pmtiles.getHeader();

    // Alle Kacheln im Bounding-Bereich für z14 abfragen
    const minZ = header.minZoom;
    const maxZ = header.maxZoom;

    const hydrantsFound = new Map();

    // Bounding Box Mittelfranken
    const minLat = header.minLat;
    const maxLat = header.maxLat;
    const minLon = header.minLon;
    const maxLon = header.maxLon;

    function l2tX(lon, z) { return Math.floor(((lon + 180) / 360) * Math.pow(2, z)); }
    function l2tY(lat, z) {
      const r = (lat * Math.PI) / 180;
      return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z));
    }

    const minX = l2tX(minLon, 14);
    const maxX = l2tX(maxLon, 14);
    const minY = l2tY(maxLat, 14);
    const maxY = l2tY(minLat, 14);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const resp = await pmtiles.getZxy(14, x, y);
        if (!resp || !resp.data) continue;
        const pbf = new PbfReader(new Uint8Array(resp.data));
        const vt = new VectorTile(pbf);
        const layer = vt.layers['hydrants'];
        if (!layer) continue;
        for (let i = 0; i < layer.length; i++) {
          const feat = layer.feature(i);
          const gj = feat.toGeoJSON(x, y, 14);
          const id = feat.id ?? gj.id ?? gj.properties?.['@id'] ?? gj.properties?.id;
          if (id != null) {
            hydrantsFound.set(String(id), gj.geometry.coordinates);
          }
        }
      }
    }

    src.close();
    return { header, hydrantsFound };
  }

  const decodedD12 = await decodeAllTiles(pmtilesNewD12);
  const decodedD14 = await decodeAllTiles(pmtilesNewD14);

  const geojsonHydrantsRaw = JSON.parse(fs.readFileSync(layers[0].geojson, 'utf-8')).features;
  const originalHydrants = new Map();
  for (const f of geojsonHydrantsRaw) {
    const id = String(f.id ?? f.properties?.['@id'] ?? f.properties?.id);
    originalHydrants.set(id, f.geometry.coordinates);
  }

  log(`  GeoJSON Hydranten:          ${originalHydrants.size}`);
  log(`  PMTiles z14 (Detail 12):    ${decodedD12.hydrantsFound.size} Hydranten gefunden`);
  log(`  PMTiles z14 (Detail 14):    ${decodedD14.hydrantsFound.size} Hydranten gefunden`);
  const completenessD12 = (decodedD12.hydrantsFound.size / originalHydrants.size) * 100;
  log(`  Vollständigkeit Detail 12:  ${completenessD12.toFixed(2)}% (${decodedD12.hydrantsFound.size === originalHydrants.size ? 'VERLUSTFREI 100%' : 'Abweichung'})`);

  // 5. Genauigkeitsanalyse (Stichprobe Positionsabweichung in Metern)
  log(`\n[5/5] Analysiere Positionsabweichung (Detail 12 vs. Detail 14)...`);

  let maxDiffD12 = 0;
  let sumDiffD12 = 0;
  let countD12 = 0;

  let maxDiffD14 = 0;
  let sumDiffD14 = 0;
  let countD14 = 0;

  for (const [id, origCoord] of originalHydrants) {
    const d12Coord = decodedD12.hydrantsFound.get(id);
    if (d12Coord) {
      const dist = distanceMeters(origCoord[1], origCoord[0], d12Coord[1], d12Coord[0]);
      if (dist > maxDiffD12) maxDiffD12 = dist;
      sumDiffD12 += dist;
      countD12++;
    }

    const d14Coord = decodedD14.hydrantsFound.get(id);
    if (d14Coord) {
      const dist = distanceMeters(origCoord[1], origCoord[0], d14Coord[1], d14Coord[0]);
      if (dist > maxDiffD14) maxDiffD14 = dist;
      sumDiffD14 += dist;
      countD14++;
    }
  }

  const avgDiffD12 = countD12 > 0 ? sumDiffD12 / countD12 : 0;
  const avgDiffD14 = countD14 > 0 ? sumDiffD14 / countD14 : 0;

  log(`  Genauigkeit Detail 12 (-d 12, Standard):`);
  log(`    Mittlere Abweichung: ${avgDiffD12.toFixed(3)} m (~${Math.round(avgDiffD12 * 100)} cm)`);
  log(`    Maximale Abweichung: ${maxDiffD12.toFixed(3)} m (~${Math.round(maxDiffD12 * 100)} cm)`);

  log(`  Genauigkeit Detail 14 (-d 14):`);
  log(`    Mittlere Abweichung: ${avgDiffD14.toFixed(3)} m (~${Math.round(avgDiffD14 * 100)} cm)`);
  log(`    Maximale Abweichung: ${maxDiffD14.toFixed(3)} m (~${Math.round(maxDiffD14 * 100)} cm)`);

  // 6. Hochrechnung auf DACHLiLu
  log(`\n================================================================================`);
  log(`HOCHRECHNUNG AUF DACHLILU`);
  log(`================================================================================`);
  const liveDachliluMb = 514.12; // Gemessen am 29.09.2026
  const ratioD12 = sizeNewD12 / sizeOld;
  const ratioD14 = sizeNewD14 / sizeOld;

  const estimatedD12Mb = Math.round(liveDachliluMb * ratioD12 * 100) / 100;
  const estimatedD14Mb = Math.round(liveDachliluMb * ratioD14 * 100) / 100;

  log(`  Aktuelle DACHLiLu-Größe (z16):     ${liveDachliluMb} MB (> 512 MB -> BYPASS)`);
  log(`  Kompressionsfaktor z14 (Detail 12): ${(ratioD12 * 100).toFixed(1)}% des Altbestands`);
  log(`  Hochgerechnete DACHLiLu-Größe:     ${estimatedD12Mb} MB (Detail 12)`);
  log(`  Hochgerechnete DACHLiLu-Größe:     ${estimatedD14Mb} MB (Detail 14)`);
  log(`  Cloudflare Free Cache Limit:        512.00 MB`);

  const under512 = estimatedD12Mb < 512;
  log(`\n  Ergebnis: Liegt DACHLiLu sicher unter 512 MB? -> ${under512 ? 'JA! (' + estimatedD12Mb + ' MB < 512 MB)' : 'NEIN'}`);
  if (under512) {
    log(`  -> Cloudflare Cache-Status wird von BYPASS auf HIT wechseln!`);
  }

  // Berichtsobjekt speichern
  const report = {
    testRegion: 'Mittelfranken (Geofabrik)',
    rawPbfSizeMb: pbfMb,
    featureCounts: geojsonCounts,
    sizes: {
      old_z16_bytes: sizeOld,
      old_z16_mb: Math.round((sizeOld / (1024 * 1024)) * 100) / 100,
      new_z14_d12_bytes: sizeNewD12,
      new_z14_d12_mb: Math.round((sizeNewD12 / (1024 * 1024)) * 100) / 100,
      new_z14_d14_bytes: sizeNewD14,
      new_z14_d14_mb: Math.round((sizeNewD14 / (1024 * 1024)) * 100) / 100,
      pois_z14_mb: Math.round((sizePois / (1024 * 1024)) * 100) / 100,
      boundaries_z14_mb: Math.round((sizeBoundaries / (1024 * 1024)) * 100) / 100,
      reductionPercentD12: Math.round((1 - ratioD12) * 1000) / 10,
      reductionPercentD14: Math.round((1 - ratioD14) * 1000) / 10
    },
    accuracy: {
      detail12: {
        avgMeters: Math.round(avgDiffD12 * 1000) / 1000,
        maxMeters: Math.round(maxDiffD12 * 1000) / 1000
      },
      detail14: {
        avgMeters: Math.round(avgDiffD14 * 1000) / 1000,
        maxMeters: Math.round(maxDiffD14 * 1000) / 1000
      }
    },
    completeness: {
      geojsonHydrants: originalHydrants.size,
      pmtilesHydrantsD12: decodedD12.hydrantsFound.size,
      pmtilesHydrantsD14: decodedD14.hydrantsFound.size,
      isLossless: decodedD12.hydrantsFound.size === originalHydrants.size
    },
    extrapolationDachlilu: {
      currentLiveMb: liveDachliluMb,
      estimatedD12Mb,
      estimatedD14Mb,
      cloudflareLimitMb: 512,
      safelyUnderLimit: under512
    }
  };

  const reportPath = path.join(ROOT_DIR, 'pipeline', 'tools', 'build_comparison_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  log(`\n  Vollständiger Bericht geschrieben: ${reportPath}`);
}

main().catch((err) => {
  console.error('Fehler bei Build-Vergleich:', err);
  process.exit(1);
});
