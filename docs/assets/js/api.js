/**
 * ==========================================================================================
 * DATEI: api.js (REPARIERT)
 * ZWECK: Datenabruf mit ECHTEM Retry (probiert nächsten Server bei Fehler)
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

    // Liste der Server (Reihenfolge optimiert)
    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ];

    // Wir probieren jeden Server der Reihe nach
    for (let endpoint of endpoints) {
        try {
            console.log(`Versuche Server: ${endpoint}`); // Debug-Info

            const res = await fetch(endpoint, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(query),
                signal: State.controllers.fetch.signal 
            });
            
            // Wenn Server Fehler meldet (z.B. 504 Timeout oder 429 Too Many Requests)
            if (!res.ok) {
                console.warn(`Server ${endpoint} antwortet mit Status ${res.status}. Versuche nächsten...`);
                continue; // WICHTIG: Springt zum nächsten Server in der Liste!
            }

            const text = await res.text();
            
            // Schutz vor HTML-Fehlerseiten (passiert bei manchen Proxies)
            if (text.trim().startsWith('<') || text.trim().length === 0) {
                console.warn(`Server ${endpoint} schickte ungültige Daten. Versuche nächsten...`);
                continue;
            }

            // Wenn wir hier sind, hat alles geklappt!
            return JSON.parse(text);

        } catch (e) {
            // Wenn der User abbricht (Zoomt/Verschiebt), dann wirklich aufhören
            if (e.name === 'AbortError') throw e;
            
            // Wenn kein Internet da ist, bringt nächster Server auch nichts
            if (e.message === 'err_offline') throw e;

            // Bei allen anderen Netzwerkfehlern: Warnung loggen und nächsten Server probieren
            console.warn(`Verbindungsfehler bei ${endpoint}:`, e);
        }
    }
    
    // Wenn die Schleife durchläuft und KEINER geantwortet hat:
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
    if (zoom >= 12) {
        queryParts.push(`nwr["amenity"="fire_station"](${bbox});`);
        queryParts.push(`nwr["building"="fire_station"](${bbox});`);
        logMessage += "Lade Wachen... ";
    }

    // LEVEL B: Hydranten laden (ERST AB ZOOM 16 - SICHERHEITSHALBER)
    // Ich habe es auf 16 erhöht, damit Zoom 15 (oft noch ganze Stadtteile) nicht crashed.
    if (zoom >= 15) {
        queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"](${bbox});`);
        queryParts.push(`node["emergency"="defibrillator"](${bbox});`);
        logMessage += "+ Hydranten & Defis";
    } else {
        logMessage += "(Hydranten ausgeblendet, zu weit weg)";
    }

    // LEVEL C: Grenzen laden (ab Zoom 14)
    let boundaryQuery = (zoom >= 14) ? `(way["boundary"="administrative"]["admin_level"="8"](${bbox});)->.boundaries; .boundaries out geom;` : '';

    console.log(logMessage);

    if (queryParts.length === 0 && boundaryQuery === '') return;

    // Timeout erhöht auf 90 Sekunden!
    const q = `[out:json][timeout:90];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;

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