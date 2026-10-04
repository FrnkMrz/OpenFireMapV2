# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenFireMapV2 is a client-side interactive web map for fire-service-related objects (fire stations, hydrants, water supply points, defibrillators) built on OpenStreetMap data. Non-commercial learning project. MIT licensed.

## Tech Stack

- **Vanilla JavaScript** (ES modules, no framework)
- **Vite** for bundling/dev server (builds to `docs/`)
- **Leaflet** for map rendering (npm dependency)
- **Tailwind CSS** v3
- **Vitest** for unit tests, **Playwright** for e2e tests
- **OpenStreetMap / Overpass API / Nominatim** for geodata
- No backend — fully client-side, deployed via GitHub Pages

## Project Structure

```
src/
  js/           # Application JavaScript (ES modules)
    lang/       # i18n translation files (30+ languages)
    config.js   # Central config (URLs, colors, zoom, performance) — no magic numbers in code
    app.js      # Main entry: bootstraps i18n → UI → Leaflet → map → export (lazy)
    map.js      # Map init, markers, permalink (#zoom/lat/lon/layer), share
    api.js      # Overpass/Nominatim API calls
    cache.js    # Client-side caching (localStorage, configurable TTL)
    state.js    # Shared mutable app state (singleton object)
    ui.js       # Desktop UI logic and event wiring
    mobile-ui.js # Additive mobile UI layer (IIFE, triggers desktop buttons via .click())
    i18n.js     # Internationalization (default: de, fallback: en)
    net.js      # Network utilities (fetch with AbortController/retry)
    pipeline.js # Local pipeline integration (PMTiles vector tiles & GeoJSON)
    export.js   # Map export (PNG/PDF via jsPDF + html2canvas, lazy-loaded)
    version.js  # Version constant
  input.css     # Tailwind CSS source
public/         # Static assets served as-is (sw.js, manifest.json, favicons, vendor assets)
index.html      # Single page entry point (Vite root)
scripts/
  i18n-check.mjs  # i18n completeness checker
docs/           # Build output → deployed to GitHub Pages
test/           # Vitest unit tests (*.test.js)
tests/          # Playwright e2e tests (*.spec.js)
```

## Build & Development

```bash
npm install           # Install dependencies
npm run dev           # Vite dev server at http://localhost:5173
npm run build         # Build to docs/ (Vite)
npm run preview       # Preview the production build
npm run lint          # ESLint on src/**/*.js
npm run i18n:check    # Check i18n translation completeness
```

### Testing

```bash
npm test                    # Vitest (watch mode) — unit tests in test/
npm run test:ci             # Vitest (run once, no watch)
npm run test:coverage       # Vitest with coverage report
npx playwright test         # Playwright e2e tests (requires dev server running or starts one)
npx playwright test tests/map.spec.js  # Run a single e2e spec
```

## Deployment

GitHub Actions workflow (`.github/workflows/pages.yml`) runs on push to `main`:
1. `npm ci` + `npm run build`
2. Deploys `docs/` to GitHub Pages

## Code Conventions

- Comments and internal documentation are in **German**
- Code uses **ES module** syntax (`import`/`export`)
- Central configuration lives in `src/js/config.js`
- Translation files in `src/js/lang/` export a single object with translation keys
- Module type is `commonjs` in package.json but source uses ES modules (Vite handles this)

## Git Conventions

- Main branch: `main`
- Commit messages: short, descriptive (English)
- Branch naming: `feature/`, `fix/`, `perf/` prefixes

## Key Architecture Notes

- **Bootstrap order** (`app.js`): i18n → UI → wait for `window.L` (Leaflet via CDN/vendor) → `initMapLogic()` → lazy-import `export.js`
- **Mobile UI** (`mobile-ui.js`): loaded as an IIFE script tag, not imported. Detects mobile via `pointer: coarse` / touch / `window.innerWidth < 1370`, hides desktop controls, proxies actions by calling `.click()` on hidden desktop buttons — no logic is duplicated
- **State** (`state.js`): single mutable singleton; all modules share it via import. Key fields: `map`, `markerLayer`, `cachedElements`, `isFetchingData`, `isFetchingBoundaries`, `pendingBufferFetches`, `activeFetchBounds`, `activeLayerKey`, `exportFormat`, `selection`
- **Permalink**: URL hash format `#zoom/lat/lon/layer` (e.g. `#17/48.12345/9.56789/topo`), updated debounced on map move
- **Overpass requests**: debounced; endpoints tried once each in shuffled order — 429/5xx/timeout put an endpoint on cooldown and move on (timeouts are a `TimeoutError` from `net.js`, not an `AbortError`); background requests run `silent`; cancelled via `AbortController` on new request
- **Cache**: IndexedDB-backed (`OFM_DB`) with user-configurable TTL via `localStorage` (Off / 1h / 1d / 3d / 7d / 30d, default 7 days)
- **Export**: jsPDF + html2canvas, lazy-loaded on startup; zoom-based area limits in `Config.exportZoomLimitsKm` prevent browser OOM; wartet auf `pendingBufferFetches` ohne feste Timeouts
- **Pipeline / PMTiles**: Cloudflare R2 ist die primäre Datenquelle hinter `pipeline.openfiremap.org` (DACHLiLu PMTiles Vektorkacheln via HTTP Range Requests). Dank z14-Optimierung (≈ 182 MiB inkl. OSM-IDs < 512 MiB Limit) liefert der Cloudflare Edge Cache zuverlässig mit `HIT` aus (2–6 Kacheln pro Viewport). Automatisches Cache-Busting via `metadata.json` (`?v=<generated_at>`) und Abdeckungsprüfung (`PmtilesCoverageMismatch`) verhindern Stale-Cache-Ausfälle. Fallback-Kaskade: PMTiles -> Overpass. R2-CORS erlaubt `https://openfiremap.org` und `http://localhost:5173` – lokal daher immer `npm run dev` auf Port 5173 nutzen, andere Ports werden blockiert.
- **Schutzfilter Wachen-Ebene**: `LAYER_TAG_GUARDS` in `pipeline.js` lässt in der Ebene `fire_stations` nur Objekte mit `amenity=fire_station` oder `building=fire_station` durch. Die Pipeline lieferte bis 04.10.2026 auch Referenzobjekte (Tore, Eingänge, Türen; 11 %), die `renderMarkers` sonst ab Zoom 15 als Hydranten-Punkte zeichnet. Die Filter-Tabelle muss zu den Ebenen-Filtern im Builder passen (Pipeline-Repo).
- **Live-Delta (PMTiles + Overpass)**: `metadata.json` enthält `osm_data_until` (OSM-Datenstand aus dem PBF-Header, nicht `generated_at` = Build-Zeit); POI-Kacheln tragen `@type`/`@id`, die `geoJsonFeatureToElement()` als `type`/`id` übernimmt. Nach dem PMTiles-Laden holt `api.js` per Overpass `newer:` die Änderungen für den geladenen Bereich inkl. Pufferring und ersetzt/ergänzt per `type:id` (`mergePoiDelta`). Gelöschte Objekte erkennt `newer:` nicht. Schalter `Config.pipeline.liveDelta`.
- **Progressives Rendern & Pufferung**: Sichtbarer Kartenausschnitt wird mit `isPartial: true` sofort gezeichnet, der Pufferring asynchron im Hintergrund geladen. `pendingBufferFetches` (`Set`) sichert den Export, `activeFetchBounds` verhindert unnötiges Neu-Rendern und schützt aktive Pufferringe bei kleinen Kartenbewegungen.
- **Pipeline-Betrieb (privates Repo)**: Build, Upload und Monitoring der PMTiles-Pipeline (Builder, Nginx, VM 102, Home Assistant) liegen im privaten Repo `FrnkMrz/openfiremap-dach-pipeline`, nicht hier. Dieses Repo enthält nur die Client-Seite (`src/js/pipeline.js`, Abdeckungspolygone in `src/js/coverage/`). Keine Betriebsdetails (Hosts, Pfade, Zugänge) in dieses öffentliche Repo schreiben.
- **Status & Benachrichtigungen**: Klare Aufgabentrennung: Permanente Status-Box (`#status-box`) für Zoom/Datenzustand, `#hydrant-download-status` für asynchronen Hydranten-Ladefortschritt/Retry, `#notification-box` (`showNotification(msg, duration, type)`) ausschließlich für Nutzer-Aktionen und Warnungen/Fehler mit Farbcodierung (success, info, warning, error) und kollisionsfreier Platzierung auf Mobilgeräten.
