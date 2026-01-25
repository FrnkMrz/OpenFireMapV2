# OpenFireMapV2

Interaktive Web-Karte für Feuerwachen, Löschwasser-Objekte und
Defibrillatoren auf Basis von **OpenStreetMap**.\
Clientseitig, ohne Backend, mit Fokus auf Stabilität und
Nachvollziehbarkeit.

------------------------------------------------------------------------

## Kurzüberblick

-   **Frontend only** (kein Server, kein Framework)
-   **GitHub Pages** als Hosting (`docs/`)
-   **Overpass & Nominatim** mit Cache, Abort, Backoff
-   **Saubere Trennung**: Quellcode (`src/`) vs. Deploy-Artefakte
    (`docs/`)

------------------------------------------------------------------------

## Einordnung & Motivation

Dieses Projekt ist ein **privates Schulungs- und Übungsprojekt**.

Ziele: - praktische Erfahrung mit **Vanilla JavaScript
(Vibe-Coding)** - sicherer Umgang mit **Git und GitHub** - saubere
Projektstruktur ohne Framework-Abhängigkeiten

OpenFireMap.org entstand ursprünglich um **2011** als am OSM Stammtichin Nürnberg.
OpenFireMapV2 ist der bewusste Versuch, diese Idee **neu
aufzusetzen**: - mit aktueller Web-Technik - mit besserer Struktur - mit
Fokus auf Wartbarkeit und Robustheit

Das Projekt ist **nicht kommerziell** und dient dem Lernen und der
technischen Weiterentwicklung.\


------------------------------------------------------------------------

## Repository-Struktur

    OpenFireMapV2/
    ├─ src/            # Quellcode (hier wird gearbeitet)
    │  ├─ js/          # JavaScript-Module
    │  ├─ static/      # index.html, Assets, Favicons
    │  └─ input.css    # Tailwind Entry
    │
    ├─ docs/           # Deploy-Output (GitHub Pages)
    │  ├─ index.html
    │  └─ assets/
    │     ├─ css/
    │     └─ js/
    │
    ├─ scripts/        # Build-/Copy-Skripte
    ├─ package.json
    └─ README.md

**Merksatz:** - `src/` = Quelle - `docs/` = Ergebnis

GitHub Pages liest **ausschließlich `docs/`**.

------------------------------------------------------------------------

## Build & Deploy

Der Build ist bewusst minimalistisch. Kein Vite, kein Webpack.

### Was der Build macht

-   **Tailwind CSS**
    -   scannt Klassen in `src/`
    -   erzeugt `docs/assets/css/main.css`
-   **Statische Dateien**
    -   `src/static/*` → `docs/*`

### Build ausführen

``` bash
npm install      # einmal pro Rechner
npm run build    # nach Änderungen
```

Ohne Build bleibt `docs/` unverändert → GitHub Pages zeigt den alten
Stand.

------------------------------------------------------------------------

## API-Architektur (kurz)

-   **api.js**
    -   Overpass-Queries
    -   Nominatim-Geocoding
    -   Cache, Abort, Backoff
-   **net.js**
    -   Einheitlicher fetch-Wrapper
    -   Timeout & HTTP-Fehlerklassifikation
-   **cache.js**
    -   In-Memory Cache (BBox + Zoom)
    -   TTL, keine Persistenz

**Warum:** - Overpass ist langsam und rate-limitiert - Nutzer
zoomen/pannen häufig - Alte Requests müssen abbrechen

------------------------------------------------------------------------

## Karten-Logik

-   Requests nur bei `moveend` / `zoomend`
-   Debounce (\~400 ms)
-   Abbruch alter Requests bei neuen Aktionen
-   BBox-Rundung für Cache-Treffer

Ergebnis: - deutlich weniger Requests - flüssigere UI - reproduzierbares
Verhalten

------------------------------------------------------------------------

## Arbeiten auf mehreren Rechnern

Voraussetzungen: - Git - Node.js (LTS)

Setup:

``` bash
git clone https://github.com/FrnkMrz/OpenFireMapV2.git
cd OpenFireMapV2
npm install
npm run build
```

Workflow:

``` bash
# ändern
npm run build
git commit
git push
```

------------------------------------------------------------------------

## Typische Stolperfallen

-   **Seite zeigt alten Stand** → Build vergessen
-   **CSS fehlt** → Tailwind nicht gebaut
-   **Overpass 504** → Serverproblem, Code reagiert korrekt
-   \*\*404 auf \*.map\*\* → SourceMaps fehlen, harmlos

------------------------------------------------------------------------

## Design-Entscheidungen

-   Kein Framework
-   Kein Bundler
-   Kein Backend
-   Maximale Transparenz
-   Lange Lebensdauer

Ziel ist Verständlichkeit auch nach Jahren.

------------------------------------------------------------------------

## Lizenz

MIT
