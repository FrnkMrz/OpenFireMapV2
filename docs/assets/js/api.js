/**
 * ==========================================================================================
 * DATEI: api.js
 * ZWECK: Datenabruf und Netzwerk-Kommunikation
 * BESCHREIBUNG:
 * Hier passiert die Magie, um Daten von OpenStreetMap zu holen.
 * Wir nutzen "Overpass API" für die Objekte und "Nominatim" für die Suche.
 * ==========================================================================================
 */
/**
 * ==========================================================================================
 * DATEI: api.js (NEU & KORRIGIERT)
 * ZWECK: Datenabruf und Netzwerk-Kommunikation
 * UPDATE: Nutzt jetzt POST-Requests gegen "Server überlastet" Fehler
 * ==========================================================================================
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t } from './i18n.js';
import { renderMarkers } from './map.js'; 
import { showNotification } from './ui.js'; 

/**
 * Robuste Abfrage-Funktion (nutzt jetzt POST statt GET)
 */
async function fetchWithRetry(query) {
    // 1. Offline Check
    if (!navigator.onLine) throw new Error('err_offline');

    // Liste der Server (mit Backup)
    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter', // Backup Server
        'https://overpass.kumi.systems/api/interpreter'
    ];

    // Wir probieren die Server nacheinander durch
    for (let endpoint of endpoints) {
        try {
            // WICHTIG: Hier nutzen wir jetzt 'POST'. 
            // Das erlaubt längere Anfragen und verhindert oft 504/429 Fehler.
            const res = await fetch(endpoint, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'data=' + encodeURIComponent(query),
                signal: State.controllers.fetch.signal 
            });
            
            if (!res.ok) {
                if (res.status === 429) throw new Error('err_ratelimit');
                if (res.status >= 500) throw new Error('err_timeout');
                console.warn(`Server ${endpoint} Fehler: ${res.status}`);
                continue; // Nächster Server
            }

            const text = await res.text();
            
            // Schutz vor HTML-Fehlerseiten (passiert manchmal bei Proxies)
            if (text.trim().startsWith('<')) continue; 

            return JSON.parse(text);

        } catch (e) {
            // Wenn es ein bekannter Fehler ist (Offline, Timeout), werfen wir ihn weiter
            if (['err_ratelimit', 'err_timeout', 'err_offline'].includes(e.message)) throw e;
            // Wenn der User abgebrochen hat (z.B. beim Zoomen), ist das ok
            if (e.name === 'AbortError') throw e;
            
            console.warn(`Verbindungsfehler bei ${endpoint}:`, e);
            // Sonst: Nächsten Server probieren
        }
    }
    throw new Error("err_generic");
}

/**
 * Hauptfunktion: Lädt die OSM Daten für den aktuellen Kartenausschnitt.
 */
export async function fetchOSMData() {
    const zoom = State.map.getZoom();
    const status = document.getElementById('data-status');

    // Standby bei zu wenig Zoom
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

    const b = State.map.getBounds();
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;

    if(status) {
        status.innerText = t('status_loading');
        status.className = 'text-amber-400 font-bold'; // Gelb beim Laden
    }
    
    // Alten Request abbrechen
    if (State.controllers.fetch) State.controllers.fetch.abort();
    State.controllers.fetch = new AbortController();

    // Query Bauen
    let queryParts = [];
    if (zoom >= 12) {
        queryParts.push(`nwr["amenity"="fire_station"](${bbox});`);
        queryParts.push(`nwr["building"="fire_station"](${bbox});`);
    }
    if (zoom >= 15) {
        queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"](${bbox});`);
        queryParts.push(`node["emergency"="defibrillator"](${bbox});`);
    }

    let boundaryQuery = (zoom >= 14) ? `(way["boundary"="administrative"]["admin_level"="8"](${bbox});)->.boundaries; .boundaries out geom;` : '';

    if (queryParts.length === 0 && boundaryQuery === '') return;

    // Timeout auf 25s gesetzt (Server mögen kurze Timeouts lieber)
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
            console.error(e);
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