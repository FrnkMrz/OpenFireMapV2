// Ausschnitt waehlen: Uebersichtskarte mit rotem Rahmen in der Groesse des Kartenfensters (Papier, Lage, Format, Massstab).
// Die Karte wird unter dem Rahmen verschoben; die Mitte der Karte wird die Mitte des Blatts.
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol, PMTiles } from "pmtiles";
import { buildStyle } from "./style.js";
import { PAPER_MM, computeLayout, groundSizeM, metersPerPx, NICE_SCALES } from "./layout.js";

const q = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const areaName = (q.get("area") || "").replace(/[^a-z0-9-]/gi, "");
let areaInfo = null;
if (areaName) { try { areaInfo = await (await fetch(`/${areaName}.json`)).json(); } catch { /* ohne Beschreibung */ } }
const baseFile = areaName ? `${areaName}.pmtiles` : "neunkirchen.pmtiles";
const startLat = +(q.get("lat") || areaInfo?.lat || 49.5252);
const startLon = +(q.get("lon") || areaInfo?.lon || 11.3181);

for (const s of NICE_SCALES) $("scale").add(new Option(s.toLocaleString("de-DE"), String(s)));
$("paper").value = PAPER_MM[q.get("paper")] ? q.get("paper") : "a3l";
$("side").value = ["right", "left", "top", "bottom"].includes(q.get("side")) ? q.get("side") : "right";
$("fmt").value = [...$("fmt").options].some((o) => o.value === q.get("fmt")) ? q.get("fmt") : "fill";
const wantScale = +(q.get("scale") || 5000);
$("scale").value = String(NICE_SCALES.reduce((b, s) => (Math.abs(s - wantScale) < Math.abs(b - wantScale) ? s : b), NICE_SCALES[0]));

const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);
let header = null;
try { header = await new PMTiles(`${location.origin}/${baseFile}`).getHeader(); } catch { /* ohne Abdeckung */ }

const map = new maplibregl.Map({
  container: "map",
  style: buildStyle({ scale: 10000, mode: "plan", pmtilesUrl: `${location.origin}/${baseFile}` }),
  center: [startLon, startLat],
  zoom: 14,
  maxZoom: 19,
  attributionControl: false,
  // Nur Verschieben und Zoomen: Rahmen und Blatt sind nach Norden ausgerichtet; Drehen oder Kippen wuerde den Rahmen vom Blatt trennen
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  maxPitch: 0,
  ...(header ? { maxBounds: [[header.minLon, header.minLat], [header.maxLon, header.maxLat]] } : {}),
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
map.touchZoomRotate.disableRotation();
// Auch Tastatur (Umschalt + Pfeiltasten) und Programmaufrufe duerfen die Karte nicht drehen
map.on("rotate", () => { if (map.getBearing() !== 0) map.setBearing(0); });

function state() {
  const [wMm, hMm] = PAPER_MM[$("paper").value];
  const L = computeLayout({ wMm, hMm, side: $("side").value, fmt: $("fmt").value });
  const scale = +$("scale").value;
  return { L, scale, ground: groundSizeM(L.frame, scale) };
}

function update() {
  const { scale, ground } = state();
  const c = map.getCenter();
  const mpp = metersPerPx(map.getZoom(), c.lat);
  const f = $("frame");
  f.style.width = `${ground.w / mpp}px`;
  f.style.height = `${ground.h / mpp}px`;
  const km = (m) => (m / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 });
  $("frame-label").textContent = `${km(ground.w)} × ${km(ground.h)} km · 1:${scale.toLocaleString("de-DE")}`;
  const p = new URLSearchParams({ sheet: "1", dpi: "150", paper: $("paper").value, side: $("side").value, fmt: $("fmt").value, scale: String(scale), lat: c.lat.toFixed(5), lon: c.lng.toFixed(5) });
  if (areaName) p.set("area", areaName);
  $("go").href = `/?${p}`;
  // Liegt der Rahmen nicht ganz in den geladenen Daten, bleibt das Blatt dort leer
  const half = { w: ground.w / 2, h: ground.h / 2 };
  const dLat = half.h / 110540, dLon = half.w / (111320 * Math.cos((c.lat * Math.PI) / 180));
  const outside = header && (c.lng - dLon < header.minLon || c.lng + dLon > header.maxLon || c.lat - dLat < header.minLat || c.lat + dLat > header.maxLat);
  $("msg").className = outside ? "warn" : "";
  $("msg").textContent = outside
    ? "Achtung: Der Rahmen ragt über die geladenen Kartendaten hinaus; dort bleibt das Blatt leer. Rahmen kleiner machen (Maßstab) oder Daten für den Ort holen (extract-area.mjs)."
    : `Mitte ${c.lat.toFixed(5)} N, ${c.lng.toFixed(5)} E. Karte verschieben und zoomen: Der rote Rahmen ist der Ausschnitt des Blatts.`;
}

function fit() {
  const { ground } = state();
  const box = $("wrap").getBoundingClientRect();
  const c = map.getCenter();
  const mppNeeded = Math.max(ground.w / (0.8 * box.width), ground.h / (0.8 * box.height));
  map.setZoom(Math.log2((78271.517 * Math.cos((c.lat * Math.PI) / 180)) / mppNeeded));
}

for (const id of ["paper", "side", "fmt", "scale"]) $(id).addEventListener("change", () => { fit(); update(); });
$("fit").addEventListener("click", () => { fit(); update(); });
map.on("move", update);
map.once("load", () => { fit(); update(); window.__pickReady = true; });
window.__pickMap = map;
