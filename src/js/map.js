/**
 * ==========================================================================================
 * DATEI: map.js
 * ZWECK: Karte und Marker (Mit Smart-Tooltips)
 * ==========================================================================================
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t } from './i18n.js';
import { fetchOSMData } from './api.js';
import { showNotification } from './ui.js';

// ---------------------------------------------------------------------------
// Permalink — URL-Hash Hilfsfunktionen
// Format: #zoom/lat/lon/layer  (z.B. #17/48.1234/9.5678/topo)
// ---------------------------------------------------------------------------

/** Liest den URL-Hash und gibt {lat, lon, zoom, layer} zurück oder null. */
function parsePermalinkHash() {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return null;
    const parts = hash.split('/');
    if (parts.length < 3) return null;

    const zoom = Number(parts[0]);
    const lat  = Number(parts[1]);
    const lon  = Number(parts[2]);
    const layer = parts[3] || null; // optional

    if (!Number.isFinite(zoom) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (zoom < 1 || zoom > 22) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

    return { lat, lon, zoom: Math.round(zoom), layer };
}

let _permalinkTimer = null;

/** Aktualisiert den URL-Hash mit der aktuellen Kartenposition (debounced). */
function updatePermalink() {
    if (_permalinkTimer) clearTimeout(_permalinkTimer);
    _permalinkTimer = setTimeout(() => {
        if (!State.map) return;
        const c = State.map.getCenter();
        const z = Math.round(State.map.getZoom());
        const layer = State.activeLayerKey || 'voyager';
        const newHash = `#${z}/${c.lat.toFixed(5)}/${c.lng.toFixed(5)}/${layer}`;
        if (window.location.hash !== newHash) {
            window.history.replaceState(null, '', newHash);
        }
    }, 300);
}

/**
 * Teilt die aktuelle Kartenansicht via Web Share API (Mobile)
 * oder kopiert den Link in die Zwischenablage (Desktop-Fallback).
 */
export async function shareMap() {
    if (!State.map) return;
    // Permalink sofort aktualisieren, damit der geteilte Link aktuell ist
    const c = State.map.getCenter();
    const z = Math.round(State.map.getZoom());
    const layer = State.activeLayerKey || 'voyager';
    const url = `${window.location.origin}${window.location.pathname}#${z}/${c.lat.toFixed(5)}/${c.lng.toFixed(5)}/${layer}`;

    // Web Share API (native Share-Sheet auf Mobile)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'OpenFireMap.org',
                text: t('share_map') || 'Kartenansicht teilen',
                url
            });
            return; // Erfolgreich geteilt
        } catch (e) {
            // User hat Share-Dialog abgebrochen – kein Fehler
            if (e.name === 'AbortError') return;
            console.warn('[Share] Web Share fehlgeschlagen, Fallback auf Clipboard', e);
        }
    }

    // Fallback: Zwischenablage
    try {
        await navigator.clipboard.writeText(url);
        showNotification(t('link_copied') || 'Link kopiert!', 3000);
    } catch {
        // Letzter Fallback: prompt
        window.prompt(t('link_copied') || 'Link kopiert!', url);
    }
}

export function initMapLogic() {
    State.markerLayer = L.layerGroup();
    State.boundaryLayer = L.layerGroup();
    State.rangeLayerGroup = L.layerGroup();
    State.distanceLayerGroup = L.layerGroup(); // blaue Linie + Label

    // NEU: Wir initialisieren einen Cache für die Marker-Verwaltung.
    // Speichert: ID -> { marker: LeafletMarker, type: String, mode: String }
    State.markerCache = new Map();

    // Tooltip-State (global, weil Tooltips über viele Marker hinweg koordiniert werden müssen)
    // - openTooltipMarker: Referenz auf den Marker, dessen Tooltip gerade sichtbar ist.
    //   Damit erzwingen wir: "max. 1 Tooltip gleichzeitig".
    //   Öffnet ein neuer Tooltip, schließen wir den alten sofort.
    State.openTooltipMarker = null;


    // 1) Startposition bestimmen: Permalink-Hash > localStorage > Config-Default
    let startCenter = Config.defaultCenter;
    let startZoom = Config.defaultZoom;
    let startLayer = 'voyager';

    // 1a) Permalink-Hash hat höchste Priorität
    const permalink = parsePermalinkHash();
    if (permalink) {
        startCenter = [permalink.lat, permalink.lon];
        startZoom = permalink.zoom;
        if (permalink.layer && Config.layers[permalink.layer]) {
            startLayer = permalink.layer;
        }
        console.log('[Permalink] Starte mit Hash-Position:', permalink);
    } else {
        // 1b) Fallback: letzte Position aus localStorage
        try {
            const savedView = localStorage.getItem('ofm_last_view');
            if (savedView) {
                const parsed = JSON.parse(savedView);
                if (Array.isArray(parsed.center) && parsed.center.length === 2 &&
                    typeof parsed.center[0] === 'number' && typeof parsed.center[1] === 'number' &&
                    typeof parsed.zoom === 'number') {
                    startCenter = parsed.center;
                    startZoom = parsed.zoom;
                }
            }
        } catch (e) {
            console.warn('Fehler beim Laden der letzten Position:', e);
        }
    }

    State.map = L.map('map', {
        zoomControl: false,
        preferCanvas: true, // <--- WICHTIG: Beschleunigt das Rendering massiv
        center: startCenter,
        zoom: startZoom
    });

    State.boundaryLayer.addTo(State.map);
    State.rangeLayerGroup.addTo(State.map);
    State.distanceLayerGroup.addTo(State.map);
    State.markerLayer.addTo(State.map);

    setBaseLayer(startLayer);

    let debounceTimer;
    let isFirstLoad = true; // NEU: Flag für Sofort-Start
    // Merkt sich, für welchen "Daten-Modus" + Karten-Ausschnitt wir zuletzt geladen haben.
    // Damit vermeiden wir unnötige Requests beim minimalen Verschieben oder bei Zoom-Änderungen,
    // die am Ladeumfang nichts ändern.
    let lastRenderBucket = null;
    let lastFetchKey = null;


    // Debug/Tracing (aktivieren mit: localStorage.setItem('OFM_DEBUG','1') + Reload)
    const DEBUG = localStorage.getItem('OFM_DEBUG') === '1';
    const dbg = (...args) => { if (DEBUG) console.debug('[OFM]', ...args); };

    if (DEBUG) {
        // Overlay für schnelle Sichtbarkeit
        const el = document.createElement('div');
        el.id = 'ofm-debug';
        el.style.cssText = 'position:fixed;bottom:10px;left:10px;z-index:9999;background:rgba(0,0,0,0.7);color:#fff;padding:8px 10px;border-radius:8px;font:12px/1.3 monospace;max-width:40vw;pointer-events:none;';
        el.textContent = 'OFM_DEBUG=1';
        document.body.appendChild(el);

        const set = (s) => { const e = document.getElementById('ofm-debug'); if (e) e.textContent = s; };
        window.addEventListener('ofm:overpass', (ev) => {
            const d = ev.detail || {};
            const z = State.map?.getZoom?.() ?? '?';
            const m = State.queryMeta ? ` pad=${State.queryMeta.padMeters}m snap=${State.queryMeta.snapMeters}m` : '';
            const line = `${d.phase || 'evt'} z=${z}${m} ${d.endpoint ? ('ep=' + d.endpoint.replace('https://', '')) : ''} ${d.ms ? (d.ms + 'ms') : ''} ${d.status ? ('HTTP ' + d.status) : ''}`;
            set(line);
        });

        State.map?.on?.('zoomstart movestart', () => {
            const z = State.map.getZoom();
            set(`move/zoom… z=${z}`);
        });
    }


    // Ab wann wird was geladen? Muss 1:1 zur Logik in api.js passen.
    // - < 12: gar nichts
    // - 12-14: nur Feuerwachen (Stations)
    // - >= 15: alles (Stations + Hydranten/AED/Wasserstellen)
    const getLoadMode = (zoom) => {
        if (zoom < 12) return 'none';
        if (zoom < 15) return 'stations';
        return 'all';
    };

    // Zoom-Buckets: wir rendern nur neu, wenn sich der Bucket ändert.
    // Das nimmt beim Zoomen massiv Druck von CPU/DOM.
    const getZoomBucket = (zoom) => {
        if (zoom < 12) return 'z<12';
        if (zoom < 15) return 'z12-14';
        if (zoom < 17) return 'z15-16';
        if (zoom < 18) return 'z17';
        return 'z18+';
    };

    // Hilfsfunktion: Bounding Box des aktuellen Viewports als stabiler String.
    // Wir runden bewusst,
    // Liefert eine (gepufferte + gesnappte) BBox-Key-String-Repräsentation.
    // Idee:
    // - Wir fragen bewusst GRÖSSER ab als der sichtbare Kartenausschnitt (Padding in Metern).
    //   So führt ein leichtes Verschieben nicht sofort zu einem neuen Overpass-Request.
    // - Zusätzlich "snappen" wir die Abfrage-BBox auf ein grobes Grid (ebenfalls in Metern),
    //   damit minimale Bewegungen/Pixel-Rauschen nicht ständig einen neuen Key erzeugen.
    const getRoundedBBox = () => {
        const rawZoom = State.map.getZoom();
        const center = State.map.getCenter();

        // CACHE-FIX 2.0:
        // Damit Cache-Keys über Zoom-Stufen hinweg (15 <-> 18) identisch bleiben,
        // dürfen wir NICHT die ViewBox nehmen (die wird beim Zoomen kleiner).
        // Wir nehmen den Center und einen fixen Radius, der dem "Reference Zoom" entspricht.

        let radiusMeters;
        let snapMeters;

        // Bucket: High Zoom (Hydranten) -> Wir simulieren immer ein Z15-Fenster
        if (rawZoom >= 15) {
            radiusMeters = 2500; // ca. 5km Box (etwas größer für mehr Overlap)
            snapMeters = 1000;   // 1km-Raster: stabil über Zoom-Animationen hinweg (400m war zu fein)
        }
        // Bucket: Mid Zoom (Feuerwachen) -> Wir simulieren ein Z12-Fenster
        else if (rawZoom >= 12) {
            radiusMeters = 15000; // Riesige Box
            snapMeters = 1000;
        }
        // Fallback (eigentlich 'none')
        else {
            radiusMeters = 50000;
            snapMeters = 5000;
        }

        // Umrechnung Meter -> Grad
        const lat = center.lat;
        const metersPerDegLat = 111320;
        const metersPerDegLon = 111320 * Math.cos(lat * Math.PI / 180);

        const dLat = radiusMeters / metersPerDegLat;
        const dLon = radiusMeters / metersPerDegLon;

        // BBox um den Center
        let south = center.lat - dLat;
        let north = center.lat + dLat;
        let west = center.lng - dLon;
        let east = center.lng + dLon;

        // Snap to Grid
        const snapLat = snapMeters / metersPerDegLat;
        const snapLon = snapMeters / metersPerDegLon;
        const snap = (v, step) => Math.round(v / step) * step;

        south = snap(south, snapLat);
        north = snap(north, snapLat);
        west = snap(west, snapLon);
        east = snap(east, snapLon);

        // Für api.js
        State.queryBounds = L.latLngBounds([[south, west], [north, east]]);
        const bboxStr = `${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}`;
        State.queryMeta = {
            zoom: rawZoom,
            bbox: bboxStr,
            snapMeters // Info
        };

        // Cache Key
        return bboxStr;
    };


    State.map.on('moveend zoomend', () => {
        // Permalink-Hash aktualisieren
        updatePermalink();

        // 0) BayernAtlas: Buttons ein-/ausblenden anhand der Bounding Box
        const center = State.map.getCenter();
        const bavariaBounds = L.latLngBounds([47.27, 8.97], [50.56, 13.84]);
        const btnBayern = document.getElementById('btn-bayern');
        const btnBayernDop = document.getElementById('btn-bayern_dop');

        if (bavariaBounds.contains(center)) {
            if (btnBayern) btnBayern.style.display = '';
            if (btnBayernDop) btnBayernDop.style.display = '';
        } else {
            if (btnBayern) btnBayern.style.display = 'none';
            if (btnBayernDop) btnBayernDop.style.display = 'none';
            
            // Wenn man Bayern verlässt, aber der Layer noch aktiv ist -> Fallback
            if (State.activeLayerKey === 'bayern' || State.activeLayerKey === 'bayern_dop') {
                setBaseLayer('voyager');
            }
        }

        const zoom = State.map.getZoom();

        // 0) Blaue Linie auf Zoom < 17 verbergen, sonst neu rendern falls Ziel aktiv
        if (zoom < 17) {
            if (State.distanceLayerGroup) State.distanceLayerGroup.clearLayers();
        } else if (State.distanceTarget && State.userMarker) {
            drawBlueLine(State.distanceTarget.lat, State.distanceTarget.lon, true);
        }

        // 1) Re-Rendering aus Cache, aber nur bei Bucket-Wechsel.
        // Beim Zoomen (vor allem raus) wollen wir sofort reagieren, aber nicht bei jedem moveend alles neu bauen.
        const bucket = getZoomBucket(zoom);
        if (State.cachedElements && bucket !== lastRenderBucket) {
            lastRenderBucket = bucket;
            renderMarkers(State.cachedElements, zoom);
        }

        // Tooltips gibt es nur ab Zoom 18. Bei Zoom-Out: offenen Tooltip sofort schließen.
        if (zoom < 18 && State.openTooltipMarker) {
            try { State.openTooltipMarker.closeTooltip(); } catch { /* ignore */ }
            State.openTooltipMarker = null;
        }

        // 2) Daten-Loading nur, wenn es auch Sinn ergibt
        const mode = getLoadMode(zoom);
        if (mode === 'none') {
            // Unter Zoom 12 laden wir gar nichts. api.js räumt zusätzlich auf.
            // Wichtig: UI nicht im "Warten"-Status hängen lassen.
            const statusEl = document.getElementById('data-status');
            if (statusEl) {
                statusEl.innerText = t('status_standby');
                statusEl.className = 'text-green-400';
            }
            State.markerLayer.clearLayers();
            State.boundaryLayer.clearLayers();
            return;
        }

        // 3) Request-Gating: nur neu laden, wenn sich Mode oder Viewport sinnvoll geändert hat
        const bboxKey = getRoundedBBox();
        dbg('gate', { zoom, mode, bboxKey, queryMeta: State.queryMeta });
        const boundaryFlag = (zoom >= 14) ? 'b1' : 'b0';
        const fetchKey = `${mode}|${boundaryFlag}|${bboxKey}`;

        if (debounceTimer) clearTimeout(debounceTimer);

        // Debounce je nach Zoom (Hydranten-Modus braucht mehr Ruhe, sonst hagelt es 429).
        // OPTIMIERUNG: Niedrige Werte für schnelleren Initial-Load.
        const debounceMs =
            (zoom <= 15) ? 200 :  // Schneller Start für Stations/Low-Zoom
                (zoom === 16) ? 300 :
                    (zoom === 17) ? 250 :
                        200;

        // 4) Sofort-Start beim ersten Mal (KEIN Debounce)
        if (isFirstLoad) {
            isFirstLoad = false;
            if (debounceTimer) clearTimeout(debounceTimer);

            // Sofort ausführen
            doFetch();
            return;
        }

        debounceTimer = setTimeout(doFetch, debounceMs);

        async function doFetch() {
            const statusEl = document.getElementById('data-status');

            // Wenn sich seit dem letzten gestarteten Fetch nichts geändert hat: skip.
            // WICHTIG: Diese Guard verhindert bereits doppelte Netzwerkanfragen für denselben
            // Bereich. Eine zusätzliche minIntervalMs-Sperre ist redundant und verhindert
            // beim schnellen Hin- und Hernavigieren das sofortige Anzeigen von Cache-Daten.
            if (fetchKey === lastFetchKey) {
                if (statusEl) {
                    statusEl.innerText = t('status_current');
                    statusEl.className = 'text-green-400';
                }
                return;
            }

            // Status "Warten" setzen
            if (statusEl) {
                statusEl.innerText = t('status_waiting');
                statusEl.className = 'text-amber-400 font-bold';
            }

            lastFetchKey = fetchKey;
            dbg('fetchOSMData()', { fetchKey });
            window.dispatchEvent(new CustomEvent('ofm:overpass', { detail: { phase: 'trigger', fetchKey } }));

            try {
                // Status auf "Lädt" setzen (SWR Pattern: wir zeigen Cache, laden aber neu)
                if (statusEl) {
                    statusEl.innerText = t('status_loading');
                    statusEl.className = 'text-blue-400';
                }

                // Detaillierte Lade-Info anzeigen (wird bei Cache-Hit überschrieben)
                showNotification(t('loading_data'), 30000);

                // Track if we rendered cached data
                let cachedCount = 0;

                // SWR: Wir geben renderMarkers als Callback mit, 
                // damit Cache-Daten sofort gezeichnet werden.
                const data = await fetchOSMData((cachedData) => {
                    cachedCount = cachedData?.length || 0;
                    if (cachedCount > 0) {
                        // Cache-Hit: Zeige Daten + Hinweis auf Aktualisierung
                        showNotification(`${cachedCount} ${t('cached_objects')} – ${t('refreshing')}`, 30000);
                    }
                    renderMarkers(cachedData, zoom);
                });

                if (data) {
                    // Nur erneut rendern, wenn sich die Datenmenge geändert hat
                    const networkCount = data.length || 0;
                    if (networkCount !== cachedCount) {
                        renderMarkers(data, zoom);
                    }

                    if (statusEl) {
                        statusEl.innerText = t('status_current');
                        statusEl.className = 'text-green-400';
                    }

                    // Erfolgs-Nachricht: Cache-Info erhalten, wenn Cache aktuell war
                    if (cachedCount > 0 && networkCount === cachedCount) {
                        // Cache war aktuell - zeige das deutlich
                        showNotification(`${t('from_cache')} (${cachedCount} ${t('objects')})`, 3000);
                    } else if (cachedCount > 0) {
                        // Cache + Aktualisierung
                        showNotification(`${t('data_updated')} (${cachedCount} → ${networkCount})`, 2500);
                    } else {
                        // Frische Daten
                        showNotification(`${t('data_complete')} (${networkCount} ${t('objects')})`, 2000);
                    }
                } else if (data === null) {
                    // Kein Fehler, aber leere Query (z.B. Zoom zu klein)
                    if (statusEl) {
                        statusEl.innerText = t('status_waiting');
                        statusEl.className = 'text-amber-400 font-bold';
                    }
                }
            } catch (err) {
                if (err?.name === 'AbortError') {
                    // Nichts tun, neue Anfrage läuft schon
                    return;
                }

                // Fehlerbehandlung
                if (statusEl) {
                    const msgKey = (err?.status === 429) ? 'err_ratelimit' :
                        (err?.status >= 500) ? 'err_server' : 'status_error';
                    statusEl.innerText = t(msgKey);
                    statusEl.className = 'text-red-500 font-bold';
                }
            }
        } // end doFetch
    });

    State.map.on('click', () => {
        if (!State.selection.active) {
            State.rangeLayerGroup.clearLayers();
            clearDistanceLine();
        }
    });

    State.map.on('zoom', () => {
        const el = document.getElementById('zoom-val');
        if (el) el.innerText = State.map.getZoom().toFixed(1);
    });

    // Initial load: 
    // Wir feuern 'moveend' SOFORT, damit Daten ohne Verzögerung geladen werden.
    State.map.fire('moveend');
}

export function setBaseLayer(key) {
    State.activeLayerKey = key;
    State.map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) State.map.removeLayer(layer);
    });
    const conf = Config.layers[key];
    const options = { attribution: conf.attr, maxZoom: conf.maxZoom };
    if (conf.subdomains) options.subdomains = conf.subdomains;
    if (conf.maxNativeZoom) options.maxNativeZoom = conf.maxNativeZoom;

    L.tileLayer(conf.url, options).addTo(State.map);

    document.querySelectorAll('.layer-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`btn-${key}`);
    if (btn) btn.classList.add('active');

    // Boundaries aktualisieren (Farbe je nach Hintergrund)
    // Gelb für Satellit, Dunkelgrau für alles andere
    const isSat = (key === 'satellite');
    const boundsColor = isSat ? Config.colors.boundsSatellite : Config.colors.bounds;
    const boundsWeight = isSat ? 3 : 1;

    State.boundaryLayer.eachLayer(layer => {
        if (layer instanceof L.Polyline) {
            layer.setStyle({ color: boundsColor, weight: boundsWeight });
        }
    });

    // Permalink aktualisieren (Layer hat sich geändert)
    updatePermalink();
}

// Hilfsfunktion für SVGs (jetzt mit Farben aus Config und expliziter Pixelgröße für Android)
function getSVGContent(type, pixelSize = 28, clusterCount = 2) {
    // Farben holen
    const c = Config.colors;

    // 1. Defibrillator
    if (type === 'defibrillator') {
        return `<svg width="${pixelSize}px" height="${pixelSize}px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${c.defib}" stroke="white" stroke-width="5"/>
            <path d="M50 80 C10 40 10 10 50 35 C90 10 90 40 50 80 Z" fill="white"/>
            <path d="M55 45 L45 55 L55 55 L45 65" stroke="${c.defib}" stroke-width="3" fill="none"/>
        </svg>`;
    }

    // Entscheidung: Blau oder Rot?
    const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
    const color = isWater ? c.water : c.hydrant;

    // 2. Wandhydrant
    if (type === 'wall') {
        return `<svg width="${pixelSize}px" height="${pixelSize}px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>
            <circle cx="42" cy="52" r="18" fill="none" stroke="white" stroke-width="6" />
            <line x1="64" y1="34" x2="64" y2="70" stroke="white" stroke-width="6" stroke-linecap="round" />
        </svg>`;
    }

    // Buchstabe ermitteln
    let char;
    switch (type) {
        case 'underground': char = 'U'; break;
        case 'wsh': char = 'W'; break;
        case 'pillar': char = 'O'; break;
        case 'pipe': char = 'I'; break;
        case 'dry_barrel': char = 'Ø'; break;
        default: char = '';
    }

    // 3. Wache
    if (type === 'station') return `<svg width="${pixelSize}px" height="${pixelSize}px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 L50 5 L90 40 L90 90 L10 90 Z" fill="${c.station}" stroke="white" stroke-width="4"/><rect x="30" y="55" width="40" height="35" rx="2" fill="white" opacity="0.9"/></svg>`;

    // 4. Cluster Badge (NEU)
    if (type === 'cluster_badge') {
        return `<svg width="${pixelSize}px" height="${pixelSize}px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>
            <text x="50" y="70" font-family="Arial" font-weight="bold" font-size="52" text-anchor="middle" fill="white">${clusterCount}</text>
        </svg>`;
    }

    // 5. Standard
    const innerRing = type === 'wsh' ? `<circle cx="50" cy="50" r="36" fill="none" stroke="white" stroke-dasharray="6 4" stroke-width="4"/>` : '';
    return `<svg width="${pixelSize}px" height="${pixelSize}px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${innerRing}${char ? `<text x="50" y="72" font-family="Arial" font-weight="bold" font-size="50" text-anchor="middle" fill="white">${char}</text>` : ''}</svg>`;
}


/**
 * ==========================================================================================
 * INTELLIGENTES CLUSTERING (NUR FEUERWACHEN)
 * ==========================================================================================
 * Ziel:
 * - Mehrere OSM-Objekte, die faktisch dasselbe Feuerwehrhaus beschreiben (z.B. Node + Way),
 *   sollen innerhalb eines Radius von 150 m zu EINEM Marker zusammengefasst werden.
 * - Strikt nur für amenity=fire_station.
 * - Hydranten, Löschwasser-Objekte, Sirenen, Defis etc. bleiben komplett unberührt.
 *
 * Umsetzung:
 * - Pre-Processing der Overpass-Elemente VOR dem Rendering.
 * - Basis-Objekt ("Master") ist das Element mit den meisten Tags (höchste Detailtiefe).
 * - Fehlende Tags werden vom Kandidaten in den Master kopiert.
 * - Position wird auf den geometrischen Mittelpunkt des Clusters gesetzt.
 *
 * Hinweis zur Laufzeit:
 * - Kommentare kosten keine CPU.
 * - Der Cluster-Loop läuft nur über Feuerwehrwachen (typisch: wenige Dutzend) und ist damit
 *   in der Praxis günstig.
 */

function isFireStation(element) {
    /**
     * Fire-Station-Erkennung (nur für das Clustering).
     *
     * Praxis-Problem: In OSM werden Wachen nicht immer sauber als *ein* Objekt mit
     * amenity=fire_station gemappt. Häufig gibt es:
     * - amenity=fire_station (klassisch, oft Node/Way/Relation)
     * - building=fire_station (einzelne Gebäude auf dem Gelände)
     *
     * Damit wir bei Standorten wie „FW Nürnberg Süd“ nicht 10 Haus-Icons bekommen,
     * behandeln wir beides als „Fire Station“ für das Clustering.
     *
     * WICHTIG: Hydranten, Löschwasserstellen, Sirenen, Defis etc. bleiben außen vor,
     * weil wir hier weiterhin NUR auf diese Fire-Station-Tags matchen.
     */
    if (!element || !element.tags) return false;
    const t = element.tags;
    return (t.amenity === 'fire_station' || t.building === 'fire_station');
}

function getElementLatLon(el) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    return { lat, lon };
}

/**
 * Haversine-Distanz in Metern.
 * Genau genug für 150 m Cluster-Radius.
 */
function distanceMeters(a, b) {
    const R = 6371000; // Meter
    const toRad = (deg) => deg * Math.PI / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);

    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const sin1 = Math.sin(dLat / 2);
    const sin2 = Math.sin(dLon / 2);

    const h = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function countTags(tags) {
    if (!tags) return 0;
    // Nur eigene Keys zählen, keine Prototyp-Spielereien.
    return Object.keys(tags).length;
}

/**
 * Clustert Fire-Station-Elemente innerhalb von 150 m.
 * Gibt eine neue Element-Liste zurück: clusteredFireStations + others
 */
function clusterFireStations(rawElements, radiusMeters = 150) {
    if (!Array.isArray(rawElements) || rawElements.length === 0) return rawElements;

    // Schritt A: Trennen
    const fireStations = [];
    const others = [];

    for (const el of rawElements) {
        if (isFireStation(el)) fireStations.push(el);
        else others.push(el);
    }

    // Keine Wachen? Dann nix zu tun.
    if (fireStations.length < 2) return rawElements;

    // Schritt B: Sortierung nach "Qualität" (Anzahl Tags), absteigend.
    fireStations.sort((a, b) => countTags(b.tags) - countTags(a.tags));

    // Schritt C: Clustering
    const processed = new Set();
    const clustered = [];

    for (const master of fireStations) {
        if (!master || processed.has(master.id)) continue;

        const masterPos = getElementLatLon(master);
        if (!masterPos) {
            // Wenn wir keine Koordinate haben, können wir nicht sinnvoll clustern.
            clustered.push(master);
            processed.add(master.id);
            continue;
        }

        // Aggregation für sauberen Mittelpunkt bei mehreren Kandidaten
        let sumLat = masterPos.lat;
        let sumLon = masterPos.lon;
        let count = 1;

        // Master bekommt garantiert ein tags-Objekt
        master.tags = master.tags || {};

        // Kandidaten durchsuchen (nur die übrigen Wachen)
        for (const cand of fireStations) {
            if (!cand || cand.id === master.id || processed.has(cand.id)) continue;

            const candPos = getElementLatLon(cand);
            if (!candPos) continue;

            if (distanceMeters(masterPos, candPos) < radiusMeters) {
                // Kandidat gehört zum Cluster -> wird nicht als eigener Marker gerendert
                processed.add(cand.id);

                // Merge: Fehlende Tags in den Master kopieren
                if (cand.tags) {
                    for (const [k, v] of Object.entries(cand.tags)) {
                        // Nur "fehlend" ergänzen. Leere Strings zählen als fehlend.
                        if (master.tags[k] === undefined || master.tags[k] === '') {
                            master.tags[k] = v;
                        }
                    }
                }

                // Mittelpunkt updaten (inkrementell)
                sumLat += candPos.lat;
                sumLon += candPos.lon;
                count += 1;
            }
        }

        // Master-Position auf Cluster-Mittelpunkt setzen
        const newLat = sumLat / count;
        const newLon = sumLon / count;

        // Wichtig: Wir setzen lat/lon direkt, damit der bestehende Render-Code
        // (el.lat || el.center?.lat) einfach funktioniert.
        master.lat = newLat;
        master.lon = newLon;

        // Falls es ein center-Objekt gibt (z.B. Way/Relation), ziehen wir es nach.
        if (master.center && typeof master.center === 'object') {
            master.center.lat = newLat;
            master.center.lon = newLon;
        }

        // Master als verarbeitet markieren (Kandidaten sind es schon).
        processed.add(master.id);
        clustered.push(master);
    }

    // Schritt D: Zusammenfügen
    return clustered.concat(others);
}


/**
 * ==========================================================================================
 * POI CLUSTERING (Z17/Z18: Nahe Wasserstellen bündeln)
 * ==========================================================================================
 */
function clusterPOIs(rawElements, zoom, radiusMeters = 5) {
    if (zoom < 17 || zoom >= 19) return rawElements; // Nur auf Z17 und Z18 aktiv
    if (!Array.isArray(rawElements) || rawElements.length === 0) return rawElements;

    const pois = [];
    const others = [];

    for (const el of rawElements) {
        if (isFireStation(el) || (el.tags && el.tags.emergency === 'defibrillator')) {
            others.push(el);
        } else {
            const pos = getElementLatLon(el);
            if (pos) pois.push(el);
            else others.push(el);
        }
    }

    if (pois.length < 2) return rawElements;

    const processed = new Set();
    const clustered = [];

    // Priorisiere Hydranten von links nach rechts / oben nach unten, um stabile Cluster-Zentren zu behalten
    pois.sort((a, b) => (a.id || 0) - (b.id || 0));

    for (const rawMaster of pois) {
        if (processed.has(rawMaster.id)) continue;

        const masterPos = getElementLatLon(rawMaster);
        let sumLat = masterPos.lat;
        let sumLon = masterPos.lon;
        let memberCount = 1;
        const clusterMembers = [rawMaster];

        for (const cand of pois) {
            if (cand.id === rawMaster.id || processed.has(cand.id)) continue;

            const candPos = getElementLatLon(cand);
            if (distanceMeters(masterPos, candPos) < radiusMeters) {
                processed.add(cand.id);
                clusterMembers.push(cand);
                sumLat += candPos.lat;
                sumLon += candPos.lon;
                memberCount++;
            }
        }

        if (memberCount > 1) {
            // Unabhängiges Cluster-Objekt erzeugen, damit wir rawElements NICHT kaputt mutieren
            // Das verhindert, dass die Geometrie in Z16 oder nach Reloads abdriftet
            const clusterMaster = {
                ...rawMaster,
                isHydrantCluster: true,
                clusterCount: memberCount,
                clusterMembers: clusterMembers,
                lat: sumLat / memberCount,
                lon: sumLon / memberCount
            };
            if (clusterMaster.center) {
                clusterMaster.center = { ...clusterMaster.center, lat: clusterMaster.lat, lon: clusterMaster.lon };
            }
            clustered.push(clusterMaster);
        } else {
            // Nur Einzelobjekt kopieren
            clustered.push({ ...rawMaster, isHydrantCluster: false, clusterCount: 1, clusterMembers: [] });
        }

        processed.add(rawMaster.id);
    }

    return clustered.concat(others);
}

function generateTooltip(tags, clusterMembers) {
    // Single POI Logic
    if (!clusterMembers || clusterMembers.length === 0) {
        const safeTags = tags || {};
        const tooltipTitle = escapeHtml(safeTags.name || t('details_hydrant'));
        let html = `<div class="p-2 min-w-[180px]"><div class="font-bold text-sm border-b border-white/20 pb-1 mb-1 text-blue-400">${tooltipTitle}</div>`;
        
        if (safeTags['fire_hydrant:style']?.toLowerCase() === 'wsh') {
            html += `<div class="text-[11px] text-orange-400 font-bold mb-2 pb-1 border-b border-white/10 italic">${escapeHtml(t('wsh_hint') || "Württembergischer Schachthydrant")}</div>`;
        }

        html += `<div class="text-[10px] font-mono grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">`;
        for (const [key, val] of Object.entries(safeTags)) {
            html += `<div class="text-slate-400 text-right">${escapeHtml(key)}:</div><div class="text-slate-200 break-words">${escapeHtml(val)}</div>`;
        }
        return html + `</div></div>`;
    }

    // Cluster Logic: Render alle enthaltenen Hydranten
    let html = `<div class="p-2 min-w-[200px]"><div class="font-bold text-sm border-b border-white/20 pb-1 mb-2 text-blue-400">${clusterMembers.length} ${t('cluster_info')}</div><div class="flex flex-col gap-3">`;

    clusterMembers.forEach((member, i) => {
        const safeTags = member.tags || {};
        const displayName = escapeHtml(safeTags.name || t('details_hydrant'));
        html += `<div class="text-[10px] bg-white/5 rounded p-1"><div class="font-bold text-slate-300 mb-1 border-b border-white/10 pb-0.5">${i + 1}. ${displayName}</div>`;
        
        if (safeTags['fire_hydrant:style']?.toLowerCase() === 'wsh') {
            html += `<div class="text-[11px] text-orange-400 font-bold mb-1 pb-1 border-b border-white/10 italic">${escapeHtml(t('wsh_hint') || "Württembergischer Schachthydrant")}</div>`;
        }
        
        html += `<div class="font-mono grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">`;
        for (const [key, val] of Object.entries(safeTags)) {
            html += `<div class="text-slate-400 text-right">${escapeHtml(key)}:</div><div class="text-slate-200 break-words">${escapeHtml(val)}</div>`;
        }
        html += `</div></div>`;
    });

    html += `</div></div>`;
    return html;
}


// Kreis-Funktion (jetzt mit Config-Farbe)
export function showRangeCircle(lat, lon) {
    State.rangeLayerGroup.clearLayers();
    const currentZoom = State.map.getZoom();

    if (currentZoom < 16) return;

    L.circle([lat, lon], {
        color: Config.colors.rangeCircle,
        fillColor: Config.colors.rangeCircle,
        fillOpacity: 0.15,
        radius: 100,
        weight: 2,
        dashArray: '5, 8',
        interactive: false
    }).addTo(State.rangeLayerGroup);

    // Bei < 17 nur den Kreis (Label wäre zu störend / würde überlappen)
    if (currentZoom >= 17) {
        // Berechne den genauen Punkt für das Label: 11 Uhr Position auf der Linie (Radius = 100m)
        // 11 Uhr bedeutet: -30° (oder 330°) Richtung Nord-West
        // dy (Nord) = 100m * cos(30°) ≈ 86.6m
        // dx (West) = 100m * sin(-30°) = -50m
        const latRad = lat * (Math.PI / 180);
        const mPerDegLat = 111320; // 1° Latitude = ~111.32 km überall
        const mPerDegLon = 111320 * Math.cos(latRad); // 1° Longitude = schrumpft je nach Breitengrad
        
        const latOffset = 86.6 / mPerDegLat;
        const lonOffset = -50 / mPerDegLon;

        // Marker für das Text-Label genau auf der Kreislinie bei 11 Uhr
        L.marker([lat + latOffset, lon + lonOffset], { opacity: 0, interactive: false })
            .addTo(State.rangeLayerGroup)
            .bindTooltip('100 m', {
                permanent: true,
                direction: 'center',
                className: 'range-label',
                offset: [0, 0]
            })
            .openTooltip();
    }
}

// ============================================================================
// BLAUE DISTANZ-LINIE
// ============================================================================

export function clearDistanceLine() {
    if (State.distanceLayerGroup) {
        State.distanceLayerGroup.clearLayers();
    }
    State.distanceTarget = null;
}

export function drawBlueLine(targetLat, targetLon, isRedraw = false) {
    if (!State.userMarker) {
        clearDistanceLine();
        return;
    }
    const zoom = State.map.getZoom();

    // Position immer speichern, auch wenn wir sie gerade wegen Zoom nicht rendern
    if (!isRedraw) {
        State.distanceTarget = { lat: targetLat, lon: targetLon };
    }

    if (zoom < 17) {
        if (State.distanceLayerGroup) State.distanceLayerGroup.clearLayers();
        return;
    }

    const { lat: startLat, lng: startLon } = State.userMarker.getLatLng();

    // Wenn der Nutzer-Marker nicht im sichtbaren Bereich der Karte liegt (z.B. weit weg gescrollt), Linie nicht zeichnen
    if (!State.map.getBounds().contains([startLat, startLon])) {
        if (State.distanceLayerGroup) State.distanceLayerGroup.clearLayers();
        return;
    }

    if (State.distanceLayerGroup) {
        State.distanceLayerGroup.clearLayers();
    }

    const dist = Math.round(distanceMeters({ lat: startLat, lon: startLon }, { lat: targetLat, lon: targetLon }));

    // Linie zeichnen
    L.polyline([[startLat, startLon], [targetLat, targetLon]], {
        color: '#3b82f6', // tailwind blue-500
        weight: 3,
        dashArray: '5, 8',
        interactive: false
    }).addTo(State.distanceLayerGroup);

    // Label zeichnen (Text mit Shadow statt weißer Box, leicht verschoben)
    const midLat = (startLat + targetLat) / 2;
    const midLon = (startLon + targetLon) / 2;

    const labelIcon = L.divIcon({
        className: 'distance-label-icon',
        html: `<div style="padding: 2px 6px; font-size: 13px; font-weight: 800; color: #3b82f6; white-space: nowrap; transform: translate(-50%, -120%); text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; pointer-events: none;">${dist} m</div>`,
        iconSize: [0, 0]
    });

    L.marker([midLat, midLon], { icon: labelIcon, interactive: false }).addTo(State.distanceLayerGroup);
}

export function drawLineToNearest() {
    if (!State.userMarker) return;

    let closest = null;
    let minDist = Infinity;
    const { lat: startLat, lng: startLon } = State.userMarker.getLatLng();

    for (const data of State.markerCache.values()) {
        // Only consider markers that are currently rendered and not stations/defibs
        if (data.marker && !data.isStation && !data.isDefib) {
            const markerLatLng = data.marker.getLatLng();
            const dist = distanceMeters({ lat: startLat, lon: startLon }, { lat: markerLatLng.lat, lon: markerLatLng.lng });
            if (dist < minDist) {
                minDist = dist;
                closest = { lat: markerLatLng.lat, lon: markerLatLng.lng };
            }
        }
    }

    if (closest) {
        drawBlueLine(closest.lat, closest.lon);
    }
}
/**
 * Rendert die Marker basierend auf den übergebenen Daten (elements).
 * OPTIMIERUNG: Nutzt "Diffing", um Flackern zu verhindern.
 * Es werden nur Marker entfernt/hinzugefügt, die sich tatsächlich geändert haben.
 */
export function renderMarkers(elements, zoom) {
    // ------------------------------------------------------------
    // Pre-Processing: intelligentes Clustering NUR für Feuerwehrwachen
    // ------------------------------------------------------------
    // Wir clustern hier bewusst VOR dem Rendering, damit:
    // - alle nachfolgenden Logiken (Zoom-Filter, Diffing, Tooltip, etc.) unverändert bleiben
    // - nur amenity=fire_station betroffen ist
    // - Hydranten/Defis/Wasserstellen/Sirenen etc. exakt so bleiben, wie sie aus Overpass kommen
    const preprocessedElements = clusterFireStations(elements, 150);

    // POI-Clustering: Hydranten/Wasserstellen < 5m auf Z17/Z18 bündeln
    const displayElements = clusterPOIs(preprocessedElements, zoom, 5);

    // Grenzen (Boundaries) werden weiterhin komplett neu gezeichnet, 
    // da es meist nur wenige sind und sich die Geometrie bei Zoom ändern kann.
    State.boundaryLayer.clearLayers();

    // 1. Vorbereitung: Welche Marker sollen aktuell angezeigt werden?
    // Wir sammeln hier nur die Daten, wir zeichnen noch nicht.
    const markersToKeep = new Set();
    const renderedLocations = []; // Für die Duplikat-Prüfung (z.B. bei Wachen)

    displayElements.forEach(el => {
        const tags = el.tags || {};
        const id = `${el.type || 'node'}:${el.id}`; // Stabiler Key: type:id (node/way/relation können gleiche id haben)

        // --- A. Grenzen verarbeiten (wie bisher) ---
        if (tags.boundary === 'administrative' && el.geometry && zoom >= 14) {
            const latlngs = el.geometry.map(p => [p.lat, p.lon]);
            // Farbe & Dicke wählen: Wenn Satellit, dann Gelb und dicker
            const isSat = (State.activeLayerKey === 'satellite');
            const bColor = isSat ? Config.colors.boundsSatellite : Config.colors.bounds;
            const bWeight = isSat ? 3 : 1;

            L.polyline(latlngs, {
                color: bColor,
                weight: bWeight,
                dashArray: '10, 10',
                opacity: 0.7
            }).addTo(State.boundaryLayer);
            return;
        }

        // --- B. Datenvalidierung ---
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        if (!lat || !lon) return;

        // --- C. Typ-Bestimmung ---
        const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
        const isDefib = tags.emergency === 'defibrillator';
        // Fallback für Typen
        let type = isStation ? 'station' : (isDefib ? 'defibrillator' : (tags['fire_hydrant:type'] || tags.emergency));
        if (type === 'underground' && tags['fire_hydrant:style']?.toLowerCase() === 'wsh') {
            type = 'wsh';
        }

        // --- D. Zoom-Filter (Sichtbarkeit) ---
        // Stationen ab Zoom 12, Hydranten/Defis ab Zoom 15
        if (isStation && zoom < 12) return;
        if (!isStation && !isDefib && zoom < 15) return;
        if (isDefib && zoom < 15) return;

        // --- E. Duplikat-Check für Stationen (Räumliche Nähe) ---
        const alreadyDrawn = renderedLocations.some(loc => Math.abs(loc.lat - lat) < 0.0001 && Math.abs(loc.lon - lon) < 0.0001);
        if (isStation && alreadyDrawn) return;
        if (isStation) renderedLocations.push({ lat, lon });

        // --- F. Darstellungs-Modus bestimmen ---
        // Wir müssen wissen, ob der Marker als "Punkt" oder als "SVG-Icon" dargestellt werden soll.
        // Das ändert sich je nach Zoomstufe.
        let mode;
        if (isStation) {
            mode = (zoom < 14) ? 'dot' : 'svg';
        } else if (isDefib) {
            mode = (zoom < 17) ? 'dot' : 'svg';
        } else {
            // Hydranten etc.
            mode = (zoom < 17) ? 'dot' : 'svg';
        }

        // Wir merken uns, dass diese ID in diesem Durchlauf gültig ist
        markersToKeep.add(id);

        // WICHTIGER FIX: Wenn dieses Element ein Master-Cluster ist, 
        // müssen wir AUCH die IDs aller Kandidaten-Mitglieder in markersToKeep eintragen.
        // Andernfalls löscht der Garbage-Collector nachher die gecachten Dot-Marker der
        // Kandidaten, was beim Rauszoomen zu massivem Flackern und Fehl-Rendern führt, 
        // weil die Map denkt, sie seien gelöscht worden.
        if (el.isHydrantCluster && el.clusterMembers) {
            el.clusterMembers.forEach(member => {
                const memberId = `${member.type || 'node'}:${member.id}`;
                markersToKeep.add(memberId);

                // Wir müssen auch sicherstellen, dass die Kandidaten-Einträge im Cache
                // gelöscht werden, damit sie optisch verschwinden und Platz für das Badge machen.
                // Nur der Master darf "überleben" und gezeichnet werden.
                if (memberId !== id && State.markerCache.has(memberId)) {
                    const cachedCand = State.markerCache.get(memberId);
                    State.markerLayer.removeLayer(cachedCand.marker);
                    State.markerCache.delete(memberId);
                }
            });
        }

        // --- G. DIFFING LOGIK (Das Herzstück) ---

        // Prüfen, ob wir den Marker schon haben
        const cached = State.markerCache.get(id);

        // Fall 1: Marker existiert UND Modus (Dot vs SVG) ist gleich geblieben, sowie Cluster-Status ist identisch
        if (cached &&
            cached.mode === mode &&
            cached.isHydrantCluster === el.isHydrantCluster &&
            cached.clusterCount === el.clusterCount) {
            // Nichts tun! Der Marker bleibt einfach auf der Karte.
            // Das verhindert das Flackern und spart Rechenleistung.
            return;
        }

        // Fall 2: Marker existiert, aber Modus oder Cluster-Status hat sich geändert
        if (cached && (cached.mode !== mode || cached.isHydrantCluster !== el.isHydrantCluster || cached.clusterCount !== el.clusterCount)) {
            // Alten Marker entfernen, da er neu gezeichnet werden muss
            State.markerLayer.removeLayer(cached.marker);
            State.markerCache.delete(id);
        }

        // Fall 3: Marker ist neu (oder wurde gerade in Fall 2 gelöscht) -> Neu erstellen
        createAndAddMarker(id, lat, lon, type, tags, mode, zoom, isStation, isDefib, el.isHydrantCluster, el.clusterCount, el.clusterMembers);
    });

    // --- H. AUFRÄUMEN (Garbage Collection) ---
    // Wir entfernen alle Marker von der Karte, die im aktuellen Datensatz NICHT mehr vorkommen.
    for (const [id, entry] of State.markerCache) {
        if (!markersToKeep.has(id)) {
            State.markerLayer.removeLayer(entry.marker);
            State.markerCache.delete(id);
        }
    }
}

/**
 * Hilfsfunktion zum Erstellen eines einzelnen Markers.
 * Ausgelagert für bessere Lesbarkeit.
 */
function createAndAddMarker(id, lat, lon, type, tags, mode, zoom, isStation, isDefib, isHydrantCluster, clusterCount, clusterMembers) {
    let marker;
    let iconHtml;
    let className = '';
    let size = [28, 28];
    let zIndex;

    // 1. Icon Konfiguration basierend auf Modus
    if (mode === 'dot') {
        // Kleine Punkte für niedrige Zoomstufen
        if (isStation) {
            marker = L.marker([lat, lon], { icon: L.divIcon({ html: '<div class="station-square"></div>', iconSize: [10, 10] }) });
        } else if (isDefib) {
            marker = L.marker([lat, lon], { icon: L.divIcon({ className: 'defib-dot', iconSize: [10, 10] }) });
        } else {
            // Wasser/Hydranten Unterscheidung für Dots
            const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
            className = isWater ? 'tank-dot' : 'hydrant-dot';
            marker = L.marker([lat, lon], { icon: L.divIcon({ className, iconSize: [10, 10] }) });
        }
    } else {
        if (isStation) {
            size = [32, 32]; zIndex = 1000;
        } else if (isDefib) {
            size = [28, 28]; zIndex = 2000;
        } else {
            zIndex = 0;
            // Falls keines davon, bleibt size auf [28, 28] vom Standard oben
        }

        // Übersteuerung für Clustering
        const finalType = isHydrantCluster ? 'cluster_badge' : type;
        iconHtml = getSVGContent(finalType, size[0], clusterCount); // Explicit Pixel Size übergeben
        className = 'icon-container';

        marker = L.marker([lat, lon], {
            icon: L.divIcon({ className, html: iconHtml, iconSize: size }),
            zIndexOffset: zIndex
        });

        // Klick-Event für Hydranten-Radius
        if (!isStation && !isDefib) {
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                showRangeCircle(lat, lon);
            });
        }
    }

    // 2. Tooltip Logik (Smart Tooltips ab Zoom-Level 18)
    if (marker && className === 'icon-container') {
        // Tooltip-Inhalt einmalig binden; öffnen/schließen wir per Event-Logik

        /**
         * ----------------------------------------------------------------------------------
         * SMART-TOOLTIP-LOGIK
         * ----------------------------------------------------------------------------------
         * Anforderungen:
         * 1) Tooltip öffnet bei Mouseover (nicht bei Klick).
         *    Klick bleibt frei für andere Features (z.B. 100 m Radius um die Position).
         * 2) Tooltip bleibt offen, solange der User:
         *    - auf dem Marker ist ODER
         *    - mit der Maus im Tooltip selbst steht (Tooltip ist "interactive").
         * 3) Wenn der User raus geht, schließt der Tooltip nach 3 Sekunden.
         *    (kleiner Puffer, damit man den Tooltip bequem "anfahren" kann).
         * 4) Es darf immer nur ein Tooltip offen sein:
         *    Öffnet ein neuer Tooltip, schließen wir den vorherigen sofort.
         *
         * Performance-Hinweis:
         * Kommentare kosten keine Laufzeit. Die Event-Handler bleiben klein,
         * und wir binden Tooltip-DOM-Listener pro Tooltip-Container nur einmal.
         */

        marker.unbindTooltip();
        marker.bindTooltip(generateTooltip(tags, clusterMembers), {
            interactive: true,
            permanent: false,
            direction: 'top',
            opacity: 0.95
        });

        // Timer-Handle für das verzögerte Schließen (3 s).
        // Wir verwenden setTimeout statt "sofort schließen", weil das UX-mäßig
        // sonst nervt: Marker verlassen -> Tooltip wäre weg, bevor man ihn erreicht.
        let closeTimer = null;

        // Nur ein Tooltip gleichzeitig offen:
        // - Wenn bereits ein Tooltip offen ist (State.openTooltipMarker),
        //   schließen wir ihn, sobald ein anderer Marker seinen Tooltip öffnen will.
        // - Wenn der "neue" Marker identisch ist, tun wir nichts.
        const closeOtherOpenTooltip = (currentMarker) => {
            const openMarker = State.openTooltipMarker;
            if (!openMarker) return;
            if (openMarker === currentMarker) return;
            try { openMarker.closeTooltip(); } catch { /* ignore */ }
            State.openTooltipMarker = null;
        };

        // Alte Listener sicher entfernen, damit wir nichts stapeln
        marker.off('mouseover');
        marker.off('mouseout');
        marker.off('tooltipopen');
        marker.off('tooltipclose');
        // Leaflet hängt standardmäßig auch ein Click-Handler für Tooltips an (besonders relevant auf Touch-Geräten).
        // Das kollidiert bei uns mit "Click = 100 m Radius" und mit "Tooltip nur per Hover".
        // Daher: alle Click-Listener entfernen und unseren Radius-Click danach gezielt wieder anbinden.
        marker.off('click');

        // Klick bleibt ausschließlich für den 100 m Radius (Hydranten/Wasser etc.) und Distanz-Linie,
        // NICHT für Tooltips.
        if (!isStation && !isDefib) {
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                drawBlueLine(lat, lon); // Update Linie
                showRangeCircle(lat, lon);
            });
        }


        // Mouseover auf den Marker: Tooltip sofort öffnen (ab Zoom >= 18).
        // Wichtig: Das passiert unabhängig vom Klick-Handling (Radius etc.).
        marker.on('mouseover', function () {
            if (State.map.getZoom() < 18) return;

            if (closeTimer) {
                clearTimeout(closeTimer);
                closeTimer = null;
            }
            closeOtherOpenTooltip(this);
            this.openTooltip();
            State.openTooltipMarker = this;
        });

        // Mouseout vom Marker: Tooltip nicht sofort schließen,
        // sondern nach 3 s. Der Timer wird abgebrochen, wenn der User
        // in den Tooltip fährt (mouseenter auf Tooltip-DOM).
        marker.on('mouseout', function () {
            if (State.map.getZoom() < 18) return;

            closeTimer = setTimeout(() => {
                this.closeTooltip();
            }, 3000);
        });

        // Tooltip-DOM ist sichtbar:
        // - Hier greifen wir den Tooltip-Container ab, um 'mouseenter'/'mouseleave'
        //   direkt auf dem Tooltip zu hören (nicht nur auf dem Marker).
        // - So bleibt der Tooltip offen, während man ihn liest oder anklickt.
        // - Gleichzeitig erzwingen wir die "nur ein Tooltip offen"-Regel auch dann,
        //   wenn Leaflet den Tooltip aus anderen Gründen öffnet (Touch/Keyboard).
        marker.on('tooltipopen', function (e) {
            // Tooltips gibt es nur ab Zoom-Level 18. Falls Leaflet ihn aus anderen Gründen öffnet: sofort schließen.
            if (State.map.getZoom() < 18) {
                try { marker.closeTooltip(); } catch { /* ignore */ }
                return;
            }
            // Tooltip kann auch über Touch / Keyboard öffnen: Regel trotzdem durchziehen.
            closeOtherOpenTooltip(marker);
            State.openTooltipMarker = marker;

            const tooltipNode = e?.tooltip?._container;
            if (!tooltipNode) return;

            // Listener nur einmal pro Tooltip-Container binden.
            // Ohne diese Flagge würden wir bei jedem tooltipopen erneut Listener anheften
            // und der Timer würde mehrfach feuern (klassischer Event-Leak).
            if (tooltipNode.__ofmBound) return;
            tooltipNode.__ofmBound = true;

            L.DomEvent.on(tooltipNode, 'mouseenter', () => {
                if (closeTimer) {
                    clearTimeout(closeTimer);
                    closeTimer = null;
                }
            });

            L.DomEvent.on(tooltipNode, 'mouseleave', () => {
                closeTimer = setTimeout(() => {
                    marker.closeTooltip();
                }, 3000);
            });
        });
        // Tooltip schließt (egal wodurch): Aufräumen.
        // - globalen "openTooltipMarker" zurücksetzen, falls er auf diesen Marker zeigt
        // - laufenden closeTimer abbrechen
        marker.on('tooltipclose', function () {
            if (State.openTooltipMarker === marker) {
                State.openTooltipMarker = null;
            }
            if (closeTimer) {
                clearTimeout(closeTimer);
                closeTimer = null;
            }
        });

    }

    // 3. Marker zur Karte hinzufügen
    if (marker) {
        marker.addTo(State.markerLayer);

        // 4. In den Cache speichern (inkl. Tags, damit wir später nicht raten müssen)
        State.markerCache.set(id, {
            marker,
            mode,
            type,
            tags,
            lat,
            lon,
            isStation,
            isDefib,
            isHydrantCluster,
            clusterCount
        });
    }
}


/**
 * Sicherheitsfunktion gegen Code-Injection (XSS)
 * Wandelt gefährliche Zeichen in harmlose HTML-Entities um.
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ---- Test-Exports (nur für Unit-Tests, nicht für die App) ----
export const _testing = {
    isFireStation,
    getElementLatLon,
    distanceMeters,
    countTags,
    clusterPOIs,
    clusterFireStations
};
