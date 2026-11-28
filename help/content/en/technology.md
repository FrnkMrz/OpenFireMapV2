---
title: Technology
description: How OpenFireMap works technically: web app in the browser, map services, data pipeline with PMTiles on Cloudflare, Overpass and Nominatim, accessibility, security and privacy.
eyebrow: For the technically curious
lead: A look under the hood. This page describes the building blocks of OpenFireMap, the services involved and what happens when a map area loads. You need none of this to use the map.
order: 11
---

## At a glance {#ueberblick}

OpenFireMap is a pure web app. There is **no application server of its own**, no database of user data and no accounts. Your browser loads the app from GitHub Pages and fetches everything else directly from the services involved: map images from the map providers, fire service objects as prepared tiles from Cloudflare or live from Overpass, search results from Nominatim.

:::diagram architecture
How OpenFireMap is built: the web app runs in the browser and talks directly to map providers, Overpass, Nominatim and the Cloudflare storage. The data pipeline builds the tiles for Cloudflare from OpenStreetMap.
:::

| Building block | Technology | Job |
|---|---|---|
| Web app | JavaScript (ES modules, no framework), [Vite](https://vite.dev/), [Leaflet](https://leafletjs.com/), [Tailwind CSS](https://tailwindcss.com/) | map, symbols, controls, export |
| Hosting | [GitHub Pages](https://pages.github.com/) | serves HTML, JavaScript and CSS |
| Fire service data | [OpenStreetMap](https://www.openstreetmap.org/), prepared as [PMTiles](https://docs.protomaps.com/pmtiles/) | hydrants, water points, stations, defibrillators, municipal boundaries |
| Data delivery | [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/) with edge cache | prepared tiles for 45 countries |
| Live data | [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | changes since the data date, rest of the world |
| Search | [Nominatim](https://nominatim.org/) | find places and addresses |
| Town plan | [MapLibre GL JS](https://maplibre.org/), [Protomaps](https://protomaps.com/) base map | print-ready plan in the browser |

The web app's source code is public on GitHub: [FrnkMrz/OpenFireMapV2](https://github.com/FrnkMrz/OpenFireMapV2), under the MIT licence. A detailed architecture description for developers (in German) is in [docs/ARCHITEKTUR.md](https://github.com/FrnkMrz/OpenFireMapV2/blob/main/docs/ARCHITEKTUR.md).

## The web app in the browser {#web-app}

The app consists of JavaScript modules without a framework. [Vite](https://vite.dev/) bundles them at build time, [Leaflet](https://leafletjs.com/) draws map, symbols and circles. The start sequence:

:::steps
1. **Language:** the interface loads its texts (30 languages, German and English as fallback).
2. **Interface:** buttons, menus and dialogs are wired up. On phones a separate control layer sits on top and triggers the desktop buttons instead of duplicating logic.
3. **Map:** Leaflet starts at the area in the address bar (`#zoom/lat/lon/layer`) or at the last place viewed.
4. **Export:** the export part (PDF, PNG, GPX, CSV) loads after start-up so the map appears sooner.
:::

All fixed values such as addresses, time limits and colours live in one place, [`src/js/config.js`](https://github.com/FrnkMrz/OpenFireMapV2/blob/main/src/js/config.js). The map area is always in the address bar, so any view can be shared as a link.

## Base maps {#karten}

The base maps are raster tiles (256 × 256 pixels) that the browser fetches directly from each provider. OpenFireMap neither stores nor changes them.

| Layer | Provider |
|---|---|
| Default, light, dark | [CARTO](https://carto.com/attributions) basemaps based on OpenStreetMap |
| OpenStreetMap, OSM German | [OpenStreetMap](https://www.openstreetmap.org/) and [OpenStreetMap Germany](https://www.openstreetmap.de/) |
| Topographic | [OpenTopoMap](https://opentopomap.org/) (OSM and SRTM elevation data) |
| Satellite | [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9) |
| BayernAtlas, Bavaria aerial | [Bavarian Surveying Administration](https://geodaten.bayern.de/) (open data) |

Attributions are shown at the bottom right of the map and in every export.

## The fire service objects {#objekte}

All fire service objects come from [OpenStreetMap](https://www.openstreetmap.org/). OpenFireMap reads these tags:

| Layer | OSM tags | from zoom |
|---|---|---|
| Fire stations | `amenity=fire_station`, `building=fire_station` | 12 |
| Hydrants and fire water | `emergency=fire_hydrant`, `water_tank`, `suction_point`, `fire_water_pond`, `cistern` | 15 |
| Defibrillators | `emergency=defibrillator` | 15 |
| Municipal boundaries | `boundary=administrative` with `admin_level=8` | 14 |

The full machine-readable list of tags used is in [taginfo.json](/taginfo.json) and on [Taginfo](https://taginfo.openstreetmap.org/projects/openfiremap).

## A map area step by step {#ladeweg}

On every map move OpenFireMap waits briefly until the map is at rest, cancels any running request with an `AbortController` and then loads again.

:::diagram loading
How a map area loads: inside the pipeline area the app reads the prepared tiles, draws at once and fetches changes from Overpass. Otherwise, or if the tiles do not fit, it queries Overpass directly.
:::

:::steps
1. **Check the area:** is the view in Germany, Austria, Switzerland, Liechtenstein or Luxembourg (DACHLiLu), or in one of the 40 European countries whose file is listed in the manifest? Rough rectangles pre-filter, simplified country outlines decide.
2. **Read tiles:** a PMTiles file is one big archive of vector tiles. The browser first reads the directory and then uses **HTTP range requests** to fetch only the bytes of the 2 to 6 tiles the view needs. Tiles are built up to zoom 14 and scaled up beyond that.
3. **Draw at once:** the visible area appears as soon as its tiles arrive. A margin around it loads in the background, so small moves need no new request.
4. **Live delta:** the tiles have a data date (`osm_data_until`). For everything changed in OpenStreetMap since then, the app asks Overpass with `newer:` and replaces or adds objects by OSM type and ID.
5. **Fallback:** outside the pipeline area, on errors, or if the files do not fully cover the view, the app queries Overpass directly.
:::

This is what the live query for hydrants looks like (shortened):

```
[out:json][timeout:10][bbox:49.54,11.33,49.57,11.38];
(
  nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"]
     (newer:"2026-11-20T21:21:21Z");
  node["emergency"="defibrillator"](newer:"2026-11-20T21:21:21Z");
)->.pois;
.pois out center;
```

### Overpass servers {#overpass}

OpenFireMap knows four public Overpass servers and tries them in random order, each at most once. If one answers with 429 (too many requests), a 5xx error or not at all, the app pauses it for a few minutes and moves on. A response with an outdated data date (`timestamp_osm_base`) is discarded for the live delta, so the map never wrongly claims to be up to date.

:::note What the live delta cannot do
`newer:` finds new and changed objects but not deleted ones. A deleted hydrant only disappears with the next data date of the tiles.
:::

## The data pipeline {#pipeline}

The prepared tiles come from an automatic pipeline of the project. Its code lives in a separate, non-public repository. The flow:

:::steps
1. **Update:** the country extracts from [Geofabrik](https://download.geofabrik.de/) in `.osm.pbf` format. For DACHLiLu the pipeline does not download them again each time (several gigabytes in total); it applies only Geofabrik's daily change files with [pyosmium](https://osmcode.org/pyosmium/). If a file is missing or damaged, or no change files arrive any more, it downloads the full extract. The 40 European countries are still downloaded in full.
2. **Filter:** [Osmium](https://osmcode.org/osmium-tool/) extracts only the fire service objects and municipal boundaries.
3. **Prepare:** a Python program turns them into GeoJSON per layer, with OSM type and ID on every object (for the live delta) and the data date from the PBF header.
4. **Build tiles:** [Tippecanoe](https://github.com/felt/tippecanoe) creates vector tiles up to zoom 14 and writes them as one PMTiles file.
5. **Only finished results:** if a step fails, nothing is published and the previous data stays online.
6. **Publish:** upload to Cloudflare R2, then the description files, and finally a targeted purge of the Cloudflare cache.
:::

| Area | File |
|---|---|
| DACHLiLu | one shared file |
| 40 European countries | one file per country, with a time stamp in the name |
| Town plan base map (Germany) | separate file, built with [Planetiler](https://github.com/onthegomap/planetiler) |

How current the data is in each area is explained under [Data & freshness](../data/#aktualitaet).

### Public description files {#metadaten}

Anyone can read two files; they steer the app:

- [`metadata.json`](https://pipeline.openfiremap.org/metadata.json): data date (`osm_data_until`), build time (`generated_at`), object counts and extract ages for DACHLiLu. The app appends the build time to the tile address (`?v=…`), so after a new build nobody gets old tiles from a cache.
- [`eu/regions.json`](https://pipeline.openfiremap.org/eu/regions.json): the manifest of European countries with file name, rectangle, data date and object counts per country. The app reads it strictly: a file name must match its country exactly, otherwise the entry is ignored.

### Several countries in one view {#europa}

A view at a border needs several files. The app opens them in parallel, merges objects by OSM type and ID and draws boundary lines contained in both extracts only once. As data date it shows the oldest of the files involved. If that is too old for a live delta (more than 10 days), it skips the delta instead of sending a huge query.

:::tip Want to rebuild it or know more?
The pipeline is deliberately described only in principle here. If you want details or plan to build something similar, please write to [info@openfiremap.org](mailto:info@openfiremap.org).
:::

## Place search {#suche}

Search uses the public [Nominatim](https://nominatim.org/) service of the OpenStreetMap Foundation. OpenFireMap follows its [usage policy](https://operations.osmfoundation.org/policies/nominatim/): a request is only sent when you submit the search with Enter or the button, not while you type.

## Cache and offline {#cache}

- **Loaded data** is kept in the browser in IndexedDB. You choose how long (off, 1 hour, 1 day, 3 days, 7 days or 30 days; 7 days by default).
- **Settings** such as language and last view are kept in `localStorage`.
- **A service worker** stores only the app shell so the app starts quickly and can be installed. It deliberately does not store data or map images: an offline map would show outdated water sources as valid.

## Export and town plan {#export}

Export also runs entirely in the browser: [jsPDF](https://github.com/parallax/jsPDF) creates PDF files, and the map is drawn from the tiles onto a canvas. GPX and CSV are written by the app itself. The area is limited to **10 km per side** so the browser does not run out of memory. Below zoom 15 the export loads the hydrants itself, because the map has not loaded them there yet.

The [town plan](../town-plan/) uses [MapLibre GL JS](https://maplibre.org/) with its own vector base map in the style of [Protomaps](https://protomaps.com/), also stored as PMTiles on Cloudflare.

## Data status and status page {#status}

The "Data status & source" window in the map shows where the data in the view comes from (tiles, Overpass or cache) and how old the base data is. The [status page](/status/) reads `metadata.json` and `eu/regions.json` live and shows data date, object counts and density per inhabitant for each country (population figures from Eurostat, the World Bank and NISRA).

## Accessibility {#barrierefreiheit}

Accessibility is built into the technology, not only the design. What it means for you is on the [Accessibility](../accessibility/) page. Technically:

- **Dialogs:** one shared helper controls all windows. It moves focus inside, keeps the Tab key in the dialog, locks the rest with `inert`, closes on Escape and returns focus to the trigger.
- **Markers:** from zoom 17 symbols are tab stops with a meaningful `aria-label`. Enter opens the details and announces them through a live region.
- **Messages:** two fixed live regions, `role="alert"` only for errors and `role="status"` for everything else, so screen readers neither repeat nor miss anything.
- **Contrast:** text on the semi-transparent panels must reach 4.5:1 and symbols 3:1, on light and dark map backgrounds. Because checking tools cannot rate panels over map tiles, a dedicated test measures this.
- **Automated checks:** [axe-core](https://github.com/dequelabs/axe-core) checks map, dialogs, all languages and the help pages on every change.

## Security {#sicherheit}

Without servers and accounts there is little to attack. What remains is protected:

### In the browser {#sicherheit-browser}

- **Content Security Policy:** scripts only come from openfiremap.org itself, with no inline scripts. Connections and images are only allowed to the services listed above. A test makes sure every service in the configuration is in the policy, and only those. The help pages also allow no inline styles.
- **Permissions Policy:** camera, microphone, payments, USB and motion sensors are switched off. Only the page itself may ask for your location, and only when you press the button.
- **External data escaped:** everything from OpenStreetMap is third-party input. Names and tags are escaped before display so no injected HTML can run. The GPX export escapes XML special characters.
- **Strict checks of pipeline files:** manifest, file names and coverage are verified before the app trusts them.
- **HTTPS only:** the site and all services are encrypted. External links open with `rel="noopener"`.

### In the code and delivery {#sicherheit-code}

- **Few dependencies:** at runtime the app needs only a few libraries, with versions pinned in `package-lock.json`.
- **Automatic checks on every change:** GitHub Actions runs `npm audit` (high risks in runtime dependencies stop the build), plus linter, unit and browser tests. Only a green run is deployed.
- **Updates:** Dependabot proposes updates weekly, security updates immediately.
- **Secrets:** GitHub secret scanning with push protection keeps keys out of the repository. Each job in the workflow only has the permissions it needs.
- **Pipeline:** write access to storage exists only on the build machine, and each credential is limited to its task. The storage is read-only from outside; browser requests (CORS) are only allowed for openfiremap.org and local development.

:::note Found a security issue?
Please do not report it publicly. Write to [info@openfiremap.org](mailto:info@openfiremap.org) or use a private security advisory on GitHub. Details are in the [security policy](https://github.com/FrnkMrz/OpenFireMapV2/blob/main/SECURITY.md).
:::

## Privacy, technically {#datenschutz}

OpenFireMap sets no cookies and uses no tracking or analytics. Because the app runs in your browser, every service it contacts sees your IP address and the requested area:

| Service | When | What is sent |
|---|---|---|
| GitHub Pages | on opening | request for the app |
| Map providers | while displaying | tile coordinates of the chosen layer |
| Cloudflare | in the pipeline area | byte ranges of the PMTiles files |
| Overpass | live delta, rest of world, export | rectangle of the view |
| Nominatim | when searching, for the suggested export and town plan title | your search term or the centre of the map area |

The legal details are in the [privacy policy](/datenschutz/#en).

## Quality and delivery {#qualitaet}

- **Unit tests** with [Vitest](https://vitest.dev/) for data preparation, pipeline logic, geometry, export and the help pages.
- **Browser tests** with [Playwright](https://playwright.dev/) in Chromium: map, loading with real data, export, town plan, accessibility and contrast.
- **Translations:** a script checks that all 30 languages have every text.
- **Delivery:** every change comes in through a reviewed pull request. After merging into `main`, GitHub Actions rebuilds the site and publishes it on GitHub Pages without manual steps.

## Links and sources {#links}

- Source code: [github.com/FrnkMrz/OpenFireMapV2](https://github.com/FrnkMrz/OpenFireMapV2), bugs and wishes as an [issue](https://github.com/FrnkMrz/OpenFireMapV2/issues)
- Version history: [CHANGELOG](https://github.com/FrnkMrz/OpenFireMapV2/blob/main/CHANGELOG.md)
- Data: [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL), extracts from [Geofabrik](https://download.geofabrik.de/)
- Formats and tools: [PMTiles](https://github.com/protomaps/PMTiles), [Tippecanoe](https://github.com/felt/tippecanoe), [Osmium](https://osmcode.org/osmium-tool/), [pyosmium](https://osmcode.org/pyosmium/), [Planetiler](https://github.com/onthegomap/planetiler)
- Services: [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API), [Nominatim](https://nominatim.org/), [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/), [GitHub Pages](https://pages.github.com/)
- Libraries: [Leaflet](https://leafletjs.com/), [MapLibre GL JS](https://maplibre.org/), [jsPDF](https://github.com/parallax/jsPDF), [Vite](https://vite.dev/), [Tailwind CSS](https://tailwindcss.com/)
- Data status: [status page](/status/)
