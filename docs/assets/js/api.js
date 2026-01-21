/**
 * ==========================================================================================
 * DATEI: api.js (OPTIMIERT)
 * ZWECK: Datenabruf - Strengere Trennung der Zoom-Stufen
 * ==========================================================================================
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t } from './i18n.js';
import { renderMarkers } from './map.js'; 
import { showNotification } from './ui.js'; 

/**
 * Holt Daten vom Server (POST Request)
 */
async function fetchWithRetry(query) {
    if (!navigator.onLine) throw new Error('err_offline');

    // Liste der Server
    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ];

    for (let endpoint of endpoints) {
        try {
            const res = await fetch(endpoint, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(query),
                signal: State.controllers.fetch.signal 
            });
            
            if (!res.ok) {
                if (res.status === 429) throw new Error('err_ratelimit');
                if (res.status >= 500) throw new Error('err_timeout');
                console.warn(`Server ${endpoint} Fehler: ${res.status}`);
                continue; 
            }

            const text = await res.text();
            if (text.trim().startsWith('<')) continue; 

            return JSON.parse(text);

        } catch (e) {
            if (['err_ratelimit', 'err_timeout', 'err_offline'].includes(e.message)) throw e;
            if (e.name === 'AbortError') throw e;
            console.warn(`Fehler bei ${endpoint}:`, e);
        }
    }
    throw new Error("err_generic");
}

/**
 * Hauptfunktion: Entscheidet, WAS geladen wird
 */
export async function fetchOSMData() {
    const zoom = State.map.getZoom();
    const status = document.getElementById('data-status');

    // 1. ZU WEIT WEG (Zoom 0-11): Nichts laden
    if (zoom < 12) {
        if(status) {
            status.innerText = t('status_standby');
            status.className = 'text-green-400';
        }
        State.markerLayer.clearLayers();
        State.boundaryLayer.clearLayers();
        State.cachedElements = [];
        return;
    }

    // Koordinaten holen
    const b = State.map.getBounds();
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;

    // Status auf "Laden" setzen
    if(status) {
        status.innerText = t('status_loading');
        status.className = 'text-amber-400 font-bold'; 
    }
    
    // Alten Request abbrechen
    if (State.controllers.fetch) State.controllers.fetch.abort();
    State.controllers.fetch = new AbortController();

    // QUERY ZUSAMMENBAUEN
    let queryParts = [];
    let logMessage = `Zoom ${zoom.toFixed(1)}: `;

    // LEVEL A: Wachen laden (ab Zoom 12)
    // Das sind nur wenige Objekte, das geht schnell.
    if (zoom >= 12) {
        queryParts.push(`nwr["amenity"="fire_station"](${bbox});`);
        queryParts.push(`nwr["building"="fire_station"](${bbox});`);
        logMessage += "Lade Wachen... ";
    }

    // LEVEL B: Hydranten laden (ERST AB ZOOM 15!)
    // Hier entsteht die Last. Wenn wir das zu früh machen, crasht der Server.
    if (zoom >= 15) {
        queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"](${bbox});`);
        queryParts.push(`node["emergency"="defibrillator"](${bbox});`);
        logMessage += "+ Hydranten & Defis";
    } else {
        logMessage += "(Hydranten ausgeblendet, zu weit weg)";
    }

    // LEVEL C: Grenzen laden (ab Zoom 14)
    let boundaryQuery = (zoom >= 14) ? `(way["boundary"="administrative"]["admin_level"="8"](${bbox});)->.boundaries; .boundaries out geom;` : '';

    console.log(logMessage); // <--- SCHAU MAL IN DIE KONSOLE (F12)

    if (queryParts.length === 0 && boundaryQuery === '') return;

    // Timeout: 25 Sekunden
    const q = `[out:json][timeout:25];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;

    try {
        const data = await fetchWithRetry(q);
        State.cachedElements = data.elements;
        renderMarkers(data.elements, zoom);
        
        if(status) {
            status.innerText = t('status_current');
            status.className = 'text-green-400';
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error("Fetch Fehler:", e);
            const errorKey = ['err_ratelimit', 'err_timeout', 'err_offline'].includes(e.message) ? e.message : 'err_generic';
            const txt = t(errorKey);
            
            if(status) {
                status.innerText = txt;
                status.className = 'text-red-500 font-bold';
            }
            showNotification(txt, 5000);
        }
    }
}