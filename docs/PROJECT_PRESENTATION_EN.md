# OpenFireMapV2 – Project presentation

OpenFireMap is a worldwide, interactive map for fire-service-related OpenStreetMap data. It is intended for OSM contributors, fire departments, mapping enthusiasts and anyone who wants to inspect fire stations, hydrants, water supply points or AEDs.

Live map: **[https://openfiremap.org](https://openfiremap.org)**  
Source code: **[github.com/FrnkMrz/OpenFireMapV2](https://github.com/FrnkMrz/OpenFireMapV2)**

## From a hydrant map to a modern web map

The first hydrant map was created in September 2010. The project was shaped by OSM contributors, a mapping party in Zurich and discussions at the Nuremberg OSM meetup. Since January 2012, `OpenFireMap.org` has pointed to the continued map. OpenFireMap was presented in the context of digital fire-service maps around the FOSSGIS conference in 2017.

In 2025/2026, OpenFireMapV2 rebuilt the application on a modern client-side architecture. In 2026, a pre-built PMTiles and Cloudflare R2 pipeline was added.

## The challenge of large Overpass queries

Overpass makes targeted OSM queries available worldwide. Large areas and many concurrent requests can, however, create waiting times or additional load on public Overpass infrastructure. For a well-defined region with recurring requests, pre-built data can be served more efficiently.

## The technical approach

For Germany, Austria, Switzerland, Luxembourg and Liechtenstein (DACHLiLu), relevant OSM objects are prepared as PMTiles vector tiles. Cloudflare R2 serves the roughly 514 MB PMTiles archive. The browser uses HTTP Range Requests to fetch only the byte ranges needed for visible tiles.

This pipeline is an acceleration layer, not a geographic expansion. OpenFireMap was worldwide from the beginning. Outside DACHLiLu, and whenever pipeline data is missing, stale or unavailable, the application falls back to Overpass.

```text
Browser → PMTiles / Cloudflare R2 → Overpass fallback
```

Metadata-based cache busting and stale-coverage detection keep an old PMTiles version from being treated as current indefinitely.

## Current facts and features

- version **v0.7.2**
- approximately **1.25 million** fire-service-related objects in the DACHLiLu pipeline
- PMTiles archive of approximately **514 MB**
- Cloudflare R2 as the primary public pipeline source
- 99 successful Vitest tests and a Playwright performance test
- PNG, PDF, GPX and CSV exports
- more than 30 languages
- IndexedDB caching and responsive desktop/mobile use
- local VM 102 used as the pipeline test and backup environment

## Value for OSM and fire departments

OSM contributors get a practical view that can make missing or inconsistent entries easier to spot. Fire departments and interested organizations can inspect open data in a responsive map and export areas for further work.

OpenFireMap is not an official dispatch or operational map. OSM data can be incomplete or outdated and should be checked against trusted local sources before operational use.

## Data and licensing

The map data comes from [OpenStreetMap](https://www.openstreetmap.org/) and is available under the [ODbL](https://www.openstreetmap.org/copyright). OpenFireMapV2 software is released under the [MIT license](../LICENSE). Pipeline builds use regional [Geofabrik extracts](https://download.geofabrik.de/); search and live queries use Nominatim and Overpass under their respective usage policies.

Feedback, corrections and code contributions are welcome in the [GitHub repository](https://github.com/FrnkMrz/OpenFireMapV2). Data errors should be corrected directly in OpenStreetMap.
