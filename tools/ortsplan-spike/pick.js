// Ortsplan erstellen: Assistent in drei Schritten (Ausschnitt, Format, Legende).
// Der Rahmen ist das Kartenfenster des Blatts: am Griff oben verschieben, an Kanten und Ecken aufziehen.
// Frei (Standard): jede Seite einzeln, das Blatt nimmt das Seitenverhältnis des Rahmens an, der Maßstab ergibt sich. Fest: Seitenverhältnis des Blatts, Ecken ändern nur den Maßstab.
// Karte (Verschieben, Zoom) und Rahmen sind getrennt: der Rahmen klebt am Ort (Mitte in Grad), nicht am Bildschirm.
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol, PMTiles } from "pmtiles";
import { buildStyle } from "./style.js";
import { PAPER_MM, SIDES, computeLayout, groundSizeM, metersPerPx, NICE_SCALES } from "./layout.js";
import { resizeFromCorner, resizeFree, snapScale, clampCenterPx, ratioFmt, parseRatioFmt, roundUpScale, RATIO_MIN, RATIO_MAX } from "./framegeo.js";

const q = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const areaName = (q.get("area") || "").replace(/[^a-z0-9-]/gi, "");
let areaInfo = null;
if (areaName) { try { areaInfo = await (await fetch(`/${areaName}.json`)).json(); } catch { /* ohne Beschreibung */ } }
const baseFile = areaName ? `${areaName}.pmtiles` : "neunkirchen.pmtiles";
const startLat = +(q.get("lat") || areaInfo?.lat || 49.5252);
const startLon = +(q.get("lon") || areaInfo?.lon || 11.3181);

// ---- Einstellungen: Standard, zuletzt benutzt (localStorage, darf fehlen), Adresse gewinnt ----
const KEY = "ofm_ortsplan_wizard";
const DEFAULTS = { size: "a2", orient: "l", fmt: "fill", free: true, ratio: 0, round: false, side: "left", scale: 4000, lsym: true, lroad: true, index: true, icols: 0, isize: 1, dpi: 150 };
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { /* ohne Speicher */ }
const S = { ...DEFAULTS };
const num = (v, lo, hi, d) => (Number.isFinite(+v) && v !== "" && v !== null && v !== undefined ? Math.min(hi, Math.max(lo, +v)) : d);
function apply(src) {
  const paper = PAPER_MM[src.paper] ? src.paper : PAPER_MM[`${src.size}${src.orient}`] ? `${src.size}${src.orient}` : null;
  if (paper) { S.size = paper.slice(0, 2); S.orient = paper.slice(2); }
  // Kartenformat: ein Wert aus der Liste heißt fester Rahmen, "1.6234:1" ein freier Rahmen (so kommt es auch vom Blatt zurück)
  const rf = parseRatioFmt(src.fmt);
  if (rf) { S.free = true; S.ratio = rf; } else if ([...$("fmt").options].some((o) => o.value === src.fmt)) { S.fmt = src.fmt; S.free = false; }
  if (src.free !== undefined && src.free !== null) S.free = src.free === true || src.free === "1";
  if (+src.ratio >= RATIO_MIN && +src.ratio <= RATIO_MAX) S.ratio = +src.ratio;
  if (SIDES.includes(src.side)) S.side = src.side;
  if (+src.scale > 0) S.scale = Math.max(100, Math.round(+src.scale));
  for (const k of ["lsym", "lroad", "index", "round"]) if (src[k] !== undefined && src[k] !== null) S[k] = src[k] === true || src[k] === "1";
  S.icols = Math.round(num(src.icols, 0, 6, S.icols));
  S.isize = num(src.isize, 0.5, 3, S.isize);
  if ([96, 150, 200, 300].includes(+src.dpi)) S.dpi = +src.dpi;
}
apply(saved);
apply(Object.fromEntries(q.entries()));
if (!S.free) S.scale = snapScale(S.scale);
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* ohne Speicher */ } };

for (const s of NICE_SCALES) $("scale").add(new Option(s.toLocaleString("de-DE"), String(s)));

// ---- Karte ----
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
  // Nur Verschieben und Zoomen: Rahmen und Blatt sind nach Norden ausgerichtet; Drehen oder Kippen würde den Rahmen vom Blatt trennen
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  maxPitch: 0,
  ...(header ? { maxBounds: [[header.minLon, header.minLat], [header.maxLon, header.maxLat]] } : {}),
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
map.touchZoomRotate.disableRotation();
// Auch Tastatur (Umschalt + Pfeiltasten) und Programmaufrufe dürfen die Karte nicht drehen
map.on("rotate", () => { if (map.getBearing() !== 0) map.setBearing(0); });

// Rahmen: Mitte in Grad und Maßstab (S.scale)
let fc = { lng: startLon, lat: startLat };

const paperKey = () => `${S.size}${S.orient}`;
const layoutFmt = () => (S.free ? ratioFmt(S.ratio) : S.fmt);
function layout() {
  const [wMm, hMm] = PAPER_MM[paperKey()];
  const L = computeLayout({ wMm, hMm, side: S.side, fmt: layoutFmt() });
  return { wMm, hMm, L, ground: groundSizeM(L.frame, S.scale) };
}
// Freier Rahmen: Seitenverhältnis zuerst vom Blatt (Papier füllen), danach vom Rahmen
if (!(S.ratio > 0)) { const f = computeLayout({ wMm: PAPER_MM[paperKey()][0], hMm: PAPER_MM[paperKey()][1], side: S.side, fmt: "fill" }).frame; S.ratio = f.w / f.h; }
/** Breite des Kartenfensters in mm bei einem Seitenverhältnis (Papier und Lage der Legende wie gewählt). */
const windowWmm = (ratio) => { const [wMm, hMm] = PAPER_MM[paperKey()]; return computeLayout({ wMm, hMm, side: S.side, fmt: ratioFmt(ratio) }).frame.w; };
/** Gewünschten Maßstab auf einen druckbaren abbilden: beim Ziehen auf 10 aufgerundet, mit Runden auf einen Standardmaßstab. */
const pickScale = (exact, final = false) => (S.round && final ? roundUpScale(exact) : Math.max(100, Math.ceil(exact / 10) * 10));
/** Ändert fn Papier oder Lage, bleibt im freien Modus der Ausschnitt in Metern gleich; der Maßstab folgt. */
function keepGround(fn) {
  const g = layout().ground;
  fn();
  if (S.free) S.scale = pickScale((g.w * 1000) / layout().L.frame.w, true);
}
const km = (m) => (m / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 });

/** Rahmen auf dem Bildschirm: Mitte aus der Karte, Größe aus dem Maßstab. */
function frameBox() {
  const { ground } = layout();
  const mpp = metersPerPx(map.getZoom(), fc.lat);
  const p = map.project([fc.lng, fc.lat]);
  return { cx: p.x, cy: p.y, w: ground.w / mpp, h: ground.h / mpp, mpp };
}

function drawFrame() {
  const b = frameBox();
  const f = $("frame");
  f.style.left = `${b.cx - b.w / 2}px`;
  f.style.top = `${b.cy - b.h / 2}px`;
  f.style.width = `${b.w}px`;
  f.style.height = `${b.h}px`;
  f.classList.toggle("tight", b.cy - b.h / 2 < 56);
}

function goLink() {
  const p = new URLSearchParams({
    sheet: "1", dpi: String(S.dpi), paper: paperKey(), side: S.side, fmt: layoutFmt(), scale: String(S.scale),
    lat: fc.lat.toFixed(5), lon: fc.lng.toFixed(5), index: S.index ? "1" : "0", lsym: S.lsym ? "1" : "0", lroad: S.lroad ? "1" : "0",
    icols: String(S.icols), isize: String(S.isize),
  });
  if (areaName) p.set("area", areaName);
  return `/?${p}`;
}

function updateText() {
  const { wMm, hMm, ground } = layout();
  $("frame-label").textContent = `${km(ground.w)} × ${km(ground.h)} km · 1:${S.scale.toLocaleString("de-DE")}`;
  $("size-info").textContent = `${wMm} × ${hMm} mm · die Karte deckt ${km(ground.w)} × ${km(ground.h)} km ab${S.free ? ", mit dem Seitenverhältnis des Rahmens" : ""}`;
  $("area-info").textContent = `Mitte ${fc.lat.toFixed(5)} N, ${fc.lng.toFixed(5)} E`;
  $("go").href = goLink();
  // Liegt der Rahmen nicht ganz in den geladenen Daten, bleibt das Blatt dort leer
  const dLat = ground.h / 2 / 110540, dLon = ground.w / 2 / (111320 * Math.cos((fc.lat * Math.PI) / 180));
  const outside = header && (fc.lng - dLon < header.minLon || fc.lng + dLon > header.maxLon || fc.lat - dLat < header.minLat || fc.lat + dLat > header.maxLat);
  $("msg").className = outside ? "warn" : "";
  $("msg").textContent = outside
    ? "Der Rahmen ragt über die geladenen Kartendaten hinaus; dort bleibt das Blatt leer. Rahmen kleiner oder verschieben."
    : "Der Rahmen liegt komplett im Datengebiet.";
}

// ---- Vorschau der Blattaufteilung (Schritt 3), aus denselben Maßen wie das Blatt ----
function drawPreview() {
  const { wMm, hMm, L } = layout();
  const prev = $("prev");
  prev.style.aspectRatio = `${wMm} / ${hMm}`;
  const pct = (r, el) => { el.style.left = `${(r.x / wMm) * 100}%`; el.style.top = `${(r.y / hMm) * 100}%`; el.style.width = `${(r.w / wMm) * 100}%`; el.style.height = `${(r.h / hMm) * 100}%`; };
  pct(L.frame, $("pv-map"));
  $("pv-map").textContent = `Karte 1:${S.scale.toLocaleString("de-DE")}`;
  pct(L.panel, $("pv-panel"));
  const horizontal = S.side === "top" || S.side === "bottom";
  const pn = $("pv-panel");
  pn.style.flexDirection = horizontal ? "row" : "column";
  const blocks = ["Titel", ...(S.lsym || S.lroad ? ["Legende"] : []), "Maßstab", ...(S.index ? ["Verzeichnis"] : [])];
  pn.replaceChildren(...blocks.map((t) => { const s = document.createElement("span"); s.textContent = t; if (t === "Verzeichnis") s.style.flex = "2"; return s; }));
}

function refresh() {
  persist();
  for (const [id, key] of [["g-size", "size"], ["g-orient", "orient"], ["g-side", "side"]]) {
    for (const b of $(id).children) b.setAttribute("aria-pressed", String(b.dataset.v === S[key]));
  }
  const scales = [...new Set([...NICE_SCALES, S.scale])].sort((a, b) => a - b);
  $("scale").replaceChildren(...scales.map((v) => new Option(v.toLocaleString("de-DE"), String(v))));
  $("scale").value = String(S.scale);
  $("fmt").value = S.fmt;
  for (const b of $("g-free").children) b.setAttribute("aria-pressed", String((b.dataset.v === "1") === S.free));
  $("frame").classList.toggle("fixed", !S.free);
  $("fmt-wrap").hidden = S.free;
  $("c-round").checked = S.round; $("c-round").closest("label").hidden = !S.free;
  $("hint-frame").textContent = S.free
    ? "Ziehe den Rahmen an den Kanten und Ecken so auf, wie du den Ausschnitt brauchst. Papier und Rahmen bestimmen den Maßstab."
    : "Der Rahmen hat das Seitenverhältnis des Blatts (Schritt 2). An den Ecken ziehen macht ihn größer oder kleiner und ändert den Maßstab.";
  $("c-sym").checked = S.lsym; $("c-road").checked = S.lroad; $("c-index").checked = S.index;
  $("o-dpi").value = String(S.dpi); $("o-icols").value = String(S.icols); $("o-isize").value = String(S.isize);
  drawFrame(); updateText(); drawPreview();
}

function fit() {
  const { ground } = layout();
  const box = $("wrap").getBoundingClientRect();
  const mppNeeded = Math.max(ground.w / (0.7 * box.width), ground.h / (0.7 * (box.height - 40)));
  map.jumpTo({ center: [fc.lng, fc.lat], zoom: Math.log2((78271.517 * Math.cos((fc.lat * Math.PI) / 180)) / mppNeeded) });
}

// ---- Eingaben ----
const chips = (id, items, key, refit) => {
  $(id).replaceChildren(...items.map(([v, t]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.dataset.v = v; b.textContent = t;
    b.addEventListener("click", () => { keepGround(() => { S[key] = v; }); if (refit) fit(); refresh(); });
    return b;
  }));
};
chips("g-size", [["a4", "A4"], ["a3", "A3"], ["a2", "A2"], ["a1", "A1"]], "size", true);
chips("g-orient", [["l", "Quer"], ["p", "Hoch"]], "orient", true);
chips("g-side", [["top", "Oben"], ["bottom", "Unten"], ["left", "Links"], ["right", "Rechts"]], "side", true);
$("scale").addEventListener("change", () => { S.scale = +$("scale").value; fit(); refresh(); });
$("fmt").addEventListener("change", () => { S.fmt = $("fmt").value; fit(); refresh(); });
// Rahmenform: Frei oder wie das Blatt. Beim Umschalten bleibt der Rahmen, wie er ist (frei übernimmt das Seitenverhältnis des Blatts, fest rastet den Maßstab ein)
function setFree(free) {
  if (free === S.free) return;
  if (free) { const { L } = layout(); S.ratio = L.frame.w / L.frame.h; } else S.scale = snapScale(S.scale);
  S.free = free; fit(); refresh();
}
$("g-free").replaceChildren(...[["1", "Frei"], ["0", "Wie das Blatt"]].map(([v, t]) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip"; b.dataset.v = v; b.textContent = t;
  b.addEventListener("click", () => setFree(v === "1"));
  return b;
}));
$("c-round").addEventListener("change", () => { S.round = $("c-round").checked; if (S.round && S.free) S.scale = roundUpScale(S.scale); fit(); refresh(); });
$("fit").addEventListener("click", () => { fit(); refresh(); });
for (const [id, key] of [["c-sym", "lsym"], ["c-road", "lroad"], ["c-index", "index"]]) $(id).addEventListener("change", () => { S[key] = $(id).checked; refresh(); });
$("o-dpi").addEventListener("change", () => { S.dpi = +$("o-dpi").value; refresh(); });
$("o-icols").addEventListener("change", () => { S.icols = Math.round(num($("o-icols").value, 0, 6, 0)); refresh(); });
$("o-isize").addEventListener("change", () => { S.isize = num($("o-isize").value, 0.5, 3, 1); refresh(); });

// Schritte
let step = 0;
function go(n) {
  step = Math.max(0, Math.min(2, n));
  document.querySelectorAll(".sec").forEach((s) => s.classList.toggle("on", +s.dataset.s === step));
  document.querySelectorAll(".st").forEach((b) => { if (+b.dataset.s === step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
  $("back").hidden = step === 0;
  $("next").hidden = step === 2;
  $("go").hidden = step !== 2;
}
document.querySelectorAll(".st").forEach((b) => b.addEventListener("click", () => go(+b.dataset.s)));
$("back").addEventListener("click", () => go(step - 1));
$("next").addEventListener("click", () => go(step + 1));

// Rahmen verschieben (Leiste) und Größe ändern (Ecken)
const wrapPt = (e) => { const r = $("wrap").getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const setCenterPx = (c) => { const ll = map.unproject([c.x, c.y]); fc = { lng: ll.lng, lat: ll.lat }; };
$("grip").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  $("grip").setPointerCapture(e.pointerId);
  const start = wrapPt(e), b = frameBox();
  const view = { w: $("wrap").clientWidth, h: $("wrap").clientHeight };
  const move = (ev) => { const p = wrapPt(ev); setCenterPx(clampCenterPx({ x: b.cx + p.x - start.x, y: b.cy + p.y - start.y }, view)); refresh(); };
  const up = () => { $("grip").removeEventListener("pointermove", move); $("grip").removeEventListener("pointerup", up); $("grip").removeEventListener("pointercancel", up); };
  $("grip").addEventListener("pointermove", move); $("grip").addEventListener("pointerup", up); $("grip").addEventListener("pointercancel", up);
});
document.querySelectorAll(".handle").forEach((h) => h.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  h.setPointerCapture(e.pointerId);
  const b = frameBox(), c = h.dataset.c;
  const rect = { l: b.cx - b.w / 2, t: b.cy - b.h / 2, r: b.cx + b.w / 2, b: b.cy + b.h / 2 };
  // Wo der Griff beim Anfassen sitzt: der Rahmen springt nicht um die Griffgröße
  const grab = { x: c.includes("w") ? rect.l : c.includes("e") ? rect.r : b.cx, y: c.includes("n") ? rect.t : c.includes("s") ? rect.b : b.cy };
  const start = wrapPt(e), off = { x: start.x - grab.x, y: start.y - grab.y };
  const anchor = { x: c.includes("w") ? rect.r : rect.l, y: c.includes("n") ? rect.b : rect.t };
  const { L } = layout();
  let last = start;
  const resize = (final) => {
    const pointer = { x: last.x - off.x, y: last.y - off.y };
    const r = S.free
      ? resizeFree({ rect, handle: c, pointer, mpp: b.mpp, frameWmm: windowWmm, pickScale: (x) => pickScale(x, final) })
      : resizeFromCorner({ anchor, pointer: last, aspect: L.frame.w / L.frame.h, mpp: b.mpp, frameWmm: L.frame.w });
    S.scale = r.scale; if (S.free) S.ratio = r.ratio; setCenterPx(r.center); refresh();
  };
  const move = (ev) => { last = wrapPt(ev); resize(false); };
  const up = () => {
    h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up);
    if (S.free && S.round) resize(true); // erst beim Loslassen auf den Standardmaßstab einrasten
    // Wurde der Rahmen groesser als die Ansicht, zoomt die Karte heraus: sonst lägen die Ecken ausserhalb und liessen sich nicht mehr greifen
    const bb = frameBox(), wrap = $("wrap");
    if (bb.w > 0.9 * wrap.clientWidth || bb.h > 0.9 * (wrap.clientHeight - 40)) { fit(); refresh(); }
  };
  h.addEventListener("pointermove", move); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
}));
// Tastatur: Pfeiltasten verschieben (mit Umschalt weiter), Plus/Minus ändern den Maßstab
$("frame").addEventListener("keydown", (e) => {
  const d = e.shiftKey ? 100 : 20, b = frameBox();
  const view = { w: $("wrap").clientWidth, h: $("wrap").clientHeight };
  const dir = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
  if (dir) setCenterPx(clampCenterPx({ x: b.cx + dir[0], y: b.cy + dir[1] }, view));
  else if (e.key === "+" || e.key === "-") {
    // + = Rahmen größer (größere Maßstabszahl), - = kleiner; frei ohne Runden in Viertelschritten, sonst von Standardwert zu Standardwert
    if (S.free && !S.round) S.scale = pickScale(S.scale * (e.key === "+" ? 1.25 : 0.8));
    else {
      const i = NICE_SCALES.indexOf(snapScale(S.scale)) + (e.key === "+" ? 1 : -1);
      if (i >= 0 && i < NICE_SCALES.length) S.scale = NICE_SCALES[i];
    }
  } else return;
  e.preventDefault(); refresh();
});

map.on("move", () => { drawFrame(); });
map.once("load", () => { go(0); fit(); refresh(); window.__pickReady = true; });
window.__pickMap = map;
window.__wizard = { state: () => ({ ...S, center: { ...fc } }), go, frameBox, goLink };
