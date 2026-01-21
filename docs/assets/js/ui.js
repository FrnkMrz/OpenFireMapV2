/**
 * ==========================================================================================
 * DATEI: ui.js (Benutzeroberfläche & Interaktion)
 * ZWECK: Steuerung von Menüs, Buttons und Benachrichtigungen.
 * LERN-ZIEL: DOM-Manipulation (Elemente verändern) und Event-Listener (Klicks verarbeiten).
 * ==========================================================================================
 */

import { State } from './state.js';
import { t } from './i18n.js';
// Wir importieren die Export-Funktionen, um sie mit den Buttons zu verknüpfen
import { setExportFormat, setExportZoom, startSelection, exportAsPNG, exportAsGPX, cancelExport } from './export.js';
// Wir importieren die Karten-Funktion, um den Hintergrund zu ändern
import { setBaseLayer } from './map.js';

/**
 * HILFSFUNKTION: addClick
 * Fügt einem HTML-Element eine Klick-Funktion hinzu.
 * Prüft vorher sicherheitshalber, ob das Element überhaupt existiert.
 * Das verhindert Abstürze, falls man im HTML mal einen Button löscht.
 */
function addClick(id, fn) {
    const el = document.getElementById(id);
    if (el) {
        el.onclick = fn;
    } else {
        // Nur eine Warnung in der Entwickler-Konsole (F12), kein Programm-Absturz.
        console.warn(`Warnung: Button mit ID '${id}' wurde im HTML nicht gefunden.`);
    }
}

/**
 * HAUPTFUNKTION: showNotification
 * Zeigt eine kleine Meldung (Toast) oben rechts an.
 * WICHTIG: Das 'export' ist entscheidend, damit api.js diese Funktion nutzen kann!
 * * @param {string} msg - Der Text, der angezeigt werden soll.
 * @param {number} duration - Wie lange sichtbar? (Standard: 3000ms = 3 Sekunden)
 */
export function showNotification(msg, duration = 3000) {
    const box = document.getElementById('notification-box');
    if (!box) return; // Sicherheitscheck: Gibt es die Box überhaupt?
    
    box.innerText = msg;       // Text setzen
    box.style.display = 'block'; // Sichtbar machen
    
    // Falls noch ein alter Timer läuft (weil gerade schon eine Meldung da war), löschen wir ihn.
    if(box.hideTimeout) clearTimeout(box.hideTimeout);
    
    // Neuen Timer starten: Nach Ablauf der Zeit Box wieder ausblenden
    box.hideTimeout = setTimeout(() => {
        box.style.display = 'none';
    }, duration); 
}

/**
 * Schließt alle offenen Menüs (Layer, Export, Info).
 * Das rufen wir immer auf, bevor wir ein neues Menü öffnen, damit sich nichts überlappt.
 */
export function closeAllMenus() {
    // Liste der IDs aller Menüs
    const menus = ['layer-menu', 'export-menu'];
    
    menus.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden'); // Tailwind-Klasse 'hidden' macht es unsichtbar
    });

    // Das Info-Modal hat eine Sonderbehandlung (da es 'flex' statt 'block' nutzt)
    const legal = document.getElementById('legal-modal');
    if(legal) legal.style.display = 'none';
    
    // Barrierefreiheit: Screenreadern sagen, dass die Buttons jetzt "zu" sind
    const layerBtn = document.getElementById('layer-btn-trigger');
    if(layerBtn) layerBtn.setAttribute('aria-expanded', 'false');
    
    const expBtn = document.getElementById('export-btn-trigger');
    if(expBtn) expBtn.setAttribute('aria-expanded', 'false');
}

/* =============================================================================
   MENÜ-STEUERUNG (Öffnen/Schließen)
   ============================================================================= */

export function toggleLayerMenu() {
    const menu = document.getElementById('layer-menu');
    if(!menu) return;
    
    const isHidden = menu.classList.contains('hidden');
    
    closeAllMenus(); // Erst alles andere zumachen
    
    if (isHidden) {
        // Wenn es zu war -> Aufmachen
        menu.classList.remove('hidden');
        document.getElementById('layer-btn-trigger')?.setAttribute('aria-expanded', 'true');
    }
}

export function toggleExportMenu() {
    const menu = document.getElementById('export-menu');
    if(!menu) return;
    
    const isHidden = menu.classList.contains('hidden');
    
    closeAllMenus();
    
    if (isHidden) {
        menu.classList.remove('hidden');
        document.getElementById('export-btn-trigger')?.setAttribute('aria-expanded', 'true');
        
        // Export-Ansicht zurücksetzen (falls vom letzten Mal noch der Ladebalken da ist)
        document.getElementById('export-setup')?.classList.remove('hidden');
        document.getElementById('export-progress')?.classList.add('hidden');
    }
}

export function toggleLegalModal() {
    const modal = document.getElementById('legal-modal');
    if(!modal) return;
    
    // Prüfen ob sichtbar (hier prüfen wir style.display, weil es kein Tailwind 'hidden' nutzt)
    const isVisible = modal.style.display === 'flex';
    
    closeAllMenus();
    
    if (!isVisible) {
        modal.style.display = 'flex';
    }
}

/* =============================================================================
   FUNKTIONEN FÜR KARTE & SUCHE
   ============================================================================= */

/**
 * Sucht einen Ort über die Nominatim API (OpenStreetMap Suche)
 */
export function searchLocation() {
    const input = document.getElementById('search-input');
    if (!input || !input.value) return; // Nichts eingegeben? Abbrechen.
    
    const query = input.value;
    
    // Anfrage an den Server senden
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(response => response.json()) // Antwort als JSON lesen
        .then(data => {
            // Haben wir ein Ergebnis?
            if(data.length > 0 && State.map) {
                // Zum ersten Ergebnis fliegen (Zoom 18)
                State.map.flyTo([data[0].lat, data[0].lon], 18);
            } else {
                showNotification(t('no_results') || "Ort nicht gefunden");
            }
        })
        .catch(err => {
            console.error(err);
            showNotification("Such-Fehler");
        });
}

/**
 * Bestimmt den eigenen Standort per GPS (Geolocation API)
 */
export function locateUser() {
    // Hat der Browser überhaupt GPS?
    if (!navigator.geolocation) { 
        showNotification("GPS nicht verfügbar"); 
        return; 
    }
    
    // Lade-Animation am Button starten
    const btn = document.getElementById('locate-btn');
    const icon = btn ? btn.querySelector('svg') : null;
    if(icon) icon.classList.add('animate-spin'); 

    // Position abfragen
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            // Erfolg!
            if(State.map) State.map.flyTo([pos.coords.latitude, pos.coords.longitude], 18);
            if(icon) icon.classList.remove('animate-spin'); // Animation stopp
            showNotification(t('geo_found') || "Standort gefunden!");
        },
        (err) => {
            // Fehler (z.B. User hat "Nein" geklickt)
            console.warn("GPS Fehler:", err);
            if(icon) icon.classList.remove('animate-spin');
            showNotification(t('geo_fail') || "Standort nicht ermittelbar");
        },
        { enableHighAccuracy: true, timeout: 5000 } // Optionen: Genauigkeit vor Geschwindigkeit
    );
}

/* =============================================================================
   SETUP (INITIALISIERUNG)
   Diese Funktion wird einmalig beim Start von app.js aufgerufen.
   ============================================================================= */

export function setupUI() {
    console.log("UI wird initialisiert...");

    // 1. Menü-Buttons verbinden
    addClick('layer-btn-trigger', toggleLayerMenu);
    addClick('export-btn-trigger', toggleExportMenu);
    addClick('btn-legal-trigger', toggleLegalModal);
    
    // Schließen-Buttons in den Menüs
    addClick('legal-close-btn', toggleLegalModal);
    addClick('export-close-btn', toggleExportMenu);
    
    // 2. Suche: Button und Enter-Taste
    const searchInp = document.getElementById('search-input');
    if (searchInp) {
        searchInp.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchLocation(); // Enter drückt quasi den Button
        });
    }
    addClick('search-btn', searchLocation);
    addClick('locate-btn', locateUser);

    // 3. Layer-Auswahl Buttons (Hintergrund wechseln)
    // Wir gehen durch die Liste der IDs und hängen überall den Listener an
    ['voyager', 'positron', 'dark', 'satellite', 'topo', 'osm', 'osmde'].forEach(key => {
        addClick(`btn-${key}`, () => setBaseLayer(key));
    });

    // 4. Export-Einstellungen Buttons
    ['free', 'a4l', 'a4p'].forEach(fmt => {
        addClick(`fmt-${fmt}`, () => setExportFormat(fmt));
    });
    
    [15, 16, 17, 18].forEach(z => {
        addClick(`zoom-${z}`, () => setExportZoom(z));
    });

    // 5. Export-Aktionen
    addClick('select-btn', startSelection);
    addClick('png-btn', exportAsPNG);
    addClick('gpx-btn', exportAsGPX);
    addClick('cancel-export-btn', cancelExport);

    // Automatische Schließ-Logik starten
    setupMenuAutoClose();
}

/**
 * Automatisches Schließen von Menüs, wenn die Maus den Bereich verlässt.
 * (Usability Feature)
 */
function setupMenuAutoClose() {
    ['layer-menu', 'export-menu', 'legal-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        
        let closeTimer = null;
        
        // Wenn Maus rausgeht -> Timer starten (10 Sekunden)