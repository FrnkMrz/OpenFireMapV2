# Changelog

All notable changes to this project will be documented in this file.

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
