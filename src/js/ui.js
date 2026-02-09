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
import { setExportFormat, setExportZoom, startSelection, exportAsPNG, exportAsGPX, exportAsPDF, cancelExport, fetchLocationTitle } from './export.js';
// Wir importieren die Karten-Funktion zum Wechseln des Hintergrunds
import { setBaseLayer } from './map.js';

// ...

// 6. Export-Aktionen
// 6. Export-Aktionen (Jetzt mit Bestätigungs-Dialog)
addClick('select-btn', startSelection);

// Hilfsfunktion: Button -> Dialog -> Export
const withTitleConfirm = (fn) => () => openTitleConfirmation(fn);

addClick('png-btn', withTitleConfirm(exportAsPNG));
addClick('pdf-btn', withTitleConfirm(exportAsPDF));
addClick('gpx-btn', withTitleConfirm(exportAsGPX));
addClick('cancel-export-btn', cancelExport);

// Bestätigungs-Dialog Events
let pendingExportAction = null;

addClick('export-confirm-cancel', () => {
    document.getElementById('export-title-modal').classList.add('hidden');
    // Zurück zum Export-Menü? Oder ganz zu? Wir machen ganz zu für Clean State.
    // toggleExportMenu(); // Optional: Wieder öffnen
});

addClick('export-confirm-ok', () => {
    const modal = document.getElementById('export-title-modal');
    if (modal) modal.classList.add('hidden');
    if (pendingExportAction) pendingExportAction();
});

function openTitleConfirmation(actionCallback) {
    pendingExportAction = actionCallback;

    // 1. Export-Menü schließen
    const exportMenu = document.getElementById('export-menu');
    if (exportMenu) exportMenu.classList.add('hidden');

    // 2. Dialog öffnen
    const modal = document.getElementById('export-title-modal');
    if (modal) {
        modal.classList.remove('hidden');

        // 3. Titel vorladen (Logik hierhin verschoben)
        const input = document.getElementById('export-confirm-title');
        if (input) {
            if (!input.value) {
                input.placeholder = "Lade Ortsnamen...";
                const center = State.map.getCenter();
                fetchLocationTitle(center.lat, center.lng).then(city => {
                    // Nur setzen, wenn User nicht schon was getippt hat (Race Condition)
                    if (!input.value && city) {
                        input.value = `Ort- und Hydrantenplan ${city}`;
                    }
                    input.placeholder = "Titel eingeben";
                });
            }
            input.focus();
        }
    }
}

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
    if (box.hideTimeout) clearTimeout(box.hideTimeout);

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
    if (legal) legal.style.display = 'none';

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
    if (!menu) return;

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
    if (!modal) return;

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
            if (data.length > 0 && State.map) {
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
    if (icon) icon.classList.add('animate-spin');

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            // 1. ZUR POSITION SPRINGEN (Mit Zoom-Check)
            if (State.map) {
                const currentZoom = State.map.getZoom();
                const defaultZoom = Config.locateZoom || 17;

                // LOGIK: Wenn wir schon tief drin sind (z.B. 18), nicht rauszoomen!
                // Sonst den Standard-Wert (17) nehmen.
                const targetZoom = currentZoom >= 18 ? currentZoom : defaultZoom;

                State.map.flyTo([lat, lng], targetZoom);
            }

            // 2. Alten Marker entfernen
            if (State.userMarker) {
                State.map.removeLayer(State.userMarker);
            }

            // 3. NEUER MARKER (Die Lösung für das "Wandern")
            const dotIcon = L.divIcon({
                className: 'user-location-wrapper',
                html: '<div class="user-location-inner"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            State.userMarker = L.marker([lat, lng], { icon: dotIcon }).addTo(State.map);

            // 4. Timer (25 Sekunden)
            if (State.userLocationTimer) clearTimeout(State.userLocationTimer);

            State.userLocationTimer = setTimeout(() => {
                if (State.userMarker) {
                    State.map.removeLayer(State.userMarker);
                    State.userMarker = null;
                }
            }, 25000);

            if (icon) icon.classList.remove('animate-spin');
            showNotification(t('geo_found') || "Standort gefunden!");
        },
        (err) => {
            if (icon) icon.classList.remove('animate-spin');
            console.error(err);
            showNotification("Standort konnte nicht ermittelt werden.");
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

    // 6. Export-Aktionen (wurden oben bereits mit withTitleConfirm initialisiert)
    addClick('select-btn', startSelection);
    // addClick('png-btn', exportAsPNG); <-- FEHLER: Das umgeht den Dialog!
    // addClick('gpx-btn', exportAsGPX);
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
