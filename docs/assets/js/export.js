/**
 * ==========================================================================================
 * DATEI: export.js
 * ZWECK: Export von Karten als Bild (PNG) und Daten (GPX)
 * LERN-ZIEL: Canvas-Zeichnung, Asynchrone Prozesse, Blob-Verarbeitung, Fehlerbehandlung
 * ==========================================================================================
 * * * WARUM DIESE DATEI SO KOMPLEX IST:
 * 1. Wir können nicht einfach einen Screenshot machen, da die Karte größer sein kann als der Bildschirm.
 * 2. Wir müssen hunderte kleine Bilder (Kacheln) laden und nahtlos zusammensetzen.
 * 3. Canvas (die Zeichenfläche) erlaubt keine HTML-Elemente, also müssen wir Icons manuell malen.
 * 4. Browser blockieren Downloads oft aus Sicherheitsgründen ("Tainted Canvas"), das müssen wir umgehen.
 */

import { State } from './state.js';   // Zugriff auf Karte & Daten
import { Config } from './config.js'; // Zugriff auf Server-URLs & Copyright-Texte
import { t, getLang } from './i18n.js'; // Übersetzung & Sprach-Formatierung
import { showNotification, toggleExportMenu } from './ui.js'; // UI Steuerung

/* =============================================================================
   TEIL 1: DAS AUSWAHL-WERKZEUG
   Hier steuern wir das blaue Rechteck, das der Nutzer auf der Karte ziehen kann.
   ============================================================================= */

/**
 * Setzt das Papierformat (z.B. A4 Quer).
 * Das erzwingt ein bestimmtes Seitenverhältnis beim Ziehen des Rechtecks.
 */
export function setExportFormat(fmt) {
    State.exportFormat = fmt;
    
    // UI Update: Alle Buttons normal machen, den gewählten Button hervorheben
    document.querySelectorAll('.fmt-btn').forEach(b => {
        b.classList.remove('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
        b.classList.add('bg-white/5');
    });
    const btn = document.getElementById(`fmt-${fmt}`);
    if(btn) btn.classList.add('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
    
    // Alte Auswahl löschen, da sie jetzt das falsche Format haben könnte
    clearSelection();
}

/**
 * Setzt die gewünschte Zoom-Stufe (Detailgrad) für das Bild.
 * Zoom 18 = Sehr detailliert (Hausnummern), Zoom 15 = Übersicht.
 */
export function setExportZoom(z) {
    // Sicherheits-Check: Topographische Karten gehen oft nur bis Zoom 17
    if (State.activeLayerKey === 'topo' && z > 17) return; 
    
    State.exportZoomLevel = z;
    
    // UI Update
    document.querySelectorAll('.zoom-btn').forEach(b => {
        b.classList.remove('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
        b.classList.add('bg-white/5');
    });
    const btn = document.getElementById(`zoom-${z}`);
    if(btn) btn.classList.add('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
}

/**
 * Aktiviert den "Auswahl-Modus".
 * Die Karte wird eingefroren (nicht mehr verschiebbar), damit man zeichnen kann.
 */
export function startSelection() {
    State.selection.active = true;
    clearSelection();
    
    // Leaflet Funktion: Ziehen der Karte deaktivieren
    State.map.dragging.disable(); 
    
    // Cursor ändern (Fadenkreuz)
    State.map.getContainer().classList.add('selection-mode'); 
    
    showNotification(t('drag_area')); 
}

/**
 * Löscht das blaue Rechteck von der Karte.
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
 * Der "Event Handler" für die Maus-Bewegungen beim Auswählen.
 * Wird von app.js aufgerufen, wenn man auf die Karte klickt/zieht.
 */
export function handleSelectionEvents(e, type) {
    if (!State.selection.active) return; // Nur aktiv, wenn Modus an ist

    // 1. MAUS GEDRÜCKT: Startpunkt setzen
    if (type === 'down') {
        State.selection.startPoint = e.latlng;
        // Ein leeres Rechteck an der Startposition erzeugen
        State.selection.rect = L.rectangle([e.latlng, e.latlng], {
            color: '#3b82f6', weight: 2, fillOpacity: 0.2, interactive: false
        }).addTo(State.map);
    } 
    // 2. MAUS BEWEGT: Rechteck vergrößern
    else if (type === 'move' && State.selection.startPoint && State.selection.rect) {
        let current = e.latlng;
        
        // Wenn ein festes Format (A4) gewählt ist, müssen wir tricksen:
        if (State.exportFormat !== 'free') {
            const ratio = (State.exportFormat === 'a4l') ? 1.4142 : 0.7071; // Seitenverhältnis Wurzel 2
            const start = State.selection.startPoint;
            
            // Mathe: Die Erde ist keine Scheibe! Längengrade werden zum Pol hin schmaler.
            // Wir müssen das Verhältnis korrigieren ("Mercator-Verzerrung").
            const lngScale = Math.cos(start.lat * Math.PI / 180);
            
            const dy = Math.abs(current.lat - start.lat);
            const dx = (dy * ratio) / lngScale;
            
            // Richtung bestimmen (ziehen wir nach oben oder unten?)
            const latDir = current.lat > start.lat ? 1 : -1;
            const lngDir = current.lng > start.lng ? 1 : -1;
            
            // Punkt neu berechnen, damit das Verhältnis stimmt
            current = L.latLng(start.lat + (latDir * dy), start.lng + (lngDir * dx));
        }
        // Rechteck aktualisieren
        State.selection.rect.setBounds([State.selection.startPoint, current]);
    }
    // 3. MAUS LOSGELASSEN: Fertig
    else if (type === 'up' && State.selection.startPoint) {
        State.selection.finalBounds = State.selection.rect.getBounds();
        State.selection.active = false;
        State.selection.startPoint = null;
        
        // Karte wieder freigeben
        State.map.dragging.enable();
        State.map.getContainer().classList.remove('selection-mode');
        
        // Info anzeigen "Fixiert"
        document.getElementById('selection-info').classList.remove('hidden');
    }
}

/* =============================================================================
   TEIL 2: GPX EXPORT
   Erstellt eine XML-Datei für Navigationsgeräte.
   ============================================================================= */

// Hilfsfunktion: Sonderzeichen (wie & < >) maskieren, damit das XML gültig bleibt.
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
    try {
        // Welchen Bereich exportieren wir? (Auswahl oder ganze Ansicht)
        const bounds = State.selection.finalBounds || State.map.getBounds();
        
        // Filter: Nur Punkte exportieren, die im Bereich liegen
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

        // GPX Kopfzeilen schreiben
        let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
        gpx += '<gpx version="1.1" creator="OpenFireMap V2" xmlns="http://www.topografix.com/GPX/1/1">\n';
        gpx += `  <metadata><name>Hydranten Export</name><time>${new Date().toISOString()}</time></metadata>\n`;

        // Alle Punkte durchgehen und als Wegpunkt (<wpt>) hinzufügen
        pointsToExport.forEach(el => {
            const tags = el.tags || {};
            
            // Typ bestimmen
            const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
            const isHydrant = tags.emergency && ['fire_hydrant', 'water_tank', 'suction_point', 'fire_water_pond', 'cistern'].some(t => tags.emergency.includes(t));
            const isDefib = tags.emergency === 'defibrillator';

            if (!isStation && !isHydrant && !isDefib) return;

            // Name generieren (z.B. "H 100" oder "Feuerwache")
            let name = tags.name || (isStation ? t('station') : (isDefib ? t('defib') : t('hydrant')));
            if (!tags.name && tags['fire_hydrant:type']) name = `H ${tags['fire_hydrant:type']}`;
            if (!tags.name && tags['ref']) name = `${isStation ? 'Wache' : 'H'} ${tags['ref']}`;

            // Beschreibung aus allen Tags bauen
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

        // Datei erzeugen und Download starten
        const blob = new Blob([gpx], {type: 'application/gpx+xml'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `OpenFireMap_Export_${new Date().toISOString().slice(0,10)}.gpx`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url); // Speicher freigeben
        
        showNotification(`${pointsToExport.length} ${t('gpx_success')}`);
        toggleExportMenu();
    } catch (e) {
        console.error("GPX Export Fehler:", e);
        showNotification("GPX Fehler: " + e.message, 5000);
    }
}

/* =============================================================================
   TEIL 3: PNG EXPORT (Das Meisterstück)
   Dies ist der komplizierteste Teil der App. Wir bauen ein Bild Pixel für Pixel.
   ============================================================================= */

// Abbruch-Funktion (Button "Abbrechen")
export function cancelExport() { 
    if(State.controllers.export) State.controllers.export.abort(); 
}

// Mathe-Funktionen: Umrechnung von Geokoordinaten (Lat/Lon) zu Kachel-Nummern (X/Y)
const worldSize = (z) => Math.pow(2, z);
const lat2tile = (lat, z) => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * worldSize(z);
const lon2tile = (lon, z) => (lon + 180) / 360 * worldSize(z);

/**
 * Erzeugt SVG-Quellcode für die Icons im PNG.
 * Da Canvas keine CSS-Klassen kennt, müssen wir das Icon hier "hardcoden" (SVG Strings).
 */
function getSVGContentForExport(type) {
    // 1. Defibrillator
    if (type === 'defibrillator') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#16a34a" stroke="white" stroke-width="5"/><path d="M50 80 C10 40 10 10 50 35 C90 10 90 40 50 80 Z" fill="white"/><path d="M55 45 L45 55 L55 55 L45 65" stroke="#16a34a" stroke-width="3" fill="none"/></svg>`;
    }
    const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
    const color = isWater ? '#3b82f6' : '#ef4444';
    
    // 2. Wandhydrant
    if (type === 'wall') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/><circle cx="42" cy="52" r="18" fill="none" stroke="white" stroke-width="6" /><line x1="64" y1="34" x2="64" y2="70" stroke="white" stroke-width="6" stroke-linecap="round" /></svg>`;
    }
    
    // 3. Typ-Buchstabe
    let char = '';
    switch(type) {
        case 'underground': char = 'U'; break; 
        case 'pillar':      char = 'O'; break; 
        case 'pipe':        char = 'I'; break;
        case 'dry_barrel':  char = 'Ø'; break; 
        default:            char = '';
    }
    
    // 4. Feuerwache
    if (type === 'station') return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 L50 5 L90 40 L90 90 L10 90 Z" fill="#ef4444" stroke="white" stroke-width="4"/><rect x="30" y="55" width="40" height="35" rx="2" fill="white" opacity="0.9"/></svg>`;
    
    // 5. Standard Hydrant
    return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${char ? `<text x="50" y="72" font-family="Arial" font-weight="bold" font-size="50" text-anchor="middle" fill="white">${char}</text>` : ''}</svg>`;
}

/**
 * HAUPTFUNKTION: Erstellt das PNG
 * Diese Funktion ist 'async', weil das Laden der Bilder Zeit braucht.
 */
export async function exportAsPNG() {
    console.log("=== EXPORT START ===");
    
    try {
        // Abbruch-Controller initialisieren
        State.controllers.export = new AbortController();
        const signal = State.controllers.export.signal;
        
        // 1. UI auf "Laden" umschalten
        document.getElementById('export-setup').classList.add('hidden');
        document.getElementById('export-progress').classList.remove('hidden');
        const progressBar = document.getElementById('progress-bar');
        
        // Hilfsfunktion: Zeigt Fortschrittstext an
        function setStatus(msg) {
            console.log("Status:", msg);
            const titleEl = document.querySelector('.exporting-active');
            if(titleEl) titleEl.innerText = msg;
        }

        setStatus(t('locating')); // "Lokalisiere..."

        // 2. Parameter berechnen (Welcher Ausschnitt?)
        const targetZoom = State.exportZoomLevel;
        const bounds = State.selection.finalBounds || State.map.getBounds(); 
        const nw = bounds.getNorthWest(); // Nord-West Ecke
        const se = bounds.getSouthEast(); // Süd-Ost Ecke

        // 3. Titel automatisch bestimmen (Reverse Geocoding)
        let displayTitle = "OpenFireMap.org";
        try {
            const center = bounds.getCenter();
            // Frage OSM: "Welcher Ort ist an diesen Koordinaten?"
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}&zoom=18`);
            const d = await res.json();
            const addr = d.address || {};
            // Baue Titel: "Schnaittach" oder "Schnaittach - Rollhofen"
            const city = addr.city || addr.town || addr.village || "";
            const suburb = addr.suburb || addr.neighbourhood || "";
            if (city) displayTitle = suburb ? `${city} - ${suburb}` : city;
        } catch(e) { console.warn("Titel Warnung (ignoriert):", e); }

        // 4. Größe des Zielbildes berechnen
        // Wir rechnen aus, welche Kacheln (Tiles) wir brauchen.
        const x1 = Math.floor(lon2tile(nw.lng, targetZoom));
        const y1 = Math.floor(lat2tile(nw.lat, targetZoom));
        const x2 = Math.floor(lon2tile(se.lng, targetZoom));
        const y2 = Math.floor(lat2tile(se.lat, targetZoom));

        const margin = 40;  // Weißer Rand
        const footerH = 60; // Platz für Copyright unten
        
        // Bildgröße = Anzahl Kacheln * 256 Pixel
        const mapWidth = (x2 - x1 + 1) * 256;
        const mapHeight = (y2 - y1 + 1) * 256;
        const totalWidth = mapWidth + (margin * 2);
        const totalHeight = mapHeight + margin + footerH + margin;

        // Sicherheits-Check: Browser stürzen ab, wenn Canvas zu riesig wird (>16.000px)
        if (totalWidth > 14000 || totalHeight > 14000) { 
            throw new Error(t('too_large') + " (>14000px)");
        }

        // 5. Canvas erstellen (Die Leinwand)
        const canvas = document.createElement('canvas');
        canvas.width = totalWidth; 
        canvas.height = totalHeight; 
        const ctx = canvas.getContext('2d');
        
        // Weißen Hintergrund füllen
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 6. Kacheln laden und zeichnen
        setStatus(`${t('loading_tiles')} (Z${targetZoom})...`);
        const tileQueue = [];
        // Liste aller benötigten Kacheln erstellen
        for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) tileQueue.push({x, y});
        
        const totalTiles = tileQueue.length;
        let loaded = 0;
        const baseUrlTpl = Config.layers[State.activeLayerKey].url.replace('{s}', 'a').replace('{r}', '');

        // Queue-Worker: Lädt max. 8 Bilder gleichzeitig (Browser-Limit beachten)
        const processQueue = async () => {
            while (tileQueue.length > 0 && !signal.aborted) {
                const {x, y} = tileQueue.shift();
                await new Promise(resolve => {
                    const img = new Image(); 
                    // WICHTIG: crossOrigin erlaubt uns, das Bild im Canvas zu speichern
                    img.crossOrigin = "anonymous"; 
                    img.src = baseUrlTpl.replace('{z}', targetZoom).replace('{x}', x).replace('{y}', y);
                    
                    img.onload = () => { 
                        // Bild an die richtige Stelle malen
                        ctx.drawImage(img, (x - x1) * 256 + margin, (y - y1) * 256 + margin); 
                        loaded++; updateProgress(); resolve(); 
                    };
                    img.onerror = () => { 
                        console.warn(`Kachelfehler bei ${x}/${y}`);
                        loaded++; resolve(); // Trotzdem weitermachen
                    };
                });
            }
        };

        // 8 parallele Worker starten
        const workers = [];
        for (let i = 0; i < 8; i++) workers.push(processQueue());
        await Promise.all(workers);

        function updateProgress() { 
            const p = Math.round((loaded / totalTiles) * 80); 
            progressBar.style.width = p + "%"; 
        }

        if(signal.aborted) throw new Error("Vom Benutzer abgebrochen");

        // 7. Grenzen (gestrichelte Linien) malen
        setStatus(t('render_bounds'));
        ctx.save();
        ctx.translate((-x1 * 256) + margin, (-y1 * 256) + margin);
        ctx.strokeStyle = "#333333"; ctx.lineWidth = 2; ctx.setLineDash([20, 20]); ctx.lineCap = "round";
        
        State.cachedElements.forEach(el => {
            if (el.tags && el.tags.boundary === 'administrative' && el.geometry && targetZoom >= 14) {
                 ctx.beginPath();
                 let first = true;
                 for (let p of el.geometry) {
                     // Geokoordinaten in Pixel umrechnen
                     const px = lon2tile(p.lon, targetZoom) * 256;
                     const py = lat2tile(p.lat, targetZoom) * 256;
                     if (first) { ctx.moveTo(px, py); first = false; } else { ctx.lineTo(px, py); }
                 }
                 ctx.stroke();
            }
        });
        ctx.restore();

        // 8. Hydranten & Wachen malen
        setStatus(t('render_infra'));
        ctx.save(); 
        ctx.translate((-x1 * 256) + margin, (-y1 * 256) + margin);
        
        const iconCache = {};
        
        // Helper: SVG zu Bild konvertieren (damit wir es in Canvas malen können)
        const loadSVG = async (type) => {
            if(iconCache[type]) return iconCache[type];
            const svgStr = getSVGContentForExport(type);
            const blob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.src = url;
            await new Promise(r => img.onload = r);
            iconCache[type] = img;
            URL.revokeObjectURL(url);
            return img;
        };

        for (let el of State.cachedElements) {
            const tags = el.tags || {};
            if (tags.boundary === 'administrative') continue;

            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
            const type = isStation ? 'station' : (tags.emergency === 'defibrillator' ? 'defibrillator' : (tags['fire_hydrant:type'] || tags.emergency));
            
            const tx = lon2tile(lon, targetZoom) * 256;
            const ty = lat2tile(lat, targetZoom) * 256;
            
            // Nur malen, wenn im Bildausschnitt
            if (tx < x1*256 || tx > (x2+1)*256 || ty < y1*256 || ty > (y2+1)*256) continue;
            
            // Zoom-Filter (Wann zeigen wir was?)
            if (isStation && targetZoom < 12) continue;
            if (!isStation && targetZoom < 15) continue;

            // Zeichnen: Entweder als Punkt (weit weg) oder als Icon (nah)
            if (targetZoom < 17 && !isStation) {
                 ctx.beginPath();
                 ctx.arc(tx, ty, 5, 0, 2 * Math.PI);
                 ctx.fillStyle = type === 'defibrillator' ? '#16a34a' : '#ef4444'; 
                 ctx.fill(); ctx.stroke();
            } else {
                try {
                    const img = await loadSVG(type);
                    const size = 32;
                    ctx.drawImage(img, tx - size/2, ty - size/2, size, size);
                } catch(err) { console.warn("Icon Fehler", err); }
            }
        }
        ctx.restore();

        // 9. HEADER & FOOTER MALEN (Layout wiederhergestellt!)
        setStatus(t('layout_final'));
        
        // Weißer Kasten oben für Titel
        const bannerH = 170;
        ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
        ctx.fillRect(margin, margin, mapWidth, bannerH);
        
        // Rahmen zeichnen
        ctx.strokeStyle = "rgba(15, 23, 42, 0.2)"; ctx.lineWidth = 3;
        ctx.strokeRect(margin, margin, mapWidth, bannerH); // Header Rahmen
        ctx.strokeRect(margin, margin + bannerH, mapWidth, mapHeight - bannerH); // Karten Rahmen
        
        const centerX = margin + (mapWidth / 2);
        
        // Titel
        ctx.fillStyle = "#0f172a"; ctx.textAlign = "center";
        ctx.font = "bold 44px Arial, sans-serif"; 
        ctx.fillText(displayTitle, centerX, margin + 55);
        
        // Datum & Auflösung
        const now = new Date();
        ctx.font = "22px Arial, sans-serif"; ctx.fillStyle = "#334155";
        
        // Datum formatieren je nach Sprache (getLang aus i18n.js)
        const localeMap = { 'de': 'de-DE', 'en': 'en-US' };
        const dateLocale = localeMap[getLang()] || 'en-US';
        const dateStr = now.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' });
        const mPerPx = (Math.cos(bounds.getCenter().lat * Math.PI / 180) * 2 * Math.PI * 6378137) / (256 * Math.pow(2, targetZoom));
        
        ctx.fillText(`${t('legend_date')}: ${dateStr} | ${t('legend_res')}: Zoom ${targetZoom} (~${mPerPx.toFixed(2)} m/px)`, centerX, margin + 95);
        
        // Copyright (Text aus Config)
        ctx.font = "italic 16px Arial, sans-serif"; ctx.fillStyle = "#64748b";
        ctx.fillText(Config.layers[State.activeLayerKey].textAttr || "© OpenStreetMap", centerX, margin + 125);

        // Maßstabsbalken (Scale Bar)
        const prettyD = [1000, 500, 250, 100, 50]; 
        let distM = 100, scaleW = 100 / mPerPx;
        // Finde passenden Maßstab, der ins Bild passt
        for (let d of prettyD) { let w = d / mPerPx; if (w <= mapWidth * 0.3) { distM = d; scaleW = w; break; } }
        
        const sX = margin + mapWidth - scaleW - 40; 
        const sY = margin + mapHeight - 40;
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; ctx.fillRect(sX - 10, sY - 50, scaleW + 20, 60);
        ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.moveTo(sX, sY - 10); ctx.lineTo(sX, sY); ctx.lineTo(sX + scaleW, sY); ctx.lineTo(sX + scaleW, sY - 10); ctx.stroke();
        ctx.fillStyle = "#0f172a"; ctx.font = "bold 18px Arial"; ctx.fillText(`${distM} m`, sX + scaleW / 2, sY - 15);

        // Footer Text (Unten)
        const footerY = margin + mapHeight + (footerH / 2) + 10; 
        ctx.fillStyle = "#334155";
        
        ctx.textAlign = "left"; 
        ctx.font = "16px Arial, sans-serif"; 
        ctx.fillText("OpenFireMap.org", margin, footerY);

        ctx.textAlign = "right";
        ctx.font = "16px Arial, sans-serif";
        const timeStr = now.toLocaleString(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        ctx.fillText(timeStr, margin + mapWidth, footerY);

        // 10. DOWNLOAD STARTEN
        setStatus("Speichere Datei...");
        
        // Wir nutzen 'toBlob' (besser für Speicher) statt 'toDataURL'
        canvas.toBlob((blob) => {
            if (!blob) {
                throw new Error("Blob fehlgeschlagen");
            }
            const link = document.createElement('a');
            // Dateiname säubern (keine Leerzeichen)
            const safeTitle = displayTitle.replace(/[\s\.:]/g, '_');
            link.download = `Plan_${safeTitle}_Z${targetZoom}.png`;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => {
                URL.revokeObjectURL(link.href);
                toggleExportMenu();
                showNotification("Download gestartet!", 3000);
            }, 1000);
        }, 'image/png');

    } catch (e) {
        console.error("CRITICAL EXPORT ERROR:", e);
        showNotification("FEHLER: " + e.message, 10000);
        
        setTimeout(() => {
            document.getElementById('export-progress').classList.add('hidden');
            document.getElementById('export-setup').classList.remove('hidden');
        }, 5000);
    }
}