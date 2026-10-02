# AGENTS.md

Guidance for AI agents (Codex, Claude Code, Antigravity) working on the OpenFireMap DACH Data Pipeline.

## Project Overview

This repository builds and serves optimized static GeoJSON datasets of fire-service-related OSM objects (hydrants, fire stations, water supply points, defibrillators) for OpenFireMap.

## Tech Stack & Architecture

- **Docker Compose**: Multi-container setup (`builder` + `web`)
- **Nginx (Alpine)**: Static web server on port 8080 with CORS and gzip enabled
- **Python 3.12 + osmium-tool (C++)**: Fast OSM PBF filtering and GeoJSON export
- **Geofabrik**: Source for OSM PBF extracts
- **Target environment**: Proxmox VM 102 (`docker-lab-KW3`), Debian 13, 2 vCPU, 8 GB RAM (7.7 GiB usable); the builder container uses a 2 GB `/dev/shm` RAM disk (`shm_size`)

## Key Principles & Constraints

1. **No heavy databases**: Do NOT introduce PostGIS or a full Overpass API instance. The 8 GB RAM of VM 102 (shared with the web container and the OS page cache for the PBF extracts) must be respected.
2. **Static-First**: The web container only serves pre-built static GeoJSON and metadata JSON files.
3. **High Performance**: Use `osmium-tool` for filtering and geometry generation.
4. **CORS & Compression**: The Nginx endpoints on VM 102 allow cross-origin requests (`Access-Control-Allow-Origin: *`) and use gzip (not for PMTiles, to keep HTTP 206 range responses intact). The public R2 bucket behind `pipeline.openfiremap.org` only allows `https://openfiremap.org` and `http://localhost:5173`.
5. **No Breaking Changes**: Output formats must strictly follow GeoJSON RFC 7946 specifications.
6. **Logging Limits**: Keep Docker container logging capped at 3 files of 10 MB each.

## Common Operations

```bash
# Build data locally / on server
docker compose run --rm builder

# Run web server
docker compose up -d web

# Check metadata output
curl -s http://localhost:8080/metadata.json | jq .
```
