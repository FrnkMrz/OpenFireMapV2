# AGENTS.md

Guidance for AI agents (Codex, Claude Code, Antigravity) working on the OpenFireMap DACH Data Pipeline.

## Project Overview

This repository builds and serves optimized static GeoJSON datasets of fire-service-related OSM objects (hydrants, fire stations, water supply points, defibrillators) for OpenFireMap.

## Tech Stack & Architecture

- **Docker Compose**: Multi-container setup (`builder` + `web`)
- **Nginx (Alpine)**: Static web server on port 8080 with CORS and gzip enabled
- **Python 3.12 + osmium-tool (C++)**: Fast OSM PBF filtering and GeoJSON export
- **Geofabrik**: Source for OSM PBF extracts
- **Target environment**: Proxmox VM 102 (`docker-lab-KW3`), Debian 13, 2 vCPU, 4 GiB RAM

## Key Principles & Constraints

1. **No heavy databases**: Do NOT introduce PostGIS or a full Overpass API instance. The 4 GiB RAM limit of VM 102 must be respected.
2. **Static-First**: The web container only serves pre-built static GeoJSON and metadata JSON files.
3. **High Performance**: Use `osmium-tool` for filtering and geometry generation.
4. **CORS & Compression**: All endpoints must allow cross-origin requests (`Access-Control-Allow-Origin: *`) and have gzip enabled.
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
