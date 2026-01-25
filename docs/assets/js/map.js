/**
 * ==========================================================================================
 * DATEI: map.js
 * ZWECK: Karte und Marker (Mit Smart-Tooltips)
 * ==========================================================================================
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t } from './i18n.js';
import { fetchOSMData } from './api.js';

export function initMapLogic() {
    State.markerLayer = L.layerGroup();
    State.boundaryLayer = L.layerGroup();
    State.rangeLayerGroup = L.layerGroup();

    // NEU: Wir initialisieren einen Cache für die Marker-Verwaltung.
    // Speichert: ID -> { marker: LeafletMarker, type: String, mode: String }
    State.markerCache = new Map();

    State.map = L.map('map', { 
        zoomControl: false, 
        preferCanvas: true, // <--- WICHTIG: Beschleunigt das Rendering massiv
        center: Config.defaultCenter, 
        zoom: Config.defaultZoom 
    });

    State.boundaryLayer.addTo(State.map);
    State.rangeLayerGroup.addTo(State.map);
    State.markerLayer.addTo(State.map);

    setBaseLayer('voyager');

    let debounceTimer;
    State.map.on('moveend zoomend', () => {
        // FIX FÜR "RAUSZOOMEN": 
        // Wir rufen sofort renderMarkers auf, um die Sichtbarkeit basierend auf dem 
        // NEUEN Zoom-Level zu prüfen. 
        // Dadurch verschwinden Hydranten (<15) oder Wachen (<12) sofort,
        // ohne dass wir auf das Neuladen der Daten warten müssen.
        if (State.cachedElements) {
            renderMarkers(State.cachedElements, State.map.getZoom());
        }

        // Der Rest bleibt gleich (Daten neu laden nach kurzer Wartezeit)
        if (debounceTimer) clearTimeout(debounceTimer);
        const statusEl = document.getElementById('data-status');
        if(statusEl) {
            statusEl.innerText = t('status_waiting');
            statusEl.className = 'text-amber-400 font-bold';
        }
        debounceTimer = setTimeout(() => fetchOSMData(), 400);
    });

    State.map.on('click', () => {
        if (!State.selection.active) {
            State.rangeLayerGroup.clearLayers();
        }
    });
    
    State.map.on('zoom', () => {
        const el = document.getElementById('zoom-val');
        if(el) el.innerText = State.map.getZoom().toFixed(1);
    });

    fetchOSMData();
}

export function setBaseLayer(key) {
    State.activeLayerKey = key;
    State.map.eachLayer(layer => { 
        if (layer instanceof L.TileLayer) State.map.removeLayer(layer); 
    });
    const conf = Config.layers[key];
    L.tileLayer(conf.url, { attribution: conf.attr, maxZoom: conf.maxZoom }).addTo(State.map);
    
    document.querySelectorAll('.layer-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`btn-${key}`);
    if(btn) btn.classList.add('active');
}

// Hilfsfunktion für SVGs (jetzt mit Farben aus Config)
function getSVGContent(type) {
    // Farben holen
    const c = Config.colors;

    // 1. Defibrillator
    if (type === 'defibrillator') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${c.defib}" stroke="white" stroke-width="5"/>
            <path d="M50 80 C10 40 10 10 50 35 C90 10 90 40 50 80 Z" fill="white"/>
            <path d="M55 45 L45 55 L55 55 L45 65" stroke="${c.defib}" stroke-width="3" fill="none"/>
        </svg>`;
    }
    
    // Entscheidung: Blau oder Rot?
    const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
    const color = isWater ? c.water : c.hydrant;
    
    // 2. Wandhydrant
    if (type === 'wall') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>
            <circle cx="42" cy="52" r="18" fill="none" stroke="white" stroke-width="6" />
            <line x1="64" y1="34" x2="64" y2="70" stroke="white" stroke-width="6" stroke-linecap="round" />
        </svg>`;
    }
    
    // Buchstabe ermitteln
    let char = '';
    switch(type) {
        case 'underground': char = 'U'; break; 
        case 'pillar':      char = 'O'; break; 
        case 'pipe':        char = 'I'; break;
        case 'dry_barrel':  char = 'Ø'; break; 
        default:            char = '';
    }
    
    // 3. Wache
    if (type === 'station') return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 L50 5 L90 40 L90 90 L10 90 Z" fill="${c.station}" stroke="white" stroke-width="4"/><rect x="30" y="55" width="40" height="35" rx="2" fill="white" opacity="0.9"/></svg>`;
    
    // 4. Standard
    return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${char ? `<text x="50" y="72" font-family="Arial" font-weight="bold" font-size="50" text-anchor="middle" fill="white">${char}</text>` : ''}</svg>`;
}

function generateTooltip(tags) {
    const safeTags = tags || {};
    const tooltipTitleRaw = safeTags.name || t('details');
    const tooltipTitle = escapeHtml(tooltipTitleRaw);

    let html = `<div class="p-2 min-w-[180px]"><div class="font-bold text-sm border-b border-white/20 pb-1 mb-1 text-blue-400">${tooltipTitle}</div><div class="text-[10px] font-mono grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">`;

    for (const [key, val] of Object.entries(safeTags)) {
        html += `<div class="text-slate-400 text-right">${escapeHtml(key)}:</div><div class="text-slate-200 break-words">${escapeHtml(val)}</div>`;
    }

    html += `</div></div>`;
    return html;
}


// Kreis-Funktion (jetzt mit Config-Farbe)
export function showRangeCircle(lat, lon) {
    State.rangeLayerGroup.clearLayers();
    const zoom = State.map.getZoom();
    if (zoom < 16) return; 

    // Hier nutzen wir Config.colors.rangeCircle
    L.circle([lat, lon], {
        color: Config.colors.rangeCircle, 
        fillColor: Config.colors.rangeCircle, 
        fillOpacity: 0.15, 
        radius: 100, weight: 2, dashArray: '5, 8', interactive: false 
    }).addTo(State.rangeLayerGroup);

    if (zoom >= 17) {
        const latRad = lat * Math.PI / 180;
        const kmPerDegLon = 111.32 * Math.cos(latRad);
        const offsetLon = 0.05 / kmPerDegLon; 
        
        const labelMarker = L.marker([lat, lon + offsetLon], {opacity: 0, interactive: false}).addTo(State.rangeLayerGroup);
        labelMarker.bindTooltip("100 m", { permanent: true, direction: 'center', className: 'range-label', offset: [0, 0] }).openTooltip();
    }
}
/**
 * Rendert die Marker basierend auf den übergebenen Daten (elements).
 * OPTIMIERUNG: Nutzt "Diffing", um Flackern zu verhindern.
 * Es werden nur Marker entfernt/hinzugefügt, die sich tatsächlich geändert haben.
 */
export function renderMarkers(elements, zoom) {
    // Grenzen (Boundaries) werden weiterhin komplett neu gezeichnet, 
    // da es meist nur wenige sind und sich die Geometrie bei Zoom ändern kann.
    State.boundaryLayer.clearLayers();

    // 1. Vorbereitung: Welche Marker sollen aktuell angezeigt werden?
    // Wir sammeln hier nur die Daten, wir zeichnen noch nicht.
    const markersToKeep = new Set();
    const renderedLocations = []; // Für die Duplikat-Prüfung (z.B. bei Wachen)

    elements.forEach(el => {
        const tags = el.tags || {};
        const id = el.id; // WICHTIG: Die eindeutige OSM-ID

        // --- A. Grenzen verarbeiten (wie bisher) ---
        if (tags.boundary === 'administrative' && el.geometry && zoom >= 14) {
            const latlngs = el.geometry.map(p => [p.lat, p.lon]);
            L.polyline(latlngs, { 
                color: Config.colors.bounds, 
                weight: 1, 
                dashArray: '10, 10', 
                opacity: 0.7 
            }).addTo(State.boundaryLayer);
            return;
        }

        // --- B. Datenvalidierung ---
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        if (!lat || !lon) return;

        // --- C. Typ-Bestimmung ---
        const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
        const isDefib = tags.emergency === 'defibrillator';
        // Fallback für Typen
        let type = isStation ? 'station' : (isDefib ? 'defibrillator' : (tags['fire_hydrant:type'] || tags.emergency));

        // --- D. Zoom-Filter (Sichtbarkeit) ---
        // Stationen ab Zoom 12, Hydranten/Defis ab Zoom 15
        if (isStation && zoom < 12) return; 
        if (!isStation && !isDefib && zoom < 15) return; 
        if (isDefib && zoom < 15) return; 

        // --- E. Duplikat-Check für Stationen (Räumliche Nähe) ---
        const alreadyDrawn = renderedLocations.some(loc => Math.abs(loc.lat - lat) < 0.0001 && Math.abs(loc.lon - lon) < 0.0001);
        if (isStation && alreadyDrawn) return;
        if (isStation) renderedLocations.push({lat, lon});

        // --- F. Darstellungs-Modus bestimmen ---
        // Wir müssen wissen, ob der Marker als "Punkt" oder als "SVG-Icon" dargestellt werden soll.
        // Das ändert sich je nach Zoomstufe.
        let mode = 'standard';
        if (isStation) {
            mode = (zoom < 14) ? 'dot' : 'svg';
        } else if (isDefib) {
            mode = (zoom < 17) ? 'dot' : 'svg';
        } else {
            // Hydranten etc.
            mode = (zoom < 17) ? 'dot' : 'svg';
        }

        // Wir merken uns, dass diese ID in diesem Durchlauf gültig ist
        markersToKeep.add(id);

        // --- G. DIFFING LOGIK (Das Herzstück) ---
        
        // Prüfen, ob wir den Marker schon haben
        const cached = State.markerCache.get(id);

        // Fall 1: Marker existiert UND Modus (Dot vs SVG) ist gleich geblieben
        if (cached && cached.mode === mode) {
            // Nichts tun! Der Marker bleibt einfach auf der Karte.
            // Das verhindert das Flackern und spart Rechenleistung.
            return; 
        }

        // Fall 2: Marker existiert, aber Modus hat sich geändert (z.B. Zoom von 16 auf 17 -> Dot zu SVG)
        if (cached && cached.mode !== mode) {
            // Alten Marker entfernen, da er neu gezeichnet werden muss
            State.markerLayer.removeLayer(cached.marker);
            State.markerCache.delete(id);
        }

        // Fall 3: Marker ist neu (oder wurde gerade in Fall 2 gelöscht) -> Neu erstellen
        createAndAddMarker(id, lat, lon, type, tags, mode, zoom, isStation, isDefib);
    });

    // --- H. AUFRÄUMEN (Garbage Collection) ---
    // Wir entfernen alle Marker von der Karte, die im aktuellen Datensatz NICHT mehr vorkommen.
    for (const [id, entry] of State.markerCache) {
        if (!markersToKeep.has(id)) {
            State.markerLayer.removeLayer(entry.marker);
            State.markerCache.delete(id);
        }
    }
}

/**
 * Hilfsfunktion zum Erstellen eines einzelnen Markers.
 * Ausgelagert für bessere Lesbarkeit.
 */
function createAndAddMarker(id, lat, lon, type, tags, mode, zoom, isStation, isDefib) {
    let marker;
    let iconHtml;
    let className = '';
    let size = [28, 28];
    let zIndex = 0;

    // 1. Icon Konfiguration basierend auf Modus
    if (mode === 'dot') {
        // Kleine Punkte für niedrige Zoomstufen
        if (isStation) {
            marker = L.marker([lat, lon], { icon: L.divIcon({ html: '<div class="station-square"></div>', iconSize: [10, 10] }) });
        } else if (isDefib) {
            marker = L.marker([lat, lon], { icon: L.divIcon({ className: 'defib-dot', iconSize: [10,10] }) });
        } else {
            // Wasser/Hydranten Unterscheidung für Dots
            const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
            className = isWater ? 'tank-dot' : 'hydrant-dot';
            marker = L.marker([lat, lon], { icon: L.divIcon({ className, iconSize: [10,10] }) });
        }
    } else {
        // SVG Icons für hohe Zoomstufen
        iconHtml = getSVGContent(type); // Nutzt deine existierende Funktion
        className = 'icon-container';
        
        if (isStation) {
            size = [32, 32]; zIndex = 1000;
        } else if (isDefib) {
            size = [28, 28]; zIndex = 2000;
        } else {
            zIndex = 0;
        }

        marker = L.marker([lat, lon], { 
            icon: L.divIcon({ className, html: iconHtml, iconSize: size }), 
            zIndexOffset: zIndex 
        });

        // Klick-Event für Hydranten-Radius
        if (!isStation && !isDefib) {
            marker.on('click', (e) => { 
                L.DomEvent.stopPropagation(e);
                showRangeCircle(lat, lon); 
            });
        }
    }

    // 2. Tooltip Logik (Smart Tooltips ab Zoom-Level 18)
    if (marker && className === 'icon-container') {
        // Tooltip-Inhalt einmalig binden; öffnen/schließen wir per Event-Logik
        marker.unbindTooltip();
        marker.bindTooltip(generateTooltip(tags), {
            interactive: true,
            permanent: false,
            direction: 'top',
            opacity: 0.95
        });

        let closeTimer = null;

        // Alte Listener sicher entfernen, damit wir nichts stapeln
        marker.off('mouseover');
        marker.off('mouseout');
        marker.off('tooltipopen');

        marker.on('mouseover', function() {
            if (State.map.getZoom() < 18) return;

            if (closeTimer) {
                clearTimeout(closeTimer);
                closeTimer = null;
            }
            this.openTooltip();
        });

        marker.on('mouseout', function() {
            if (State.map.getZoom() < 18) return;

            closeTimer = setTimeout(() => {
                this.closeTooltip();
            }, 3000);
        });

        // Wenn der User in den Tooltip fährt, Timer stoppen (sonst nervt's)
        marker.on('tooltipopen', function(e) {
            const tooltipNode = e?.tooltip?._container;
            if (!tooltipNode) return;

            L.DomEvent.on(tooltipNode, 'mouseenter', () => {
                if (closeTimer) {
                    clearTimeout(closeTimer);
                    closeTimer = null;
                }
            });

            L.DomEvent.on(tooltipNode, 'mouseleave', () => {
                closeTimer = setTimeout(() => {
                    marker.closeTooltip();
                }, 3000);
            });
        });
    }

    // 3. Marker zur Karte hinzufügen
    if (marker) {
        marker.addTo(State.markerLayer);

        // 4. In den Cache speichern (inkl. Tags, damit wir später nicht raten müssen)
        State.markerCache.set(id, {
            marker,
            mode,
            type,
            tags,
            lat,
            lon,
            isStation,
            isDefib
        });
    }
}


/**
 * Sicherheitsfunktion gegen Code-Injection (XSS)
 * Wandelt gefährliche Zeichen in harmlose HTML-Entities um.
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}