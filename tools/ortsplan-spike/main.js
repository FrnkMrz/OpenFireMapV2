import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { buildStyle, zoomForScale, CSS_PX_PER_MM } from "./style.js";
import { ICON_PX } from "./icons.js";
import { collectElements, buildFeatures, addFireLayers } from "./fire.js";

const PAPER_MM = { a4l: [297, 210], a4p: [210, 297], a3l: [420, 297], a3p: [297, 420] };
const q = new URLSearchParams(location.search);
const scale = +(q.get("scale") || 5000);
const paper = q.get("paper") || "a4l";
const dpi = +(q.get("dpi") || 96);
const mode = q.get("mode") || "plan"; // plan | real
const lat = +(q.get("lat") || 49.5252);
const lon = +(q.get("lon") || 11.3181);
const [wMm, hMm] = PAPER_MM[paper] || PAPER_MM.a4l;

// Formular
const form = document.getElementById("ctl");
for (const [k, v] of Object.entries({ scale, paper, dpi, mode, lat, lon })) form.elements[k].value = v;
document.getElementById("info").textContent =
  `1:${scale} · ${paper.toUpperCase()} · ${dpi} dpi · ${mode} · Bild ${Math.round(wMm * CSS_PX_PER_MM * dpi / 96)}×${Math.round(hMm * CSS_PX_PER_MM * dpi / 96)} px`;

const el = document.getElementById("map");
el.style.width = `${Math.round(wMm * CSS_PX_PER_MM)}px`;
el.style.height = `${Math.round(hMm * CSS_PX_PER_MM)}px`;

const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

const map = new maplibregl.Map({
  container: el,
  style: buildStyle({
    scale, mode,
    pmtilesUrl: `${location.origin}/neunkirchen.pmtiles`,
    ofmUrl: `${location.origin}/ofm.pmtiles`,
  }),
  center: [lon, lat],
  zoom: zoomForScale(scale, lat),
  pixelRatio: dpi / 96,
  maxCanvasSize: [8192, 8192],
  canvasContextAttributes: { preserveDrawingBuffer: true },
  attributionControl: false,
  fadeDuration: 0,
});
window.__map = map;
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
const sizes = { station: (poiMm * 1.15 * CSS_PX_PER_MM) / ICON_PX, poi: (poiMm * CSS_PX_PER_MM) / ICON_PX };
// lbl=top: Beschriftung liegt ueber den Symbolen (Standard); lbl=avoid: Namen weichen den Symbolen aus.
const lbl = q.get("lbl") || "top";
const withFire = q.get("fire") !== "0";
// Wie die App: Hydranten/Wasser innerhalb 5 m werden ab Zoom 17 (hier: Massstab 1:5000 und groesser) zusammengefasst.
const clusterPoi = scale <= 5000;

map.once("idle", async () => {
  if (withFire) {
    const els = collectElements(map);
    const feats = buildFeatures(els, { clusterPoi });
    const r = await addFireLayers(map, feats, sizes, lbl === "avoid" ? { beforeId: undefined, ignorePlacement: false } : { beforeId: "road-labels", ignorePlacement: true });
    window.__fire = { poiMm: +poiMm.toFixed(2), lbl, elements: els.length, symbols: r.total, stations: r.stations, defibs: feats.filter((f) => f.properties.icon === "defibrillator").length, badges: feats.filter((f) => f.properties.icon.startsWith("badge-")).length, boundaries: map.querySourceFeatures("ofm", { sourceLayer: "boundaries" }).length };
    map.once("idle", () => { window.__ready = true; });
    map.triggerRepaint();
  } else {
    window.__ready = true;
  }
});

document.getElementById("png").addEventListener("click", () => {
  map.getCanvas().toBlob((b) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `ortsplan-${scale}-${paper}-${dpi}dpi-${mode}.png`;
    a.click();
  });
});
