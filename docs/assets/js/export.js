/**
 * ==========================================================================================
 * DATEI: export.js
 * ZWECK: Erstellung von PNG-Bildern und GPX-Dateien
 * LERN-ZIEL: Canvas-Zeichnung, Asynchrone Bild-Verarbeitung, Blob-Erstellung
 * ==========================================================================================
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t, getLang } from './i18n.js';
import { showNotification, toggleExportMenu } from './ui.js';

/* =============================================================================
   TEIL 1: AUSWAHL-WERKZEUG (Das blaue Rechteck)
   ============================================================================= */

/**
 * Ändert das gewünschte Papierformat (Frei, A4 Quer, A4 Hoch).
 * Das beeinflusst, wie das Auswahl-Rechteck geformt ist.
 */
export function setExportFormat(fmt) {
    State.exportFormat = fmt;
    
    // Buttons aktualisieren (aktiven Button hervorheben)
    document.querySelectorAll('.fmt-btn').forEach(b => {
        b.classList.remove('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
        b.classList.add('bg-white/5');
    });
    const btn = document.getElementById(`fmt-${fmt}`);
    if(btn) btn.classList.add('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
    
    // Alte Auswahl löschen, da sie vielleicht das falsche Format hat
    clearSelection();
}

/**
 * Setzt die gewünschte Zoom-Stufe für den Export.
 */
export function setExportZoom(z) {
    // Topo-Karte geht nur bis Zoom 17
    if (State.activeLayerKey === 'topo' && z > 17) return; 
    
    State.exportZoomLevel = z;
    
    // Buttons aktualisieren
    document.querySelectorAll('.zoom-btn').forEach(b => {
        b.classList.remove('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
        b.classList.add('bg-white/5');
    });
    const btn = document.getElementById(`zoom-${z}`);
    if(btn) btn.classList.add('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
}

/**
 * Startet den Auswahl-Modus auf der Karte.
 */
export function startSelection() {
    State.selection.active = true;
    clearSelection();
    
    // Karte einfrieren (damit man nicht verschiebt, während man zieht)
    State.map.dragging.disable(); 
    // Fadenkreuz-Cursor anzeigen
    State.map.getContainer().classList.add('selection-mode'); 
    
    showNotification(t('drag_area')); 
}

/**
 * Löscht die aktuelle Auswahl.
 */
function clearSelection() {
    if (State.selection.rect) { 
        State.map.removeLayer(State.selection.rect); 
        State.selection.rect = null; 
    }
    State.selection.finalBounds = null;
    document.getElementById('selection-info').classList.add('hidden');
}

/**
 * Verarbeitet Maus-Bewegungen auf der Karte (wird von app.js aufgerufen).
 */
export function handleSelectionEvents(e, type) {
    if (!State.selection.active) return;

    // Maus gedrückt: Startpunkt setzen
    if (type === 'down') {
        State.selection.startPoint = e.latlng;
        State.selection.rect = L.rectangle([e.latlng, e.latlng], {
            color: '#3b82f6', weight: 2, fillOpacity: 0.2, interactive: false
        }).addTo(State.map);
    } 
    // Maus bewegt: Rechteck großziehen
    else if (type === 'move' && State.selection.startPoint && State.selection.rect) {
        let current = e.latlng;
        
        // Wenn ein festes Format (A4) gewählt ist, erzwingen wir das Seitenverhältnis
        if (State.exportFormat !== 'free') {
            const ratio = (State.exportFormat === 'a4l') ? 1.4142 : 0.7071; // Wurzel 2
            const start = State.selection.startPoint;
            
            // Komplizierte Mathe für die Erdkrümmung (Mercator Projektion)
            const lngScale = Math.cos(start.lat * Math.PI / 180);
            const dy = Math.abs(current.lat - start.lat);
            const dx = (dy * ratio) / lngScale;
            
            const latDir = current.lat > start.lat ? 1 : -1;
            const lngDir = current.lng > start.lng ? 1 : -1;
            
            // Neuer Punkt mit erzwungenem Verhältnis
            current = L.latLng(start.lat + (latDir * dy), start.lng + (lngDir * dx));
        }
        State.selection.rect.setBounds([State.selection.startPoint, current]);
    }
    // Maus losgelassen: Fertig
    else if (type === 'up' && State.selection.startPoint) {
        State.selection.finalBounds = State.selection.rect.getBounds();
        State.selection.active = false;
        State.selection.startPoint = null;
        
        // Karte wieder freigeben
        State.map.dragging.enable();
        State.map.getContainer().classList.remove('selection-mode');
        
        // Info anzeigen "Ausschnitt fixiert"
        document.getElementById('selection-info').classList.remove('hidden');
    }
}

/* =============================================================================
   TEIL 2: GPX EXPORT (Daten für Navis)
   ============================================================================= */

/**
 * Hilfsfunktion: Macht Text XML-sicher (ersetzt < > & etc.)
 */
function escapeXML(str) {
    if (!str) return '';
    return str.replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;'; case '>': return '&gt;';
            case '&': return '&amp;'; case '\'': return '&apos;'; case '"': return '&quot;';
        }
    });
}

export function exportAsGPX() {
    // Welchen Bereich nehmen wir? Auswahl oder aktuelle Ansicht?
    const bounds = State.selection.finalBounds || State.map.getBounds();
    
    // Filtern: Nur Punkte im Bereich
    const pointsToExport = State.cachedElements.filter(el => {
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        if (!lat || !lon) return false;
        return bounds.contains(L.latLng(lat, lon));
    });

    if (pointsToExport.length === 0) {
        showNotification(t('no_objects'));
        return;
    }

    // GPX Header bauen
    let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
    gpx += '<gpx version="1.1" creator="OpenFireMap V2" xmlns="http://www.topografix.com/GPX/1/1">\n';
    gpx += `  <metadata><name>Hydranten Export</name><time>${new Date().toISOString()}</time></metadata>\n`;

    // Punkte hinzufügen
    pointsToExport.forEach(el => {
        const tags = el.tags || {};
        const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
        const isHydrant = tags.emergency && ['fire_hydrant', 'water_tank', 'suction_point', 'fire_water_pond', 'cistern'].some(t => tags.emergency.includes(t));
        const isDefib = tags.emergency === 'defibrillator';

        if (!isStation && !isHydrant && !isDefib) return;

        // Namen generieren
        let name = tags.name || (isStation ? t('station') : (isDefib ? t('defib') : t('hydrant')));
        if (!tags.name && tags['fire_hydrant:type']) name = `H ${tags['fire_hydrant:type']}`;
        if (!tags.name && tags['ref']) name = `${isStation ? 'Wache' : 'H'} ${tags['ref']}`;

        // Beschreibung generieren
        let desc = [];
        for (const [k, v] of Object.entries(tags)) {
            desc.push(`${k}: ${v}`);
        }
        
        gpx += `  <wpt lat="${el.lat || el.center.lat}" lon="${el.lon || el.center.lon}">\n`;
        gpx += `    <name>${escapeXML(name)}</name>\n`;
        gpx += `    <desc>${escapeXML(desc.join('\n'))}</desc>\n`;
        gpx += `    <sym>${isStation ? 'Fire Station' : 'Hydrant'}</sym>\n`;
        gpx += `  </wpt>\n`;
    });

    gpx += '</gpx>';

    // Download starten
    const blob = new Blob([gpx], {type: 'application/gpx+xml'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `OpenFireMap_Export_${new Date().toISOString().slice(0,10)}.gpx`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    
    showNotification(`${pointsToExport.length} ${t('gpx_success')}`);
    toggleExportMenu();
}

/* =============================================================================
   TEIL 3: PNG EXPORT (Das komplexe Bild-Rendern)
   ============================================================================= */

// Abbruch-Funktion
export function cancelExport() { 
    if(State.controllers.export) State.controllers.export.abort(); 
}

// Mathe-Helfer für Kachel-Berechnung
const worldSize = (z) => Math.pow(2, z);
const lat2tile = (lat, z) => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * worldSize(z);
const lon2tile = (lon, z) => (lon + 180) / 360 * worldSize(z);

/**
 * SVG Icons erstellen (Kopie aus map.js, damit der Export unabhängig funktioniert)
 * Das ist wichtig, weil Canvas keine HTML-Divs zeichnen kann, sondern echte Grafikdaten braucht.
 */
function getSVGContentForExport(type) {
    if (type === 'defibrillator') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#16a34a" stroke="white" stroke-width="5"/><path d="M50 80 C10 40 10 10 50 35 C90 10 90 40 50 80 Z" fill="white"/><path d="M55 45 L45 55 L55 55 L45 65" stroke="#16a34a" stroke-width="3" fill="none"/></svg>`;
    }
    const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
    const color = isWater ? '#3b82f6' : '#ef4444';
    
    if (type === 'wall') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/><circle cx="42" cy="52" r="18" fill="none" stroke="white" stroke-width="6" /><line x1="64" y1="34" x2="64" y2="70" stroke="white" stroke-width="6" stroke-linecap="round" /></svg>`;
    }
    
    let char = '';
    switch(type) {
        case 'underground': char = 'U'; break; 
        case 'pillar':      char = 'O'; break; 
        case 'pipe':        char = 'I'; break;
        case 'dry_barrel':  char = 'Ø'; break; 
        default:            char = '';
    }
    
    if (type === 'station') return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 L50 5 L90 40 L90 90 L10 90 Z" fill="#ef4444" stroke="white" stroke-width="4"/><rect x="30" y="55" width="40" height="35" rx="2" fill="white" opacity="0.9"/></svg>`;
    
    return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${char ? `<text x="50" y="72" font-family="Arial" font-weight="bold" font-size="50" text-anchor="middle" fill="white">${char}</text>` : ''}</svg>`;
}

export async function exportAsPNG() {
    // 1. Controller starten (für Abbrechen-Button)
    State.controllers.export = new AbortController();
    const signal = State.controllers.export.signal;
    
    // UI auf "Laden" umschalten
    document.getElementById('export-setup').classList.add('hidden');
    document.getElementById('export-progress').classList.remove('hidden');
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent'); // Falls im HTML vorhanden
    const progressLabel = document.getElementById('progress-label');
    
    // Parameter holen
    const targetZoom = State.exportZoomLevel;
    const fallbackZoom = targetZoom - 1; // Fallback, falls Kachel fehlt
    const bounds = State.selection.finalBounds || State.map.getBounds(); 
    const nw = bounds.getNorthWest();
    const se = bounds.getSouthEast();

    progressLabel.innerText = t('locating'); 

    // --- TITEL BESTIMMEN (Nominatim API) ---
    // Hier stellen wir die Original-Logik wieder her: Ort + Ortsteil
    let displayTitle = "OpenFireMap.org";
    const centerLat = bounds.getCenter().lat;
    const centerLon = bounds.getCenter().lng;

    try {
        const fetchAddress = async (lat, lon) => {
            // Wir fragen OSM: "Wie heißt der Ort hier?"
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18`); 
            const d = await res.json();
            const addr = d.address || {};
            // Wir suchen Stadt/Dorf/Gemeinde
            const city = addr.city || addr.town || addr.village || addr.municipality || "";
            // Wir suchen Ortsteil
            const suburb = addr.suburb || addr.neighbourhood || addr.hamlet || "";
            return { city, suburb };
        };

        const centerLoc = await fetchAddress(centerLat, centerLon);
        if (centerLoc.city) {
            // Format: "Schnaittach - Rollhofen" oder nur "Schnaittach"
            displayTitle = centerLoc.suburb ? `${centerLoc.city} - ${centerLoc.suburb}` : centerLoc.city;
        }

        // Check bei großen Karten: Wenn es mehr als 3 verschiedene Städte sind, nehmen wir wieder den Standardtitel
        if (targetZoom === 14 || targetZoom === 15) {
            const pointsToCheck = [
                {lat: nw.lat, lon: nw.lng}, {lat: nw.lat, lon: se.lng}, 
                {lat: se.lat, lon: se.lng}, {lat: se.lat, lon: nw.lng}  
            ];
            const promises = pointsToCheck.map(p => fetchAddress(p.lat, p.lon));
            const results = await Promise.all(promises);
            results.push(centerLoc);
            const uniqueCities = new Set();
            results.forEach(loc => { if (loc.city) uniqueCities.add(loc.city); });
            if (uniqueCities.size >= 3) displayTitle = "OpenFireMap.org";
        }
    } catch (e) { console.error("Titel Fehler:", e); }

    // --- GRÖSSE BERECHNEN ---
    const x1 = Math.floor(lon2tile(nw.lng, targetZoom));
    const y1 = Math.floor(lat2tile(nw.lat, targetZoom));
    const x2 = Math.floor(lon2tile(se.lng, targetZoom));
    const y2 = Math.floor(lat2tile(se.lat, targetZoom));

    const margin = 40; 
    const footerH = 60; 
    
    const mapWidth = (x2 - x1 + 1) * 256;
    const mapHeight = (y2 - y1 + 1) * 256;

    const mPerPx = (Math.cos(bounds.getCenter().lat * Math.PI / 180) * 2 * Math.PI * 6378137) / (256 * Math.pow(2, targetZoom));

    // Sicherheits-Check: Zu groß?
    if (mapWidth > 14000 || mapHeight > 14000) { 
        showNotification(t('too_large'), 5000); 
        toggleExportMenu(); return; 
    }

    const maxKm = Config.exportZoomLimitsKm[targetZoom] || 5; 
    const maxMeters = maxKm * 1000;
    
    const widthMeters = mapWidth * mPerPx;
    const heightMeters = mapHeight * mPerPx;

    if (widthMeters > maxMeters || heightMeters > maxMeters) {
         const currentMax = Math.max(widthMeters, heightMeters) / 1000;
         const msg = `Zoom ${targetZoom}: Max. ${maxKm}km! (Ist: ~${currentMax.toFixed(1)}km)`;
         showNotification(msg, 6000); 
         toggleExportMenu(); 
         return;
    }

    // Canvas erstellen (Die Leinwand)
    const canvas = document.createElement('canvas');
    canvas.width = mapWidth + (margin * 2); 
    canvas.height = mapHeight + margin + footerH + margin; 
    const ctx = canvas.getContext('2d');
    
    // Weißer Hintergrund
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- KACHELN LADEN ---
    const totalTiles = (x2 - x1 + 1) * (y2 - y1 + 1);
    let loaded = 0;
    const baseUrlTpl = Config.layers[State.activeLayerKey].url.replace('{s}', 'a').replace('{r}', '');

    progressLabel.innerText = `${t('loading_tiles')} (Z${targetZoom})...`;
    
    const tileQueue = [];
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            tileQueue.push({x, y});
        }
    }

    const CONCURRENCY = 8; // 8 Bilder gleichzeitig laden
    const processQueue = async () => {
        while (tileQueue.length > 0 && !signal.aborted) {
            const {x, y} = tileQueue.shift();
            await new Promise(resolve => {
                const img = new Image(); 
                img.crossOrigin = "anonymous"; // Wichtig, sonst blockiert der Browser den Download!
                const zTargetUrl = baseUrlTpl.replace('{z}', targetZoom).replace('{x}', x).replace('{y}', y);
                
                img.onload = () => { 
                    ctx.drawImage(img, (x - x1) * 256 + margin, (y - y1) * 256 + margin); 
                    loaded++; updateProgress(); resolve(); 
                };
                // Fallback: Wenn Kachel fehlt, versuche Zoom-1 (unscharf, aber besser als nichts)
                img.onerror = () => {
                    const zFallback_x = Math.floor(x/2); const zFallback_y = Math.floor(y/2);
                    const off_x = (x % 2) * 128; const off_y = (y % 2) * 128;
                    const zFallbackUrl = baseUrlTpl.replace('{z}', fallbackZoom).replace('{x}', zFallback_x).replace('{y}', zFallback_y);
                    const fImg = new Image(); fImg.crossOrigin = "anonymous"; fImg.src = zFallbackUrl;
                    fImg.onload = () => { 
                        ctx.drawImage(fImg, off_x, off_y, 128, 128, (x - x1) * 256 + margin, (y - y1) * 256 + margin, 256, 256); 
                        loaded++; updateProgress(); resolve(); 
                    };
                    fImg.onerror = () => { loaded++; resolve(); }; // Wenn alles schief geht: weiße Kachel
                };
                img.src = zTargetUrl;
            });
        }
    };

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) workers.push(processQueue());
    await Promise.all(workers);

    function updateProgress() { 
        const p = Math.round((loaded / totalTiles) * 80); 
        progressBar.style.width = p + "%"; 
        if(progressPercent) progressPercent.innerText = p + "%"; 
    }
    
    if(signal.aborted) { toggleExportMenu(); return; }
    
    // --- GRENZEN MALEN ---
    progressLabel.innerText = t('render_bounds');
    ctx.save(); 
    ctx.translate((-x1 * 256) + margin, (-y1 * 256) + margin); 
    ctx.strokeStyle = "#333333"; ctx.lineWidth = 2; ctx.setLineDash([20, 20]); ctx.lineCap = "round";

    for (let el of State.cachedElements) {
        if (el.tags && el.tags.boundary === 'administrative' && el.geometry) {
            if (targetZoom < 14) continue; 
            ctx.beginPath();
            let first = true;
            for (let p of el.geometry) {
                const px = lon2tile(p.lon, targetZoom) * 256;
                const py = lat2tile(p.lat, targetZoom) * 256;
                if (first) { ctx.moveTo(px, py); first = false; } else { ctx.lineTo(px, py); }
            }
            ctx.stroke();
        }
    }
    ctx.restore();

    // --- MARKER (HYDRANTEN) MALEN ---
    progressLabel.innerText = t('render_infra');
    ctx.save(); 
    ctx.translate((-x1 * 256) + margin, (-y1 * 256) + margin);
    const iconCache = {};
    const renderedExportLocations = []; 

    for (let el of State.cachedElements) {
        const tags = el.tags || {};
        if (tags.boundary === 'administrative') continue;

        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
        
        // Duplikate filtern
        if (isStation) {
            const alreadyDrawn = renderedExportLocations.some(loc => Math.abs(loc.lat - lat) < 0.0001 && Math.abs(loc.lon - lon) < 0.0001);
            if (alreadyDrawn) continue;
            renderedExportLocations.push({lat, lon});
        }

        const type = isStation ? 'station' : (tags.emergency === 'defibrillator' ? 'defibrillator' : (tags['fire_hydrant:type'] || tags.emergency));
        const tx = lon2tile(lon, targetZoom) * 256;
        const ty = lat2tile(lat, targetZoom) * 256;
        
        // Nur malen, was im Bild ist
        if (tx < x1*256 || tx > (x2+1)*256 || ty < y1*256 || ty > (y2+1)*256) continue;

        // Zoom Filter (Wann zeigen wir was?)
        if (isStation && targetZoom < 12) continue;
        if (type === 'defibrillator') {
            if (targetZoom < 15) continue;
        } else if (!isStation && targetZoom < 15) continue;

        // Entscheidung: Punkt oder Icon?
        const drawAsStationSquare = isStation && targetZoom < 14;
        const drawAsHydrantDot = !isStation && type !== 'defibrillator' && targetZoom < 17;
        const drawAsDefibDot = type === 'defibrillator' && targetZoom >= 15 && targetZoom < 17;

        if (drawAsHydrantDot || drawAsStationSquare || drawAsDefibDot) {
            // Punkte zeichnen
            const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
            const color = isStation ? '#ef4444' : (type === 'defibrillator' ? '#16a34a' : (isWater ? '#3b82f6' : '#ef4444'));
            ctx.beginPath();
            if (drawAsStationSquare) ctx.rect(tx - 5, ty - 5, 10, 10); else ctx.arc(tx, ty, 5, 0, 2 * Math.PI);
            ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "white"; ctx.stroke();
        } else {
            // Icons zeichnen (SVG zu Bild konvertieren)
            if (!iconCache[type]) {
                const svgB = new Blob([getSVGContentForExport(type)], {type: 'image/svg+xml;charset=utf-8'});
                const url = URL.createObjectURL(svgB);
                const img = new Image();
                img.src = url; 
                await new Promise(res => img.onload = res); 
                iconCache[type] = img;
            }
            
            // Schatten
            ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
            
            const iconScale = targetZoom < 17 ? 0.8 : 1.0; 
            const size = (type === 'station' ? 38 : 34) * iconScale;
            ctx.drawImage(iconCache[type], tx - size/2, ty - size/2, size, size);
            
            ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        }
    }
    ctx.restore();

    // --- LAYOUT & FOOTER (Das Design) ---
    progressLabel.innerText = t('layout_final');
    const bannerH = 170; 
    
    // Header Kasten
    ctx.fillStyle = "rgba(255, 255, 255, 0.98)"; 
    ctx.fillRect(margin, margin, mapWidth, bannerH);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.2)"; ctx.lineWidth = 3; 
    ctx.strokeRect(margin, margin, mapWidth, bannerH);
    // Rahmen um Karte
    ctx.strokeRect(margin, margin + bannerH, mapWidth, mapHeight - bannerH);
    
    const centerX = margin + (mapWidth / 2);

    // Titel
    ctx.fillStyle = "#0f172a"; ctx.textAlign = "center";
    const finalTitle = displayTitle === "OpenFireMap.org" ? "OpenFireMap.org" : `${t('plan_title')} ${displayTitle}`;
    ctx.font = "bold 44px Arial, sans-serif"; ctx.fillText(finalTitle, centerX, margin + 55);
    
    // Datum & Auflösung
    const now = new Date();
    ctx.font = "22px Arial, sans-serif"; ctx.fillStyle = "#334155";
    
    // Datum lokalisieren
    const localeMap = { 'de': 'de-DE', 'en': 'en-US' };
    const dateLocale = localeMap[getLang()] || 'en-US';
    const dateStr = now.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' });
    
    ctx.fillText(`${t('legend_date')}: ${dateStr} | ${t('legend_res')}: Zoom ${targetZoom} (~${mPerPx.toFixed(2)} m/px)`, centerX, margin + 95);
    
    // Copyright Zeile (Nutzt textAttr aus Config)
    ctx.font = "italic 16px Arial, sans-serif"; ctx.fillStyle = "#64748b";
    const attributionText = Config.layers[State.activeLayerKey].textAttr || '© OpenStreetMap contributors';
    ctx.fillText(attributionText, centerX, margin + 125);

    // Maßstabsbalken (Scale Bar)
    const prettyD = [1000, 500, 250, 100, 50]; 
    let distM = 100, scaleW = 100 / mPerPx;
    for (let d of prettyD) { let w = d / mPerPx; if (w <= mapWidth * 0.3) { distM = d; scaleW = w; break; } }
    
    const sX = margin + mapWidth - scaleW - 40; 
    const sY = margin + mapHeight - 40;
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; ctx.fillRect(sX - 10, sY - 50, scaleW + 20, 60);
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 3; 
    ctx.beginPath(); ctx.moveTo(sX, sY - 10); ctx.lineTo(sX, sY); ctx.lineTo(sX + scaleW, sY); ctx.lineTo(sX + scaleW, sY - 10); ctx.stroke();
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 18px Arial"; ctx.fillText(`${distM} m`, sX + scaleW / 2, sY - 15);

    // Footer Zeile (Unten)
    const footerY = margin + mapHeight + (footerH / 2) + 10; 
    ctx.fillStyle = "#334155";
    
    ctx.textAlign = "left"; 
    ctx.font = "16px Arial, sans-serif"; 
    ctx.fillText("OpenFireMap.org", margin, footerY);

    ctx.textAlign = "right";
    ctx.font = "16px Arial, sans-serif";
    const timeStr = now.toLocaleString(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    ctx.fillText(timeStr, margin + mapWidth, footerY);

    // --- DOWNLOAD STARTEN ---
    progressBar.style.width = "100%";
    const link = document.createElement('a'); 
    const cleanTitle = finalTitle.replace(/[\s\.:]/g, '_'); // Dateinamen säubern
    link.download = `Hydrantenplan_${cleanTitle}_Z${targetZoom}.png`;
    link.href = canvas.toDataURL("image/png"); 
    
    // WICHTIG: Klick auslösen
    document.body.appendChild(link); // Hack für manche Browser
    link.click();
    document.body.removeChild(link);
    
    // Aufräumen
    Object.values(iconCache).forEach(img => URL.revokeObjectURL(img.src)); 
    setTimeout(toggleExportMenu, 800);
}