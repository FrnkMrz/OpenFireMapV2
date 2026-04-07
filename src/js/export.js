/**
 * ==========================================================================================
 * DATEI: export.js
 * ZWECK: Exportiert die Karte als Bild (PNG) oder Daten (GPX)
 * ==========================================================================================
 * * LERN-ZIELE DIESER DATEI:
 * 1. Mathematik: Wie rechnet man Längen- und Breitengrade in Pixel um? (Mercator-Projektion)
 * 2. Canvas API: Wie nutzt man Clipping (ctx.clip), um überstehende Linien abzuschneiden?
 * 3. Asynchronität: Wie lädt man hunderte Kacheln gleichzeitig?
 * 4. Reverse Geocoding: Wie finden wir den Ortsnamen für den Titel heraus?
 */

import { State } from "./state.js";
import { Config } from "./config.js";
import { fetchDataForExport } from "./api.js";
import { t, getLang } from "./i18n.js";
import { showNotification, toggleExportMenu } from "./ui.js";
import { jsPDF } from "jspdf";

/**
 * Generiert den Dateinamen nach dem Muster:
 * YYYY-MM-DD_HH-mm_Z{Zoom}_{Titel}
 */
function getExportFilename(title, zoom) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');

  const safeTitle = (title || "OpenFireMap_Export").replace(/[\s.:/]/g, "_");
  return `${year}-${month}-${day}_${hour}-${minute}_Z${zoom}_${safeTitle}`;
}

/* =============================================================================
   HILFSFUNKTIONEN: PRE-PROCESSING FÜR EXPORT (Clustering nur für Feuerwachen)
   -----------------------------------------------------------------------------
   Warum hier?
   - Export nutzt getrennte POI-/Boundary-Caches und führt sie gezielt zusammen.
   - Auf der Karte clustern wir Feuerwachen (150 m), damit nicht mehrere Haus-Icons
     auf einem Gelände erscheinen (z.B. mehrere Gebäude einer Wache).
   - Damit Export und Karte identisch sind, wenden wir das gleiche Clustering auch
     im Export an – aber strikt NUR für Fire Stations.
   ============================================================================= */

const EXPORT_FIRE_STATION_CLUSTER_RADIUS_M = 150;

function isFireStation(el) {
  const tags = el?.tags;
  return !!(
    tags &&
    (tags.amenity === "fire_station" || tags.building === "fire_station")
  );
}

function getLatLon(el) {
  const lat = el?.lat ?? el?.center?.lat;
  const lon = el?.lon ?? el?.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return { lat, lon };
}

function elementKey(el) {
  // Overpass IDs können sich zwischen node/way/relation überschneiden.
  // Daher immer type + id kombinieren.
  const t = el?.type || "node";
  return `${t}:${el?.id}`;
}

function tagCount(el) {
  const t = el?.tags;
  return t ? Object.keys(t).length : 0;
}

function mergeMissingTags(targetTags, sourceTags) {
  if (!sourceTags) return;
  for (const [k, v] of Object.entries(sourceTags)) {
    if (
      targetTags[k] === undefined ||
      targetTags[k] === null ||
      targetTags[k] === ""
    ) {
      targetTags[k] = v;
    }
  }
}

// Haversine (Meter)
function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);

  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * (s2 * s2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/**
 * Clustert ausschließlich Feuerwachen (amenity/building=fire_station) innerhalb radiusM.
 * Alle anderen Elemente bleiben unverändert.
 *
 * Strategie:
 * - Master: Element mit den meisten Tags (höchste "Qualität")
 * - Merge: fehlende Tags in den Master übernehmen
 * - Position: geometrischer Mittelpunkt aller Cluster-Mitglieder
 */
function preprocessElementsForExport(
  rawElements,
  radiusM = EXPORT_FIRE_STATION_CLUSTER_RADIUS_M,
) {
  if (!Array.isArray(rawElements) || rawElements.length === 0)
    return rawElements || [];

  const fireStations = [];
  const others = [];

  for (const el of rawElements) {
    if (isFireStation(el)) fireStations.push(el);
    else others.push(el);
  }

  if (fireStations.length <= 1) return rawElements;

  // Sortierung: "beste" Elemente zuerst
  fireStations.sort((a, b) => tagCount(b) - tagCount(a));

  const processed = new Set();
  const clustered = [];

  for (let i = 0; i < fireStations.length; i++) {
    const master = fireStations[i];
    const masterKey = elementKey(master);
    if (processed.has(masterKey)) continue;

    const masterPos = getLatLon(master);
    if (!masterPos) {
      // Ohne Position macht Clustering keinen Sinn.
      processed.add(masterKey);
      clustered.push(master);
      continue;
    }

    processed.add(masterKey);

    // Master klonen, damit wir die aktuell vorbereiteten Export-Daten nicht nebenbei mutieren.
    const merged = {
      ...master,
      tags: { ...(master.tags || {}) },
    };

    let sumLat = masterPos.lat;
    let sumLon = masterPos.lon;
    let count = 1;

    for (let j = i + 1; j < fireStations.length; j++) {
      const cand = fireStations[j];
      const candKey = elementKey(cand);
      if (processed.has(candKey)) continue;

      const candPos = getLatLon(cand);
      if (!candPos) continue;

      if (distanceMeters(masterPos, candPos) < radiusM) {
        processed.add(candKey);
        mergeMissingTags(merged.tags, cand.tags || {});
        sumLat += candPos.lat;
        sumLon += candPos.lon;
        count++;
      }
    }

    // Mittelpunkt setzen (inkrementell über sum/count)
    const avgLat = sumLat / count;
    const avgLon = sumLon / count;

    // Für node-basierte Exporte erwarten wir lat/lon.
    merged.lat = avgLat;
    merged.lon = avgLon;

    // Für way/relation-Objekte erwartet der Rest oft center.* (zur Sicherheit beides).
    merged.center = { lat: avgLat, lon: avgLon };

    clustered.push(merged);
  }

  // Reihenfolge ist für Export egal; wir lassen "clustered + others".
  return clustered.concat(others);
}

function getCachedExportElements() {
  return [
    ...(State.cachedPoiElements || []),
    ...(State.cachedBoundaryElements || []),
  ];
}

function getPreparedCachedExportElements() {
  return preprocessElementsForExport(getCachedExportElements());
}

/* =============================================================================
   TEIL 1: DAS AUSWAHL-WERKZEUG (Das blaue Rechteck)
   ============================================================================= */

/**
 * Setzt das Export-Format (PNG oder GPX) und aktualisiert die UI-Buttons.
 * Hinweis: Hier passiert keine Export-Logik, nur State + UI.
 */
export function setExportFormat(fmt) {
  State.exportFormat = fmt;
  document.querySelectorAll(".fmt-btn").forEach((b) => {
    b.classList.remove(
      "active",
      "text-blue-400",
      "border-blue-400/50",
      "bg-white/10",
    );
    b.classList.add("bg-white/5");
    b.setAttribute("aria-pressed", "false");
  });
  const btn = document.getElementById(`fmt-${fmt}`);
  if (btn) {
    btn.classList.add(
      "active",
      "text-blue-400",
      "border-blue-400/50",
      "bg-white/10",
    );
    btn.setAttribute("aria-pressed", "true");
  }
  clearSelection();
}

/**
 * Setzt die Ziel-Zoomstufe für den PNG-Export.
 * Topo-Layer: maximale Zoomstufe ist begrenzt (Tile-Verfügbarkeit).
 */
export function setExportZoom(z) {
  if (State.activeLayerKey === "topo" && z > 17) return;
  State.exportZoomLevel = z;
  document.querySelectorAll(".zoom-btn").forEach((b) => {
    b.classList.remove(
      "active",
      "text-blue-400",
      "border-blue-400/50",
      "bg-white/10",
    );
    b.classList.add("bg-white/5");
    b.setAttribute("aria-pressed", "false");
  });
  const btn = document.getElementById(`zoom-${z}`);
  if (btn) {
    btn.classList.add(
      "active",
      "text-blue-400",
      "border-blue-400/50",
      "bg-white/10",
    );
    btn.setAttribute("aria-pressed", "true");
  }
}

/**
 * Startet den "Auswahlmodus": Nutzer zieht ein Rechteck auf der Karte.
 * Das Rechteck definiert den Export-Ausschnitt (Bounds).
 */
export function startSelection() {
  State.selection.active = true;
  clearSelection();
  State.map.dragging.disable();
  State.map.getContainer().classList.add("selection-mode");
  showNotification(t("drag_area"));
}

function clearSelection() {
  if (State.selection.rect) {
    State.map.removeLayer(State.selection.rect);
    State.selection.rect = null;
  }
  State.selection.finalBounds = null;
  document.getElementById("selection-info").classList.add("hidden");
}

/**
 * Zentraler Event-Handler für die Rechteck-Auswahl.
 * - 'down': Startpunkt setzen
 * - 'move': Rechteck anpassen (inkl. Option: Quadrat erzwingen)
 * - 'up'  : Auswahl finalisieren
 */
export function handleSelectionEvents(e, type) {
  if (!State.selection.active) return;

  if (type === "down") {
    State.selection.startPoint = e.latlng;
    State.selection.rect = L.rectangle([e.latlng, e.latlng], {
      color: Config.colors.selection,
      weight: 2,
      fillOpacity: 0.2,
      interactive: false,
    }).addTo(State.map);
  } else if (
    type === "move" &&
    State.selection.startPoint &&
    State.selection.rect
  ) {
    let current = e.latlng;
    if (State.exportFormat !== "free") {
      const ratio = State.exportFormat === "a4l" ? 1.4142 : 0.7071;
      const start = State.selection.startPoint;
      const lngScale = Math.cos((start.lat * Math.PI) / 180);
      const dy = Math.abs(current.lat - start.lat);
      const dx = (dy * ratio) / lngScale;
      const latDir = current.lat > start.lat ? 1 : -1;
      const lngDir = current.lng > start.lng ? 1 : -1;
      current = L.latLng(start.lat + latDir * dy, start.lng + lngDir * dx);
    }
    State.selection.rect.setBounds([State.selection.startPoint, current]);
  } else if (type === "up" && State.selection.startPoint) {
    State.selection.finalBounds = State.selection.rect.getBounds();
    State.selection.active = false;
    State.selection.startPoint = null;
    State.map.dragging.enable();
    State.map.getContainer().classList.remove("selection-mode");
    document.getElementById("selection-info").classList.remove("hidden");
  }
}

/* =============================================================================
   TEIL 2: GPX EXPORT
   ============================================================================= */

function escapeXML(str) {
  if (!str) return "";
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
    }
  });
}

/**
 * Exportiert alle relevanten Punkte im ausgewählten Ausschnitt als GPX-Waypoints.
 * WICHTIG: Für Konsistenz mit der Karte werden Feuerwachen vorab geclustert (150 m),
 * Hydranten/AED/Wasserstellen bleiben 1:1.
 */
export async function exportAsGPX() {
  try {
    const bounds = State.selection.finalBounds || State.map.getBounds();
    const elementsForExport = getPreparedCachedExportElements();
    const pointsToExport = elementsForExport.filter((el) => {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) return false;
      return bounds.contains(L.latLng(lat, lon));
    });

    if (pointsToExport.length === 0) {
      showNotification(t("no_objects"));
      return;
    }

    // TITEL HOLEN (Benutzer-Input)
    let displayTitle = document.getElementById("export-confirm-title")?.value?.trim() || "";
    if (!displayTitle) {
      try {
        const center = bounds.getCenter();
        displayTitle = await fetchLocationTitle(center.lat, center.lng);
      } catch (e) { console.warn(e); }
    }

    // Neuer Dateiname-Generator
    const filename = getExportFilename(displayTitle, State.exportZoomLevel);

    let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
    gpx +=
      '<gpx version="1.1" creator="OpenFireMap V2" xmlns="http://www.topografix.com/GPX/1/1">\n';
    gpx += `  <metadata><name>${escapeXML(displayTitle || "Hydranten Export")}</name><time>${new Date().toISOString()}</time></metadata>\n`;

    pointsToExport.forEach((el) => {
      const tags = el.tags || {};
      const isStation =
        tags.amenity === "fire_station" || tags.building === "fire_station";
      const isHydrant =
        tags.emergency &&
        [
          "fire_hydrant",
          "water_tank",
          "suction_point",
          "fire_water_pond",
          "cistern",
        ].some((t) => tags.emergency.includes(t));
      const isDefib = tags.emergency === "defibrillator";

      if (!isStation && !isHydrant && !isDefib) return;

      let name =
        tags.name ||
        (isStation ? t("station") : isDefib ? t("defib") : t("hydrant"));
      if (!tags.name && tags["fire_hydrant:type"]) {
        let hType = tags["fire_hydrant:type"];
        if (hType === 'underground' && tags['fire_hydrant:style']?.toLowerCase() === 'wsh') hType = 'wsh';
        name = `H ${hType}`;
      }
      if (!tags.name && tags["ref"])
        name = `${isStation ? "Wache" : "H"} ${tags["ref"]}`;

      let desc = [];
      for (const [k, v] of Object.entries(tags)) {
        desc.push(`${k}: ${v}`);
      }

      gpx += `  <wpt lat="${el.lat || el.center.lat}" lon="${el.lon || el.center.lon}">\n`;
      gpx += `    <name>${escapeXML(name)}</name>\n`;
      gpx += `    <desc>${escapeXML(desc.join("\n"))}</desc>\n`;
      gpx += `    <sym>${isStation ? "Fire Station" : "Hydrant"}</sym>\n`;
      gpx += `  </wpt>\n`;
    });

    gpx += "</gpx>";

    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${filename}.gpx`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    showNotification(`${pointsToExport.length} ${t("gpx_success")}`);
    toggleExportMenu();
  } catch (e) {
    console.error("GPX Fehler:", e);
    showNotification("GPX Fehler: " + e.message, 5000);
  }
}

/* =============================================================================
   TEIL 3: PNG EXPORT
   ============================================================================= */

/**
 * Bricht einen laufenden PNG-Export ab (Tile-Downloads etc.).
 * Nutzt AbortController, damit Fetches sauber beendet werden.
 */
export function cancelExport() {
  if (State.controllers.export) State.controllers.export.abort();
}

/* -----------------------------------------------------------------------------
   Tile-/Projektion-Helfer (WebMercator)
   -----------------------------------------------------------------------------
   Leaflet-Kacheln sind in "Tiles" organisiert:
   - Zoom z: Welt ist in 2^z Tiles pro Achse geteilt
   - lat/lon -> Tile-Koordinaten (x/y) per WebMercator-Formel
   Diese Funktionen sind reine Mathematik und haben keine Nebenwirkungen.
----------------------------------------------------------------------------- */
const worldSize = (z) => Math.pow(2, z);
const lat2tile = (lat, z) =>
  ((1 -
    Math.log(
      Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
    ) /
    Math.PI) /
    2) *
  worldSize(z);
const lon2tile = (lon, z) => ((lon + 180) / 360) * worldSize(z);



/**
 * HILFSFUNKTION: KERN-RENDER-LOGIK
 * Erzeugt ein Canvas mit der Karte, Overlays, Titel etc.
 * Gibt { canvas, filename, targetZoom } zurück.
 */
async function generateMapCanvas() {
  console.log("=== EXPORT RENDER START ===");

  State.controllers.export = new AbortController();
  const signal = State.controllers.export.signal;

  // 1. UI UPDATE
  const exportMenu = document.getElementById("export-menu");
  if (exportMenu) exportMenu.classList.remove("hidden"); // Ensure parent is visible!

  document.getElementById("export-setup").classList.add("hidden");
  document.getElementById("export-progress").classList.remove("hidden");


  function setStatus(msg) {
    console.log("Status:", msg);
    const titleEl = document.querySelector(".exporting-active");
    if (titleEl) titleEl.innerText = msg;
  }

  setStatus(t("locating"));

  // 2. PARAMETER
  const targetZoom = State.exportZoomLevel;
  const bounds = State.selection.finalBounds || State.map.getBounds();

  // DATEN LADEN (Explizit für diesen Ausschnitt & Zoom)
  setStatus(t("loading_data") || "Lade Daten..."); // Fallback String falls Key fehlt
  let elementsForExport = [];
  const cachedExportElements = getCachedExportElements();

  // NEU: Wenn wir aktuell auf Zoom < 15 sind, sind KEINE Hydranten im Cache.
  // Wir müssen zwingend die API fragen, da jeder Export zwingend Hydranten beinhalten soll,
  // unabhängig von der gewählten Export-Zoomstufe.
  const currentMapZoom = State.map.getZoom();
  const needsStrictOnlineFetch = currentMapZoom < 15;

  if (!needsStrictOnlineFetch) {
    // Falls die Karte gerade noch Daten im Hintergrund lädt (z. B. nach einem Pan), 
    // warten wir, bis der Vorgang abgeschlossen ist, damit wir den finalen Cache haben.
    while (State.isFetchingData) {
      setStatus(`${t("loading_data") || "Lade Daten..."} (Warte auf Karte)`);
      await new Promise(r => setTimeout(r, 200));
    }

    // Liegt der gewünschte Export-Ausschnitt VOLLSTÄNDIG innerhalb der BBox,
    // die die App zuletzt für die Darstellung geladen hat?
    if (cachedExportElements.length > 0) {
      if (State.queryBounds && State.queryBounds.contains(bounds)) {
        console.log("Export: Cache enthält Daten für diesen KOMPLETTEN Bereich -> Nutze Cache.");
        elementsForExport = preprocessElementsForExport(cachedExportElements);
      } else {
        console.log("Export: Bereich ist zu groß oder liegt außerhalb des Karten-Caches -> Erzwinge Download.");
      }
    }
  }

  // Wenn Cache nicht reichte oder needsStrictOnlineFetch true war -> Online-Abfrage
  if (elementsForExport.length === 0) {
    try {
      console.log(`Fetching export data for bounds. Strict Online Fetch? ${needsStrictOnlineFetch}`);
      const data = await fetchDataForExport(bounds, targetZoom, signal);
      elementsForExport = preprocessElementsForExport(data.elements || []);

      // Fallback: Wenn Online leer, aber Cache existiert (vielleicht knapp daneben?), war vorher schon Handled.
      // Aber hier nochmal zur Sicherheit.
      if (elementsForExport.length === 0 && cachedExportElements.length > 0) {
        console.warn("Export: Online-Daten leer, nutze Cache als Fallback.");
        elementsForExport = preprocessElementsForExport(cachedExportElements);
      }

      showNotification(`Export: ${elementsForExport.length} Objekte (Online geladen).`, 3000);
    } catch (e) {
      console.warn("Export-Fetch fehlgeschlagen, nutze Cache als Fallback", e);
      elementsForExport = preprocessElementsForExport(cachedExportElements);
      showNotification(`Export Warnung: Ladefehler, nutze Cache (${elementsForExport.length} Objekte).`, 5000);
    }
  } else {
    showNotification(`Export: ${elementsForExport.length} Objekte (aus Cache).`, 2000);
  }
  console.log("Final export elements count:", elementsForExport.length);

  const nw = bounds.getNorthWest();
  const se = bounds.getSouthEast();

  // 3. ORTSBESTIMMUNG
  let displayTitle = document.getElementById("export-confirm-title")?.value?.trim() || "";

  if (!displayTitle) {
    try {
      // WICHTIG: Wenn der Nutzer einen Bereich gewählt hat, nimm dessen Zentrum.
      // Falls nicht, nimm das Zentrum der Karte.
      const searchBounds = State.selection.active && State.selection.finalBounds
        ? State.selection.finalBounds
        : State.map.getBounds();
      const center = searchBounds.getCenter();
      displayTitle = await fetchLocationTitle(center.lat, center.lng);
    } catch { /* ignore */ }
  }

  // 4. GRÖSSE BERECHNEN (Präzise Pixel-Mathe für exakte Export-Proportionen)
  const margin = 40;
  const footerH = 60;

  let exactMapW = (lon2tile(se.lng, targetZoom) - lon2tile(nw.lng, targetZoom)) * 256;
  let exactMapH = (lat2tile(se.lat, targetZoom) - lat2tile(nw.lat, targetZoom)) * 256;

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.font = "bold 44px Arial, sans-serif";
  const titleText = displayTitle || "Ort- und Hydrantenplan";
  const titleWidth = tempCtx.measureText(titleText).width;

  // Wir sorgen für mindestens 650px (damit auch Datum / Maßstab etc. immer Platz haben)
  const minMapWidth = Math.max(titleWidth + 60, 650) - (2 * margin);

  let mapWidth = Math.max(exactMapW, minMapWidth);
  let mapHeight = exactMapH;

  if (State.exportFormat !== "free") {
    // A4 Proportion genau berechnen: 297/210 = ~1.4142857
    const A4_RATIO = State.exportFormat === "a4l" ? 1.4142857 : 0.7070707;
    // ratio = totalWidth / totalHeight
    // totalWidth = mapWidth + 2*margin
    // totalHeight = mapHeight + 2*margin + footerH
    let testTotalW = mapWidth + 2 * margin;
    let testTotalH = testTotalW / A4_RATIO;
    let testMapH = testTotalH - 2 * margin - footerH;

    if (testMapH < mapHeight) {
      // Box war höher als erlaubt -> Höhe bestimmt die Breite
      testTotalH = mapHeight + 2 * margin + footerH;
      testTotalW = testTotalH * A4_RATIO;
      mapWidth = testTotalW - 2 * margin;
    } else {
      mapHeight = testMapH;
    }
  }

  mapWidth = Math.round(mapWidth);
  mapHeight = Math.round(mapHeight);

  const totalWidth = mapWidth + margin * 2;
  const totalHeight = mapHeight + margin + footerH + margin;

  // Zentrum der Auswahl in WebMercator
  const centerTileX = (lon2tile(nw.lng, targetZoom) + lon2tile(se.lng, targetZoom)) / 2;
  const centerTileY = (lat2tile(nw.lat, targetZoom) + lat2tile(se.lat, targetZoom)) / 2;

  // Der exakte logische Kachel-Startpunkt dieses Canvas-Ausschnitts (als Fließkommazahl)
  const startTileX = centerTileX - (mapWidth / 256) / 2;
  const startTileY = centerTileY - (mapHeight / 256) / 2;
  const endTileX = startTileX + (mapWidth / 256);
  const endTileY = startTileY + (mapHeight / 256);

  // Kacheln, die tatsächlich heruntergeladen werden müssen (Integer-Index)
  const tileX1 = Math.floor(startTileX);
  const tileY1 = Math.floor(startTileY);
  const tileX2 = Math.floor(endTileX);
  const tileY2 = Math.floor(endTileY);

  const mPerPx =
    (Math.cos((bounds.getCenter().lat * Math.PI) / 180) *
      2 *
      Math.PI *
      6378137) /
    (256 * Math.pow(2, targetZoom));

  if (totalWidth > 14000 || totalHeight > 14000)
    throw new Error(t("too_large") + " (>14000px)");

  // 5. CANVAS
  setStatus(t("export_rendering") || "Karte wird gezeichnet...");

  // Kurzer Timeout, damit das UI den Status aktualisieren kann, bevor der Main Thread blockiert
  await new Promise(resolve => setTimeout(resolve, 50));

  const canvas = document.createElement("canvas");
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 6. KACHELN LADEN
  setStatus(`${t("loading_tiles")} (Z${targetZoom})...`);
  const tileQueue = [];
  for (let x = tileX1; x <= tileX2; x++) {
    for (let y = tileY1; y <= tileY2; y++) {
      tileQueue.push({ x, y, z: targetZoom });
    }
  }

  // Parallel laden (Limit concurrency)
  const CONCURRENCY = 6;
  let active = 0;

  const results = []; // {x, y, img}

  await new Promise((resolve, reject) => {
    const next = () => {
      if (signal.aborted) {
        reject(new Error("Aborted"));
        return;
      }
      if (tileQueue.length === 0 && active === 0) {
        resolve();
        return;
      }
      while (active < CONCURRENCY && tileQueue.length > 0) {
        const item = tileQueue.shift();
        active++;
        const layerConf = Config.layers[State.activeLayerKey];
        const subdomains = Array.isArray(layerConf?.subdomains) && layerConf.subdomains.length > 0
          ? layerConf.subdomains
          : ["a", "b", "c"];
        const sSub = subdomains[Math.abs(item.x + item.y) % subdomains.length];
        let url;
        if (layerConf?.url.includes("{s}")) {
          url = layerConf.url
            .replace("{s}", sSub)
            .replace("{z}", item.z)
            .replace("{x}", item.x)
            .replace("{y}", item.y);
        } else {
          // Layer ohne Subdomains, z.B. ArcGIS Satellite
          url = layerConf.url
            .replace("{z}", item.z)
            .replace("{x}", item.x)
            .replace("{y}", item.y);
        }

        // Caching für Tiles nicht nötig für Export
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          results.push({ ...item, img });
          active--;
          next();
        };
        img.onerror = () => {
          console.warn("Tile error", url);
          active--;
          next();
        };
        img.src = url;
      }
    };
    next();
  });

  if (signal.aborted) throw new Error("Export abgebrochen");

  // Nur innerhalb der eigentlichen Karte zeichnen (schützt Rand & Header vor Kacheln/Icons)
  ctx.save();
  ctx.beginPath();
  ctx.rect(margin, margin, mapWidth, mapHeight);
  ctx.clip(); 

  // 7. ZEICHNEN (Tiles)
  results.forEach((r) => {
    // Pixel-Offset auf der Karte + Margin
    const px = (r.x - startTileX) * 256 + margin;
    const py = (r.y - startTileY) * 256 + margin;
    ctx.drawImage(r.img, px, py);
  });

  // 8. OVERLAYS ZEICHNEN
  setStatus(t("render_infra"));



  console.log("Export: Rendering markers...", elementsForExport.length);

  // Versatz berechnen (für exakte Positionierung der Marker)
  const originTileX = startTileX;
  const originTileY = startTileY;

  // Boundaries zeichnen (z.B. Gemeindegrenzen)
  for (const el of elementsForExport) {
    if (el.tags && el.tags.boundary === 'administrative' && el.geometry) {
      // Linie zeichnen
      const coords = el.geometry.map(p => {
        const px = (lon2tile(p.lon, targetZoom) - originTileX) * 256 + margin;
        const py = (lat2tile(p.lat, targetZoom) - originTileY) * 256 + margin;
        return [px, py];
      });

      ctx.beginPath();
      ctx.strokeStyle = (State.activeLayerKey === 'satellite') ? Config.colors.boundsSatellite : Config.colors.bounds;
      ctx.lineWidth = (State.activeLayerKey === 'satellite') ? 3 : 1;
      ctx.setLineDash([10, 10]);
      ctx.moveTo(coords[0][0], coords[0][1]);
      for (let i = 1; i < coords.length; i++) ctx.lineTo(coords[i][0], coords[i][1]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Marker zeichnen
  // ... (Code bleibt gleich, nur Kontext ist ctx)
  for (const el of elementsForExport) {
    if (el.tags?.boundary === 'administrative') continue; // Schon gemalt

    const lat = el.lat || el.center?.lat;
    const lon = el.lon || el.center?.lon;

    const tx = (lon2tile(lon, targetZoom) - originTileX) * 256 + margin;
    const ty = (lat2tile(lat, targetZoom) - originTileY) * 256 + margin;

    const tags = el.tags || {};
    const isStation = tags.amenity === "fire_station" || tags.building === "fire_station";
    let type = isStation
      ? "station"
      : tags.emergency === "defibrillator"
        ? "defibrillator"
        : tags["fire_hydrant:type"] || tags.emergency || "fire_hydrant";
    if (type === 'underground' && tags['fire_hydrant:style']?.toLowerCase() === 'wsh') {
      type = 'wsh';
    }

    if (
      tx < margin ||
      tx > mapWidth + margin ||
      ty < margin ||
      ty > mapHeight + margin
    )
      continue;

    // Wir zeichnen jetzt IMMER das volle Icon, egal welche Zoomstufe der Export ist. 
    // Der Nutzer wünscht explizit gut lesbare Hydranten auf allen Plänen.
    drawCanvasIcon(ctx, tx, ty, type, isStation, type === 'defibrillator');
  }
  ctx.restore();

  // 9. HEADER & FOOTER
  setStatus(t("layout_final"));

  const bannerH = 170;
  ctx.fillStyle = Config.colors.bgHeader;
  ctx.fillRect(margin, margin, mapWidth, bannerH);
  ctx.strokeStyle = "rgba(15, 23, 42, 0.2)";
  ctx.lineWidth = 3;
  ctx.strokeRect(margin, margin, mapWidth, bannerH);
  ctx.strokeRect(margin, margin + bannerH, mapWidth, mapHeight - bannerH);

  const centerX = margin + mapWidth / 2;
  ctx.fillStyle = Config.colors.textMain;
  ctx.textAlign = "center";
  ctx.font = "bold 44px Arial, sans-serif";
  ctx.fillText(titleText, centerX, margin + 55);

  const now = new Date();
  ctx.font = "22px Arial, sans-serif";
  ctx.fillStyle = Config.colors.textSub;
  const localeMap = { de: "de-DE", en: "en-US" };
  const dateLocale = localeMap[getLang()] || "en-US";
  const dateStr = now.toLocaleDateString(dateLocale, { year: "numeric", month: "long" });
  ctx.fillText(
    `${t("legend_date")}: ${dateStr} | ${t("legend_res")}: Zoom ${targetZoom} (~${mPerPx.toFixed(2)} m/px)`,
    centerX,
    margin + 95,
  );

  ctx.font = "italic 16px Arial, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(
    Config.layers[State.activeLayerKey].textAttr || "© OpenStreetMap",
    centerX,
    margin + 125,
  );

  // Scale Bar
  const prettyD = [1000, 500, 250, 100, 50];
  let distM = 100, scaleW = 100 / mPerPx;
  for (let d of prettyD) {
    let w = d / mPerPx;
    if (w <= mapWidth * 0.3) {
      distM = d;
      scaleW = w;
      break;
    }
  }
  const sX = margin + mapWidth - scaleW - 40;
  const sY = margin + mapHeight - 40;
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillRect(sX - 10, sY - 50, scaleW + 20, 60);
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sX, sY - 10);
  ctx.lineTo(sX, sY);
  ctx.lineTo(sX + scaleW, sY);
  ctx.lineTo(sX + scaleW, sY - 10);
  ctx.stroke();
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px Arial";
  ctx.fillText(`${distM} m`, sX + scaleW / 2, sY - 15);

  // Footer
  const footerY = margin + mapHeight + footerH / 2 + 10;
  ctx.fillStyle = Config.colors.textSub;
  ctx.textAlign = "left";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("OpenFireMap.org", margin, footerY);
  ctx.textAlign = "right";
  const timeStr = now.toLocaleString(dateLocale, {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  ctx.fillText(timeStr, margin + mapWidth, footerY);

  const safeTitle = titleText.replace(/[\s.:]/g, "_");
  return { canvas, filename: `${safeTitle}_Z${targetZoom}` };
}

// -----------------------------------------------------------
// EXPORT IMPL: PNG
// -----------------------------------------------------------
export async function exportAsPNG() {
  try {
    const { canvas, filename } = await generateMapCanvas();
    const statusEl = document.querySelector(".exporting-active");
    if (statusEl) statusEl.innerText = "Speichere PNG...";

    // FIX: toBlob macht in Chrome Probleme mit dem Dateinamen (wird zu UUID).
    // toDataURL ist synchron und blockiert kurz, aber der Dateiname bleibt erhalten.
    const dataUrl = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toggleExportMenu();
    showNotification("Download gestartet (PNG)!", 3000);

  } catch (e) {
    handleExportError(e);
  }
}

// -----------------------------------------------------------
// EXPORT IMPL: PDF
// -----------------------------------------------------------
export async function exportAsPDF() {
  try {
    const { canvas, filename } = await generateMapCanvas();
    const statusEl = document.querySelector(".exporting-active");
    if (statusEl) statusEl.innerText = "Erstelle PDF...";

    // 1. PDF initialisieren
    // Wir nehmen A4 als Voreinstellung, aber passen die Orientierung dem Canvas an.
    const orient = canvas.width > canvas.height ? "l" : "p";
    const pdf = new jsPDF({
      orientation: orient,
      unit: "mm",
      format: "a4",
      compress: true
    });

    // 2. Maße berechnen (Einpassen auf A4)
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Ratio
    const ratioCanvas = canvas.width / canvas.height;
    const ratioPage = pageWidth / pageHeight;

    let renderW, renderH;

    if (ratioCanvas > ratioPage) {
      // Breiter als Seite -> Breite füllen
      renderW = pageWidth;
      renderH = pageWidth / ratioCanvas;
    } else {
      // Höher als Seite -> Höhe füllen
      renderH = pageHeight;
      renderW = pageHeight * ratioCanvas;
    }

    // Zentrieren
    const x = (pageWidth - renderW) / 2;
    const y = (pageHeight - renderH) / 2;

    // 3. Canvas als Bild hinzufügen
    // toDataURL ist synchron und kann bei riesigen Canvas blocken, aber jsPDF braucht es.
    const imgData = canvas.toDataURL("image/jpeg", 0.85); // JPEG für kleinere PDF-Größe
    pdf.addImage(imgData, "JPEG", x, y, renderW, renderH);

    // 4. Speichern
    pdf.save(`${filename}.pdf`);

    toggleExportMenu();
    showNotification("Download gestartet (PDF)!", 3000);

  } catch (e) {
    handleExportError(e);
  }
}

function handleExportError(e) {
  console.error("EXPORT FEHLER:", e);
  showNotification("FEHLER: " + e.message, 10000);
  setTimeout(() => {
    document.getElementById("export-progress").classList.add("hidden");
    document.getElementById("export-setup").classList.remove("hidden");
  }, 5000);
}

// ... (Code davor bleibt unverändert)

/**
 * NEU: Initialisiert die Auswahl-Logik (Maus-Events).
 * Damit muss die app.js nicht mehr die Details kennen.
 */
/**
 * Initialisiert alle UI- und Map-Event-Listener für den Export-Workflow.
 * Diese Funktion wird genau einmal beim App-Start aufgerufen.
 */
export function initSelectionLogic() {
  if (!State.map) {
    console.error("Export-Logik Fehler: Karte noch nicht bereit.");
    return;
  }

  // Die Event-Listener direkt an die Karte hängen
  State.map.on("mousedown", (e) => handleSelectionEvents(e, "down"));
  State.map.on("mousemove", (e) => handleSelectionEvents(e, "move"));
  State.map.on("mouseup", (e) => handleSelectionEvents(e, "up"));

  console.log("Auswahl-Werkzeug wurde initialisiert.");
}

/**
 * Holt den Ortsnamen für eine Koordinate (z.B. für den Export-Titel).
 */
export async function fetchLocationTitle(lat, lon) {
  try {
    const res = await fetch(
      `${Config.nominatimUrl}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18`
    );
    const d = await res.json();
    const addr = d.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || t("export_unknown_city");
    const suburb = addr.suburb || addr.neighbourhood || addr.hamlet || "";
    return city ? (suburb ? `${city} - ${suburb}` : city) : "";
  } catch (e) {
    console.warn("Reverse Geocoding failed", e);
    return "";
  }
}

const iconCache = {};

/**
 * Hilfsfunktion zum Zeichnen der Icons auf Canvas (statt SVG-String parsing).
 * Nutzt Offscreen-Caching zur Performance-Steigerung und Vermeidung
 * von Safari-Bugs (fillText auf riesigen Canvases wird oft verschluckt).
 */
function drawCanvasIcon(ctx, x, y, type, isStation, isDefib) {
  const c = Config.colors;
  const cacheKey = isStation ? 'station' : (isDefib ? 'defib' : type);

  // Icon generieren und cachen, falls noch nicht vorhanden
  if (!iconCache[cacheKey]) {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = 100;
    offCanvas.height = 100;
    const offCtx = offCanvas.getContext("2d");

    if (isStation) {
      // Wache: Haus-Symbol
      offCtx.fillStyle = c.station;
      offCtx.strokeStyle = "white";
      offCtx.lineWidth = 4;
      offCtx.beginPath();
      offCtx.moveTo(10, 40); offCtx.lineTo(50, 5); offCtx.lineTo(90, 40); offCtx.lineTo(90, 90); offCtx.lineTo(10, 90); offCtx.closePath();
      offCtx.fill(); offCtx.stroke();
      // Tor
      offCtx.fillStyle = "white";
      offCtx.globalAlpha = 0.9;
      offCtx.fillRect(30, 55, 40, 35);
      offCtx.globalAlpha = 1;
    } else if (isDefib) {
      // Defi: Herz + Blitz
      offCtx.fillStyle = c.defib;
      offCtx.strokeStyle = "white";
      offCtx.lineWidth = 5;
      offCtx.beginPath(); offCtx.arc(50, 50, 45, 0, Math.PI * 2); offCtx.fill(); offCtx.stroke();
      // Herz
      offCtx.fillStyle = "white";
      offCtx.beginPath(); offCtx.moveTo(50, 80); offCtx.quadraticCurveTo(10, 40, 50, 35); offCtx.quadraticCurveTo(90, 40, 50, 80); offCtx.fill();
      // Blitz
      offCtx.strokeStyle = c.defib; offCtx.lineWidth = 3;
      offCtx.beginPath(); offCtx.moveTo(55, 45); offCtx.lineTo(45, 55); offCtx.lineTo(55, 55); offCtx.lineTo(45, 65); offCtx.stroke();
    } else {
      // Hydrant / Wasser
      const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
      const color = isWater ? c.water : c.hydrant;

      // Kreis
      offCtx.fillStyle = color;
      offCtx.strokeStyle = "white";
      offCtx.lineWidth = 5;
      offCtx.beginPath(); offCtx.arc(50, 50, 45, 0, Math.PI * 2); offCtx.fill(); offCtx.stroke();

      if (type === 'wall') {
        offCtx.fillStyle = "none";
        offCtx.strokeStyle = "white";
        offCtx.lineWidth = 6;
        offCtx.beginPath(); offCtx.arc(42, 52, 18, 0, 2 * Math.PI); offCtx.stroke();
        offCtx.beginPath(); offCtx.moveTo(64, 34); offCtx.lineTo(64, 70); offCtx.stroke();
      } else {
        // Buchstabe und extra Grafiken
        let char = '';
        if (type === 'underground') char = 'U';
        if (type === 'wsh') {
          char = 'W';
          offCtx.strokeStyle = "white";
          offCtx.lineWidth = 4;
          offCtx.setLineDash([6, 4]);
          offCtx.beginPath(); 
          offCtx.arc(50, 50, 36, 0, Math.PI * 2); 
          offCtx.stroke();
          offCtx.setLineDash([]);
        }
        if (type === 'pillar') char = 'O';
        if (type === 'pipe') char = 'I';
        if (type === 'dry_barrel') char = 'Ø';

        if (char) {
          offCtx.fillStyle = "white";
          offCtx.font = "bold 50px Arial, sans-serif";
          offCtx.textAlign = "center";
          offCtx.textBaseline = "middle";
          offCtx.fillText(char, 50, 55);
        }
      }
    }
    iconCache[cacheKey] = offCanvas;
  }

  // Auf Ziel-Canvas zeichnen
  const scale = isStation ? 0.4 : 0.35;
  const size = 100 * scale;
  ctx.drawImage(iconCache[cacheKey], x - size / 2, y - size / 2, size, size);
}
