/**
 * ==========================================================================================
 * DATEI: ui.js
 * ZWECK: Steuerung der Benutzeroberfläche (User Interface)
 * LERN-ZIEL: DOM-Manipulation (HTML ändern) und Event-Listener (Klicks abfangen).
 * ==========================================================================================
 */

import { State } from './state.js';
import { t } from './i18n.js';
// Wir importieren Funktionen aus anderen Modulen, um sie mit Buttons zu verknüpfen
import { setExportFormat, setExportZoom, startSelection, exportAsPNG, exportAsGPX, cancelExport } from './export.js';
import { setBaseLayer } from './map.js';

/**
 * HILFSFUNKTION: addClick
 * Fügt einem HTML-Element eine Klick-Funktion hinzu.
 * LERN-ZIEL: Sicheres Programmieren.
 * Wenn wir einfach document.getElementById(...).onclick machen und das Element fehlt,
 * stürzt das Skript ab. Diese Funktion prüft erst, ob das Element da ist.
 */
function addClick(id, fn) {
    const el = document.getElementById(id);
    if (el) {
        el.onclick = fn;
    } else {
        // Nur eine Warnung in der Konsole, kein Absturz der ganzen App.
        console.warn(`Warnung: Button mit ID '${id}' fehlt im HTML.`);
    }
}

/**
 * WICHTIG: Diese Funktion wird von api.js gebraucht!
 * "export" macht sie öffentlich.
 * Zeigt eine Nachricht (Toast) oben rechts an.
 */
export function showNotification(msg, duration = 3000) {
    const box = document.getElementById('notification-box');
    if (!box) return;
    
    box.innerText = msg;
    box.style.display = 'block';
    
    // Timer zurücksetzen, falls noch einer läuft
    if(box.hideTimeout) clearTimeout(box.hideTimeout);
    
    // Nach 'duration' Millisekunden (Standard: 3000ms = 3s) wieder ausblenden
    box.hideTimeout = setTimeout(() => {
        box.style.display = 'none';
    }, duration); 
}

/**
 * Schließt alle offenen Menüs.
 * Das ist wichtig für die "Exklusivität": Wenn ich das Export-Menü öffne,
 * soll das Layer-Menü automatisch zugehen.
 */
export function closeAllMenus() {
    ['layer-menu', 'export-menu'].forEach(id => {
        const el = document.getElementById(id);
        // 'hidden' ist eine Tailwind-Klasse, die display:none setzt
        if (el) el.classList.add('hidden');
    });
    
    const legal = document.getElementById('legal-modal');
    if(legal) legal.style.display = 'none'; // Modals nutzen oft flex/block, daher style direkt ändern
    
    // ARIA (Barrierefreiheit): Sagt Screenreadern, dass der Button jetzt "zu" ist.
    document.getElementById('layer-btn-trigger')?.setAttribute('aria-expanded', 'false');
    document.getElementById('export-btn-trigger')?.setAttribute('aria-expanded', 'false');
}

// --- TOGGLE FUNKTIONEN (Auf/Zu machen) ---

export function toggleLayerMenu() {
    const menu = document.getElementById('layer-menu');
    if(!menu) return;
    
    const isHidden = menu.classList.contains('hidden');
    closeAllMenus(); // Erst alles aufräumen
    
    if (isHidden) {
        // Wenn es zu war, machen wir es auf
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
        // UI zurücksetzen (Ladebalken ausblenden, falls vom letzten Mal noch da)
        document.getElementById('export-setup')?.classList.remove('hidden');
        document.getElementById('export-progress')?.classList.add('hidden');
    }
}

export function toggleLegalModal() {
    const modal = document.getElementById('legal-modal');
    if(!modal) return;
    const isVisible = modal.style.display === 'flex';
    closeAllMenus();
    if (!isVisible) {
        modal.style.display = 'flex';
    }
}

/**
 * Ortssuche über Nominatim API
 */
export function searchLocation() {
    const input = document.getElementById('search-input');
    if (!input || !input.value) return;
    
    // Wir fragen den OpenStreetMap Server nach Koordinaten für den Text
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input.value)}`)
        .then(r => r.json())
        .then(data => {
            if(data.length > 0 && State.map) {
                // Wenn gefunden: Hinfliegen (Zoom 18)
                State.map.flyTo([data[0].lat, data[0].lon], 18);
            } else {
                showNotification(t('no_results') || "Nicht gefunden");
            }
        });
}

/**
 * GPS Standort Button
 */
export function locateUser() {
    if (!navigator.geolocation) { 
        showNotification("GPS Fehler"); return; 
    }
    
    const btn = document.getElementById('locate-btn');
    const icon = btn ? btn.querySelector('svg') : null;
    if(icon) icon.classList.add('animate-spin'); // Kleines visuelles Feedback (Drehen)

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            if(State.map) State.map.flyTo([pos.coords.latitude, pos.coords.longitude], 18);
            if(icon) icon.classList.remove('animate-spin');
            showNotification(t('geo_found') || "Gefunden!");
        },
        (err) => {
            if(icon) icon.classList.remove('animate-spin');
            showNotification("GPS nicht möglich");
        }
    );
}

/**
 * INITIALISIERUNG (Wird einmal beim Start ausgeführt)
 * Hier verbinden wir die HTML-Elemente mit unseren JavaScript-Funktionen.
 */
export function setupUI() {
    // 1. Menü-Buttons
    addClick('layer-btn-trigger', toggleLayerMenu);
    addClick('export-btn-trigger', toggleExportMenu);
    addClick('btn-legal-trigger', toggleLegalModal);
    addClick('legal-close-btn', toggleLegalModal);
    addClick('export-close-btn', toggleExportMenu);
    
    // 2. Suche (Enter-Taste unterstützen)
    const searchInp = document.getElementById('search-input');
    if (searchInp) {
        searchInp.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchLocation();
        });
    }
    addClick('search-btn', searchLocation);
    addClick('locate-btn', locateUser);

    // 3. Layer-Auswahl (Dynamisch für alle Layer in der Liste)
    ['voyager', 'positron', 'dark', 'satellite', 'topo', 'osm', 'osmde'].forEach(key => {
        addClick(`btn-${key}`, () => setBaseLayer(key));
    });

    // 4. Export-Einstellungen
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
 * Feature: Menüs schließen sich automatisch nach 10 Sekunden, wenn die Maus weg ist.
 */
function setupMenuAutoClose() {
    ['layer-menu', 'export-menu', 'legal-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        let closeTimer = null;
        
        el.addEventListener('mouseleave', () => {
            const isHidden = id === 'legal-modal' ? (el.style.display === 'none') : el.classList.contains('hidden');
            if (isHidden) return; // Wenn schon zu ist, brauchen wir keinen Timer
            
            closeTimer = setTimeout(() => {
                if (id === 'legal-modal') el.style.display = 'none';
                else el.classList.add('hidden');
                
                // Barrierefreiheit zurücksetzen
                const btnId = id === 'layer-menu' ? 'layer-btn-trigger' : 'export-btn-trigger';
                document.getElementById(btnId)?.setAttribute('aria-expanded', 'false');
            }, 10000); // 10000ms = 10 Sekunden
        });
        
        // Wenn Maus zurückkommt, Timer abbrechen
        el.addEventListener('mouseenter', () => {
            if (closeTimer) clearTimeout(closeTimer);
        });
    });
}