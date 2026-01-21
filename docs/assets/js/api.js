/**
 * ==========================================================================================
 * DATEI: api.js
 * ZWECK: Datenabruf und Netzwerk-Kommunikation
 * BESCHREIBUNG:
 * Hier passiert die Magie, um Daten von OpenStreetMap zu holen.
 * Wir nutzen "Overpass API" für die Objekte und "Nominatim" für die Suche.
 * ==========================================================================================
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t } from './i18n.js';
import { renderMarkers } from './map.js'; // Um die Daten danach auf die Karte zu malen
import { showNotification } from './ui.js'; // Um Fehler anzuzeigen

/**
 * Eine robuste Funktion zum Datenabruf ("Fetch").
 * Sie probiert automatisch mehrere Server durch, wenn einer ausfällt.
 * * @param {string} query - Die Abfragesprache für Overpass
 */
async function fetchWithRetry(query) {
    // 1. Check: Haben wir überhaupt Internet?
    if (!navigator.onLine) throw new Error('err_offline');

    // 2. Loop: Wir probieren jeden Server in unserer Liste
    for (let endpoint of Config.overpassEndpoints) {
        try {
            // Der eigentliche Abruf
            const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, { 
                signal: State.controllers.fetch.signal // Damit wir abbrechen können
            });
            
            // Wenn der Server "Nein" sagt (Fehlercode):
            if (!res.ok) {
                if (res.status === 429) throw new Error('err_ratelimit'); // Zu viele Anfragen
                if (res.status >= 500) throw new Error('err_timeout');    // Server kaputt/überlastet
                continue; // Probiere den nächsten Server
            }

            // Text lesen
            const text = await res.text();
            
            // Manchmal schicken Server HTML-Fehlerseiten statt JSON. Das fangen wir ab.
            if (text.trim().startsWith('<')) continue; 

            // Text in echtes Javascript-Objekt umwandeln (JSON)
            return JSON.parse(text);

        } catch (e) {
            // Spezielle Fehler werfen wir weiter nach oben
            if (['err_ratelimit', 'err_timeout', 'err_offline'].includes(e.message)) throw e;
            // Wenn der Nutzer abgebrochen hat, ist das okay
            if (e.name === 'AbortError') throw e;
            // Sonst: Einfach nächsten Server probieren
        }
    }
    // Wenn gar nichts geklappt hat:
    throw new Error("err_generic");
}

/**
 * Hauptfunktion: Lädt die OSM Daten für den aktuellen Kartenausschnitt.
 */
export async function fetchOSMData() {
    const zoom = State.map.getZoom();
    const status = document.getElementById('data-status');

    // Wenn wir zu weit weg sind (Zoom < 12), laden wir nichts, um den Server zu schonen.
    if (zoom < 12) {
        if(status) {
            status.innerText = t('status_standby');
            status.className = 'text-green-400';
        }
        State.markerLayer.clearLayers();
        State.boundaryLayer.clearLayers();
        State.cachedElements = []; // Speicher leeren
        return;
    }

    // Wo schauen wir gerade hin? (Bounding Box: Süden, Westen, Norden, Osten)
    const b = State.map.getBounds();
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;

    // UI Update: "Laden..." anzeigen
    if(status) status.innerText = t('status_loading');
    
    // Falls noch ein alter Ladevorgang läuft: Abbrechen!
    if (State.controllers.fetch) State.controllers.fetch.abort();
    State.controllers.fetch = new AbortController();

    // Die Overpass Query zusammenbauen
    let queryParts = [];
    
    // Ab Zoom 12: Wachen
    if (zoom >= 12) {
        queryParts.push(`nwr["amenity"="fire_station"](${bbox});`);
        queryParts.push(`nwr["building"="fire_station"](${bbox});`);
    }
    // Ab Zoom 15: Hydranten & Wasser
    if (zoom >= 15) {
        queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"](${bbox});`);
    }
    // Ab Zoom 15: Defis
    if (zoom >= 15) {
        queryParts.push(`node["emergency"="defibrillator"](${bbox});`);
    }

    // Grenzen laden (ab Zoom 14)
    let boundaryQuery = (zoom >= 14) ? `(way["boundary"="administrative"]["admin_level"="8"](${bbox});)->.boundaries; .boundaries out geom;` : '';

    // Wenn nichts zu tun ist, brechen wir ab
    if (queryParts.length === 0 && boundaryQuery === '') return;

    // Die fertige Abfrage
    const q = `[out:json][timeout:90];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;

    try {
        // Daten holen...
        const data = await fetchWithRetry(q);
        
        // ... speichern ...
        State.cachedElements = data.elements;
        
        // ... und auf die Karte malen
        renderMarkers(data.elements, zoom);
        
        if(status) {
            status.innerText = t('status_current');
            status.className = 'text-green-400';
        }
    } catch (e) {
        // Fehlerbehandlung
        if (e.name !== 'AbortError') {
            console.error(e);
            // Wir suchen den passenden übersetzten Text für den Fehler
            const errorKey = ['err_ratelimit', 'err_timeout', 'err_offline'].includes(e.message) ? e.message : 'err_generic';
            const txt = t(errorKey);
            
            if(status) {
                status.innerText = txt;
                status.className = 'text-red-500 font-bold';
            }
            showNotification(txt, 5000); // Rote Box oben rechts
        }
    }
}