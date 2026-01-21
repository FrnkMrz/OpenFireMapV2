/**
 * ==========================================================================================
 * DATEI: api.js
 * ZWECK: Kommunikation mit den OpenStreetMap-Servern (Overpass API)
 * LERN-ZIEL: Asynchrone Datenabrufe (Fetch), Fehlerbehandlung, Retry-Strategien.
 * ==========================================================================================
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t } from './i18n.js';
import { renderMarkers } from './map.js'; 
import { showNotification } from './ui.js'; // WICHTIG: Hier importieren wir die Funktion aus ui.js

/**
 * HILFSFUNKTION: fetchWithRetry
 * Versucht Daten zu laden. Wenn ein Server zickt, nehmen wir den nächsten.
 */
async function fetchWithRetry(query) {
    // 1. Haben wir Internet?
    if (!navigator.onLine) throw new Error('err_offline');

    // Wir holen die Server-Liste aus der Config
    const endpoints = Config.overpassEndpoints;
    let lastError = null;

    // Wir probieren Server 1, dann 2, dann 3...
    for (let endpoint of endpoints) {
        try {
            console.log(`Versuche Server: ${endpoint}`); 

            // FETCH: Der eigentliche Anruf
            // POST Methode ist robuster bei großen Datenmengen als GET.
            const res = await fetch(endpoint, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(query),
                signal: State.controllers.fetch.signal // Abbruch-Signal verbinden
            });
            
            // Wenn der Server einen Fehler meldet (z.B. 504 Timeout oder 429 Zu Viele Anfragen)
            if (!res.ok) {
                console.warn(`Server ${endpoint} Fehler: ${res.status}. Versuche nächsten...`);
                // Wir speichern den Fehlertyp für später, brechen aber NICHT ab!
                lastError = res.status === 429 ? 'err_ratelimit' : 'err_timeout';
                continue; // Springe zum nächsten Durchlauf der Schleife (nächster Server)
            }

            const text = await res.text();
            
            // Manchmal senden Server HTML-Fehlerseiten statt Daten. Das prüfen wir.
            if (text.trim().startsWith('<') || text.trim().length === 0) {
                console.warn(`Server ${endpoint} lieferte ungültige Daten. Versuche nächsten...`);
                continue;
            }

            // Erfolg! JSON parsen und zurückgeben.
            return JSON.parse(text);

        } catch (e) {
            // Wenn der User abgebrochen hat (AbortError), ist das okay.
            if (e.name === 'AbortError') throw e;
            
            // Bei Netzwerkfehlern (DNS, Verbindung weg): Warnung und nächster Server.
            console.warn(`Verbindungsfehler bei ${endpoint}:`, e);
            lastError = 'err_generic';
        }
    }
    
    // Wenn wir hier sind, haben ALLE Server versagt. Wir werfen den letzten Fehler.
    throw new Error(lastError || "err_generic");
}

/**
 * HAUPTFUNKTION: fetchOSMData
 * Entscheidet basierend auf Zoom-Level, WAS geladen wird.
 */
export async function fetchOSMData() {
    const zoom = State.map.getZoom();
    const status = document.getElementById('data-status');

    // 1. ZU WEIT WEG (Zoom 0-11): Nichts laden, um Server zu schonen.
    if (zoom < 12) {
        if(status) {
            status.innerText = t('status_standby');
            status.className = 'text-green-400';
        }
        // Karte aufräumen
        State.markerLayer.clearLayers();
        State.boundaryLayer.clearLayers();
        State.cachedElements = [];
        return;
    }

    // Koordinaten des sichtbaren Bereichs holen
    const b = State.map.getBounds();
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;

    // Status auf "LADEN" (Gelb)
    if(status) {
        status.innerText = t('status_loading');
        status.className = 'text-amber-400 font-bold'; 
    }
    
    // Wenn noch eine alte Anfrage läuft: Abbrechen!
    if (State.controllers.fetch) State.controllers.fetch.abort();
    State.controllers.fetch = new AbortController();

    // QUERY ZUSAMMENBAUEN
    let queryParts = [];
    
    // LEVEL A: Wachen (Ab Zoom 12) - Das sind wenige Daten
    if (zoom >= 12) {
        queryParts.push(`nwr["amenity"="fire_station"](${bbox});`);
        queryParts.push(`nwr["building"="fire_station"](${bbox});`);
    }

    // LEVEL B: Hydranten (AB ZOOM 15) - Hier wolltest du Zoom 15!
    if (zoom >= 15) {
        queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"](${bbox});`);
        queryParts.push(`node["emergency"="defibrillator"](${bbox});`);
    }

    // LEVEL C: Grenzen (Ab Zoom 14)
    let boundaryQuery = (zoom >= 14) ? `(way["boundary"="administrative"]["admin_level"="8"](${bbox});)->.boundaries; .boundaries out geom;` : '';

    if (queryParts.length === 0 && boundaryQuery === '') return;

    // Timeout auf 90 Sekunden gesetzt für mehr Stabilität
    const q = `[out:json][timeout:90];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;

    try {
        const data = await fetchWithRetry(q);
        State.cachedElements = data.elements;
        renderMarkers(data.elements, zoom);
        
        // Status auf GRÜN
        if(status) {
            status.innerText = t('status_current');
            status.className = 'text-green-400';
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error("Fetch Fehler:", e);
            // Fehlertext übersetzen
            let msgKey = 'err_generic';
            if (e.message.includes('ratelimit')) msgKey = 'err_ratelimit';
            else if (e.message.includes('timeout')) msgKey = 'err_timeout';
            else if (e.message.includes('offline')) msgKey = 'err_offline';

            const txt = t(msgKey);
            
            if(status) {
                status.innerText = txt;
                status.className = 'text-red-500 font-bold';
            }
            showNotification(txt, 5000);
        }
    }
}