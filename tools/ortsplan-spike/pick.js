// Ortsplan erstellen: Assistent in zwei Schritten (Ausschnitt und Format, Legende).
// Der Rahmen ist das Kartenfenster des Blatts: am Griff oben verschieben, an Kanten und Ecken aufziehen.
// Frei (Standard): jede Seite einzeln, das Blatt nimmt das Seitenverhältnis des Rahmens an, der Maßstab ergibt sich. Fest: Seitenverhältnis des Blatts, Ecken ändern nur den Maßstab.
// Karte (Verschieben, Zoom) und Rahmen sind getrennt: der Rahmen klebt am Ort (Mitte in Grad), nicht am Bildschirm.
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol, PMTiles } from "pmtiles";
import { buildStyle } from "./style.js";
import { PAPER_MM, ALL_SIDES, computeLayout, groundSizeM, metersPerPx, NICE_SCALES } from "./layout.js";
import { parsePos, formatPos, clampPos, estimateSizes, estimateTitle, defaultPos, rectsOverlap, blockRect, blockDims, snapMap, clampGroupOffset } from "./freelayout.js";
import { resizeFromCorner, resizeFree, snapScale, clampCenterPx, ratioFmt, parseRatioFmt, roundUpScale, pickFreeScale, MIN_SCALE, RATIO_MIN, RATIO_MAX } from "./framegeo.js";

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
const DEFAULTS = { size: "a2", orient: "l", fmt: "fill", free: true, ratio: 0, round: false, side: "left", manual: false, pos: null, onmap: false, obg: "white", scale: 4000, lsym: true, lroad: true, index: true, icols: 0, isize: 1, iauto: true, dpi: 150 };
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
  if (ALL_SIDES.includes(src.side)) S.side = src.side;
  // freie Lage der Bloecke: aus der Adresse als Text (pos=l:..), aus dem Speicher als Objekt
  const pp = typeof src.pos === "string" ? parsePos(src.pos) : src.pos && typeof src.pos === "object" ? clampPos(src.pos) : null;
  if (pp) {
    S.pos = pp; S.posKey = typeof src.posKey === "string" ? src.posKey : null; // posKey null: gehoert zum Layout, das die Adresse beschreibt (wird unten gesetzt)
    // Nur wenn Bloecke genannt sind, liegen sie frei; steht dort nur Titel und/oder Karte (t, m), bleibt die feste Leiste und folgt der Karte
    if (["legend", "scale", "source", "north", "index"].some((k) => pp[k])) S.manual = true;
  }
  if (src.manual !== undefined && src.manual !== null) S.manual = src.manual === true || src.manual === "1";
  if (src.onmap !== undefined && src.onmap !== null) S.onmap = src.onmap === true || src.onmap === "1";
  if (["white", "clear"].includes(src.obg)) S.obg = src.obg;
  if (+src.scale > 0) S.scale = Math.max(MIN_SCALE, Math.round(+src.scale));
  for (const k of ["lsym", "lroad", "index", "round", "iauto"]) if (src[k] !== undefined && src[k] !== null) S[k] = src[k] === true || src[k] === "1";
  S.icols = Math.round(num(src.icols, 0, 6, S.icols));
  S.isize = num(src.isize, 0.5, 3, S.isize);
  if ([96, 150, 200, 300].includes(+src.dpi)) S.dpi = +src.dpi;
}
apply(saved);
apply(Object.fromEntries(q.entries()));
if (!S.free) S.scale = snapScale(S.scale);
// Texte des Blatts: gehoeren zum Ort und werden darum nicht gemerkt; der Ortsname wird aus der Kartenmitte vorgeschlagen, bis man ihn selbst aendert
const T = { place: q.get("place") || "", title: q.get("title") || "", placeEdited: !!q.get("place") };
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

const ratioText = (r) => r.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const paperKey = () => `${S.size}${S.orient}`;
const layoutFmt = () => (S.free ? ratioFmt(S.ratio) : S.fmt);
/** "Papier füllen" nennt das Verhältnis, das das Kartenfenster bei diesem Papier und dieser Lage der Legende wirklich hat (die Seitenleiste nimmt Platz weg). */
function fillOption() {
  const [wMm, hMm] = PAPER_MM[paperKey()];
  const f = computeLayout({ wMm, hMm, side: S.side, fmt: "fill" }).frame;
  $("fmt").options[0].textContent = `Papier füllen (Verhältnis ${ratioText(f.w / f.h)})`;
}
function layout() {
  const [wMm, hMm] = PAPER_MM[paperKey()];
  const L = computeLayout({ wMm, hMm, side: S.side, fmt: layoutFmt() });
  return { wMm, hMm, L, ground: groundSizeM(L.frame, S.scale) };
}
// Freier Rahmen: Seitenverhältnis zuerst vom Blatt (Papier füllen), danach vom Rahmen
if (!(S.ratio > 0)) { const f = computeLayout({ wMm: PAPER_MM[paperKey()][0], hMm: PAPER_MM[paperKey()][1], side: S.side, fmt: "fill" }).frame; S.ratio = f.w / f.h; }
/** Breite des Kartenfensters in mm bei einem Seitenverhältnis (Papier und Lage der Legende wie gewählt). */
const windowWmm = (ratio) => { const [wMm, hMm] = PAPER_MM[paperKey()]; return computeLayout({ wMm, hMm, side: S.side, fmt: ratioFmt(ratio) }).frame.w; };
/** Gewünschten Maßstab auf einen druckbaren abbilden (nie unter 1:1000): beim Ziehen auf 10 aufgerundet, mit Runden auf einen Standardmaßstab. */
const pickScale = (exact, final = false) => pickFreeScale(exact, S.round && final);
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

// ---- Freie Anordnung der Bloecke: Standardlage nach der gewaehlten Seite, eigene Lage darueber ----
const isManual = () => S.manual || S.side === "none";
// Eigene Lagen gelten nur zu dem Layout (Papier, Seite, Kartenformat), mit dem sie gemerkt wurden; sonst gilt wieder die Standardlage
const layoutKey = () => `${paperKey()}|${S.side}|${layoutFmt()}`;
if (S.pos && S.posKey === null) S.posKey = layoutKey();
const ownPos = () => (S.pos && S.posKey === layoutKey() ? S.pos : null);
/** Groesse der Bloecke als Anteil des Papiers (geschaetzt): damit bleibt ein Block ganz im Papier, nicht nur seine Ecke. */
const dimsNow = () => { const [wMm, hMm] = PAPER_MM[paperKey()]; return blockDims({ lsym: S.lsym, lroad: S.lroad, ui: Math.max(1, Math.max(wMm, hMm) / 420), W: wMm, H: hMm, frame: layout().L.frame, title: T.title, place: T.place }); };
const curPos = () => {
  const pos = clampPos({ ...defaultPos({ paper: paperKey(), side: S.side, fmt: layoutFmt(), lsym: S.lsym, lroad: S.lroad }), ...(ownPos() || {}) }, dimsNow());
  if (!isManual() && pos.map) pos.map = groupClampMap(pos.map); // feste Leiste: Karte und Leiste bleiben zusammen im Papier
  return pos;
};
/** Bei fester Leiste wandern Karte und Leiste gemeinsam: Lage der Karte (Anteil des Papiers) so klemmen, dass beide im Papier bleiben. */
function groupClampMap(m) {
  const { L, wMm, hMm } = layout();
  const d = clampGroupOffset({ frame: L.frame, panel: L.panel, W: wMm, H: hMm, ui: L.ui, dx: m.x * wMm - L.frame.x, dy: m.y * hMm - L.frame.y });
  return { x: (L.frame.x + d.dx) / wMm, y: (L.frame.y + d.dy) / hMm };
}
const resetPos = () => { S.pos = null; S.posKey = undefined; };
const onMapOk = () => S.side === "none" || S.onmap; // ohne Leiste liegen die Bloecke zwangslaeufig auf der Karte
/** Liegt ein Block (geschaetzt) ganz oder teilweise auf dem Kartenfenster? */
function overlapsMap(pos, name) {
  const { L, wMm, hMm } = layout();
  const r = blockRect(name, pos, { lsym: S.lsym, lroad: S.lroad, ui: L.ui, W: wMm, H: hMm, title: T.title, place: T.place });
  const f = pos.map ? { x: pos.map.x, y: pos.map.y } : { x: L.frame.x / wMm, y: L.frame.y / hMm }; // das Kartenfenster kann verschoben sein
  return !!r && rectsOverlap(r, { ...f, w: L.frame.w / wMm, h: L.frame.h / hMm });
}
const anyOnMap = (pos) => ["title", "legend", "scale", "north", "source", "index"].some((n) => (n !== "index" || S.index) && overlapsMap(pos, n));

function goLink() {
  const p = new URLSearchParams({
    sheet: "1", dpi: String(S.dpi), paper: paperKey(), side: S.side, fmt: layoutFmt(), scale: String(S.scale),
    lat: fc.lat.toFixed(5), lon: fc.lng.toFixed(5), index: S.index ? "1" : "0", lsym: S.lsym ? "1" : "0", lroad: S.lroad ? "1" : "0",
    icols: String(S.icols), isize: String(S.isize), iauto: S.iauto ? "1" : "0",
  });
  if (isManual()) {
    p.set("pos", formatPos(curPos()));
    if (onMapOk()) p.set("onmap", "1");
    if (S.obg === "clear") p.set("obg", "clear");
  } else if (ownPos()?.title || ownPos()?.map) {
    // feste Leiste: nur Titel und Karte (die Leiste folgt der Karte); ohne eigene Verschiebung bleibt die Adresse unveraendert
    const c = curPos();
    p.set("pos", formatPos({ title: c.title, map: c.map }));
  }
  if (areaName) p.set("area", areaName);
  if (T.place) p.set("place", T.place);
  if (T.title) p.set("title", T.title);
  return `/?${p}`;
}

function updateText() {
  const { wMm, hMm, ground, L } = layout();
  $("frame-label").textContent = `${km(ground.w)} × ${km(ground.h)} km · 1:${S.scale.toLocaleString("de-DE")}`;
  $("size-info").textContent = `Blatt ${wMm} × ${hMm} mm, Kartenfenster ${Math.round(L.frame.w)} × ${Math.round(L.frame.h)} mm (Verhältnis ${ratioText(L.frame.w / L.frame.h)}) · die Karte deckt ${km(ground.w)} × ${km(ground.h)} km ab${S.free ? ", mit dem Seitenverhältnis des Rahmens" : ""}`;
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

// ---- Vorschau der Blattaufteilung (Schritt 2), aus denselben Maßen wie das Blatt ----
function drawPreview() {
  const { wMm, hMm, L } = layout();
  const prev = $("prev");
  prev.style.aspectRatio = `${wMm} / ${hMm}`;
  $("pv-map").textContent = `Karte 1:${S.scale.toLocaleString("de-DE")}`;
  $("pv-title").replaceChildren(...[T.title || "Orts- und Hydrantenplan", T.place || "Ortsname"].map((t) => { const s = document.createElement("span"); s.textContent = t; return s; }));
  const manual = isManual();
  $("pv-panel").hidden = manual;
  drawBlocks(manual, L, wMm, hMm);
  const horizontal = S.side === "top" || S.side === "bottom";
  const pn = $("pv-panel");
  pn.style.flexDirection = horizontal ? "row" : "column";
  const blocks = [...(S.lsym || S.lroad ? ["Legende"] : []), "Maßstab", ...(S.index ? ["Verzeichnis"] : [])];
  pn.replaceChildren(...blocks.map((t) => { const s = document.createElement("span"); s.textContent = t; if (t === "Verzeichnis") s.style.flex = "2"; return s; }));
}

/** Kaesten der vier Bloecke in der Vorschau (nur bei freier Anordnung): Lage aus S.pos, Groesse geschaetzt (das Blatt zeichnet die echten Masse). */
function drawBlocks(manual, L, wMm, hMm) {
  const pos = curPos(), sz = estimateSizes({ lsym: S.lsym, lroad: S.lroad });
  // Titel und Karte: bei freier Anordnung an ihrer eigenen Lage (verschiebbar), sonst an der Lage, die die Seitenleiste vorgibt
  const place = (el, r) => { el.style.left = `${(r.x / wMm) * 100}%`; el.style.top = `${(r.y / hMm) * 100}%`; el.style.width = `${(r.w / wMm) * 100}%`; el.style.height = `${(r.h / hMm) * 100}%`; };
  const t = estimateTitle({ title: T.title, place: T.place });
  const mapAt = { x: pos.map.x * wMm, y: pos.map.y * hMm };
  place($("pv-map"), { ...mapAt, w: L.frame.w, h: L.frame.h });
  place($("pv-title"), { x: pos.title.x * wMm, y: pos.title.y * hMm, w: t.w * L.ui, h: t.h * L.ui });
  place($("pv-panel"), { x: L.panel.x + (mapAt.x - L.frame.x), y: L.panel.y + (mapAt.y - L.frame.y), w: L.panel.w, h: L.panel.h }); // die Leiste folgt der Karte
  for (const [el, label] of [[$("pv-title"), "Titel verschieben"], [$("pv-map"), "Karte verschieben"]]) {
    el.classList.add("mv"); el.tabIndex = 0; el.setAttribute("role", "button"); el.setAttribute("aria-label", label);
  }
  $("mv-hint").hidden = manual;
  for (const name of ["legend", "scale", "north", "source", "index"]) {
    const el = $(`pv-b-${name}`), p = pos[name];
    const show = manual && p && (name !== "legend" || sz.legend) && (name !== "index" || S.index);
    el.hidden = !show;
    if (!show) continue;
    const w = name === "index" ? p.w : (sz[name].w * L.ui) / wMm, h = name === "index" ? p.h : (sz[name].h * L.ui) / hMm;
    el.style.left = `${p.x * 100}%`; el.style.top = `${p.y * 100}%`; el.style.width = `${w * 100}%`; el.style.height = `${h * 100}%`;
  }
  $("pos-hint").hidden = !manual; $("pos-reset-wrap").hidden = !(manual || ownPos());
  $("onmap-wrap").hidden = !manual; $("obg-wrap").hidden = !(manual && onMapOk());
  $("c-onmap").checked = onMapOk(); $("c-onmap").disabled = S.side === "none";
  for (const b of $("g-obg").children) b.setAttribute("aria-pressed", String(b.dataset.v === S.obg));
  $("c-manual").checked = manual; $("c-manual").disabled = S.side === "none";
}

function refresh() {
  persist();
  if (step === 1) scheduleSuggest();
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
  fillOption();
  $("c-round").checked = S.round; $("c-round").closest("label").hidden = !S.free;
  $("hint-frame").textContent = S.free
    ? "Ziehe den Rahmen an den Kanten und Ecken so auf, wie du den Ausschnitt brauchst. Papier und Rahmen bestimmen den Maßstab."
    : "Der Rahmen hat das Seitenverhältnis des gewählten Blatts (Papier, Ausrichtung und Kartenform darunter). An den Ecken ziehen macht ihn größer oder kleiner und ändert den Maßstab.";
  $("c-sym").checked = S.lsym; $("c-road").checked = S.lroad; $("c-index").checked = S.index;
  $("o-place").value = T.place; $("o-title").value = T.title; $("o-dpi").value = String(S.dpi); $("o-iauto").checked = S.iauto; $("o-icols").value = String(S.icols); $("o-isize").value = String(S.isize);
  drawFrame(); updateText(); drawPreview();
}

function fit() {
  const { ground } = layout();
  const box = $("wrap").getBoundingClientRect();
  const mppNeeded = Math.max(ground.w / (0.7 * box.width), ground.h / (0.7 * (box.height - 40)));
  map.jumpTo({ center: [fc.lng, fc.lat], zoom: Math.log2((78271.517 * Math.cos((fc.lat * Math.PI) / 180)) / mppNeeded) });
}

// ---- Eingaben ----
/** Hoch: eine Seitenleiste links oder rechts liesse nur ein schmales Kartenfenster (A3 hoch: Verhaeltnis 0,52 statt 0,71); darum steht die Legende dort standardmaessig unten. Zurueck auf Quer wieder links. */
const sideForOrient = (orient, side) => (orient === "p" && (side === "left" || side === "right") ? "bottom" : orient === "l" && side === "bottom" ? "left" : side);
const chips = (id, items, key, refit) => {
  $(id).replaceChildren(...items.map(([v, t]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.dataset.v = v; b.textContent = t;
    b.addEventListener("click", () => { keepGround(() => { S[key] = v; if (key === "orient") S.side = sideForOrient(v, S.side); resetPos(); }); if (refit) fit(); refresh(); }); // andere Lage oder anderes Papier: Bloecke wieder in die Standardlage
    return b;
  }));
};
chips("g-size", [["a4", "A4"], ["a3", "A3"], ["a2", "A2"], ["a1", "A1"]], "size", true);
chips("g-orient", [["l", "Quer"], ["p", "Hoch"]], "orient", true);
chips("g-side", [["top", "Oben"], ["bottom", "Unten"], ["left", "Links"], ["right", "Rechts"], ["none", "Ohne Leiste"]], "side", true);
$("scale").addEventListener("change", () => { S.scale = +$("scale").value; fit(); refresh(); });
$("fmt").addEventListener("change", () => { S.fmt = $("fmt").value; resetPos(); fit(); refresh(); });
$("c-manual").addEventListener("change", () => { S.manual = $("c-manual").checked; if (S.manual) S.pos = null; refresh(); });
$("pos-reset").addEventListener("click", () => { resetPos(); refresh(); });
$("c-onmap").addEventListener("change", () => { S.onmap = $("c-onmap").checked; if (!S.onmap && anyOnMap(curPos())) resetPos(); refresh(); }); // Block lag auf der Karte: zurueck in die Standardlage
$("g-obg").replaceChildren(...[["white", "Weiß"], ["clear", "Durchsichtig"]].map(([v, t]) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip"; b.dataset.v = v; b.textContent = t;
  b.addEventListener("click", () => { S.obg = v; refresh(); });
  return b;
}));
// Kaesten ziehen (Maus, Finger) oder mit Pfeiltasten schieben; das Verzeichnis zusaetzlich an der Ecke unten rechts in der Groesse aendern
// raw (nur beim Ziehen mit der Maus): ungerasterte Lage der Karte; sonst bliebe sie am Magneten kleben, weil jeder Schritt kleiner ist als sein Fang
function movePos(name, dx, dy, resize, raw = null) {
  const pos = curPos(), b = pos[name];
  if (!b) return;
  // Wo es nicht auf die Karte darf, gilt die Bewegung nur, solange der Block ausserhalb des Kartenfensters bleibt (sonst wenigstens eine Achse)
  const tries = resize ? [[dx, dy]] : [[dx, dy], [dx, 0], [0, dy]];
  const { L, wMm, hMm } = layout();
  for (const [ax, ay] of tries) {
    if (name === "map") {
      // Die Karte bleibt ganz im Papier (mit Rand fuer die Planquadrat-Buchstaben; bei fester Leiste zusammen mit der Leiste) und rastet beim
      // Ziehen nahe an den normalen Randabstaenden und an ihrer Standardlage ein
      const fixed = !isManual();
      const from = raw?.cur || b;
      const clampMap = (m) => (fixed ? groupClampMap(m) : clampPos({ ...pos, map: m }, dimsNow()).map);
      const free = clampMap({ x: from.x + ax, y: from.y + ay });
      const at = raw ? snapMap(free, { W: wMm, H: hMm, ui: L.ui, w: L.frame.w, h: L.frame.h, home: { x: L.frame.x, y: L.frame.y } }) : free;
      const cand = { ...pos, map: clampMap(at) };
      if (fixed || onMapOk() || !anyOnMap(cand)) { if (raw) raw.cur = free; S.pos = cand; S.posKey = layoutKey(); return; }
      continue;
    }
    const cand = clampPos({ ...pos, [name]: resize ? { ...b, w: b.w + ax, h: b.h + ay } : { ...b, x: b.x + ax, y: b.y + ay } }, dimsNow());
    if (onMapOk() || !isManual() || !overlapsMap(cand, name)) { S.pos = cand; S.posKey = layoutKey(); return; } // feste Leiste: der Titel darf auch ueber der Karte stehen
  }
}
for (const el of document.querySelectorAll("#prev [data-b]")) {
  const name = el.dataset.b;
  el.addEventListener("pointerdown", (e) => {
    if (!isManual() && name !== "title" && name !== "map") return; // die Bloecke der festen Leiste folgen der Karte; Titel und Karte lassen sich immer verschieben
    e.preventDefault(); el.focus();
    el.setPointerCapture(e.pointerId); el.classList.add("drag");
    const rect = $("prev").getBoundingClientRect(), resize = !!e.target.dataset.rz;
    let last = { x: e.clientX, y: e.clientY };
    const raw = name === "map" ? { cur: null } : null;
    const move = (ev) => {
      movePos(name, (ev.clientX - last.x) / rect.width, (ev.clientY - last.y) / rect.height, resize, raw);
      last = { x: ev.clientX, y: ev.clientY };
      const { L, wMm, hMm } = layout(); drawBlocks(true, L, wMm, hMm); $("go").href = goLink();
    };
    const up = () => { el.classList.remove("drag"); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); refresh(); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  });
  el.addEventListener("keydown", (e) => {
    if (!isManual() && name !== "title" && name !== "map") return;
    const d = e.shiftKey ? 0.05 : 0.01;
    const v = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
    if (!v) return;
    e.preventDefault(); movePos(name, v[0], v[1], name === "index" && e.altKey); refresh(); el.focus();
  });
}
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
$("o-place").addEventListener("input", () => { T.place = $("o-place").value.trim(); T.placeEdited = true; $("place-hint").textContent = ""; drawPreview(); updateText(); });
$("o-title").addEventListener("input", () => { T.title = $("o-title").value.trim(); drawPreview(); updateText(); });
let suggestTimer = 0, appliedKey = "";
const centerKey = () => `${fc.lat.toFixed(3)},${fc.lng.toFixed(3)}`; // etwa 100 m genau
/** Schlaegt den Ortsnamen der Kartenmitte vor (Nominatim, wie die Hauptkarte). Eigene Eingaben werden nie ueberschrieben; wandert der
 *  Rahmen an einen anderen Ort, gilt der alte Vorschlag nicht mehr, und eine verspaetete Antwort fuer den alten Ort wird verworfen. */
async function suggestPlace() {
  if (T.placeEdited) return;
  const key = centerKey();
  if (key === appliedKey) return;
  if (T.place) { T.place = ""; $("o-place").value = ""; $("place-hint").textContent = ""; drawPreview(); updateText(); }
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=de&lat=${fc.lat.toFixed(5)}&lon=${fc.lng.toFixed(5)}`, { signal: AbortSignal.timeout(8000) });
    const a = (await r.json()).address || {};
    const name = a.village || a.town || a.city || a.municipality || a.hamlet || a.suburb || "";
    if (name && !T.placeEdited && key === centerKey()) {
      T.place = name; appliedKey = key; $("o-place").value = name;
      $("place-hint").textContent = "Vorschlag aus der Kartenmitte, du kannst ihn ändern.";
      drawPreview(); updateText();
    }
  } catch { /* ohne Vorschlag: auf dem Blatt steht dann der Name des Gebiets */ }
}
/** Bei jeder Bewegung des Rahmens im letzten Schritt: kurz warten, dann neu vorschlagen. */
function scheduleSuggest() {
  clearTimeout(suggestTimer);
  if (!T.placeEdited) suggestTimer = setTimeout(suggestPlace, 700);
}
$("o-dpi").addEventListener("change", () => { S.dpi = +$("o-dpi").value; refresh(); });
$("o-iauto").addEventListener("change", () => { S.iauto = $("o-iauto").checked; refresh(); });
$("o-icols").addEventListener("change", () => { S.icols = Math.round(num($("o-icols").value, 0, 6, 0)); refresh(); });
$("o-isize").addEventListener("change", () => { S.isize = num($("o-isize").value, 0.5, 3, 1); refresh(); });

// Schritte
let step = 0;
function go(n) {
  step = Math.max(0, Math.min(1, n));
  document.querySelectorAll(".sec").forEach((s) => s.classList.toggle("on", +s.dataset.s === step));
  document.querySelectorAll(".st").forEach((b) => { if (+b.dataset.s === step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
  $("back").hidden = step === 0;
  $("next").hidden = step === 1;
  $("go").hidden = step !== 1;
  if (step === 1) suggestPlace();
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
