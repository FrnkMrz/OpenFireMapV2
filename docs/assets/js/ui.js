/**
 * ==========================================================================================
 * DATEI: map.js (Die Karten-Logik)
 * LERN-ZIEL: Umgang mit der Leaflet-Bibliothek, Layer-System, SVG Rendering
 * ==========================================================================================
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t } from './i18n.js';
import { fetchOSMData } from './api.js';

/**
 * Startet die Karte (wird einmal am Anfang aufgerufen)
 */
export function initMapLogic() {
    // 1. Layer-Gruppen erstellen
    // Stell dir vor, wir legen 3 transparente Folien übereinander auf die Karte.
    State.markerLayer = L.layerGroup();       // Folie 1: Für die Icons (Hydranten)
    State.boundaryLayer = L.layerGroup();     // Folie 2: Für die Grenzen
    State.rangeLayerGroup = L.layerGroup();   // Folie 3: Für den orangenen Kreis

    // 2. Die Karte selbst erstellen
    // 'map' ist die ID des HTML-Divs, wo die Karte rein soll.
    State.map = L.map('map', { 
        zoomControl: false, // Wir bauen eigene Zoom-Buttons, daher hier 'false'
        center: Config.defaultCenter, 
        zoom: Config.defaultZoom 
    });

    // 3. Folien auf die Karte legen
    State.boundaryLayer.addTo(State.map);
    State.rangeLayerGroup.addTo(State.map);
    State.markerLayer.addTo(State.map);

    // 4. Den Hintergrund laden (Standard: Voyager)
    setBaseLayer('voyager');

    // --- EVENTS (Was passiert, wenn der User etwas tut?) ---

    // Wenn der User die Karte bewegt (moveend) oder zoomt (zoomend):
    let debounceTimer;
    State.map.on('moveend zoomend', () => {
        // TRICK: "Debouncing"
        // Wenn der User die Karte zieht, feuert das Event hunderte Male.
        // Wir warten 200ms, ob er aufhört zu ziehen, bevor wir Daten laden.
        // Das spart extrem viel Serverlast!
        if (debounceTimer) clearTimeout(debounceTimer);
        
        const statusEl = document.getElementById('data-status');
        if(statusEl) {
            statusEl.innerText = t('status_waiting');
            statusEl.className = 'text-amber-400 font-bold';
        }

        debounceTimer = setTimeout(() => {
            fetchOSMData(); // Daten laden!
        }, 200);
    });

    // Wenn gezoomt wird: Anzeige unten rechts aktualisieren
    State.map.on('zoom', () => {
        const el = document.getElementById('zoom-val');
        if(el) el.innerText = State.map.getZoom().toFixed(1);
    });
    
    // Klick auf leere Karte -> Orangenen Kreis entfernen
    State.map.on('click', () => {
        if (!State.selection.active) {
            State.rangeLayerGroup.clearLayers();
        }
    });

    // Erster Start: Sofort einmal laden
    fetchOSMData();
}

/**
 * Wechselt den Kartenhintergrund (z.B. Satellit)
 */
export function setBaseLayer(key) {
    State.activeLayerKey = key;
    
    // Alte Kacheln entfernen
    State.map.eachLayer(layer => { 
        if (layer instanceof L.TileLayer) State.map.removeLayer(layer); 
    });
    
    // Neue Kacheln hinzufügen
    const conf = Config.layers[key];
    L.tileLayer(conf.url, { 
        attribution: conf.attr, 
        maxZoom: conf.maxZoom 
    }).addTo(State.map);
    
    // Buttons im Menü aktualisieren (Fett machen)
    document.querySelectorAll('.layer-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`btn-${key}`);
    if(btn) btn.classList.add('active');
}

/**
 * Erstellt das HTML für die Icons (SVG Grafik)
 * Je nach Typ (Hydrant, Wache) wird ein anderes Bild zurückgegeben.
 */
function getSVGContent(type) {
    // 1. Defibrillator (Grün)
    if (type === 'defibrillator') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="#16a34a" stroke="white" stroke-width="5"/>
            <path d="M50 80 C10 40 10 10 50 35 C90 10 90 40 50 80 Z" fill="white"/>
            <path d="M55 45 L45 55 L55 55 L45 65" stroke="#16a34a" stroke-width="3" fill="none"/>
        </svg>`;
    }
    
    // 2. Wasser (Blau) oder Feuer (Rot)
    const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
    const color = isWater ? '#3b82f6' : '#ef4444'; 
    
    // 3. Wandhydrant (spezielles Symbol)
    if (type === 'wall') {
         return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>
            <circle cx="42" cy="52" r="18" fill="none" stroke="white" stroke-width="6" />
            <line x1="64" y1="34" x2="64" y2="70" stroke="white" stroke-width="6" stroke-linecap="round" />
        </svg>`;
    }
    
    // 4. Buchstaben ermitteln (U=Unterflur, O=Oberflur)
    let char = '';
    switch(type) {
        case 'underground': char = 'U'; break; 
        case 'pillar':      char = 'O'; break; 
        case 'pipe':        char = 'I'; break;
        case 'dry_barrel':  char = 'Ø'; break; 
        default:            char = '';
    }
    
    // 5. Feuerwache (Haus-Symbol)
    if (type === 'station') return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 L50 5 L90 40 L90 90 L10 90 Z" fill="#ef4444" stroke="white" stroke-width="4"/><rect x="30" y="55" width="40" height="35" rx="2" fill="white" opacity="0.9"/></svg>`;
    
    // Standard Rückgabe: Kreis mit Buchstabe
    return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${char ? `<text x="50" y="72" font-family="Arial" font-weight="bold" font-size="50" text-anchor="middle" fill="white">${char}</text>` : ''}</svg>`;
}

/**
 * Baut das Info-Fenster (Tooltip), wenn man mit der Maus über ein Icon fährt.
 */
function generateTooltip(tags) {
    let tooltipTitle = tags.name || t('details');
    if (tags.emergency === 'defibrillator') tooltipTitle = t('defib');

    // Wir bauen HTML Text zusammen
    let html = `<div class="p-2 min-w-[180px]">
        <div class="font-bold text-sm border-b border-white/20 pb-1 mb-1 text-blue-400">${tooltipTitle}</div>
        <div class="text-[10px] font-mono grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">`;
    
    // Alle Eigenschaften (Tags) auflisten
    for (const [key, val] of Object.entries(tags)) {
        html += `<div class="text-slate-400 text-right">${key}:</div><div class="text-slate-200 break-words">${val}</div>`;
    }
    html += `</div></div>`;
    return html;
}

/**
 * Zeichnet den orangenen 100m Radius Kreis
 */
export function showRangeCircle(lat, lon) {
    State.rangeLayerGroup.clearLayers(); // Alten Kreis löschen
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
        // Geometrie: Position etwas rechts vom Zentrum berechnen
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
 * HAUPTFUNKTION: Rendert (malt) die Marker auf die Karte
 * Wird von fetchOSMData aufgerufen, wenn neue Daten da sind.
 */
export function renderMarkers(elements, zoom) {
    // Alles löschen, um sauber neu zu malen
    State.markerLayer.clearLayers();
    State.boundaryLayer.clearLayers();
    
    const renderedLocations = []; // Um Duplikate zu verhindern

    // Wir gehen durch JEDES geladene Element durch
    elements.forEach(el => {
        const tags = el.tags || {};
        
        // A. Gemeindegrenzen zeichnen
        if (tags.boundary === 'administrative' && el.geometry && zoom >= 14) {
            const latlngs = el.geometry.map(p => [p.lat, p.lon]);
            L.polyline(latlngs, { color: '#333333', weight: 1, dashArray: '10, 10', opacity: 0.7 }).addTo(State.boundaryLayer);
            return; // Fertig mit diesem Element
        }

        // Koordinaten prüfen
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        if (!lat || !lon) return;

        // B. Typ bestimmen (Wache? Defi? Hydrant?)
        const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
        const isDefib = tags.emergency === 'defibrillator';
        let type = isStation ? 'station' : (isDefib ? 'defibrillator' : (tags['fire_hydrant:type'] || tags.emergency));

        // C. Filter Logik (Was zeigen wir wann an?)
        if (isStation && zoom < 12) return; 
        if (!isStation && !isDefib && zoom < 15) return; 
        if (isDefib && zoom < 15) return; 

        // Duplikate verhindern (manche Wachen sind in OSM doppelt drin)
        const alreadyDrawn = renderedLocations.some(loc => Math.abs(loc.lat - lat) < 0.0001 && Math.abs(loc.lon - lon) < 0.0001);
        if (isStation && alreadyDrawn) return;
        if (isStation) renderedLocations.push({lat, lon});

        // D. Marker erstellen
        let marker;
        let iconHtml;
        let className = '';
        let size = [28, 28];
        let zIndex = 0;

        if (isStation) {
            if (zoom < 14) { 
                // Zoom 12-13: Nur kleiner Punkt
                marker = L.marker([lat, lon], { icon: L.divIcon({ html: '<div class="station-square"></div>', iconSize: [10, 10] }) }).addTo(State.markerLayer);
            } else {
                // Ab Zoom 14: Großes Icon
                iconHtml = getSVGContent(type); className = 'icon-container'; size = [32, 32]; zIndex = 1000;
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, html: iconHtml, iconSize: size }), zIndexOffset: zIndex }).addTo(State.markerLayer);
            }
        } 
        else if (isDefib) {
            if (zoom < 17) {
                // Kleiner grüner Punkt
                marker = L.marker([lat, lon], { icon: L.divIcon({ className: 'defib-dot', iconSize: [10,10] }) }).addTo(State.markerLayer);
            } else {
                // Großes Icon
                iconHtml = getSVGContent(type); className = 'icon-container'; size = [28, 28]; zIndex = 2000;
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, html: iconHtml, iconSize: size }), zIndexOffset: zIndex }).addTo(State.markerLayer);
            }
        } 
        else { // Hydranten
            if (zoom < 17) {
                // Kleiner Punkt (rot oder blau)
                const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
                className = isWater ? 'tank-dot' : 'hydrant-dot';
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, iconSize: [10,10] }) }).addTo(State.markerLayer);
            } else {
                // Großes Icon mit Buchstabe
                iconHtml = getSVGContent(type); className = 'icon-container';
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, html: iconHtml, iconSize: size }), zIndexOffset: 0 }).addTo(State.markerLayer);
                
                // Klick Event für den 100m Kreis
                marker.on('click', (e) => { 
                    L.DomEvent.stopPropagation(e); // Verhindert, dass der Klick "durch" den Marker auf die Karte geht
                    showRangeCircle(lat, lon); 
                });
            }
        }

        // Tooltip hinzufügen (Info beim Drüberfahren)
        if (marker && zoom === 18 && className === 'icon-container') {
             marker.bindTooltip(generateTooltip(tags), { 
                interactive: true, permanent: false, direction: 'top', opacity: 0.95 
            });
        }
    });
}