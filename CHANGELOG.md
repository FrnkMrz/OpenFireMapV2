# Changelog

All notable changes to this project will be documented in this file.

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
