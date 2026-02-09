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

export function initMapLogic() {
    State.markerLayer = L.layerGroup();
    State.boundaryLayer = L.layerGroup();
    State.rangeLayerGroup = L.layerGroup();

    // NEU: Wir initialisieren einen Cache für die Marker-Verwaltung.
    // Speichert: ID -> { marker: LeafletMarker, type: String, mode: String }
    State.markerCache = new Map();

    // Tooltip-State (global, weil Tooltips über viele Marker hinweg koordiniert werden müssen)
    // - openTooltipMarker: Referenz auf den Marker, dessen Tooltip gerade sichtbar ist.
    //   Damit erzwingen wir: "max. 1 Tooltip gleichzeitig".
    //   Öffnet ein neuer Tooltip, schließen wir den alten sofort.
    State.openTooltipMarker = null;


    // 1) Versuchen, letzte Position aus localStorage zu laden
    let startCenter = Config.defaultCenter;
    let startZoom = Config.defaultZoom;
    try {
        const savedView = localStorage.getItem('ofm_last_view');
        if (savedView) {
            const parsed = JSON.parse(savedView);
            // Validierung: Lat/Lon/Zoom müssen sinnvoll sein
            if (Array.isArray(parsed.center) && parsed.center.length === 2 && typeof parsed.zoom === 'number') {
                startCenter = parsed.center;
                startZoom = parsed.zoom;
            }
        }
    } catch (e) {
        console.warn('Fehler beim Laden der letzten Position:', e);
    }

    State.map = L.map('map', {
        zoomControl: false,
        preferCanvas: true, // <--- WICHTIG: Beschleunigt das Rendering massiv
        center: startCenter,
        zoom: startZoom
    });

    State.boundaryLayer.addTo(State.map);
    State.rangeLayerGroup.addTo(State.map);
    State.markerLayer.addTo(State.map);

    setBaseLayer('voyager');

    let debounceTimer;
    let isFirstLoad = true; // NEU: Flag für Sofort-Start
    // Merkt sich, für welchen "Daten-Modus" + Karten-Ausschnitt wir zuletzt geladen haben.
    // Damit vermeiden wir unnötige Requests beim minimalen Verschieben oder bei Zoom-Änderungen,
    // die am Ladeumfang nichts ändern.
    let lastRenderBucket = null;
    let lastFetchKey = null;
    let lastFetchStartTs = 0;

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
        const zoom = State.map.getZoom();
        const viewBounds = State.map.getBounds();
        const center = State.map.getCenter();

        // Padding (in Metern): Bei Zoom 15 soll der Abfragebereich deutlich größer sein (1–2 km),
        // damit leichtes Verschieben NICHT sofort neue Queries auslöst.
        // Padding (in Metern):
        // OPTIMIERUNG: Werte drastisch reduziert, um "Hang" beim Initial-Load zu vermeiden.
        // Vorher war Z15 auf 2000m -> extrem große Datenmenge (25x Viewport).
        // Jetzt: ca. 1 Screen-Größe Puffer.
        const padMeters =
            (zoom <= 15) ? 600 :  // war 2000
                (zoom === 16) ? 400 : // war 1200
                    (zoom === 17) ? 250 : // war 700
                        (zoom === 18) ? 150 : // war 350
                            100;

        // Snap-Grid (in Metern):
        const snapMeters =
            (zoom <= 15) ? 200 : // war 800
                (zoom === 16) ? 100 : // war 400
                    (zoom === 17) ? 50 :  // war 200
                        (zoom === 18) ? 25 :  // war 100
                            20;

        // Umrechnung Meter -> Grad (näherungsweise, reicht hier völlig)
        const lat = center.lat;
        const metersPerDegLat = 111320;
        const metersPerDegLon = 111320 * Math.cos(lat * Math.PI / 180);

        const dLatPad = padMeters / metersPerDegLat;
        const dLonPad = padMeters / metersPerDegLon;

        // Gepufferte Bounds
        let south = viewBounds.getSouth() - dLatPad;
        let west = viewBounds.getWest() - dLonPad;
        let north = viewBounds.getNorth() + dLatPad;
        let east = viewBounds.getEast() + dLonPad;

        // Snap in Grad
        const snapLat = snapMeters / metersPerDegLat;
        const snapLon = snapMeters / metersPerDegLon;

        const snap = (v, step) => Math.round(v / step) * step;

        south = snap(south, snapLat);
        north = snap(north, snapLat);
        west = snap(west, snapLon);
        east = snap(east, snapLon);

        // Für api.js: Query-Bounds bereitstellen (damit nicht "sichtbarer Ausschnitt" abgefragt wird)
        // Wichtig: Leaflet akzeptiert LatLngBounds direkt.
        State.queryBounds = L.latLngBounds([[south, west], [north, east]]);
        State.queryMeta = {
            zoom,
            padMeters,
            snapMeters,
            bbox: `${south},${west},${north},${east}`
        };

        // Stabiler Key (für Gating/Cache)
        return `${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}`;
    };


    State.map.on('moveend zoomend', () => {
        const zoom = State.map.getZoom();

        // 1) Re-Rendering aus Cache, aber nur bei Bucket-Wechsel.
        // Beim Zoomen (vor allem raus) wollen wir sofort reagieren, aber nicht bei jedem moveend alles neu bauen.
        const bucket = getZoomBucket(zoom);
        if (State.cachedElements && bucket !== lastRenderBucket) {
            lastRenderBucket = bucket;
            renderMarkers(State.cachedElements, zoom);
        }

        // Tooltips gibt es nur ab Zoom 18. Bei Zoom-Out: offenen Tooltip sofort schließen.
        if (zoom < 18 && State.openTooltipMarker) {
            try { State.openTooltipMarker.closeTooltip(); } catch (e) { /* ignore */ }
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

        // Mindestabstand zwischen gestarteten Requests (Rate-Limit/Overpass-Last).
        // Wir zeigen bei Zoom 15 ALLES, aber wir starten nicht 10 Requests pro Sekunde.
        const minIntervalMs =
            (zoom <= 15) ? 2000 : // war 2500
                (zoom === 16) ? 1500 : // war 1800
                    (zoom === 17) ? 1000 : // war 1200
                        800;

        800;

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
            if (fetchKey === lastFetchKey) {
                if (statusEl) {
                    statusEl.innerText = t('status_current');
                    statusEl.className = 'text-green-400';
                }
                return;
            }

            const now = Date.now();
            if (now - lastFetchStartTs < minIntervalMs) {
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

            lastFetchStartTs = now;
            lastFetchKey = fetchKey;
            dbg('fetchOSMData()', { fetchKey });
            window.dispatchEvent(new CustomEvent('ofm:overpass', { detail: { phase: 'trigger', fetchKey } }));

            try {
                // Status auf "Lädt" setzen (SWR Pattern: wir zeigen Cache, laden aber neu)
                if (statusEl) {
                    statusEl.innerText = t('status_loading');
                    statusEl.className = 'text-blue-400';
                }

                // Detaillierte Lade-Info anzeigen
                showNotification('🔄 Lade Daten...', 30000); // Lange duration, wird bei Erfolg überschrieben

                // Track if we rendered cached data
                let cachedCount = 0;

                // SWR: Wir geben renderMarkers als Callback mit, 
                // damit Cache-Daten sofort gezeichnet werden.
                const data = await fetchOSMData((cachedData) => {
                    cachedCount = cachedData?.length || 0;
                    if (cachedCount > 0) {
                        showNotification(`📦 ${cachedCount} Objekte aus Cache`, 3000);
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

                    // Erfolgs-Nachricht für 2 Sekunden, dann Box schließen
                    showNotification(`✅ Daten vollständig geladen (${networkCount} Objekte)`, 2000);
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
    L.tileLayer(conf.url, { attribution: conf.attr, maxZoom: conf.maxZoom }).addTo(State.map);

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
}

// Hilfsfunktion für SVGs (jetzt mit Farben aus Config)
function getSVGContent(type) {
    // Farben holen
    const c = Config.colors;

    // 1. Defibrillator
    if (type === 'defibrillator') {
        return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
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
        return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>
            <circle cx="42" cy="52" r="18" fill="none" stroke="white" stroke-width="6" />
            <line x1="64" y1="34" x2="64" y2="70" stroke="white" stroke-width="6" stroke-linecap="round" />
        </svg>`;
    }

    // Buchstabe ermitteln
    let char = '';
    switch (type) {
        case 'underground': char = 'U'; break;
        case 'pillar': char = 'O'; break;
        case 'pipe': char = 'I'; break;
        case 'dry_barrel': char = 'Ø'; break;
        default: char = '';
    }

    // 3. Wache
    if (type === 'station') return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 L50 5 L90 40 L90 90 L10 90 Z" fill="${c.station}" stroke="white" stroke-width="4"/><rect x="30" y="55" width="40" height="35" rx="2" fill="white" opacity="0.9"/></svg>`;

    // 4. Standard
    return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${char ? `<text x="50" y="72" font-family="Arial" font-weight="bold" font-size="50" text-anchor="middle" fill="white">${char}</text>` : ''}</svg>`;
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


function generateTooltip(tags) {
    const safeTags = tags || {};
    const tooltipTitleRaw = safeTags.name || t('details');
    const tooltipTitle = escapeHtml(tooltipTitleRaw);

    let html = `<div class="p-2 min-w-[180px]"><div class="font-bold text-sm border-b border-white/20 pb-1 mb-1 text-blue-400">${tooltipTitle}</div><div class="text-[10px] font-mono grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">`;

    for (const [key, val] of Object.entries(safeTags)) {
        html += `<div class="text-slate-400 text-right">${escapeHtml(key)}:</div><div class="text-slate-200 break-words">${escapeHtml(val)}</div>`;
    }

    html += `</div></div>`;
    return html;
}


// Kreis-Funktion (jetzt mit Config-Farbe)
export function showRangeCircle(lat, lon) {
    State.rangeLayerGroup.clearLayers();
    const zoom = State.map.getZoom();
    if (zoom < 16) return;

    // Hier nutzen wir Config.colors.rangeCircle
    L.circle([lat, lon], {
        color: Config.colors.rangeCircle,
        fillColor: Config.colors.rangeCircle,
        fillOpacity: 0.15,
        radius: 100, weight: 2, dashArray: '5, 8', interactive: false
    }).addTo(State.rangeLayerGroup);

    if (zoom >= 17) {
        const latRad = lat * Math.PI / 180;
        const kmPerDegLon = 111.32 * Math.cos(latRad);
        const offsetLon = 0.05 / kmPerDegLon;

        const labelMarker = L.marker([lat, lon + offsetLon], { opacity: 0, interactive: false }).addTo(State.rangeLayerGroup);
        labelMarker.bindTooltip("100 m", { permanent: true, direction: 'center', className: 'range-label', offset: [0, 0] }).openTooltip();
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
    // Grenzen (Boundaries) werden weiterhin komplett neu gezeichnet, 
    // da es meist nur wenige sind und sich die Geometrie bei Zoom ändern kann.
    State.boundaryLayer.clearLayers();

    // 1. Vorbereitung: Welche Marker sollen aktuell angezeigt werden?
    // Wir sammeln hier nur die Daten, wir zeichnen noch nicht.
    const markersToKeep = new Set();
    const renderedLocations = []; // Für die Duplikat-Prüfung (z.B. bei Wachen)

    preprocessedElements.forEach(el => {
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
        let mode = 'standard';
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

        // --- G. DIFFING LOGIK (Das Herzstück) ---

        // Prüfen, ob wir den Marker schon haben
        const cached = State.markerCache.get(id);

        // Fall 1: Marker existiert UND Modus (Dot vs SVG) ist gleich geblieben
        if (cached && cached.mode === mode) {
            // Nichts tun! Der Marker bleibt einfach auf der Karte.
            // Das verhindert das Flackern und spart Rechenleistung.
            return;
        }

        // Fall 2: Marker existiert, aber Modus hat sich geändert (z.B. Zoom von 16 auf 17 -> Dot zu SVG)
        if (cached && cached.mode !== mode) {
            // Alten Marker entfernen, da er neu gezeichnet werden muss
            State.markerLayer.removeLayer(cached.marker);
            State.markerCache.delete(id);
        }

        // Fall 3: Marker ist neu (oder wurde gerade in Fall 2 gelöscht) -> Neu erstellen
        createAndAddMarker(id, lat, lon, type, tags, mode, zoom, isStation, isDefib);
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
function createAndAddMarker(id, lat, lon, type, tags, mode, zoom, isStation, isDefib) {
    let marker;
    let iconHtml;
    let className = '';
    let size = [28, 28];
    let zIndex = 0;

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
        // SVG Icons für hohe Zoomstufen
        iconHtml = getSVGContent(type); // Nutzt deine existierende Funktion
        className = 'icon-container';

        if (isStation) {
            size = [32, 32]; zIndex = 1000;
        } else if (isDefib) {
            size = [28, 28]; zIndex = 2000;
        } else {
            zIndex = 0;
        }

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
        marker.bindTooltip(generateTooltip(tags), {
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
            try { openMarker.closeTooltip(); } catch (e) { /* ignore */ }
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

        // Klick bleibt ausschließlich für den 100 m Radius (Hydranten/Wasser etc.),
        // NICHT für Tooltips.
        if (!isStation && !isDefib) {
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
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
                try { marker.closeTooltip(); } catch (e) { /* ignore */ }
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
            isDefib
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
