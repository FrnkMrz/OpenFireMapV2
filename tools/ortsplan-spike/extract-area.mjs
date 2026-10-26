// Holt Kartendaten fuer einen weiteren Ort: Grundkarte (Protomaps) und Feuerwehr-Ebenen (OpenFireMap-Pipeline) als PMTiles-Ausschnitt.
// Aufruf: node extract-area.mjs <name> <breite> <laenge> [radiusKm=6] ["Titel des Ortes"]
// Beispiel: node extract-area.mjs lauf 49.5120 11.2780 6 "Lauf an der Pegnitz"  ->  Seite mit ?area=lauf
// Braucht die pmtiles-Kommandozeile. Die Feuerwehr-Ebenen gibt es nur fuer das Pipeline-Gebiet (DACHLiLu und Europa-Laender).
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [name, latS, lonS, radiusS = "6", title = ""] = process.argv.slice(2);
const lat = Number(latS), lon = Number(lonS), radius = Number(radiusS);
if (!/^[a-z0-9-]+$/.test(name || "") || !Number.isFinite(lat) || !Number.isFinite(lon) || !(radius > 0 && radius <= 25)) {
  console.error('Aufruf: node extract-area.mjs <name a-z0-9-> <breite> <laenge> [radiusKm 1-25] ["Titel"]');
  process.exit(1);
}
const dLat = radius / 110.54, dLon = radius / (111.32 * Math.cos((lat * Math.PI) / 180));
const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((v) => v.toFixed(4)).join(",");

const builds = await (await fetch("https://build-metadata.protomaps.dev/builds.json", { signal: AbortSignal.timeout(30000) })).json();
const newest = builds.sort((a, b) => String(b.uploaded).localeCompare(String(a.uploaded)))[0].key;
console.log(`Ausschnitt ${bbox} (Radius ${radius} km), Grundkarte ${newest}`);

fs.mkdirSync("data", { recursive: true });
const run = (args) => execFileSync("pmtiles", args, { stdio: "inherit" });
run(["extract", `https://build.protomaps.com/${newest}`, `data/${name}.pmtiles`, `--bbox=${bbox}`]);
try {
  run(["extract", "https://pipeline.openfiremap.org/openfiremap.pmtiles", `data/${name}-ofm.pmtiles`, `--bbox=${bbox}`, "--minzoom=12"]);
} catch {
  console.error("Feuerwehr-Ebenen nicht geholt (Ort ausserhalb des Pipeline-Gebiets?). Die Karte wird ohne sie gezeichnet.");
}
fs.writeFileSync(`data/${name}.json`, JSON.stringify({ name, title: title || name, lat, lon, radiusKm: radius, bbox, base: newest }, null, 1));
console.log(`fertig: Seite mit ?area=${name} oeffnen. Einbahn-Pfeile optional: node oneway-data.mjs "${[lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((v) => v.toFixed(4)).join(",")}" data/${name}-oneway.geojson`);
