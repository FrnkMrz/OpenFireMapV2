// Namespace-Import: maplibre-gl 6 hat keinen Default-Export mehr (5.x kennt beide Schreibweisen)
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol, PMTiles } from "pmtiles";
import { buildStyle, zoomForScale, CSS_PX_PER_MM } from "./style.js";
import { ICON_PX, loadIcons } from "./icons.js";
import { collectElements, buildFeatures, addFireLayers } from "./fire.js";
import { composeSheet } from "./sheet.js";
import { PAPER_MM, computeLayout, NICE_SCALES } from "./layout.js";
import { indexNote } from "./indexnote.js";
import { arrowsAlong, onlyLocalStreets } from "./oneway.js";
import { streetLabelPoints, clipLineToBox } from "./labelpoints.js";

const q = new URLSearchParams(location.search);
const scale = +(q.get("scale") || 5000);
const paper = q.get("paper") || "a4l";
const dpi = +(q.get("dpi") || 96);
const mode = q.get("mode") || "plan"; // plan | real
const fmt = q.get("fmt") || "fill"; // Kartenformat, siehe layout.js
// Beschriftung: avoid (Standard) = Strassennamen weichen den Symbolen aus, fehlende Namen kommen danach einmal UNTER die Symbole;
// top = Namen weichen nicht aus. Die Feuerwehr-Symbole liegen in beiden Faellen oben und werden nie von Namen verdeckt.
const lbl = q.get("lbl") || "avoid";
// Weiterer Ort: ?area=<name> nutzt data/<name>.pmtiles, <name>-ofm.pmtiles, <name>-oneway.geojson und <name>.json (siehe extract-area.mjs)
const areaName = (q.get("area") || "").replace(/[^a-z0-9-]/gi, "");
let areaInfo = null;
if (areaName) {
  try { areaInfo = await (await fetch(`/${areaName}.json`)).json(); } catch { /* ohne Beschreibung */ }
}
const baseFile = areaName ? `${areaName}.pmtiles` : "neunkirchen.pmtiles";
const ofmFile = areaName ? `${areaName}-ofm.pmtiles` : "ofm.pmtiles";
const onewayFile = areaName ? `${areaName}-oneway.geojson` : "oneway.geojson";
const lat = +(q.get("lat") || areaInfo?.lat || 49.5252);
const lon = +(q.get("lon") || areaInfo?.lon || 11.3181);
const [wMm, hMm] = PAPER_MM[paper] || PAPER_MM.a4l;

// Formular
const form = document.getElementById("ctl");
const indexOn = q.get("index") !== "0";
const indexSize = Math.min(3, Math.max(0.5, +(q.get("isize") || 1)));
// Massstab: dieselben Werte wie die Auswahlseite (layout.js), dazu der aktuelle, falls er nicht in der Liste steht (zum Beispiel von Hand in der Adresse)
{
  const sel = form.elements.scale;
  const values = [...new Set([...NICE_SCALES, scale])].sort((a, b) => a - b);
  sel.replaceChildren(...values.map((s) => new Option(String(s), String(s))));
}
// Jedes Auswahlfeld behaelt seinen Wert: fehlt er in der Liste, wird er ergaenzt. Sonst bliebe das Feld leer und "Neu laden"
// liesse den Wert still auf den Standard zurueckfallen.
const setField = (el, v) => {
  const val = String(v);
  if (el.tagName === "SELECT" && ![...el.options].some((o) => o.value === val)) el.add(new Option(val, val));
  el.value = val;
};
for (const [k, v] of Object.entries({ scale, paper, dpi, mode, lat, lon, index: indexOn ? "1" : "0", isize: indexSize, side: q.get("side") || "right", icols: q.get("icols") || "0", fmt })) setField(form.elements[k], v);
document.getElementById("pick-link").href = `/pick.html?${new URLSearchParams({ paper, side: q.get("side") || "right", fmt, scale: String(scale), lat: String(lat), lon: String(lon), index: indexOn ? "1" : "0", lsym: q.get("lsym") === "0" ? "0" : "1", lroad: q.get("lroad") === "0" ? "0" : "1", icols: String(q.get("icols") || 0), isize: String(indexSize), dpi: String(dpi), ...(areaName ? { area: areaName } : {}) })}`;
document.getElementById("info").textContent =
  `1:${scale} · ${paper.toUpperCase()} · ${dpi} dpi · ${mode} · Bild ${Math.round(wMm * CSS_PX_PER_MM * dpi / 96)}×${Math.round(hMm * CSS_PX_PER_MM * dpi / 96)} px`;

// Blatt-Modus (sheet=1): Karte nur im Kartenfenster, daneben Seitenleiste mit Legende und Verzeichnis.
const sheet = q.get("sheet") === "1";
const place = q.get("place") || areaInfo?.title || "Neunkirchen am Sand";
// Lage von Legende, Massstab und Verzeichnis: side=right (Standard) | left | top | bottom; icols = Spaltenzahl des Verzeichnisses (0 = automatisch)
// Kartenformat: fmt=fill (Papier fuellen, Standard) | 1:1 | 3:2 | 2:3 | 4:3 | 3:4 ... (Seitenverhaeltnis des Kartenfensters). Geometrie in layout.js.
const side = ["left", "right", "top", "bottom"].includes(q.get("side")) ? q.get("side") : "right";
const indexCols = Math.min(6, Math.max(0, Math.round(+(q.get("icols") || 0))));
const { ui, frame, panel } = computeLayout({ wMm, hMm, side, fmt });
const mapWmm = sheet ? frame.w : wMm;
const mapHmm = sheet ? frame.h : hMm;
// Optionen ohne eigenes Eingabefeld (sheet, place, fire, isz, lbl ...) bleiben beim "Neu laden" erhalten.
for (const [k, v] of q.entries()) {
  if (form.elements[k]) continue;
  const hidden = document.createElement("input");
  hidden.type = "hidden"; hidden.name = k; hidden.value = v;
  form.appendChild(hidden);
}

const el = document.getElementById("map");
el.style.width = `${Math.round(mapWmm * CSS_PX_PER_MM)}px`;
el.style.height = `${Math.round(mapHmm * CSS_PX_PER_MM)}px`;

// Das Karten-Canvas darf je Seite hoechstens 8192 px haben; bei sehr grossen Blaettern sinkt die Karten-Aufloesung entsprechend
const mapRatio = Math.min(dpi / 96, 8192 / (Math.max(mapWmm, mapHmm) * CSS_PX_PER_MM));
const mapDpi = Math.round(mapRatio * 96);

// Einbahn-Pfeile: Standard bei Massstab 1:10.000 und groesser (ow=0 aus, ow=1 immer); nur, wenn die Einbahn-Datei existiert.
// Die Pfeil-Punkte werden hier aus den Linien berechnet (Abstand in Papier-Millimetern, siehe oneway.js).
const owWanted = q.get("ow") ? q.get("ow") === "1" : scale <= 10000;
let owData = null;
if (owWanted) {
  try {
    const r = await fetch(`/${onewayFile}`);
    if (r.ok && (r.headers.get("content-type") || "").includes("json")) {
      // Pfeile nur auf Gemeindestrassen; owall=1 zeigt sie auf allen Strassenarten
      const all = await r.json();
      const pts = arrowsAlong(q.get("owall") === "1" ? all : onlyLocalStreets(all), scale);
      if (pts.features.length) owData = pts;
    }
  } catch { /* keine Datei: keine Pfeile */ }
}
const owImage = owData ? (await loadIcons(["oneway"])).get("oneway") : null;

const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

const map = new maplibregl.Map({
  container: el,
  style: buildStyle({
    scale, mode,
    pmtilesUrl: `${location.origin}/${baseFile}`,
    ofmUrl: `${location.origin}/${ofmFile}`,
    onewayData: owData,
    labelSpacingMm: q.get("lsp") ? +q.get("lsp") : (lbl === "avoid" ? 10 : null),
  }),
  center: [lon, lat],
  zoom: zoomForScale(scale, lat),
  pixelRatio: mapRatio,
  maxCanvasSize: [8192, 8192],
  canvasContextAttributes: { preserveDrawingBuffer: true },
  attributionControl: false,
  fadeDuration: 0,
  // Fester Massstab: Zoomen und Verschieben wuerden Massstab, Dateiname und Feuerwehr-Daten vom Bild trennen.
  interactive: false,
});
window.__map = map;
// Pfeil-Symbol: sofort nach dem Laden des Stils eintragen (vor dem ersten Ebenen-Aufbau) und bei Bedarf nachliefern
const addOnewayImage = () => { if (owImage && !map.hasImage("oneway")) map.addImage("oneway", owImage, { pixelRatio: 1 }); };
map.once("style.load", addOnewayImage);
map.on("styleimagemissing", (e) => { if (e.id === "oneway") addOnewayImage(); });
// Messgroesse fuer Tests: wie viele verschiedene Strassennamen stehen tatsaechlich im Bild?
window.__names = () => new Set(map.queryRenderedFeatures({ layers: ["road-labels", "road-labels-fb-a", "road-labels-fb-b"].filter((l) => map.getLayer(l)) }).map((f) => f.properties.name)).size;
// Symbolgroesse in mm Papier, nach Massstab abgestuft (App: Wache 32 px, sonst 28 px, also Wache etwas groesser).
// Zwischen den Stuetzstellen wird ueber den Logarithmus des Massstabs interpoliert; isz skaliert alles.
const SIZE_TABLE = [[2500, 3.6], [5000, 3.2], [10000, 2.6], [20000, 2.2]];
function poiSizeMm(s) {
  if (s <= SIZE_TABLE[0][0]) return SIZE_TABLE[0][1];
  for (let i = 1; i < SIZE_TABLE.length; i++) {
    const [s1, v1] = SIZE_TABLE[i];
    if (s <= s1) {
      const [s0, v0] = SIZE_TABLE[i - 1];
      return v0 + (v1 - v0) * (Math.log(s / s0) / Math.log(s1 / s0));
    }
  }
  return SIZE_TABLE[SIZE_TABLE.length - 1][1];
}
const isz = +(q.get("isz") || 1);
const poiMm = poiSizeMm(scale) * isz;
// Feuerwehrhaeuser: 1,15 (wie die App) mal 1,6 (60 % groesser auf Wunsch)
const STATION_FACTOR = 1.15 * 1.6;
const sizes = { station: (poiMm * STATION_FACTOR * CSS_PX_PER_MM) / ICON_PX, poi: (poiMm * CSS_PX_PER_MM) / ICON_PX };
// lbl=top: Beschriftung liegt ueber den Symbolen (Standard); lbl=avoid: Namen weichen den Symbolen aus.
const withFire = q.get("fire") !== "0";
// Wie die App: Hydranten/Wasser innerhalb 5 m werden ab Zoom 17 (hier: Massstab 1:5000 und groesser) zusammengefasst.
const clusterPoi = scale <= 5000;

map.once("idle", async () => {
  if (withFire) {
    const els = collectElements(map);
    const feats = buildFeatures(els, { clusterPoi });
    fireCoords = feats.map((f) => f.geometry.coordinates);
    const r = await addFireLayers(map, feats, sizes, { beforeId: undefined, ignorePlacement: lbl === "top" });
    window.__fire = { poiMm: +poiMm.toFixed(2), lbl, elements: els.length, symbols: r.total, stations: r.stations, defibs: feats.filter((f) => f.properties.icon === "defibrillator").length, badges: feats.filter((f) => f.properties.icon.startsWith("badge-")).length, boundaries: map.querySourceFeatures("ofm", { sourceLayer: "boundaries" }).length };
    await nextIdle();
  }
  // Ersatz-Beschriftung fuer Strassen ohne Namen im Bild (auch ohne Feuerwehr-Ebene)
  const added = await addFallbackLabels();
  if (window.__fire) window.__fire.fallbackNames = added;
  finish();
});

const nextIdle = () => new Promise((resolve) => { map.once("idle", resolve); map.triggerRepaint(); });

// Strassen, deren Name nirgends platziert werden konnte (Symbole, Pfeile oder lauter zu kurze Linienstuecke), bekommen
// ihren Namen als Punkt in der Mitte des laengsten Stuecks mit der Richtung der Strasse (siehe labelpoints.js).
// Erst ohne Ueberlappung (weicht anderen Beschriftungen aus), danach fuer die Uebrigen mit Ueberlappung. Beides unter den Symbolen.
// Orte der Feuerwehr-Symbole: Ersatz-Namen weichen ihnen aus, damit kein Hydrant einen Namen verdeckt (Name bleibt unter dem Symbol, aber lesbar)
let fireCoords = [];
const labelMmOf = (kind) => (kind === "minor_road" ? 1.75 : 2.1);
const clearanceOf = (name, kind) => (((name.length * 0.55 * labelMmOf(kind)) / 2 + (poiMm * 1.15) / 2 + 0.6) * scale) / 1000;
const ROAD_KINDS = ["highway", "major_road", "minor_road"];
const labelLayers = () => ["road-labels", "road-labels-fb-a", "road-labels-fb-b"].filter((l) => map.getLayer(l));

function unplacedStreets() {
  const placed = new Set(map.queryRenderedFeatures({ layers: labelLayers() }).map((f) => f.properties.name));
  // Sichtbarer Ausschnitt, innen um einen schmalen Rand verkleinert (Namen sollen nicht am Bildrand abgeschnitten werden)
  const b = map.getBounds();
  const m = ((3 * scale) / 1000) / 111320; // 3 mm Papier in Grad (Laengengrad, grob)
  const box = [b.getWest() + m, b.getSouth() + m, b.getEast() - m, b.getNorth() - m];
  const feats = [];
  for (const f of map.querySourceFeatures("p", { sourceLayer: "roads" })) {
    const p = f.properties || {};
    if (!p.name || !ROAD_KINDS.includes(p.kind) || p.is_tunnel === true || placed.has(p.name)) continue;
    const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [];
    // Linien auf den Ausschnitt schneiden: auch Strassen, die ihn ohne Eckpunkt darin durchqueren, bekommen einen Namen
    const pieces = lines.flatMap((l) => clipLineToBox(l, box));
    if (pieces.length) feats.push({ properties: { name: p.name, kind: p.kind }, geometry: { type: "MultiLineString", coordinates: pieces } });
  }
  return streetLabelPoints(feats, { obstacles: fireCoords, clearanceOf });
}

function addLabelPoints(id, pts, overlap) {
  const lay = (n) => map.getLayoutProperty("road-labels", n);
  const paint = (n) => map.getPaintProperty("road-labels", n);
  map.addSource(id, {
    type: "geojson",
    data: { type: "FeatureCollection", features: pts.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: p.coord }, properties: { name: p.name, kind: p.kind, rot: p.rot, len: p.lengthM } })) },
  });
  map.addLayer({
    id, type: "symbol", source: id,
    layout: {
      "text-field": ["get", "name"], "text-font": lay("text-font"), "text-size": lay("text-size"), "text-letter-spacing": lay("text-letter-spacing"),
      "text-rotate": ["get", "rot"], "text-rotation-alignment": "map", "text-pitch-alignment": "map", "text-padding": lay("text-padding"),
      "text-allow-overlap": overlap,
      "symbol-sort-key": ["*", ["get", "len"], -1], // laengere Strassen zuerst
    },
    paint: { "text-color": paint("text-color"), "text-halo-color": paint("text-halo-color"), "text-halo-width": paint("text-halo-width") },
  }, map.getLayer("fire-icons") ? "fire-icons" : undefined); // unter den Symbolen: Namen duerfen Hydranten nie verdecken
}

async function addFallbackLabels() {
  const first = unplacedStreets();
  if (!first.length) return 0;
  addLabelPoints("road-labels-fb-a", first, false);
  await nextIdle();
  const second = unplacedStreets();
  if (second.length) { addLabelPoints("road-labels-fb-b", second, true); await nextIdle(); }
  return first.length;
}

// Liegt der Ausschnitt ausserhalb der geladenen Daten, bleibt die Karte leer. Das soll man sehen, nicht raten muessen.
async function coverageWarning() {
  try {
    const h = await new PMTiles(`${location.origin}/${baseFile}`).getHeader();
    const b = map.getBounds();
    const inside = b.getWest() >= h.minLon && b.getEast() <= h.maxLon && b.getSouth() >= h.minLat && b.getNorth() <= h.maxLat;
    if (inside) return "";
    const f = (v) => v.toFixed(3).replace(".", ",");
    return `Achtung: Der Ausschnitt liegt außerhalb der geladenen Kartendaten (${f(h.minLon)}–${f(h.maxLon)} °E, ${f(h.minLat)}–${f(h.maxLat)} °N). Daten für diesen Ort holen: node extract-area.mjs (siehe README).`;
  } catch {
    return "";
  }
}

async function finish() {
  try {
    await buildSheet();
  } catch (err) {
    window.__error = String(err && err.stack || err);
    console.error(err);
  }
  window.__ready = true;
}

async function buildSheet() {
  const warning = await coverageWarning();
  window.__warning = warning;
  if (warning) {
    const bar = document.createElement("div");
    bar.textContent = warning;
    bar.style.cssText = "background:#fde8e8;color:#8a1111;padding:8px 12px;border-bottom:1px solid #d99;font:14px system-ui,sans-serif";
    document.body.insertBefore(bar, document.getElementById("map"));
  }
  if (sheet) {
    const meta = await fetch("/meta.json").then((r) => r.json()).catch(() => null);
    const res = await composeSheet({
      map, scale, dpi, paperMm: [wMm, hMm], frame, meta, ui, index: indexOn, legendSymbols: q.get("lsym") !== "0", legendRoads: q.get("lroad") !== "0", indexSize, warning, side, panel, indexCols,
      title: "Orts- und Hydrantenplan",
      subtitle: [place, `Maßstab 1 : ${scale.toLocaleString("de-DE")} · Papier ${paper.toUpperCase()}`],
    });
    window.__sheet = res.pages;
    window.__sheetInfo = { panelFit: res.panelFit, mapDpi, index: res.indexCount, indexPage: res.indexPage, cellM: res.cellM, cols: res.cols, rows: res.rows, pages: res.pages.length };
    const out = document.getElementById("out");
    // Hinweis ueber dem Blatt: wo das Strassenverzeichnis steht (bei oben/unten und kleinen Papieren erst auf Seite 2)
    const note = document.createElement("div");
    note.id = "index-note";
    note.style.cssText = "margin:12px;padding:8px 12px;background:#fff8d6;border:1px solid #e0c870;font:14px system-ui,sans-serif;max-width:60em";
    note.textContent = indexNote({ indexOn, indexPage: res.indexPage, indexCount: res.indexCount, pages: res.pages.length });
    out.appendChild(note);
    res.pages.forEach((url, i) => {
      if (res.pages.length > 1) {
        const cap = document.createElement("div");
        cap.textContent = `Seite ${i + 1} von ${res.pages.length}`;
        cap.style.cssText = "margin:12px 12px 0;font:600 13px system-ui,sans-serif;color:#444";
        out.appendChild(cap);
      }
      const img = new Image();
      img.src = url;
      img.style.cssText = "display:block;margin:12px;background:#fff;box-shadow:0 0 8px rgba(0,0,0,.3);max-width:calc(100vw - 24px)";
      out.appendChild(img);
    });
    el.style.display = "none";
  }
}

document.getElementById("png").addEventListener("click", () => {
  // Blatt-Modus: die zusammengesetzten Seiten speichern (Kartenfenster allein waere unvollstaendig).
  if (window.__sheet) {
    window.__sheet.forEach((url, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = url;
        a.download = `ortsplan-blatt-${scale}-${paper}-${dpi}dpi-seite${i + 1}.png`;
        a.click();
      }, i * 400);
    });
    return;
  }
  map.getCanvas().toBlob((b) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `ortsplan-${scale}-${paper}-${dpi}dpi-${mode}.png`;
    a.click();
  });
});
