// Holt Einbahnstrassen (Richtung = Knotenreihenfolge im OSM-Weg, bei oneway=-1 umgekehrt, Kreisverkehr implizit) und
// schreibt data/oneway.geojson. Aufruf: node oneway-data.mjs [sued,west,nord,ost] [ausgabedatei]
// Warum nicht aus den Kacheln: Beim Zusammenfassen von Linien kehrt der Kachelbau einzelne Richtungen um
// (an der Probe 2 von 472 Abschnitten), ein Pfeil gegen die Fahrtrichtung waere auf einem Feuerwehrplan gefaehrlich.
import fs from "node:fs";
import { featureFromWay } from "./oneway.js";

const bbox = process.argv[2] || "49.49,11.28,49.58,11.41";
const outFile = process.argv[3] || "data/oneway.geojson";
const query = `[out:json][timeout:60];(
way["highway"]["oneway"~"^(yes|-1|true|1)$"](${bbox});
way["highway"]["junction"="roundabout"]["oneway"!~"^(no|false|0)$"](${bbox});
);out geom tags;`;

let data = null;
for (const ep of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"]) {
  try {
    const res = await fetch(ep, {
      method: "POST",
      headers: { "User-Agent": "OpenFireMap-ortsplan-spike/0.1 (info@openfiremap.org)", "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(60000), // sonst haengt der Aufruf bei einem ueberlasteten Server ohne Ende
    });
    data = JSON.parse(await res.text());
    console.log("Overpass:", ep);
    break;
  } catch (e) {
    console.log("Overpass fehlgeschlagen:", ep, String(e.message).slice(0, 60));
  }
}
if (!data) { console.error("keine Overpass-Antwort"); process.exit(2); }

const features = data.elements.map(featureFromWay).filter(Boolean);
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ type: "FeatureCollection", features }));
console.log(`geschrieben: ${outFile}, ${features.length} Einbahn-Wege`);
