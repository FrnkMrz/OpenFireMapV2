// Holt Einbahnstrassen (Richtung = Knotenreihenfolge im OSM-Weg, bei oneway=-1 umgekehrt, Kreisverkehr implizit) und
// schreibt data/oneway.geojson. Aufruf: node oneway-data.mjs [sued,west,nord,ost] [ausgabedatei]
// Warum nicht aus den Kacheln: Beim Zusammenfassen von Linien kehrt der Kachelbau einzelne Richtungen um
// (an der Probe 2 von 472 Abschnitten), ein Pfeil gegen die Fahrtrichtung waere auf einem Feuerwehrplan gefaehrlich.
import fs from "node:fs";

const bbox = process.argv[2] || "49.49,11.28,49.58,11.41";
const outFile = process.argv[3] || "data/oneway.geojson";
const query = `[out:json][timeout:60];(
way["highway"]["oneway"~"^(yes|-1|true|1)$"](${bbox});
way["highway"]["junction"="roundabout"]["oneway"!~"^(no|false|0)$"](${bbox});
);out geom tags;`;

// Nur Strassen fuer Kraftfahrzeuge; Autobahnen, Wege, Fussgaengerbereiche und Parkplatzgassen bleiben ohne Pfeil
const HIGHWAYS = new Set(["trunk", "trunk_link", "primary", "primary_link", "secondary", "secondary_link", "tertiary", "tertiary_link",
  "unclassified", "residential", "living_street", "service", "road"]);

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

const features = [];
for (const w of data.elements) {
  const t = w.tags || {};
  if (!HIGHWAYS.has(t.highway) || t.service === "parking_aisle") continue;
  let pts = (w.geometry || []).map((g) => [g.lon, g.lat]);
  if (pts.length < 2) continue;
  if (t.oneway === "-1") pts = pts.reverse();
  features.push({ type: "Feature", geometry: { type: "LineString", coordinates: pts }, properties: { id: w.id, hw: t.highway } });
}
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ type: "FeatureCollection", features }));
console.log(`geschrieben: ${outFile}, ${features.length} Einbahn-Wege`);
