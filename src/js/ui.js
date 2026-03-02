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
import { APP_VERSION } from './version.js';

// Lazy-Loader: export.js (inkl. jspdf + html2canvas) wird erst bei Bedarf geladen.
// Das spart ~70 KB gzipped bei jedem App-Start.
let _exportModule = null;
async function getExport() {
    if (!_exportModule) _exportModule = await import('./export.js');
    return _exportModule;
}
// Wir importieren die Karten-Funktion zum Wechseln des Hintergrunds
import { setBaseLayer, clearDistanceLine, drawLineToNearest } from './map.js';

// ...

// 6. Export-Aktionen (Lazy Loading: export.js wird erst bei Klick geladen)
addClick('select-btn', async () => { const m = await getExport(); m.startSelection(); });

// Hilfsfunktion: Button -> Dialog -> Export (lazy)
const withTitleConfirm = (lazyFnName) => () => openTitleConfirmation(lazyFnName);

addClick('png-btn', withTitleConfirm('exportAsPNG'));
addClick('pdf-btn', withTitleConfirm('exportAsPDF'));
addClick('gpx-btn', withTitleConfirm('exportAsGPX'));
addClick('cancel-export-btn', async () => { const m = await getExport(); m.cancelExport(); });

// Bestätigungs-Dialog Events
let pendingExportAction = null;

addClick('export-confirm-cancel', () => {
    document.getElementById('export-title-modal').classList.add('hidden');
    // Zurück zum Trigger-Button fokussieren (Barrierefreiheit)
    document.getElementById('export-btn-trigger')?.focus();
});

addClick('export-confirm-ok', () => {
    const modal = document.getElementById('export-title-modal');
    if (modal) modal.classList.add('hidden');
    if (pendingExportAction) pendingExportAction();
});

function openTitleConfirmation(exportFnName) {
    // 0. Daten-Check: Haben wir überhaupt Hydranten?
    if (!State.cachedElements || State.cachedElements.length === 0) {
        showNotification(t('no_objects'), 3000);
        return;
    }

    // Lazy: Die eigentliche Export-Funktion wird erst bei "OK" geladen
    pendingExportAction = async () => {
        const m = await getExport();
        m[exportFnName]();
    };

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
            // IMMER neu laden, damit es zum aktuellen Ausschnitt passt (User-Feedback)
            input.value = "";
            input.placeholder = "Lade Ortsnamen...";

            // Vorbefüllen des Ortsnamens für den Export-Dialog
            // NEU: Wenn eine Auswahl (Selection) aktiv ist, nehmen wir das Zentrum DIESER Auswahl.
            // Sonst nehmen wir das Zentrum der Karte.
            let centerLat = 0;
            let centerLng = 0;

            if (State.selection.active && State.selection.finalBounds) {
                const selCenter = State.selection.finalBounds.getCenter();
                centerLat = selCenter.lat;
                centerLng = selCenter.lng;
            } else if (State.map) {
                const mapCenter = State.map.getCenter();
                centerLat = mapCenter.lat;
                centerLng = mapCenter.lng;
            }

            if (centerLat && centerLng) {
                getExport().then(m => {
                    m.fetchLocationTitle(centerLat, centerLng).then(city => {
                        if (city) {
                            input.value = `Ort- und Hydrantenplan ${city}`;
                        } else {
                            input.placeholder = "Titel eingeben";
                        }
                    });
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
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            fn(e);
        });
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
let isLocating = false;

/**
 * Bestimmt den Standort des Nutzers via Browser-GPS.
 */
export function locateUser(highAccuracy = true) {
    if (!navigator.geolocation) {
        showNotification("GPS nicht unterstützt");
        return;
    }

    // Spam-Schutz: Wenn bereits eine Ortung läuft (und es kein automatischer Fallback ist), ignorieren wir weitere Klicks.
    // Das verhindert OS-seitige Timeouts (Safari/MacOS locken das GPS sonst temporär).
    if (isLocating && highAccuracy) return;

    isLocating = true;

    const btn = document.getElementById('locate-btn');
    const icon = btn ? btn.querySelector('svg') : null;

    // Icon nur beim ersten Aufruf drehen lassen
    if (icon && highAccuracy) icon.classList.add('animate-spin');

    // Safety-Net: Manche Browser (Safari) verschlucken manchmal den Error-Callback bei Timeouts.
    // Damit der Button nicht für immer gelockt bleibt, entsperren wir ihn nach 12 Sekunden hart.
    const safetyTimer = setTimeout(() => {
        if (isLocating) {
            isLocating = false;
            if (icon) icon.classList.remove('animate-spin');
            console.warn('[GPS] Safety timeout triggered. Browser did not fire callback.');
        }
    }, 12000);

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            clearTimeout(safetyTimer);
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
                clearDistanceLine();
            }

            // 3. NEUER MARKER (Die Lösung für das "Wandern")
            const dotIcon = L.divIcon({
                className: 'user-location-wrapper',
                html: '<div class="user-location-inner"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            State.userMarker = L.marker([lat, lng], { icon: dotIcon }).addTo(State.map);

            // 3b. Blaue Linie zum nächsten Hydranten zeichnen
            drawLineToNearest();

            // 4. Timer (25 Sekunden)
            if (State.userLocationTimer) clearTimeout(State.userLocationTimer);

            State.userLocationTimer = setTimeout(() => {
                if (State.userMarker) {
                    State.map.removeLayer(State.userMarker);
                    State.userMarker = null;
                    clearDistanceLine();
                }
            }, 25000);

            if (icon) icon.classList.remove('animate-spin');
            showNotification(t('geo_found') || "Standort gefunden!");
            isLocating = false;
        },
        (err) => {
            clearTimeout(safetyTimer);

            // FALLBACK FÜR SAFARI/MACOS:
            // Fehler 2 (Position unavailable) oder 3 (Timeout) treten oft bei "highAccuracy: true" 
            // an Desktop-Geräten (macOS) auf. Wir versuchen es dann transparent ohne High-Accuracy noch einmal.
            if (highAccuracy && (err.code === 2 || err.code === 3 || err.code === 1)) {
                console.warn(`[GPS Fallback] HighAccuracy failed (Code ${err.code}). Retrying with low accuracy...`);
                locateUser(false); // Rekursiver Aufruf mit low-accuracy
                return;
            }

            if (icon) icon.classList.remove('animate-spin');
            console.error('[GPS Error]', err);
            const errMsg = t('gps_error') || "Standort konnte nicht ermittelt werden.";
            // Safari liefert bei Code 2 oft eine leere (tote) message mit.
            const desc = err.message ? `: ${err.message}` : '';
            showNotification(`${errMsg} (${err.code}${desc})`, 5000);

            isLocating = false;
        },
        {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 6000 : 10000,
            maximumAge: 10000 // Erlaubt dem Browser, eine bis zu 10sek alte Position zu verwenden (schont Systemressourcen stark)
        }
    );
}

/* =============================================================================
   SETUP (Initialisierung)
   Diese Funktion wird einmalig beim Start von app.js aufgerufen.
   ============================================================================= */

export function setupUI() {
    // 0. Version in Legal Modal eintragen (falls DOM existiert)
    const versionEl = document.getElementById('app-version');
    if (versionEl) {
        versionEl.textContent = `v${APP_VERSION}`;
    }

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

    // 4. Export-Format (A4, Frei, etc.) — lazy
    ['free', 'a4l', 'a4p'].forEach(fmt => {
        addClick(`fmt-${fmt}`, async () => { const m = await getExport(); m.setExportFormat(fmt); });
    });

    // 5. Export-Zoom (15-18) — lazy
    [15, 16, 17, 18].forEach(z => {
        addClick(`zoom-${z}`, async () => { const m = await getExport(); m.setExportZoom(z); });
    });

    // 6. Export-Aktionen (wurden oben bereits mit withTitleConfirm initialisiert)
    addClick('select-btn', async () => { const m = await getExport(); m.startSelection(); });
    // addClick('png-btn', exportAsPNG); <-- FEHLER: Das umgeht den Dialog!
    // addClick('gpx-btn', exportAsGPX);
    addClick('cancel-export-btn', async () => { const m = await getExport(); m.cancelExport(); });

    // Automatische Schließ-Logik aktivieren
    setupMenuAutoClose();

    // Globaler Escape-Key Listener für Barrierefreiheit (Keyboard Navigation)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // 1. Export Title Modal
            const titleModal = document.getElementById('export-title-modal');
            if (titleModal && !titleModal.classList.contains('hidden')) {
                titleModal.classList.add('hidden');
                document.getElementById('export-btn-trigger')?.focus();
                return;
            }

            // 2. Layer Menu
            const layerMenu = document.getElementById('layer-menu');
            if (layerMenu && !layerMenu.classList.contains('hidden')) {
                closeAllMenus();
                document.getElementById('layer-btn-trigger')?.focus();
                return;
            }

            // 3. Export Menu
            const exportMenu = document.getElementById('export-menu');
            if (exportMenu && !exportMenu.classList.contains('hidden')) {
                closeAllMenus();
                document.getElementById('export-btn-trigger')?.focus();
                return;
            }

            // 4. Legal Modal
            const legalModal = document.getElementById('legal-modal');
            if (legalModal && legalModal.style.display !== 'none' && legalModal.style.display !== '') {
                closeAllMenus();
                document.getElementById('btn-legal-trigger')?.focus();
                return;
            }
        }
    });
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
