# OpenFireMapV2

[![Live](https://img.shields.io/badge/Live-openfiremap.org-2ea44f)](https://openfiremap.org)
[![Version](https://img.shields.io/badge/version-v0.7.2-1f6feb)](https://github.com/FrnkMrz/OpenFireMapV2/releases)
[![Tests](https://img.shields.io/badge/tests-99%20Vitest%20%2B%20Playwright-6f42c1)](https://github.com/FrnkMrz/OpenFireMapV2/actions)
[![License](https://img.shields.io/github/license/FrnkMrz/OpenFireMapV2)](./LICENSE)
[![OSM / ODbL](https://img.shields.io/badge/data-OpenStreetMap%20%2F%20ODbL-7a7a7a)](https://www.openstreetmap.org/copyright)
[![GitHub Pages](https://img.shields.io/badge/deployed%20with-GitHub%20Pages-222222)](https://github.com/FrnkMrz/OpenFireMapV2/actions/workflows/pages.yml)

**OpenFireMapV2** ist eine weltweit nutzbare, interaktive Karte für Feuerwehren, OSM-Mitwirkende und alle, die feuerwehrrelevante Objekte schnell auffinden möchten. Sie zeigt unter anderem Feuerwachen, Hydranten, Löschwasserstellen und Defibrillatoren auf Basis offener OpenStreetMap-Daten.

Die Live-Karte ist unter **[openfiremap.org](https://openfiremap.org)** erreichbar. Der Quellcode und die technische Dokumentation liegen im **[GitHub-Repository FrnkMrz/OpenFireMapV2](https://github.com/FrnkMrz/OpenFireMapV2)**.

OpenFireMapV2 ist aktuell **v0.7.2**. OpenFireMap war von Anfang an weltweit nutzbar: Außerhalb der vorbereiteten Pipeline-Gebiete ruft die Anwendung Daten über Overpass ab. Für Deutschland, Österreich, die Schweiz, Luxemburg und Liechtenstein (DACHLiLu) steht zusätzlich eine schnelle, vorberechnete PMTiles-Versorgung über Cloudflare R2 bereit. Sie umfasst rund **1,25 Millionen feuerwehrrelevante Objekte**; durch den auf **MaxZoom 14** optimierten Build ist die aktuelle PMTiles-Datei etwa **192,5 MiB** groß (**201.892.499 Bytes**). Damit bleibt sie unter dem Cloudflare-Free-Cache-Limit von **512 MiB**. Die Pipeline erweitert nicht die geografische Abdeckung, sondern beschleunigt die Datenversorgung in diesen Gebieten.

> OpenFireMapV2 ist ein nichtkommerzielles Open-Source-Projekt, das moderne Webtechnik mit offenen OpenStreetMap-Daten verbindet.

## Warum OpenFireMap?

- weltweite Nutzung mit Overpass-Fallback
- schnelle PMTiles-Vektorkacheln für DACHLiLu per HTTP-Range-Requests
- R2-optimierte Auslieferung mit abgestuften Cache-Zeiten, ETags und Upload-Verifikation
- automatische Erkennung veralteter Pipeline-Abdeckung und Rückfall auf Overpass
- Exporte als PNG, PDF, GPX und CSV
- mehr als 30 Sprachen, IndexedDB-Cache sowie responsive Nutzung auf Desktop und Mobilgeräten
- eine offene Grundlage, auf der OSM-Mitwirkende Daten verbessern und Feuerwehren regionale Informationen prüfen können

### Architektur in einem Satz

```text
Browser → PMTiles / Cloudflare R2 (innerhalb DACHLiLu) → Overpass-Fallback
                         ↘ Overpass weltweit außerhalb DACHLiLu
```

Der Browser lädt bei PMTiles nur die für den sichtbaren Kartenausschnitt benötigten Kachelbereiche. Wenn Pipeline-Daten fehlen, veraltet sind oder nicht erreichbar sind, wechselt die Anwendung automatisch zu Overpass. Nach einem Build werden PMTiles, GeoJSON und `metadata.json` in einer sicheren Reihenfolge nach R2 übertragen und der öffentliche Stand anschließend anhand von `generated_at` und Dateigröße geprüft.

## Dokumentation

- [Erste Schritte](docs/ERSTE_SCHRITTE.md) – Karte, Suche, Layer, Export und mobile Nutzung
- [Architektur](docs/ARCHITEKTUR.md) – Frontend, PMTiles, R2, Cache und Fallback-Logik
- [Datenquellen](docs/DATENQUELLEN.md) – OSM, Geofabrik, Overpass, Nominatim und Lizenzen
- [FAQ](docs/FAQ.md) – häufige Fragen zu Ladezeiten, Aktualität und Offline-Nutzung
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

Version **v0.7.2** combines global Overpass access with a fast pre-built PMTiles pipeline for Germany, Austria, Switzerland, Luxembourg and Liechtenstein. The pipeline serves roughly **1.25 million objects** from Cloudflare R2 using HTTP Range Requests. An optimized MaxZoom 14 build currently keeps the PMTiles archive at about **192.5 MiB (201,892,499 bytes)**, below Cloudflare's 512 MiB free-cache limit. It accelerates those areas but does not replace worldwide Overpass coverage. See the [English project presentation](docs/PROJECT_PRESENTATION_EN.md) for a concise technical overview.
