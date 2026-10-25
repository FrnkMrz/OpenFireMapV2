import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { buildStyle, zoomForScale, CSS_PX_PER_MM } from "./style.js";
import { ICON_PX } from "./icons.js";
import { collectElements, buildFeatures, addFireLayers } from "./fire.js";
import { composeSheet } from "./sheet.js";

const PAPER_MM = {
  a4l: [297, 210], a4p: [210, 297], a3l: [420, 297], a3p: [297, 420],
  a2l: [594, 420], a2p: [420, 594], a1l: [841, 594], a1p: [594, 841],
};
const q = new URLSearchParams(location.search);
const scale = +(q.get("scale") || 5000);
const paper = q.get("paper") || "a4l";
const dpi = +(q.get("dpi") || 96);
const mode = q.get("mode") || "plan"; // plan | real
// Beschriftung: avoid (Standard) = Strassennamen weichen den Symbolen aus, fehlende Namen kommen danach einmal ueber die Symbole;
// top = alle Namen ueber den Symbolen
const lbl = q.get("lbl") || "avoid";
const lat = +(q.get("lat") || 49.5252);
const lon = +(q.get("lon") || 11.3181);
const [wMm, hMm] = PAPER_MM[paper] || PAPER_MM.a4l;

// Formular
const form = document.getElementById("ctl");
const indexOn = q.get("index") !== "0";
const indexSize = Math.min(3, Math.max(0.5, +(q.get("isize") || 1)));
for (const [k, v] of Object.entries({ scale, paper, dpi, mode, lat, lon, index: indexOn ? "1" : "0", isize: indexSize })) form.elements[k].value = v;
document.getElementById("info").textContent =
  `1:${scale} · ${paper.toUpperCase()} · ${dpi} dpi · ${mode} · Bild ${Math.round(wMm * CSS_PX_PER_MM * dpi / 96)}×${Math.round(hMm * CSS_PX_PER_MM * dpi / 96)} px`;

// Blatt-Modus (sheet=1): Karte nur im Kartenfenster, daneben Seitenleiste mit Legende und Verzeichnis.
const sheet = q.get("sheet") === "1";
const place = q.get("place") || "Neunkirchen am Sand";
// Oberflaechen-Faktor: A3 = 1, A2 = 1,4, A1 = 2 (Schrift, Seitenleiste und Raender wachsen mit dem Papier)
const ui = Math.max(1, Math.max(wMm, hMm) / 420);
const sidebarW = Math.min(92 * ui, Math.max(62, 0.24 * wMm));
const frame = { x: 14 * ui, y: 14 * ui, w: wMm - 14 * ui - 6.5 * ui - sidebarW - 6 * ui, h: hMm - 28 * ui };
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

const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

const map = new maplibregl.Map({
  container: el,
  style: buildStyle({
    scale, mode,
    pmtilesUrl: `${location.origin}/neunkirchen.pmtiles`,
    ofmUrl: `${location.origin}/ofm.pmtiles`,
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
// Messgroesse fuer Tests: wie viele verschiedene Strassennamen stehen tatsaechlich im Bild?
window.__names = () => new Set(map.queryRenderedFeatures({ layers: ["road-labels", "road-labels-fallback"].filter((l) => map.getLayer(l)) }).map((f) => f.properties.name)).size;
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
    const r = await addFireLayers(map, feats, sizes, lbl === "avoid" ? { beforeId: undefined, ignorePlacement: false } : { beforeId: "road-labels", ignorePlacement: true });
    window.__fire = { poiMm: +poiMm.toFixed(2), lbl, elements: els.length, symbols: r.total, stations: r.stations, defibs: feats.filter((f) => f.properties.icon === "defibrillator").length, badges: feats.filter((f) => f.properties.icon.startsWith("badge-")).length, boundaries: map.querySourceFeatures("ofm", { sourceLayer: "boundaries" }).length };
    await nextIdle();
    if (lbl === "avoid") {
      const added = addFallbackLabels();
      window.__fire.fallbackNames = added;
      if (added) await nextIdle();
    }
    finish();
  } else {
    finish();
  }
});

const nextIdle = () => new Promise((resolve) => { map.once("idle", resolve); map.triggerRepaint(); });

// Strassen, deren Name wegen der Symbole nirgends platziert werden konnte, bekommen ihren Namen einmal ueber den Symbolen.
function addFallbackLabels() {
  const KINDS = ["highway", "major_road", "minor_road"];
  const placed = new Set(map.queryRenderedFeatures({ layers: ["road-labels"] }).map((f) => f.properties.name));
  const all = new Set();
  for (const f of map.querySourceFeatures("p", { sourceLayer: "roads" })) {
    const p = f.properties || {};
    if (p.name && KINDS.includes(p.kind) && p.is_tunnel !== true) all.add(p.name);
  }
  const missing = [...all].filter((n) => !placed.has(n));
  if (!missing.length) return 0;
  const lay = (n) => map.getLayoutProperty("road-labels", n);
  const pt = (n) => map.getPaintProperty("road-labels", n);
  map.addLayer({
    id: "road-labels-fallback", type: "symbol", source: "p", "source-layer": "roads",
    filter: ["all", ["in", ["get", "name"], ["literal", missing]], ["in", ["get", "kind"], ["literal", KINDS]], ["!=", ["get", "is_tunnel"], true]],
    layout: {
      "symbol-placement": "line", "text-field": lay("text-field"), "text-font": lay("text-font"), "text-size": lay("text-size"),
      "text-letter-spacing": lay("text-letter-spacing"), "text-max-angle": lay("text-max-angle"), "text-padding": lay("text-padding"),
      "symbol-spacing": 400,
    },
    paint: { "text-color": pt("text-color"), "text-halo-color": pt("text-halo-color"), "text-halo-width": pt("text-halo-width") },
  });
  return missing.length;
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
  if (sheet) {
    const meta = await fetch("/meta.json").then((r) => r.json()).catch(() => null);
    const res = await composeSheet({
      map, scale, dpi, paperMm: [wMm, hMm], frame, meta, ui, index: indexOn, indexSize,
      title: "Orts- und Hydrantenplan",
      subtitle: [place, `Maßstab 1 : ${scale.toLocaleString("de-DE")} · Papier ${paper.toUpperCase()}`],
    });
    window.__sheet = res.pages;
    window.__sheetInfo = { mapDpi, index: res.indexCount, cellM: res.cellM, cols: res.cols, rows: res.rows, pages: res.pages.length };
    const out = document.getElementById("out");
    for (const url of res.pages) {
      const img = new Image();
      img.src = url;
      img.style.cssText = "display:block;margin:12px;background:#fff;box-shadow:0 0 8px rgba(0,0,0,.3);max-width:calc(100vw - 24px)";
      out.appendChild(img);
    }
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
