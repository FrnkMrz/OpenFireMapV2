# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Neue Features
- **Getrennte Client-Loads für POIs und Grenzen:** Verwaltungsgrenzen werden nicht mehr zusammen mit den normalen POI-Abfragen behandelt, sondern über einen eigenen Fetch- und Cache-Pfad geladen.
- **Cache-Profile pro Datenklasse:** Der Browser-Cache speichert nun zusätzliche Metadaten wie `dataClass`, `createdAt`, `ttlMs`, `staleTtlMs` und `version`, damit Grenzen, Feuerwachen und Hydranten/Wasserpunkte unterschiedlich lange wiederverwendet werden können.
- **Verbesserte Debug-Sicht:** Overpass-Debug-Events unterscheiden jetzt zwischen `poi`, `boundary` und `view`, sodass Request-Verhalten und Cache-Treffer im Debug-Overlay klarer nachvollziehbar sind.

### Änderungen
- **Stale-While-Moving:** Beim schnellen Verschieben oder Zoomen hält die Karte bereits geladene Daten bewusst sichtbar und verschiebt das Nachladen auf einen stabileren Moment, statt sofort neue Requests zu starten.
- **Export nutzt getrennte Caches:** PNG- und GPX-Export führen POI- und Boundary-Daten jetzt gezielt aus den getrennten Caches zusammen, anstatt implizit von einer einzigen kombinierten Liste abzuhängen.
- **Refresh-Erkennung robuster:** SWR-Refreshes erkennen echte inhaltliche Änderungen jetzt über einen stabilen Fingerprint von IDs, Positionen, Tags und Geometrien statt nur über die Elementanzahl.

### Fehlerbehebungen (Bugfixes)
- **Viewport-Coverage statt Key-Wechsel:** Kleine Pan-Bewegungen, besonders auf Zoom 16 bis 18, lösen nicht mehr allein wegen eines neuen gesnappten `bboxKey` einen Reload aus. Neu geladen wird jetzt erst, wenn der sichtbare Viewport die zuletzt geladene gepufferte Fläche für POIs oder Grenzen wirklich verlässt.
- **Export-Fallback stabilisiert:** Der Cache-Fallback im Export greift wieder zuverlässig, auch wenn ein Online-Fetch erzwungen wurde oder fehlschlägt.

## [v0.6.8] - 2026-04-05

### Fehlerbehebungen (Bugfixes)
- **Cache-Key stabil (Mobile):** Der Overpass-Cache-Key wechselte bei Zoom-Animationen ständig, weil die Bbox-Ecken unabhängig auf ein 400m-Raster gesnapped wurden. Minimale Center-Verschiebungen durch Leaflet-Animationen kippten einzelne Ecken in benachbarte Grid-Zellen. Fix: Center wird gesnapped (1km-Raster), Ecken symmetrisch abgeleitet; `metersPerDegLon` wird von der gesnapten Latitude berechnet, damit auch West/Ost-Werte stabil bleiben. Cache-Hit bei Zoom/Pan innerhalb des gleichen Bereichs ist jetzt zuverlässig.
- **Blaue Distanz-Linie (Crash):** `drawLineToNearest()` speicherte den nächsten Hydranten als rohes Leaflet-`LatLng`-Objekt. Leaflet nutzt `.lng`, nicht `.lon` → `drawBlueLine(closest.lat, closest.lon)` übergab `undefined` als Longitude → `Invalid LatLng object`-Crash bei jedem Reload/Moveend. Fix: `closest = { lat, lon: markerLatLng.lng }`.
- **IndexedDB-Persistenz (iOS Safari):** `navigator.storage.persist()` wird beim App-Start aufgerufen, damit iOS Safari den IndexedDB-Cache nicht automatisch unter Speicherdruck löscht.
- **Cache-Schutz vor degradierten Overpass-Antworten:** Der SWR-Hintergrund-Refresh überschreibt den Cache nicht mehr wenn Overpass unter Last weniger als 50% der gecachten Elemente zurückgibt (`minElementCount`-Guard).
- **Cache-Key Konsistenz:** `State.queryMeta.bbox` nutzt jetzt `toFixed(5)` wie der Gate-Key – rohe IEEE-754-Floats wurden ersetzt.
- **CI:** Node.js auf Version 22 (LTS) angehoben; GitHub-Actions-Runtimes auf Node.js 24 umgestellt (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`).

## [v0.6.7] - 2026-04-03
### Neue Features
- **Einstellbarer Daten-Cache**: Benutzer können nun im "Info & Recht"-Modal die Dauer des lokalen Zwischenspeichers (Offline-Cache) einstellen: Aus, 1 Stunde, 1 Tag, 3 Tage, 7 Tage (Standard), 30 Tage.
- **Transparente Quellen**: Quellverweis für den BayernAtlas (LDBV) in den Lizenzen ergänzt.

### Fehlerbehebungen (Bugfixes)
- **Cache-Navigation**: Ein Bug wurde behoben, bei dem Hydranten beim schnellen Zurücknavigieren in einen bereits besuchten Bereich nicht sofort aus dem Cache angezeigt wurden (Optimierung der Request-Sperre).
- **Mobile-Fix**: Der Button "Info & Recht" im mobilen Burger-Menü wurde aktiviert und öffnet nun zuverlässig das Info-Modal (inkl. Einstellungen).
- **Lokalisierung**: Vollständige Synchronisation aller 30 Sprachdateien für die neuen Cache-Einstellungs-Keys.

## [v0.6.6] - 2026-04-02
### Neue Features
- **Regionale Hintergrundkarten (BayernAtlas)**: Integration der amtlichen "Webkarte Bayern" sowie der hochauflösenden digitalen Orthophotos (DOP/Luftbild) der bayerischen Vermessungsverwaltung über deren freie OpenData WMTS-Server.
- **Automatische Bounding-Box für regionale Daten**: Der BayernAtlas und das Bayern-Luftbild werden als Overlay-Option im Desktop-Layer-Menü dynamisch ein- und ausgeblendet, basierend auf dem geographischen Standort des Benutzers (Bayern Gemarkung). Ein weicher Fallback greift, falls der Benutzer den Gültigkeitsbereich verlässt.
- **Erweiterter CSP**: Anpassungen zur sicheren Einbindung der `bayernwolke.de` Kartenserver in die Content-Security-Policy von OpenFireMap.

## [v0.6.5] - 2026-04-01
### Neue Features
- **Permalink & Teilen**: Kartenansicht (Position, Zoom, aktiver Layer) kann nun direkt über die URL geteilt werden. Ein neuer "Teilen"-Button im Web und Mobile (nutzt native Share-API auf dem Smartphone) kopiert den genauen Link und erlaubt ein schnelles Weiterleiten des Kartenausschnitts.


## [v0.6.4] - 2026-03-29
### Neue Features
- **Württembergischer Schachthydrant (WSH)**: Spezielles Rendering (W-Icon mit gestricheltem Innenring) und exakte Tooltip-Warnung für Unterflurhydranten, die mit dem OSM-Tag `fire_hydrant:style=wsh` gekennzeichnet sind (auch bei abweichender Groß-/Kleinschreibung wie `WSH`).

### Fehlerbehebungen (Bugfixes)
- **100m Entfernungsring-Label**: Das 100-Meter-Label ("100 m") wurde optisch korrigiert und liegt nun wieder ordentlich auf zwei Dritteln des Radius innerhalb des gestrichelten Kreises anstatt zu weit nach außen zu ragen.
- **Hydranten Parser**: Case-Insensitivity-Bug („=== 'wsh'“) via `.toLowerCase()` behoben, sodass manuelle Großschreibungen durch OSM Mapper ("WSH") toleriert werden.

## [0.6.3] - 2026-03-06

### Added
- **i18n für Cluster-Tooltips:** Hydranten-Namen-Fallbacks ("Hydranten-Details") und Cluster-Header ("X Objekte innerhalb 5m") werden nun vollständig über das Übersetzungs-Wörterbuch abgehandelt und sind für alle 30 Sprachen verfügbar.
- **Hydranten-Clustering (Z17/Z18):** Das Rendern von extrem eng beieinander liegenden Hydranten (< 5 Meter) wurde überarbeitet. Sie werden nun visuell auf der Karte gebündelt, wobei ein Badge stattdessen das jeweilige Vielfache anzeigt ("2", "3" usw.). Die Einzelinformationen aller gebündelten POIs finden sich tabellarisch sortiert im dazugehörigen Tooltip-Fenster.

### Fixed
- **Root-Cause Fix (Clustering):** Behoben, dass der neue Code für das Hydranten-Clustering im Produktions-Build in der Rendering-Schleife nie aufgerufen wurde und eine versehentliche State-Mutation das Feature komplett blockiert hatte. Das Diffing- und Event-Caching arbeitet nun reibungslos, auch bei wilden Zoom- oder Schwenkmanövern im Zoom 17/18 Bereich.

## [0.6.2] - 2026-03-03

### Fixed
- **Map Export (Visuals):** Fixed an issue where exporting a very small map area would cause the generated title string on the document to be cut off horizontally. The export map width will now dynamically padded horizontally to ensure the title always fits cleanly.


## [0.6.1] - 2026-03-03

### Fixed
- **Map Export (Completeness):** Fixed issues where hydrants were excluded from GPX, PDF, and PNG exports when the map zoom was below 15. The Overpass API is now forced to fetch the area to ensure full coverage on the exported map.
- **Map Export (Visuals):** Removed an artificial visual limit that rendered hydrants as tiny invisible 5-pixel dots when exporting at zoom levels < 17. Hydrants will now always render with full identifiable icons regardless of chosen zoom scale.
- **Export Location Title:** Fixed a critical bug where the dialog title failed to adopt the user's selected map region ("Location A") and instead incorrectly defaulted to the center of the generic viewport ("Location B"), because the selection state was falsely read as inactive after drawing the box.


## [0.6.0] - 2026-02-24

### Added
- **Blaue Distanz-Linie**: Neue Funktion, die beim Klick auf "Locate Me" automatisch eine blaue, gestrichelte Linie zum nächstgelegenen Hydranten/Wasserstelle zieht. Inklusive Entfernungsangabe (in Metern).
- **Dynamische Linien-Updates**: Die Linie springt zum neu angeklickten Hydranten über und verschwindet nach 25 Sekunden automatisch.
- **Erweitertes Testing**: Umfassende Vitest Unit- und Playwright E2E-Tests inklusive CI/CD-Integration hinzugefügt.
- **Versionsnummer-Anzeige**: Versionslogik eingeführt und App-Version transparent im Footer/Legal-Bereich sichtbar gemacht.

### Changed
- **Lazy-Loading für Export**: Das PDF/PNG/GPX-Export-Modul (inkl. html2canvas/jspdf) wird erst bei Klick asynchron geladen, wodurch die initiale Ladezeit massiv sinkt.
- **Icon-Optimierung**: Alle Karten-Marker und UI-SVGs wurden stark komprimiert und für Android-Geräte auf die richtige Skalierung (`width: 100%`) festgelegt.
- **GPS-Rate-Limiting Fix**: Drei-stufiger Schutz gegen OS-seitige GPS-Sperren (Timeouts) in Safari/macOS eingebaut (Lock-State, `maximumAge: 10000`, 12s Fallback), plus sanftem Fallback auf Low-Accuracy-Ortung.
- **Offline-Architektur geklärt**: Das Service-Worker Caching wurde auf "Online-Only" (Network-first) korrigiert, PWA fungiert nur als schneller Shell-Loader, da Offline-Karten aus Platzgründen nicht realisierbar sind.

### Fixed
- Fehler behoben, bei dem Safari unter macOS wiederholt Location-API Fehler (Code 2) warf.
- Anzeigefehler behoben, bei dem die blaue Distanzlinie über tausende Kilometer gezogen wurde, wenn man auf der Karte extrem weit scrollte.
- UI: Überlappende weiße Labelboxen der blauen Distanzlinie entfernt und durch sauberen Outline-Textschatten ersetzt.
- SVG Rendering-Bug auf Android Chrome (zu kleine Icons) behoben.
