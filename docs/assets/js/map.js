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

    State.map = L.map('map', { 
        zoomControl: false, 
        center: Config.defaultCenter, 
        zoom: Config.defaultZoom 
    });

    State.boundaryLayer.addTo(State.map);
    State.rangeLayerGroup.addTo(State.map);
    State.markerLayer.addTo(State.map);

    setBaseLayer('voyager');

    let debounceTimer;
    State.map.on('moveend zoomend', () => {
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
    let tooltipTitle = tags.name || t('details');
    if (tags.emergency === 'defibrillator') tooltipTitle = t('defib');
    let html = `<div class="p-2 min-w-[180px]"><div class="font-bold text-sm border-b border-white/20 pb-1 mb-1 text-blue-400">${tooltipTitle}</div><div class="text-[10px] font-mono grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">`;
    for (const [key, val] of Object.entries(tags)) {
        html += `<div class="text-slate-400 text-right">${key}:</div><div class="text-slate-200 break-words">${val}</div>`;
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

export function renderMarkers(elements, zoom) {
    State.markerLayer.clearLayers();
    State.boundaryLayer.clearLayers();
    const renderedLocations = []; 

    elements.forEach(el => {
    const tags = el.tags || {};
    
    // GRENZEN (Boundaries)
    if (tags.boundary === 'administrative' && el.geometry && zoom >= 14) {
        const latlngs = el.geometry.map(p => [p.lat, p.lon]);
        
        // HIER IST DIE GEÄNDERTE ZEILE:
        L.polyline(latlngs, { color: Config.colors.bounds, weight: 1, dashArray: '10, 10', opacity: 0.7 }).addTo(State.boundaryLayer);
        
        return;
    }

        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        if (!lat || !lon) return;

        const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
        const isDefib = tags.emergency === 'defibrillator';
        let type = isStation ? 'station' : (isDefib ? 'defibrillator' : (tags['fire_hydrant:type'] || tags.emergency));

        if (isStation && zoom < 12) return; 
        if (!isStation && !isDefib && zoom < 15) return; 
        if (isDefib && zoom < 15) return; 

        const alreadyDrawn = renderedLocations.some(loc => Math.abs(loc.lat - lat) < 0.0001 && Math.abs(loc.lon - lon) < 0.0001);
        if (isStation && alreadyDrawn) return;
        if (isStation) renderedLocations.push({lat, lon});

        let marker;
        let iconHtml;
        let className = '';
        let size = [28, 28];
        let zIndex = 0;

        if (isStation) {
            if (zoom < 14) { 
                marker = L.marker([lat, lon], { icon: L.divIcon({ html: '<div class="station-square"></div>', iconSize: [10, 10] }) }).addTo(State.markerLayer);
            } else {
                iconHtml = getSVGContent(type); className = 'icon-container'; size = [32, 32]; zIndex = 1000;
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, html: iconHtml, iconSize: size }), zIndexOffset: zIndex }).addTo(State.markerLayer);
            }
        } 
        else if (isDefib) {
            if (zoom < 17) {
                marker = L.marker([lat, lon], { icon: L.divIcon({ className: 'defib-dot', iconSize: [10,10] }) }).addTo(State.markerLayer);
            } else {
                iconHtml = getSVGContent(type); className = 'icon-container'; size = [28, 28]; zIndex = 2000;
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, html: iconHtml, iconSize: size }), zIndexOffset: zIndex }).addTo(State.markerLayer);
            }
        } 
        else { 
            if (zoom < 17) {
                const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
                className = isWater ? 'tank-dot' : 'hydrant-dot';
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, iconSize: [10,10] }) }).addTo(State.markerLayer);
            } else {
                iconHtml = getSVGContent(type); className = 'icon-container';
                marker = L.marker([lat, lon], { icon: L.divIcon({ className, html: iconHtml, iconSize: size }), zIndexOffset: 0 }).addTo(State.markerLayer);
                marker.on('click', (e) => { 
                    L.DomEvent.stopPropagation(e);
                    showRangeCircle(lat, lon); 
                });
            }
        }

        // --- HIER IST DIE SMART TOOLTIP LOGIK ---
        if (marker && zoom === 18 && className === 'icon-container') {
             marker.bindTooltip(generateTooltip(tags), { 
                interactive: true, permanent: false, direction: 'top', opacity: 0.95 
            });

            // Standard-Verhalten deaktivieren
            marker.off('mouseover'); 
            marker.off('mouseout');
            marker._tooltipCloseTimer = null;

            // Eigene Öffnen-Logik
            marker.on('mouseover', function() {
                if (this._tooltipCloseTimer) {
                    clearTimeout(this._tooltipCloseTimer); 
                    this._tooltipCloseTimer = null;
                }
                this.openTooltip();
            });

            // Eigene Schließen-Logik (3 Sekunden warten)
            marker.on('mouseout', function() {
                this._tooltipCloseTimer = setTimeout(() => {
                    this.closeTooltip();
                }, 3000); // <--- HIER SIND DIE 3 SEKUNDEN
            });

            // Wenn Maus auf den Text geht: Timer stoppen
            marker.on('tooltipopen', function(e) {
                const tooltipNode = e.tooltip._container;
                if (!tooltipNode) return;
                L.DomEvent.on(tooltipNode, 'mouseenter', () => {
                    if (this._tooltipCloseTimer) {
                        clearTimeout(this._tooltipCloseTimer);
                        this._tooltipCloseTimer = null;
                    }
                });
                L.DomEvent.on(tooltipNode, 'mouseleave', () => {
                    this._tooltipCloseTimer = setTimeout(() => {
                        this.closeTooltip();
                    }, 3000);
                });
            });
        }
    });
}