/**
 * ==========================================================================================
 * DATEI: api.js (Der Daten-Holer)
 * LERN-ZIEL: Kommunikation mit API Servern, Fehlerbehandlung, Async/Await
 * ==========================================================================================
 */

import { State } from './state.js';   // Zugriff auf unser Gedächtnis
import { Config } from './config.js'; // Zugriff auf die Server-Liste
import { t } from './i18n.js';        // Für Fehlermeldungen in richtiger Sprache
import { renderMarkers } from './map.js'; // Um die Daten später zu malen
import { showNotification } from './ui.js'; // Um Fehler anzuzeigen

/**
 * Hilfsfunktion: fetchWithRetry
 * Versucht Daten zu laden. Wenn ein Server kaputt ist, probiert er den nächsten.
 * Das nennt man "Failover".
 */
async function fetchWithRetry(query) {
    // 1. Check: Haben wir überhaupt Internet?
    if (!navigator.onLine) throw new Error('err_offline');

    let lastError = null;

    // Wir gehen die Liste der Server (aus config.js) nacheinander durch
    for (let endpoint of Config.overpassEndpoints) {
        try {
            console.log(`Versuche Server: ${endpoint}`); 

            // FETCH: Der eigentliche Anruf beim Server.
            // 'await' bedeutet: Warte hier, bis der Server antwortet (blockiert nicht den Browser).
            const res = await fetch(endpoint, { 
                method: 'POST', // POST ist besser für lange Anfragen als GET
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(query), // Die Anfrage
                signal: State.controllers.fetch.signal // Damit wir abbrechen können
            });
            
            // Wenn der Server "Nicht OK" sagt (z.B. Fehler 500 oder 429)
            if (!res.ok) {
                console.warn(`Server ${endpoint} Fehler: ${res.status}. Versuche nächsten...`);
                // Wir merken uns den Fehler, brechen aber NICHT ab, sondern "continue" (nächster Server)
                lastError = res.status === 429 ? 'err_ratelimit' : 'err_timeout';
                continue; 
            }

            // Wenn wir hier sind, hat der Server geantwortet! Text lesen.
            const text = await res.text();
            
            // Manchmal schicken Server Quatsch (HTML Fehlerseiten statt Daten). Das prüfen wir.
            if (text.trim().startsWith('<') || text.trim().length === 0) {
                console.warn(`Server ${endpoint} ungültig. Versuche nächsten...`);
                continue;
            }

            // Alles super! Text in JavaScript-Objekte (JSON) umwandeln und zurückgeben.
            return JSON.parse(text);

        } catch (e) {
            // Wenn der User abgebrochen hat (AbortError), ist das kein Fehler.
            if (e.name === 'AbortError') throw e;
            
            // Echter Netzwerkfehler? Nächsten Server probieren.
            console.warn(`Verbindungsfehler bei ${endpoint}:`, e);
            lastError = 'err_generic';
        }
    }
    
    // Wenn wir HIER ankommen, haben ALLE Server versagt.
    throw new Error(lastError || "err_generic");
}

/**
 * HAUPTFUNKTION: fetchOSMData
 * Wird aufgerufen, wenn die Karte bewegt wird.
 * Baut die Anfrage zusammen und startet den Download.
 */
export async function fetchOSMData() {
    const zoom = State.map.getZoom(); // Wie nah sind wir dran?
    const status = document.getElementById('data-status'); // Das Status-Lämpchen unten rechts

    // REGEL 1: Wenn wir zu weit weg sind (Zoom < 12), laden wir NICHTS.
    // Das schützt den Server vor Überlastung (ganz Deutschland laden geht nicht).
    if (zoom < 12) {
        if(status) {
            status.innerText = t('status_standby');
            status.className = 'text-green-400';
        }
        // Alles löschen
        State.markerLayer.clearLayers();
        State.boundaryLayer.clearLayers();
        State.cachedElements = [];
        return;
    }

    // Wir holen die Ecken der aktuellen Kartenansicht (Bounding Box)
    const b = State.map.getBounds();
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;

    // Status auf GELB ("Lädt...")
    if(status) {
        status.innerText = t('status_loading');
        status.className = 'text-amber-400 font-bold'; 
    }
    
    // Alten Ladevorgang abbrechen (falls man schnell weitergeschoben hat)
    if (State.controllers.fetch) State.controllers.fetch.abort();
    State.controllers.fetch = new AbortController();

    // --- OVERPASS QUERY SPRACHE (OPQL) ZUSAMMENBAUEN ---
    // Das ist die Sprache, die die OpenStreetMap-Datenbank versteht.
    
    let queryParts = [];
    
    // LEVEL A: Feuerwachen (Schon ab Zoom 12, da es wenige sind)
    if (zoom >= 12) {
        queryParts.push(`nwr["amenity"="fire_station"](${bbox});`);
        queryParts.push(`nwr["building"="fire_station"](${bbox});`);
    }

    // LEVEL B: Hydranten (AB ZOOM 15)
    // Das sind sehr viele Daten. Deshalb laden wir sie erst, wenn man nah genug dran ist.
    if (zoom >= 15) {
        queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"](${bbox});`);
        queryParts.push(`node["emergency"="defibrillator"](${bbox});`);
    }

    // LEVEL C: Gemeindegrenzen (Ab Zoom 14)
    let boundaryQuery = (zoom >= 14) ? `(way["boundary"="administrative"]["admin_level"="8"](${bbox});)->.boundaries; .boundaries out geom;` : '';

    // Wenn nichts zu tun ist, hören wir auf.
    if (queryParts.length === 0 && boundaryQuery === '') return;

    // Die finale Nachricht an den Server:
    // [timeout:90] = Gib dem Server 90 Sekunden Zeit
    // [out:json]   = Wir wollen JSON Format zurück
    const q = `[out:json][timeout:90];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;

    try {
        // Jetzt rufen wir unsere Helper-Funktion von oben auf
        const data = await fetchWithRetry(q);
        
        // Speichern (für Export)
        State.cachedElements = data.elements;
        
        // Malen (Marker setzen)
        renderMarkers(data.elements, zoom);
        
        // Status auf GRÜN
        if(status) {
            status.innerText = t('status_current');
            status.className = 'text-green-400';
        }
    } catch (e) {
        // Fehlerbehandlung (Nur wenn es kein gewollter Abbruch war)
        if (e.name !== 'AbortError') {
            console.error("Fehler:", e);
            
            // Welchen Text zeigen wir dem User?
            let msgKey = 'err_generic';
            if (e.message.includes('ratelimit')) msgKey = 'err_ratelimit';
            else if (e.message.includes('timeout')) msgKey = 'err_timeout';
            else if (e.message.includes('offline')) msgKey = 'err_offline';

            const txt = t(msgKey);
            
            // Status auf ROT
            if(status) {
                status.innerText = txt;
                status.className = 'text-red-500 font-bold';
            }
            showNotification(txt, 5000); // Rote Box oben rechts
        }
    }
}