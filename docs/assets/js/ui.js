/**
 * ==========================================================================================
 * DATEI: ui.js (Benutzeroberfläche)
 * ZWECK: Verknüpft die HTML-Buttons mit den JavaScript-Funktionen.
 * LERN-ZIEL: DOM-Manipulation & Event-Handling verstehen.
 * ==========================================================================================
 * * Diese Datei ist der "Vermittler". Wenn der Nutzer klickt, sagt diese Datei
 * den anderen Modulen (map.js, export.js) Bescheid, was zu tun ist.
 */

import { State } from './state.js';
import { Config } from './config.js'; 
import { t } from './i18n.js';

// Wir importieren Funktionen aus export.js, um sie auf Buttons zu legen
import { setExportFormat, setExportZoom, startSelection, exportAsPNG, exportAsGPX, cancelExport } from './export.js';
// Wir importieren die Karten-Funktion zum Wechseln des Hintergrunds
import { setBaseLayer } from './map.js';

/**
 * HILFSFUNKTION: addClick
 * Fügt einem Button eine Funktion hinzu, aber prüft erst, ob er existiert.
 * Das verhindert Abstürze, wenn man mal einen Button im HTML löscht.
 */
function addClick(id, fn) {
    const el = document.getElementById(id);
    if (el) {
        el.onclick = fn;
    } else {
        // Nur Warnung für Entwickler, kein Absturz für den User
        console.warn(`Warnung: Button mit ID '${id}' fehlt im HTML.`);
    }
}

/**
 * HAUPTFUNKTION: showNotification
 * Zeigt die kleinen Meldungen oben rechts an (z.B. "GPS gefunden").
 * * WICHTIG: Das Wort "export" muss hier stehen, damit api.js die Funktion nutzen kann!
 */
export function showNotification(msg, duration = 3000) {
    const box = document.getElementById('notification-box');
    if (!box) return;
    
    box.innerText = msg;
    box.style.display = 'block'; // Sichtbar machen
    
    // Alten Timer löschen, falls gerade einer läuft
    if(box.hideTimeout) clearTimeout(box.hideTimeout);
    
    // Neuen Timer starten: Nach 3 Sekunden (duration) wieder ausblenden
    box.hideTimeout = setTimeout(() => {
        box.style.display = 'none';
    }, duration); 
}

/**
 * Menü-Steuerung: Schließt alle Popups.
 * Wird aufgerufen, bevor ein neues Fenster geöffnet wird (Exklusivität).
 */
export function closeAllMenus() {
    // 1. Normale Menüs (Layer & Export) ausblenden
    ['layer-menu', 'export-menu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden'); // 'hidden' ist eine Tailwind-Klasse
    });

    // 2. Info-Modal schließen (hat spezielles Display-Attribut)
    const legal = document.getElementById('legal-modal');
    if(legal) legal.style.display = 'none';
    
    // 3. Barrierefreiheit: Layer-Button zurücksetzen
    const layerBtn = document.getElementById('layer-btn-trigger');
    if (layerBtn) {
        layerBtn.setAttribute('aria-expanded', 'false');
        // WICHTIG: Label wieder auf "Öffnen" setzen
        layerBtn.setAttribute('aria-label', t('menu_layers_open'));
    }

    // 4. Barrierefreiheit: Export-Button zurücksetzen
    const exportBtn = document.getElementById('export-btn-trigger');
    if (exportBtn) {
        exportBtn.setAttribute('aria-expanded', 'false');
        // WICHTIG: Label wieder auf "Öffnen" setzen
        exportBtn.setAttribute('aria-label', t('menu_export_open'));
    }
}

/* =============================================================================
   TOGGLE FUNKTIONEN (Auf/Zu machen)
   ============================================================================= */

// Diese Funktion wird aufgerufen, wenn man auf den Layer-Button klickt
function toggleLayerMenu() {
    // KORREKTUR: Die ID muss exakt so heißen wie im HTML ('layer-btn-trigger')
    const btn = document.getElementById('layer-btn-trigger'); 
    const menu = document.getElementById('layer-menu'); 
    
    // Sicherheitscheck: Abbrechen, falls der Button nicht gefunden wird (verhindert Absturz)
    if (!btn || !menu) {
        console.warn("Fehler: Layer-Button oder Menü nicht gefunden.");
        return;
    }
    
    // Aktuellen Status prüfen
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    const newState = !isExpanded;

    // 1. Erst alle anderen Menüs schließen (damit sich nichts überlappt)
    if (newState) {
        closeAllMenus(); 
        menu.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
    }

    // 2. ARIA Updates (Für Screenreader)
    btn.setAttribute('aria-expanded', newState);

    // Label anpassen: Wenn offen -> "Schließen", wenn zu -> "Öffnen"
    const newLabel = newState ? t('menu_layers_close') : t('menu_layers_open');
    btn.setAttribute('aria-label', newLabel);
}

export function toggleExportMenu() {
    const menu = document.getElementById('export-menu');
    if(!menu) return;
    
    const isHidden = menu.classList.contains('hidden');
    closeAllMenus();
    
    if (isHidden) {
        menu.classList.remove('hidden');
        document.getElementById('export-btn-trigger')?.setAttribute('aria-expanded', 'true');
        
        // UI zurücksetzen (Ladebalken weg, Setup zeigen)
        document.getElementById('export-setup')?.classList.remove('hidden');
        document.getElementById('export-progress')?.classList.add('hidden');
    }
}

export function toggleLegalModal() {
    const modal = document.getElementById('legal-modal');
    if(!modal) return;
    
    // Prüfen ob es schon offen ist (bei Flexbox ist 'flex' = offen)
    const isVisible = modal.style.display === 'flex';
    closeAllMenus();
    
    if (!isVisible) {
        modal.style.display = 'flex';
    }
}

/* =============================================================================
   SUCHE & GPS
   ============================================================================= */

/**
 * Sucht einen Ort über die Nominatim API (OpenStreetMap).
 * LERN-INFO: Wir nutzen jetzt Config.searchZoom für die Ansicht.
 */
export function searchLocation() {
    const input = document.getElementById('search-input');
    if (!input || !input.value) return;
    
    const query = input.value;
    
    fetch(`${Config.nominatimUrl}/search?format=json&q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => {
            if(data.length > 0 && State.map) {
                // Wir nutzen den zentral konfigurierten Zoom-Wert
                State.map.flyTo([data[0].lat, data[0].lon], Config.searchZoom);
                
                input.blur(); // Tastatur am Handy einklappen
            } else {
                showNotification(t('no_results'));
            }
        })
        .catch(err => {
            console.error("Suchfehler:", err);
            showNotification("Suche fehlgeschlagen");
        });
}

/**
 * Bestimmt den Standort des Nutzers via Browser-GPS.
 */
export function locateUser() {
    if (!navigator.geolocation) { 
        showNotification("GPS nicht unterstützt"); 
        return; 
    }
    
    const btn = document.getElementById('locate-btn');
    const icon = btn ? btn.querySelector('svg') : null;
    if(icon) icon.classList.add('animate-spin'); 

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            console.log(`GPS Position: ${lat}, ${lng}`); // Debug-Log für die Konsole

            // 1. Zoom & Pan
            if (State.map) {
                State.map.flyTo([lat, lng], Config.locateZoom || 17);
            }

            // 2. Alten Marker entfernen
            if (State.userMarker) {
                State.map.removeLayer(State.userMarker);
            }

            // 3. NEUER MARKER (Mit eingebautem CSS!)
            // Wir nutzen 'html' statt 'className', um den Stil zu erzwingen.
            const dotIcon = L.divIcon({
                className: '', // Keine Klasse, damit Leaflet nichts überschreibt
                html: `<div style="
                    background-color: #3b82f6; 
                    width: 16px; 
                    height: 16px; 
                    border-radius: 50%; 
                    border: 2px solid white; 
                    box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);">
                </div>`,
                iconSize: [20, 20], // Größe des Containers
                iconAnchor: [10, 10] // Genau die Mitte (Hälfte von 20)
            });

            State.userMarker = L.marker([lat, lng], { icon: dotIcon }).addTo(State.map);

            // 4. Timer (25 Sekunden)
            if (State.userLocationTimer) clearTimeout(State.userLocationTimer);
            
            State.userLocationTimer = setTimeout(() => {
                if (State.userMarker) {
                    State.map.removeLayer(State.userMarker);
                    State.userMarker = null;
                    console.log("Punkt entfernt.");
                }
            }, 25000);

            if(icon) icon.classList.remove('animate-spin');
            showNotification(t('geo_found') || "Standort gefunden!");
        },
        (err) => {
            if(icon) icon.classList.remove('animate-spin');
            console.error(err);
            showNotification("GPS Fehler: " + err.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
    );
}

/* =============================================================================
   SETUP (Initialisierung)
   Diese Funktion wird einmalig beim Start von app.js aufgerufen.
   ============================================================================= */

export function setupUI() {
    // 1. Haupt-Buttons verbinden
    addClick('layer-btn-trigger', toggleLayerMenu);
    addClick('export-btn-trigger', toggleExportMenu);
    
    // Info & Recht Button (öffnet das Modal)
    addClick('btn-legal-trigger', toggleLegalModal);
    
    // Schließen-Buttons (das X oben rechts in den Fenstern)
    addClick('legal-close-btn', toggleLegalModal);
    addClick('export-close-btn', toggleExportMenu);
    
    // 2. Suche (Enter-Taste Unterstützung)
    const searchInp = document.getElementById('search-input');
    if (searchInp) {
        searchInp.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchLocation();
        });
    }
    addClick('search-btn', searchLocation);
    addClick('locate-btn', locateUser);

    // 3. Layer-Auswahl (Hintergrundbilder)
    ['voyager', 'positron', 'dark', 'satellite', 'topo', 'osm', 'osmde'].forEach(key => {
        addClick(`btn-${key}`, () => setBaseLayer(key));
    });

    // 4. Export-Format (A4, Frei, etc.)
    ['free', 'a4l', 'a4p'].forEach(fmt => {
        addClick(`fmt-${fmt}`, () => setExportFormat(fmt));
    });
    
    // 5. Export-Zoom (15-18)
    [15, 16, 17, 18].forEach(z => {
        addClick(`zoom-${z}`, () => setExportZoom(z));
    });

    // 6. Export-Aktionen
    addClick('select-btn', startSelection);
    addClick('png-btn', exportAsPNG);
    addClick('gpx-btn', exportAsGPX);
    addClick('cancel-export-btn', cancelExport);

    // Automatische Schließ-Logik aktivieren
    setupMenuAutoClose();
}

/**
 * FEATURE: Menüs automatisch schließen
 * Wenn die Maus den Bereich verlässt, schließt sich das Menü nach 10 Sekunden.
 * VERBESSERUNG: Timer wird jetzt sicher am Element gespeichert.
 */
function setupMenuAutoClose() {
    ['layer-menu', 'export-menu', 'legal-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        
        // Wir speichern den Timer direkt am Element, um Konflikte zu vermeiden
        el._closeTimer = null;
        
        // MAUS RAUS -> Timer starten
        el.addEventListener('mouseleave', () => {
            // Nur schließen, wenn das Menü auch wirklich sichtbar ist
            const isHidden = id === 'legal-modal' ? (el.style.display === 'none' || el.style.display === '') : el.classList.contains('hidden');
            if (isHidden) return;
            
            // Timer starten (10 Sekunden = 10000 ms)
            el._closeTimer = setTimeout(() => {
                if (id === 'legal-modal') el.style.display = 'none';
                else el.classList.add('hidden');
                
                // Den zugehörigen Button auch zurücksetzen (für Barrierefreiheit)
                const btnId = id === 'layer-menu' ? 'layer-btn-trigger' : (id === 'export-menu' ? 'export-btn-trigger' : 'btn-legal-trigger');
                document.getElementById(btnId)?.setAttribute('aria-expanded', 'false');
                
            }, 10000); 
        });
        
        // MAUS REIN -> Timer abbrechen (Nutzer liest noch)
        el.addEventListener('mouseenter', () => {
            if (el._closeTimer) {
                clearTimeout(el._closeTimer);
                el._closeTimer = null;
            }
        });
    });
}
