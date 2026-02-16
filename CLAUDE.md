# CLAUDE.md

## Project Overview

OpenFireMapV2 is a client-side interactive web map for fire-service-related objects (fire stations, hydrants, water supply points, defibrillators) built on OpenStreetMap data. Non-commercial learning project. MIT licensed.

## Tech Stack

- **Vanilla JavaScript** (ES modules, no framework)
- **Leaflet** for map rendering (vendored locally in `src/static/assets/vendor/leaflet/`)
- **Tailwind CSS** v3 (build-time only)
- **Node.js** build scripts (ESM `.mjs` files)
- **OpenStreetMap / Overpass API / Nominatim** for geodata
- No backend — fully client-side, deployed via GitHub Pages

## Project Structure

```
src/
  js/           # Application JavaScript (ES modules)
    lang/       # i18n translation files (30+ languages)
    config.js   # Central config (URLs, colors, zoom, performance)
    app.js      # Main app entry
    map.js      # Map logic
    api.js      # Overpass/Nominatim API calls
    cache.js    # Client-side caching
    state.js    # Application state
    ui.js       # UI logic
    i18n.js     # Internationalization
    net.js      # Network utilities
    export.js   # Map export functionality
  static/       # Static assets (HTML, favicons, vendor libs)
    index.html  # Single page entry point
  input.css     # Tailwind CSS source
scripts/
  build.mjs       # Copies src/static + src/js → docs/
  build-static.mjs
  i8n-check.mjs   # i18n completeness checker
docs/             # Build output (gitignored) — deployed to GitHub Pages
```

## Build & Development

```bash
npm install           # Install dependencies
npm run build         # Full build: copies static + JS to docs/, builds Tailwind CSS
npm run build:css     # Tailwind CSS only
npm run watch:css     # Tailwind CSS watch mode
npm run i8n:check     # Check i18n translation completeness
```

The build copies `src/static/` and `src/js/` into `docs/`, then compiles Tailwind CSS. The `docs/` folder is the deployment artifact.

## Deployment

GitHub Actions workflow (`.github/workflows/pages.yml`) runs on push to `main`:
1. `npm ci` + `npm run build`
2. Deploys `docs/` to GitHub Pages

## Code Conventions

- Comments and internal documentation are in **German**
- Code uses **ES module** syntax (`import`/`export`)
- Central configuration lives in `src/js/config.js` — no magic numbers in code
- Translation files in `src/js/lang/` export a single object with translation keys
- No tests currently (`npm test` is a no-op)
- Module type is `commonjs` in package.json but source uses ES modules (browser-native)

## Git Conventions

- Main branch: `main`
- PRs merged via GitHub
- Commit messages: short, descriptive (English)
- Branch naming: `feature/`, `fix/`, `perf/` prefixes

## Key Architecture Notes

- All map data comes from Overpass API with fallback endpoints
- Client-side caching with TTL (5 min default)
- Overpass requests use debouncing (400ms) and retry logic
- i18n supports 30+ languages with German/English as primary
- Export feature generates map images with configurable zoom limits
