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
    
    // 3. Barrierefreiheit: Screenreadern sagen "Alles ist zu"
    document.getElementById('layer-btn-trigger')?.setAttribute('aria-expanded', 'false');
    document.getElementById('export-btn-trigger')?.setAttribute('aria-expanded', 'false');
}

/* =============================================================================
   TOGGLE FUNKTIONEN (Auf/Zu machen)
   ============================================================================= */

export function toggleLayerMenu() {
    const menu = document.getElementById('layer-menu');
    if(!menu) return;
    
    const isHidden = menu.classList.contains('hidden');
    closeAllMenus(); // Erst alles andere zu
    
    if (isHidden) {
        menu.classList.remove('hidden'); // Dann dieses auf
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
 * LERN-INFO: Ein setTimeout sorgt dafür, dass der Marker nach 20s gelöscht wird.
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

            // 1. ZUR POSITION SPRINGEN
            // Wir nutzen den Wert aus der config.js (Zoom 16)
            State.map.flyTo([lat, lng], Config.locateZoom);

            // 2. ALTEN PUNKT ENTFERNEN (falls vorhanden)
            if (State.userMarker) {
                State.map.removeLayer(State.userMarker);
            }

            // 3. BLINKENDEN PUNKT ERZEUGEN
            const dotIcon = L.divIcon({
                className: 'user-location-dot',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            State.userMarker = L.marker([lat, lng], { icon: dotIcon }).addTo(State.map);

            // 4. AUTOMATISCHES LÖSCHEN NACH 20 SEKUNDEN
            // LERN-INFO: setTimeout führt eine Funktion verzögert aus.
            setTimeout(() => {
                if (State.userMarker) {
                    State.map.removeLayer(State.userMarker);
                    State.userMarker = null;
                    console.log("Standort-Punkt wurde nach 20s automatisch entfernt.");
                }
            }, 20000); // 20.000 ms = 20 Sekunden

            if(icon) icon.classList.remove('animate-spin');
            showNotification(t('geo_found') || "Standort gefunden!");
        },
        (err) => {
            if(icon) icon.classList.remove('animate-spin');
            showNotification("GPS-Zugriff verweigert");
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
 */
function setupMenuAutoClose() {
    ['layer-menu', 'export-menu', 'legal-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        
        let closeTimer = null;
        
        // Maus raus -> Timer an
        el.addEventListener('mouseleave', () => {
            // Nur schließen, wenn es gerade offen ist
            const isHidden = id === 'legal-modal' ? (el.style.display === 'none') : el.classList.contains('hidden');
            if (isHidden) return;
            
            closeTimer = setTimeout(() => {
                if (id === 'legal-modal') el.style.display = 'none';
                else el.classList.add('hidden');
                
                // ARIA Status zurücksetzen
                const btnId = id === 'layer-menu' ? 'layer-btn-trigger' : (id === 'export-menu' ? 'export-btn-trigger' : 'btn-legal-trigger');
                document.getElementById(btnId)?.setAttribute('aria-expanded', 'false');
            }, 10000); // 10 Sekunden
        });
        
        // Maus rein -> Timer aus (User liest noch)
        el.addEventListener('mouseenter', () => {
            if (closeTimer) clearTimeout(closeTimer);
        });
    });
}