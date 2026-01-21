/**
 * ==========================================================================================
 * DATEI: map.js
 * ZWECK: Karten-Darstellung und Marker-Verwaltung
 * BESCHREIBUNG:
 * Hier nutzen wir die Bibliothek "Leaflet", um die Karte anzuzeigen, 
 * Marker zu setzen und Interaktionen (Klicks) zu verarbeiten.
 * ==========================================================================================
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t } from './i18n.js';
import { fetchOSMData } from './api.js';

/**
 * Initialisiert die Karte beim Start der Seite.
 */
export function initMapLogic() {
    // 1. Layer-Gruppen erstellen (wie transparente Folien, die übereinander liegen)
    State.markerLayer = L.layerGroup();       // Folie für Marker
    State.boundaryLayer = L.layerGroup();     // Folie für Grenzen
    State.rangeLayerGroup = L.layerGroup();   // Folie für den Kreis

    // 2. Die Karte selbst erstellen
    State.map = L.map('map', { 
        zoomControl: false, // Wir bauen eigene Zoom-Buttons, daher false
        center: Config.defaultCenter, 
        zoom: Config.defaultZoom 
    });

    // 3. Folien auf die Karte legen
    State.boundaryLayer.addTo(State.map);
    State.rangeLayerGroup.addTo(State.map);
    State.markerLayer.addTo(State.map);

    // 4. Standard-Hintergrund laden
    setBaseLayer('voyager');

    /* EVENT LISTENER: Was passiert, wenn der Nutzer etwas tut?
       
       DEBOUNCE LOGIK:
       Wenn man die Karte verschiebt, feuert Leaflet hunderte Events ("move").
       Wir wollen aber nicht hunderte Male Daten laden.
       Deshalb warten wir, bis der Nutzer kurz aufhört zu schieben (200ms).
    */
    let debounceTimer;
    State.map.on('moveend zoomend', () => {
        // Alten Timer löschen (falls vorhanden)
        if (debounceTimer) clearTimeout(debounceTimer);
        
        // Status auf "Warten" setzen
        const statusEl = document.getElementById('data-status');
        if(statusEl) {
            statusEl.innerText = t('status_waiting');
            statusEl.className = 'text-amber-400 font-bold';
        }

        // Neuen Timer starten: Erst in 200ms laden!
        debounceTimer = setTimeout(() => {
            fetchOSMData();
        }, 200);
    });

    // Weitere Events
    State.map.on('zoom', () => {
        // Zoom-Anzeige unten rechts aktualisieren
        const el = document.getElementById('zoom-val');
        if(el) el.innerText = State.map.getZoom().toFixed(1);
    });
    
    // Klick auf leere Karte -> Kreis entfernen (außer wir sind im Auswahlmodus)
    State.map.on('click', () => {
        if (!State.selection.active) {
            State.rangeLayerGroup.clearLayers();
        }
    });

    // Erster Datenabruf beim Start
    fetchOSMData();
}

/**
 * Wechselt den Kartenhintergrund (z.B. Satellit oder Dark Mode)
 */
export function setBaseLayer(key) {
    State.activeLayerKey = key;
    
    // Alle alten Kachel-Layer entfernen
    State.map.eachLayer(layer => { 
        if (layer instanceof L.TileLayer) State.map.removeLayer(layer); 
    });
    
    const conf = Config.layers[key];
    
    // Neuen Layer hinzufügen
    L.tileLayer(conf.url, { 
        attribution: conf.attr, 
        maxZoom: conf.maxZoom 
    }).addTo(State.map);
    
    // UI Update: Button aktiv markieren
    document.querySelectorAll('.layer-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`btn-${key}`);
    if(btn) btn.classList.add('active');

    // Sonderfall: Topo-Karte geht nur bis Zoom 17. 
    // Wir müssen den "Zoom 18" Button im Export-Menü deaktivieren.
    const btn18 = document.getElementById('zoom-18');
    if(btn18) {
        if (key === 'topo') {
            btn18.disabled = true;
            if (State.exportZoomLevel > 17) State.exportZoomLevel = 17; 
        } else {
            btn18.disabled = false;
        }
    }
}

/**
 * Erstellt den HTML-Code für die Icons (SVG)
 */
function getSVGContent(type) {
    // Defibrillator Icon
    if (type === 'defibrillator') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="#16a34a" stroke="white" stroke-width="5"/>
            <path d="M50 80 C10 40 10 10 50 35 C90 10 90 40 50 80 Z" fill="white"/>
            <path d="M55 45 L45 55 L55 55 L45 65" stroke="#16a34a" stroke-width="3" fill="none"/>
        </svg>`;
    }

    const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
    const color = isWater ? '#3b82f6' : '#ef4444'; // Blau oder Rot
    
    // Wandhydrant
    if (type === 'wall') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>
            <circle cx="42" cy="52" r="18" fill="none" stroke="white" stroke-width="6" />
            <line x1="64" y1="34" x2="64" y2="70" stroke="white" stroke-width="6" stroke-linecap="round" />
        </svg>`;
    }
    
    // Buchstaben für Typen (U=Unterflur, O=Oberflur)
    let char = '';
    switch(type) {
        case 'underground': char = 'U'; break; 
        case 'pillar':      char = 'O'; break; 
        case 'pipe':        char = 'I'; break;
        case 'dry_barrel':  char = 'Ø'; break; 
        default:            char = '';
    }
    
    // Feuerwache
    if (type === 'station') return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 L50 5 L90 40 L90 90 L10 90 Z" fill="#ef4444" stroke="white" stroke-width="4"/><rect x="30" y="55" width="40" height="35" rx="2" fill="white" opacity="0.9"/></svg>`;
    
    // Standard Hydrant (Kreis mit Buchstabe)
    return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${char ? `<text x="50" y="72" font-family="Arial" font-weight="bold" font-size="50" text-anchor="middle" fill="white">${char}</text>` : ''}</svg>`;
}

/**
 * Erstellt das Tooltip (Info-Fenster beim Maus-Hover)
 */
function generateTooltip(tags) {
    let tooltipTitle = tags.name || t('details');
    if (tags.emergency === 'defibrillator') tooltipTitle = t('defib');

    // Wir bauen HTML Text zusammen
    let html = `<div class="p-2 min-w-[180px]">
        <div class="font-bold text-sm border-b border-white/20 pb-1 mb-1 text-blue-400">${tooltipTitle}</div>
        <div class="text-[10px] font-mono grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">`;
    
    for (const [key, val] of Object.entries(tags)) {
        html += `<div class="text-slate-400 text-right">${key}:</div><div class="text-slate-200 break-words">${val}</div>`;
    }
    html += `</div></div>`;
    return html;
}

/**
 * Zeichnet den orangenen 100m Radius Kreis um einen Punkt.
 */
export function showRangeCircle(lat, lon) {
    State.rangeLayerGroup.clearLayers();
    const zoom = State.map.getZoom();
    
    // Kreis macht erst Sinn, wenn man nah genug dran ist (Zoom 16+)
    if (zoom < 16) return; 

    // Kreis zeichnen
    L.circle([lat, lon], {
        color: '#f97316', fillColor: '#f97316', fillOpacity: 0.15, 
        radius: 100, weight: 2, dashArray: '5, 8', interactive: false 
    }).addTo(State.rangeLayerGroup);

    // Text "100m" zeichnen (nur ab Zoom 17)
    if (zoom >= 17) {
        // Berechne Position für Text (etwas rechts vom Zentrum)
        const latRad = lat * Math.PI / 180;
        const kmPerDegLon = 111.32 * Math.cos(latRad);
        const offsetLon = 0.05 / kmPerDegLon; 
        
        const labelMarker = L.marker([lat, lon + offsetLon], {opacity: 0, interactive: false}).addTo(State.rangeLayerGroup);
        labelMarker.bindTooltip("100 m", { 
            permanent: true, direction: 'center', className: 'range-label', offset: [0, 0] 
        }).openTooltip();
    }
}

/**
 * Hauptfunktion zum Malen der Marker auf die Karte.
 */
export function renderMarkers(elements, zoom) {
    // Erstmal alles Alte löschen
    State.markerLayer.clearLayers();
    State.boundaryLayer.clearLayers();
    
    const renderedLocations = []; 

    elements.forEach(el => {
        const tags = el.tags || {};
        
        // 1. Gemeindegrenzen zeichnen
        if (tags.boundary === 'administrative' && el.geometry) {
            if (zoom < 14) return; // Zu weit weg -> keine Grenzen stören
            const latlngs = el.geometry.map(p => [p.lat, p.lon]);
            L.polyline(latlngs, { color: '#333333', weight: 1, dashArray: '10, 10', opacity: 0.7 }).addTo(State.boundaryLayer);
            return; 
        }
        
        // Koordinaten holen
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        if (!lat || !lon) return;

        // Was ist es?
        const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
        const isDefib = tags.emergency === 'defibrillator';
        let type = '';

        if (isStation) type = 'station';
        else if (isDefib) type = 'defibrillator';
        else type = tags['fire_hydrant:type'] || tags.emergency;

        // Filter: Wann zeigen wir was an?
        if (isStation && zoom < 12) return; 
        if (!isStation && !isDefib && zoom < 15) return; 
        if (isDefib && zoom < 15) return; 

        // Verhindern, dass Wachen doppelt gemalt werden (passiert manchmal in OSM Daten)
        const alreadyDrawn = renderedLocations.some(loc => Math.abs(loc.lat - lat) < 0.0001 && Math.abs(loc.lon - lon) < 0.0001);
        if (isStation && alreadyDrawn) return;
        if (isStation) renderedLocations.push({lat, lon});

        let marker = null;
        let iconHtml = '';
        let className = '';
        let size = [28, 28];
        let zIndex = 0;

        // --- ENTSCHEIDUNG: Punkt oder Icon? ---
        if (isStation) {
            if (zoom < 14) { 
                // Kleines Quadrat
                className = 'station-square'; size = [10, 10]; 
                marker = L.marker([lat, lon], { icon: L.divIcon({ html: '<div class="station-square"></div>', iconSize: size }) }).addTo(State.markerLayer);
            } else {
                // Großes Icon
                iconHtml = getSVGContent(type); className = 'icon-container'; size = [32, 32]; zIndex = 1000;
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, html: iconHtml, iconSize: size }), zIndexOffset: zIndex }).addTo(State.markerLayer);
            }
        } 
        else if (isDefib) {
            if (zoom < 17) {
                // Grüner Punkt
                className = 'defib-dot'; 
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, iconSize: [10,10] }) }).addTo(State.markerLayer);
            } else {
                // Icon
                iconHtml = getSVGContent(type); className = 'icon-container'; size = [28, 28]; zIndex = 2000;
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, html: iconHtml, iconSize: size }), zIndexOffset: zIndex }).addTo(State.markerLayer);
            }
        } 
        else { // Hydranten
            if (zoom < 17) {
                // Roter oder Blauer Punkt
                const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
                className = isWater ? 'tank-dot' : 'hydrant-dot';
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, iconSize: [10,10] }) }).addTo(State.markerLayer);
            } else {
                // Icon
                iconHtml = getSVGContent(type); className = 'icon-container';
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, html: iconHtml, iconSize: size }), zIndexOffset: 0 }).addTo(State.markerLayer);
                
                // Klick Event für den 100m Kreis
                marker.on('click', (e) => { 
                    L.DomEvent.stopPropagation(e); // Verhindern, dass Klick auf Karte durchschlägt
                    showRangeCircle(lat, lon); 
                });
            }
        }

        // Tooltips hinzufügen (nur wenn Zoom groß genug und Marker existiert)
        if (marker && zoom === 18 && className === 'icon-container') {
             marker.bindTooltip(generateTooltip(tags), { 
                interactive: true, permanent: false, sticky: false, direction: 'top', opacity: 0.95 
            });
            // Hier könnte noch die Logik für das verzögerte Schließen rein, 
            // die ich im HTML Code hatte. Der Übersicht halber hier vereinfacht.
        }
    });
}