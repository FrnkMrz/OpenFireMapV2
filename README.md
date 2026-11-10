# OpenFireMapV2

[![Live](https://img.shields.io/badge/Live-openfiremap.org-2ea44f)](https://openfiremap.org)
[![Version](https://img.shields.io/badge/version-v0.11.0-1f6feb)](https://github.com/FrnkMrz/OpenFireMapV2/releases)
[![Build](https://github.com/FrnkMrz/OpenFireMapV2/actions/workflows/pages.yml/badge.svg)](https://github.com/FrnkMrz/OpenFireMapV2/actions/workflows/pages.yml)
[![License](https://img.shields.io/github/license/FrnkMrz/OpenFireMapV2)](./LICENSE)
[![OSM / ODbL](https://img.shields.io/badge/data-OpenStreetMap%20%2F%20ODbL-7a7a7a)](https://www.openstreetmap.org/copyright)
[![GitHub Pages](https://img.shields.io/badge/deployed%20with-GitHub%20Pages-222222)](https://github.com/FrnkMrz/OpenFireMapV2/actions/workflows/pages.yml)

**OpenFireMapV2** ist eine weltweit nutzbare, interaktive Karte für Feuerwehren, OSM-Mitwirkende und alle, die feuerwehrrelevante Objekte schnell auffinden möchten. Sie zeigt unter anderem Feuerwachen, Hydranten, Löschwasserstellen und Defibrillatoren auf Basis offener OpenStreetMap-Daten.

Die Live-Karte ist unter **[openfiremap.org](https://openfiremap.org)** erreichbar. Der Quellcode und die technische Dokumentation liegen im **[GitHub-Repository FrnkMrz/OpenFireMapV2](https://github.com/FrnkMrz/OpenFireMapV2)**.

OpenFireMapV2 ist aktuell **v0.11.0**. Die Hauptkarte ist weltweit nutzbar: Außerhalb der vorbereiteten Pipeline-Gebiete ruft sie Daten über Overpass ab. Für DACHLiLu sowie 40 weitere europäische Länder steht zusätzlich eine schnelle PMTiles-Versorgung über Cloudflare R2 bereit. Die Pipeline beschleunigt die Datenversorgung, erweitert aber nicht die weltweite Abdeckung. Neu in 0.11 ist der eigenständige **Ortsplan** unter `/ortsplan/`: Er erstellt für Gebiete in Deutschland druckfertige PDF- oder PNG-Pläne mit Feuerwehrsymbolen, Straßen, Legende und optionalem Straßenverzeichnis. Das Exportmenü kann außerdem transparente Feuerwehr-Rasterkacheln für abgedeckte Gebiete in Deutschland als ZIP ausgeben. Beide Funktionen beziehen vorbereitete Daten aus der Pipeline; Details und Einschränkungen stehen in der [FAQ](docs/FAQ.md) und [Architektur](docs/ARCHITEKTUR.md).

> OpenFireMapV2 ist ein nichtkommerzielles Open-Source-Projekt, das moderne Webtechnik mit offenen OpenStreetMap-Daten verbindet.

## Warum OpenFireMap?

- weltweite Nutzung mit Overpass-Fallback
- schnelle PMTiles-Vektorkacheln für DACHLiLu und 40 weitere europäische Länder per HTTP-Range-Requests
- R2-optimierte Auslieferung mit abgestuften Cache-Zeiten, ETags und Upload-Verifikation
- automatische Erkennung veralteter Pipeline-Abdeckung und Rückfall auf Overpass
- Exporte als PNG, PDF, GPX und CSV
- eigenständiger [Ortsplan](https://openfiremap.org/ortsplan/) für druckfertige PDF- und PNG-Pläne in Deutschland
- optionaler Export transparenter Feuerwehr-Rasterkacheln als ZIP für abgedeckte Gebiete in Deutschland
- Overlay-Demo und Einbindungsanleitung unter [openfiremap.org/overlay](https://openfiremap.org/overlay/), einschließlich PMTiles-Download und Leaflet-/MapLibre-Beispielen
- eine mehrsprachige [Übersicht der Kartenzeichen](https://openfiremap.org/symbols/) für Hydranten, Löschwasserstellen, Feuerwachen und Defibrillatoren
- mehr als 30 Sprachen, IndexedDB-Cache sowie responsive Nutzung auf Desktop und Mobilgeräten
- Barrierefreiheit nach WCAG 2.2 (A/AA): Bedienung per Tastatur mit Skip-Link, sichtbarem Fokus und Marker-Details auf Enter, Screenreader-Beschriftungen, geprüfte Farbkontraste und Rücksicht auf „Bewegung reduzieren“ (siehe [Erste Schritte](docs/ERSTE_SCHRITTE.md#bedienung-per-tastatur-und-screenreader))
- eine öffentliche [Pipeline-Statusseite](https://openfiremap.org/status/) mit Datenstand, Upload und Objektdichte je Land
- eine offene Grundlage, auf der OSM-Mitwirkende Daten verbessern und Feuerwehren regionale Informationen prüfen können

### Architektur in einem Satz

```text
Browser → PMTiles / Cloudflare R2 (DACHLiLu und 40 europäische Länder) → Overpass-Fallback
                         ↘ Overpass weltweit außerhalb dieser Gebiete
```

Der Browser lädt bei PMTiles nur die für den sichtbaren Kartenausschnitt benötigten Kachelbereiche. Wenn Pipeline-Daten fehlen, veraltet sind oder nicht erreichbar sind, wechselt die Anwendung automatisch zu Overpass. Nach einem Build werden PMTiles, GeoJSON und `metadata.json` in einer sicheren Reihenfolge nach R2 übertragen und der öffentliche Stand anschließend anhand von `generated_at` und Dateigröße geprüft.

## Dokumentation

- [Erste Schritte](docs/ERSTE_SCHRITTE.md) – Karte, Suche, Layer, Export und mobile Nutzung
- [Architektur](docs/ARCHITEKTUR.md) – Frontend, PMTiles, R2, Cache und Fallback-Logik
- [Datenquellen](docs/DATENQUELLEN.md) – OSM, Geofabrik, Overpass, Nominatim und Lizenzen
- [FAQ](docs/FAQ.md) – häufige Fragen zu Ladezeiten, Aktualität, Offline-Nutzung und Barrierefreiheit
- [Kartenzeichen](https://openfiremap.org/symbols/) – Symbole und ihre Bedeutung in allen unterstützten Sprachen
- [Pipeline-Statusseite](https://openfiremap.org/status/) – Datenstand und Upload je Land (Deutsch und Englisch)
- [Ortsplan erstellen](https://openfiremap.org/ortsplan/) – druckfertige Pläne für unterstützte Gebiete in Deutschland (am Computer oder Tablet)
- [OpenFireMap-Overlay](https://openfiremap.org/overlay/) – Demo, Deutschland-Archiv, Ausschnitt-Download und Einbindungsbeispiele
- [Geschichte von OpenFireMap](docs/GESCHICHTE.md) – belegbare Meilensteine seit 2010
- [Projektvorstellung Deutsch](docs/PROJEKT_VORSTELLUNG_DE.md) / [English](docs/PROJECT_PRESENTATION_EN.md)
- [Mitmachen](CONTRIBUTING.md) und [Sicherheit](SECURITY.md)

## Entwicklung

Voraussetzung ist eine aktuelle Node.js-Version.

```bash
npm ci
npm run dev       # Vite-Entwicklungsserver
npm run build     # Produktions-Build nach docs/
npm run lint
npm run i18n:check
npm run test:ci
npx playwright test
```

Der GitHub-Actions-Workflow baut und veröffentlicht den Inhalt von `docs/` über GitHub Pages. Die Anwendung bleibt eine clientseitige Webanwendung ohne eigenes Backend.

## Lizenz und Daten

Der Quellcode steht unter der [MIT-Lizenz](LICENSE). Die Kartendaten stammen aus [OpenStreetMap](https://www.openstreetmap.org/) und stehen unter der [Open Data Commons Open Database License (ODbL)](https://www.openstreetmap.org/copyright). Weitere Quellen und Hinweise sind in [Datenquellen](docs/DATENQUELLEN.md) dokumentiert.

## English summary

OpenFireMapV2 is a worldwide, client-side web map for fire stations, hydrants, water supply points and AEDs based on OpenStreetMap data. The live map is available at [openfiremap.org](https://openfiremap.org), and the source code is maintained in the [GitHub repository](https://github.com/FrnkMrz/OpenFireMapV2).

The [map symbols guide](https://openfiremap.org/symbols/) explains hydrant, water-source, fire-station and AED symbols in all supported languages.

Version **v0.11.0** adds a standalone town-plan tool for supported areas in Germany. It creates printable PDF and PNG plans with adjustable layout, map scale, symbols, roads, legend and an optional street index. The map export menu also offers a Germany raster pilot that packages transparent fire-service tiles as a ZIP for covered areas. Both tools use pre-built data and are separate from the worldwide interactive map. See the [FAQ](docs/FAQ.md) and [English project presentation](docs/PROJECT_PRESENTATION_EN.md).

The map is keyboard-accessible and checked against WCAG 2.2 (A/AA) with automated axe and contrast tests: skip link, visible focus, keyboard-operable markers and dialogs, labelled controls in all supported languages, and support for reduced motion. Testing with a real screen reader on a device is still pending. A public pipeline status page is available at [openfiremap.org/status](https://openfiremap.org/status/).
