#!/usr/bin/env node
/**
 * verify_coverage_js.mjs
 * 
 * Führt die 40.000-Viewport-Simulation direkt mit dem echten JavaScript-Code
 * (isPipelineEligible aus src/js/pipeline.js) aus.
 * 
 * Misst die Ausführungszeit pro Aufruf und exportiert alle positiv bewerteten
 * Viewports als JSON zur Validierung gegen die offizielle OSM-Landesgrenze.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPipelineEligible } from '../../src/js/pipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deterministischer Pseudo-Zufallszahlengenerator (Mulberry32)
function createMulberry32(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  let samples = 4000;
  let seed = 42;
  let outFile = path.join(__dirname, 'js_approved_viewports.json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--samples' && args[i + 1]) {
      samples = parseInt(args[++i], 10);
    } else if (args[i] === '--seed' && args[i + 1]) {
      seed = parseInt(args[++i], 10);
    } else if (args[i] === '--out' && args[i + 1]) {
      outFile = path.resolve(process.cwd(), args[++i]);
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`Verwendung: node verify_coverage_js.mjs [--samples <N>] [--seed <S>] [--out <pfad.json>]`);
      process.exit(0);
    }
  }

  return { samples, seed, outFile };
}

function main() {
  const { samples, seed, outFile } = parseArgs();

  const devices = [
    { name: 'Desktop (1440x800)', w: 1440, h: 800 },
    { name: 'Mobil (390x750)', w: 390, h: 750 }
  ];
  const zoomLevels = [12, 13, 14, 15, 16];

  const totalRuns = devices.length * zoomLevels.length * samples;
  console.log('='.repeat(80));
  console.log(`Starte JS-Simulation mit ${totalRuns.toLocaleString()} Viewports (echter JS-Code)`);
  console.log(`Samples pro Kombination: ${samples.toLocaleString()}, Basis-Seed: ${seed}`);
  console.log('='.repeat(80));

  const approvedViewports = [];
  const results = [];

  let totalDurationMs = 0;
  let totalCalls = 0;
  let combinationIndex = 0;

  for (const dev of devices) {
    for (const z of zoomLevels) {
      combinationIndex++;
      const rng = createMulberry32(seed + combinationIndex * 1000);
      let approvedCount = 0;
      let comboDurationMs = 0;

      for (let i = 0; i < samples; i++) {
        // Koordinatenbereich Bayern + Umgebung: 47.3–50.55 N / 8.97–13.84 E
        const lat = 47.3 + rng() * (50.55 - 47.3);
        const lon = 8.97 + rng() * (13.84 - 8.97);

        const latRad = (lat * Math.PI) / 180.0;
        const breiteGrad = (dev.w * 360.0) / (256.0 * (2 ** z));
        const hoeheGrad = (dev.h * 360.0) / (256.0 * (2 ** z)) * Math.cos(latRad);

        const south = lat - hoeheGrad / 2.0;
        const north = lat + hoeheGrad / 2.0;
        const west = lon - breiteGrad / 2.0;
        const east = lon + breiteGrad / 2.0;

        const bounds = { south, north, west, east };

        const t0 = performance.now();
        const eligible = isPipelineEligible(bounds, z);
        const t1 = performance.now();

        const callDuration = t1 - t0;
        comboDurationMs += callDuration;
        totalDurationMs += callDuration;
        totalCalls++;

        if (eligible) {
          approvedCount++;
          approvedViewports.push({
            device: dev.name,
            zoom: z,
            lat,
            lon,
            south,
            north,
            west,
            east
          });
        }
      }

      const avgComboMs = comboDurationMs / samples;
      results.push({
        device: dev.name,
        zoom: z,
        samples,
        approved: approvedCount,
        approvedPct: (approvedCount / samples) * 100,
        avgMs: avgComboMs
      });

      console.log(`  ${dev.name.padEnd(22)} Z${z}: ${approvedCount.toString().padStart(4)} / ${samples} genehmigt (${((approvedCount / samples) * 100).toFixed(1)}%) | Ø ${avgComboMs.toFixed(4)} ms/Call`);
    }
  }

  const overallAvgMs = totalDurationMs / totalCalls;

  console.log('\n' + '='.repeat(80));
  console.log('ERGEBNISSE DER JS-SIMULATION:');
  console.log('='.repeat(80));
  console.log('| Gerät | Zoom | Getestet | Von Pipeline genehmigt | Quote | Ø Dauer/Call | Status (<1ms) |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of results) {
    const status = r.avgMs < 1.0 ? 'PASSED' : 'SLOW';
    console.log(`| ${r.device} | ${r.zoom} | ${r.samples.toLocaleString()} | ${r.approved.toLocaleString()} | ${r.approvedPct.toFixed(1)}% | ${r.avgMs.toFixed(4)} ms | ${status} |`);
  }
  console.log('='.repeat(80));
  console.log(`Gesamt geteste Viewports:  ${totalCalls.toLocaleString()}`);
  console.log(`Genehmigte Viewports (true): ${approvedViewports.length.toLocaleString()} (${((approvedViewports.length / totalCalls) * 100).toFixed(2)}%)`);
  console.log(`Mittlere Laufzeit gesamt:    ${overallAvgMs.toFixed(4)} ms pro Aufruf`);

  if (overallAvgMs < 1.0) {
    console.log(`✅ Performance-Kriterium (< 1 ms) mit ${overallAvgMs.toFixed(4)} ms deutlich erfüllt!`);
  } else {
    console.error(`❌ Performance-Kriterium verfehlt: ${overallAvgMs.toFixed(4)} ms >= 1 ms!`);
    process.exit(1);
  }

  // Exportiere genehmigte Viewports für verify_coverage.py
  const exportPayload = {
    generatedAt: new Date().toISOString(),
    samplesPerCombo: samples,
    seed,
    overallAvgDurationMs: overallAvgMs,
    totalTested: totalCalls,
    totalApproved: approvedViewports.length,
    viewports: approvedViewports
  };

  fs.writeFileSync(outFile, JSON.stringify(exportPayload, null, 2), 'utf-8');
  console.log(`\nGenehmigte Viewports gespeichert in: ${outFile}`);
}

main();
