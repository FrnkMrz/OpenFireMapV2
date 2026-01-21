/**
 * ==========================================================================================
 * DATEI: export.js
 * ZWECK: Exportiert die Karte als Bild (PNG) oder Daten (GPX)
 * ==========================================================================================
 * * LERN-ZIELE DIESER DATEI:
 * 1. Mathematik: Wie rechnet man Längen- und Breitengrade in Pixel um? (Mercator-Projektion)
 * 2. Canvas API: Wie "malt" man eine Karte, Linien und Icons programmatisch?
 * 3. Asynchronität: Wie lädt man hunderte Kacheln gleichzeitig, ohne abzustürzen?
 * 4. Blob & Files: Wie erzeugt man eine Datei im Speicher und bietet sie zum Download an?
 * 5. Clean Code: Nutzung zentraler Farben aus Config.colors statt Hardcoding.
 */

import { State } from './state.js';   // Zugriff auf den globalen Zustand (Karte, Cache)
import { Config } from './config.js'; // Zugriff auf Konfiguration (Farben, URLs)
import { t, getLang } from './i18n.js'; // Zugriff auf Übersetzungen
import { showNotification, toggleExportMenu } from './ui.js'; // Zugriff auf UI-Funktionen

/* =============================================================================
   TEIL 1: DAS AUSWAHL-WERKZEUG (Das blaue Rechteck)
   Bevor wir exportieren, muss der Nutzer wählen, WELCHEN Bereich er will.
   ============================================================================= */

/**
 * Setzt das gewünschte Papierformat (Frei, A4 Quer, A4 Hoch).
 * WICHTIG: Das beeinflusst das Seitenverhältnis beim Ziehen des Rechtecks.
 */
export function setExportFormat(fmt) {
    State.exportFormat = fmt;
    
    // UI: Den aktiven Button markieren
    document.querySelectorAll('.fmt-btn').forEach(b => {
        b.classList.remove('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
        b.classList.add('bg-white/5');
    });
    const btn = document.getElementById(`fmt-${fmt}`);
    if(btn) btn.classList.add('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
    
    // Altes Rechteck löschen, da Format nicht mehr passt
    clearSelection();
}

/**
 * Setzt die Zoom-Stufe für das finale Bild.
 */
export function setExportZoom(z) {
    // Schutz: Topographische Karten haben oft keine Kacheln für Zoom 18.
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
 * Startet den Auswahl-Modus.
 * Die Karte wird "eingefroren" (dragging.disable), damit die Maus zeichnen kann.
 */
export function startSelection() {
    State.selection.active = true;
    clearSelection();
    
    State.map.dragging.disable(); 
    State.map.getContainer().classList.add('selection-mode'); 
    
    showNotification(t('drag_area')); 
}

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
 * @param {Event} e - Das Maus-Event von Leaflet
 * @param {string} type - 'down', 'move', 'up'
 */
export function handleSelectionEvents(e, type) {
    if (!State.selection.active) return;

    // 1. MAUS GEDRÜCKT: Startpunkt merken
    if (type === 'down') {
        State.selection.startPoint = e.latlng;
        // Farbe kommt jetzt aus der Config!
        State.selection.rect = L.rectangle([e.latlng, e.latlng], {
            color: Config.colors.selection, 
            weight: 2, 
            fillOpacity: 0.2, 
            interactive: false
        }).addTo(State.map);
    } 
    // 2. MAUS BEWEGT: Rechteck Größe anpassen
    else if (type === 'move' && State.selection.startPoint && State.selection.rect) {
        let current = e.latlng;
        
        // KOMPLEXE MATHEMATIK: Seitenverhältnis erzwingen (für DIN A4)
        if (State.exportFormat !== 'free') {
            const ratio = (State.exportFormat === 'a4l') ? 1.4142 : 0.7071; // Wurzel 2
            const start = State.selection.startPoint;
            
            // Problem: Auf einer Kugel (Erde) sind Längengrade oben enger als am Äquator.
            // Wir müssen diesen "Schrumpf-Faktor" (Cosinus der Breite) einrechnen.
            const lngScale = Math.cos(start.lat * Math.PI / 180);
            
            const dy = Math.abs(current.lat - start.lat);
            const dx = (dy * ratio) / lngScale; // Korrektur der Breite
            
            const latDir = current.lat > start.lat ? 1 : -1;
            const lngDir = current.lng > start.lng ? 1 : -1;
            
            current = L.latLng(start.lat + (latDir * dy), start.lng + (lngDir * dx));
        }
        State.selection.rect.setBounds([State.selection.startPoint, current]);
    }
    // 3. MAUS LOSGELASSEN: Fertig
    else if (type === 'up' && State.selection.startPoint) {
        State.selection.finalBounds = State.selection.rect.getBounds();
        State.selection.active = false;
        State.selection.startPoint = null;
        
        State.map.dragging.enable();
        State.map.getContainer().classList.remove('selection-mode');
        document.getElementById('selection-info').classList.remove('hidden');
    }
}

/* =============================================================================
   TEIL 2: GPX EXPORT (Daten speichern)
   ============================================================================= */

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
        const bounds = State.selection.finalBounds || State.map.getBounds();
        
        // Filter: Nur Punkte im Bereich
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

        let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
        gpx += '<gpx version="1.1" creator="OpenFireMap V2" xmlns="http://www.topografix.com/GPX/1/1">\n';
        gpx += `  <metadata><name>Hydranten Export</name><time>${new Date().toISOString()}</time></metadata>\n`;

        pointsToExport.forEach(el => {
            const tags = el.tags || {};
            const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
            const isHydrant = tags.emergency && ['fire_hydrant', 'water_tank', 'suction_point', 'fire_water_pond', 'cistern'].some(t => tags.emergency.includes(t));
            const isDefib = tags.emergency === 'defibrillator';

            if (!isStation && !isHydrant && !isDefib) return;

            let name = tags.name || (isStation ? t('station') : (isDefib ? t('defib') : t('hydrant')));
            if (!tags.name && tags['fire_hydrant:type']) name = `H ${tags['fire_hydrant:type']}`;
            if (!tags.name && tags['ref']) name = `${isStation ? 'Wache' : 'H'} ${tags['ref']}`;

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

        const blob = new Blob([gpx], {type: 'application/gpx+xml'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `OpenFireMap_Export_${new Date().toISOString().slice(0,10)}.gpx`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        showNotification(`${pointsToExport.length} ${t('gpx_success')}`);
        toggleExportMenu();
    } catch (e) {
        console.error("GPX Export Fehler:", e);
        showNotification("GPX Fehler: " + e.message, 5000);
    }
}

/* =============================================================================
   TEIL 3: PNG EXPORT (Bild erstellen)
   Das ist der komplizierteste Teil. Wir bauen ein Bild Pixel für Pixel zusammen.
   ============================================================================= */

export function cancelExport() { 
    if(State.controllers.export) State.controllers.export.abort(); 
}

// --- MATHEMATISCHE HELFERLEIN ---
const worldSize = (z) => Math.pow(2, z);
const lat2tile = (lat, z) => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * worldSize(z);
const lon2tile = (lon, z) => (lon + 180) / 360 * worldSize(z);

/**
 * Erzeugt SVG-Code für die Icons im PNG.
 * UPDATE: Nutzt jetzt Config.colors!
 */
function getSVGContentForExport(type) {
    // Zentrale Farben holen
    const c = Config.colors;

    if (type === 'defibrillator') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${c.defib}" stroke="white" stroke-width="5"/>
            <path d="M50 80 C10 40 10 10 50 35 C90 10 90 40 50 80 Z" fill="white"/>
            <path d="M55 45 L45 55 L55 55 L45 65" stroke="${c.defib}" stroke-width="3" fill="none"/>
        </svg>`;
    }
    
    const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
    const color = isWater ? c.water : c.hydrant;
    
    if (type === 'wall') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>
            <circle cx="42" cy="52" r="18" fill="none" stroke="white" stroke-width="6" />
            <line x1="64" y1="34" x2="64" y2="70" stroke="white" stroke-width="6" stroke-linecap="round" />
        </svg>`;
    }
    
    let char = '';
    switch(type) {
        case 'underground': char = 'U'; break; 
        case 'pillar':      char = 'O'; break; 
        case 'pipe':        char = 'I'; break;
        case 'dry_barrel':  char = 'Ø'; break; 
        default:            char = '';
    }
    
    if (type === 'station') return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 L50 5 L90 40 L90 90 L10 90 Z" fill="${c.station}" stroke="white" stroke-width="4"/><rect x="30" y="55" width="40" height="35" rx="2" fill="white" opacity="0.9"/></svg>`;
    
    return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${char ? `<text x="50" y="72" font-family="Arial" font-weight="bold" font-size="50" text-anchor="middle" fill="white">${char}</text>` : ''}</svg>`;
}

/**
 * HAUPTFUNKTION: EXPORT ALS PNG
 */
export async function exportAsPNG() {
    console.log("=== EXPORT START ===");
    
    try {
        State.controllers.export = new AbortController();
        const signal = State.controllers.export.signal;
        
        // 1. UI UPDATE
        document.getElementById('export-setup').classList.add('hidden');
        document.getElementById('export-progress').classList.remove('hidden');
        const progressBar = document.getElementById('progress-bar');
        
        function setStatus(msg) {
            console.log("Status:", msg);
            const titleEl = document.querySelector('.exporting-active');
            if(titleEl) titleEl.innerText = msg;
        }

        setStatus(t('locating')); 

        // 2. PARAMETER BERECHNEN
        const targetZoom = State.exportZoomLevel;
        const bounds = State.selection.finalBounds || State.map.getBounds(); 
        const nw = bounds.getNorthWest();
        const se = bounds.getSouthEast();

        // 3. AUTOMATISCHER TITEL (Reverse Geocoding)
        let displayTitle = "OpenFireMap.org";
        try {
            const center = bounds.getCenter();
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}&zoom=18`);
            const d = await res.json();
            const addr = d.address || {};
            
            // Stadt, Dorf oder Gemeinde finden
            const city = addr.city || addr.town || addr.village || addr.municipality || "";
            // Ortsteil finden
            const suburb = addr.suburb || addr.neighbourhood || addr.hamlet || "";
            
            // Titel bauen
            if (city) displayTitle = suburb ? `${city} - ${suburb}` : city;
        } catch(e) { console.warn("Titel Warnung (ignoriert):", e); }

        // 4. KACHEL-BERECHNUNG
        const x1 = Math.floor(lon2tile(nw.lng, targetZoom));
        const y1 = Math.floor(lat2tile(nw.lat, targetZoom));
        const x2 = Math.floor(lon2tile(se.lng, targetZoom));
        const y2 = Math.floor(lat2tile(se.lat, targetZoom));

        const margin = 40; 
        const footerH = 60; 
        
        const mapWidth = (x2 - x1 + 1) * 256;
        const mapHeight = (y2 - y1 + 1) * 256;
        const totalWidth = mapWidth + (margin * 2);
        const totalHeight = mapHeight + margin + footerH + margin;

        const mPerPx = (Math.cos(bounds.getCenter().lat * Math.PI / 180) * 2 * Math.PI * 6378137) / (256 * Math.pow(2, targetZoom));

        // SICHERHEITS-CHECK: Canvas-Limits
        if (totalWidth > 14000 || totalHeight > 14000) { 
            throw new Error(t('too_large') + " (>14000px)");
        }

        // 5. CANVAS ERSTELLEN
        const canvas = document.createElement('canvas');
        canvas.width = totalWidth; 
        canvas.height = totalHeight; 
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 6. KACHELN LADEN
        setStatus(`${t('loading_tiles')} (Z${targetZoom})...`);
        const tileQueue = [];
        for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) tileQueue.push({x, y});
        
        const totalTiles = tileQueue.length;
        let loaded = 0;
        const baseUrlTpl = Config.layers[State.activeLayerKey].url.replace('{s}', 'a').replace('{r}', '');

        // Queue-Worker (max 8 Bilder gleichzeitig)
        const processQueue = async () => {
            while (tileQueue.length > 0 && !signal.aborted) {
                const {x, y} = tileQueue.shift();
                await new Promise(resolve => {
                    const img = new Image(); 
                    // WICHTIG: 'anonymous' für CORS (Canvas Sicherheit)
                    img.crossOrigin = "anonymous"; 
                    img.src = baseUrlTpl.replace('{z}', targetZoom).replace('{x}', x).replace('{y}', y);
                    
                    img.onload = () => { 
                        ctx.drawImage(img, (x - x1) * 256 + margin, (y - y1) * 256 + margin); 
                        loaded++; updateProgress(); resolve(); 
                    };
                    img.onerror = () => { loaded++; resolve(); }; // Fehler ignorieren
                });
            }
        };

        const workers = [];
        for (let i = 0; i < 8; i++) workers.push(processQueue());
        await Promise.all(workers);

        function updateProgress() { 
            const p = Math.round((loaded / totalTiles) * 80); 
            progressBar.style.width = p + "%"; 
        }

        if(signal.aborted) throw new Error("Vom Benutzer abgebrochen");

        // 7. GRENZEN MALEN
        setStatus(t('render_bounds'));
        ctx.save();
        ctx.translate((-x1 * 256) + margin, (-y1 * 256) + margin);
        // Config Farbe nutzen!
        ctx.strokeStyle = Config.colors.bounds; 
        ctx.lineWidth = 2; ctx.setLineDash([20, 20]); ctx.lineCap = "round";
        
        State.cachedElements.forEach(el => {
            if (el.tags && el.tags.boundary === 'administrative' && el.geometry && targetZoom >= 14) {
                 ctx.beginPath();
                 let first = true;
                 for (let p of el.geometry) {
                     const px = lon2tile(p.lon, targetZoom) * 256;
                     const py = lat2tile(p.lat, targetZoom) * 256;
                     if (first) { ctx.moveTo(px, py); first = false; } else { ctx.lineTo(px, py); }
                 }
                 ctx.stroke();
            }
        });
        ctx.restore();

        // 8. INFRASTRUKTUR MALEN
        setStatus(t('render_infra'));
        ctx.save(); 
        ctx.translate((-x1 * 256) + margin, (-y1 * 256) + margin);
        
        const iconCache = {};
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
            
            // Nur malen, wenn im Bild
            if (tx < x1*256 || tx > (x2+1)*256 || ty < y1*256 || ty > (y2+1)*256) continue;
            
            if (isStation && targetZoom < 12) continue;
            if (!isStation && targetZoom < 15) continue;

            // Zeichnen: Punkt oder Icon?
            if (targetZoom < 17 && !isStation) {
                 ctx.beginPath();
                 ctx.arc(tx, ty, 5, 0, 2 * Math.PI);
                 
                 // Config Farben für die Punkte
                 const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
                 ctx.fillStyle = type === 'defibrillator' ? Config.colors.defib : (isWater ? Config.colors.water : Config.colors.hydrant);
                 
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

        // 9. LAYOUT (Design wiederhergestellt!)
        setStatus(t('layout_final'));
        
        // Hintergrund Header
        const bannerH = 170;
        ctx.fillStyle = Config.colors.bgHeader || "rgba(255, 255, 255, 0.98)";
        ctx.fillRect(margin, margin, mapWidth, bannerH);
        
        // Rahmen
        ctx.strokeStyle = "rgba(15, 23, 42, 0.2)"; ctx.lineWidth = 3;
        ctx.strokeRect(margin, margin, mapWidth, bannerH);
        ctx.strokeRect(margin, margin + bannerH, mapWidth, mapHeight - bannerH);
        
        const centerX = margin + (mapWidth / 2);
        
        // Titel: Jetzt mit "Hydrantenplan ..." Prefix!
        ctx.fillStyle = Config.colors.textMain || "#0f172a"; 
        ctx.textAlign = "center";
        ctx.font = "bold 44px Arial, sans-serif"; 
        
        const finalTitle = displayTitle === "OpenFireMap.org" ? "OpenFireMap.org" : `${t('plan_title')} ${displayTitle}`;
        ctx.fillText(finalTitle, centerX, margin + 55);
        
        // Datum & Zoom
        const now = new Date();
        ctx.font = "22px Arial, sans-serif"; 
        ctx.fillStyle = Config.colors.textSub || "#334155";
        
        const localeMap = { 'de': 'de-DE', 'en': 'en-US' };
        const dateLocale = localeMap[getLang()] || 'en-US';
        const dateStr = now.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' });
        
        ctx.fillText(`${t('legend_date')}: ${dateStr} | ${t('legend_res')}: Zoom ${targetZoom} (~${mPerPx.toFixed(2)} m/px)`, centerX, margin + 95);
        
        // Copyright
        ctx.font = "italic 16px Arial, sans-serif"; ctx.fillStyle = "#64748b";
        ctx.fillText(Config.layers[State.activeLayerKey].textAttr || "© OpenStreetMap", centerX, margin + 125);

        // Maßstabsbalken
        const prettyD = [1000, 500, 250, 100, 50]; 
        let distM = 100, scaleW = 100 / mPerPx;
        for (let d of prettyD) { let w = d / mPerPx; if (w <= mapWidth * 0.3) { distM = d; scaleW = w; break; } }
        
        const sX = margin + mapWidth - scaleW - 40; 
        const sY = margin + mapHeight - 40;
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; ctx.fillRect(sX - 10, sY - 50, scaleW + 20, 60);
        ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.moveTo(sX, sY - 10); ctx.lineTo(sX, sY); ctx.lineTo(sX + scaleW, sY); ctx.lineTo(sX + scaleW, sY - 10); ctx.stroke();
        ctx.fillStyle = "#0f172a"; ctx.font = "bold 18px Arial"; ctx.fillText(`${distM} m`, sX + scaleW / 2, sY - 15);

        // Footer
        const footerY = margin + mapHeight + (footerH / 2) + 10; 
        ctx.fillStyle = Config.colors.textSub || "#334155";
        ctx.textAlign = "left"; 
        ctx.font = "16px Arial, sans-serif"; 
        ctx.fillText("OpenFireMap.org", margin, footerY);

        ctx.textAlign = "right";
        ctx.font = "16px Arial, sans-serif";
        const timeStr = now.toLocaleString(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        ctx.fillText(timeStr, margin + mapWidth, footerY);

        // 10. DOWNLOAD STARTEN
        // 'toBlob' ist besser als 'toDataURL' für große Bilder (kein Absturz)
        setStatus("Speichere Datei...");
        
        canvas.toBlob((blob) => {
            if (!blob) throw new Error("Blob fehlgeschlagen");
            
            const link = document.createElement('a');
            const safeTitle = finalTitle.replace(/[\s\.:]/g, '_');
            link.download = `Plan_${safeTitle}_Z${targetZoom}.png`;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link); // Hack für Firefox
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