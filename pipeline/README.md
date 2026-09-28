# OpenFireMap DACH Data Pipeline

## 🇩🇪 Deutsch

Automatische Datenpipeline und Bereitstellung von feuerwehrrelevanten Geodaten (Hydranten, Feuerwachen, Löschwasserentnahmestellen, Defibrillatoren) auf Basis von OpenStreetMap (OSM) für **OpenFireMap**.

---

### 📌 Überblick

Dieses Projekt stellt eine eigene, performante und ausfallsichere Datenquelle für OpenFireMap im DACH-Raum bereit:
- **Keine Abhängigkeit von öffentlichen Overpass-Servern** für das eigene Einsatz- und Testgebiet.
- **Blitzschnelle GeoJSON-Auslieferung** über Nginx mit CORS und Gzip-Kompression.
- **Ressourcenschonend**: Läuft stabil auf kleiner Hardware (2 vCPU, 4 GiB RAM) ohne schwere Datenbanken (PostGIS/Overpass-DB).
- **C++ Performance**: Filterung von Millionen OSM-Objekten in Sekunden mittels `osmium-tool`.
- **Vollautomatisch**: Tägliche/wöchentliche Aktualisierung per Cronjob.

📘 **Ausführliche Erklärung & Schulung:** Lies unseren [Docker-Leitfaden & Architektur-Guide](docs/DOCKER_LEITFADEN.md) für eine detaillierte Erklärung aller Konzepte (Container, Volumes, Port-Mapping und Portabilität).

---

### 🏗️ Architektur

```
                   +--------------------------------------------+
                   |            Geofabrik Download              |
                   |      (z. B. bayern-latest.osm.pbf)         |
                   +---------------------+----------------------+
                                         |
                                         v
+-------------------------------------------------------------------------------+
| Proxmox Host (pve) - 192.168.178.8                                            |
|   |                                                                           |
|   +--> VM 102 (docker-lab-KW3) - 192.168.178.152                              |
|          |                                                                    |
|          +--> [Container: openfiremap-builder] (Python 3.12 + osmium + tippecanoe)
|          |      1. Download PBF (curl mit Retry & Resume)                     |
|          |      2. osmium tags-filter (Hydranten, Wachen, Defis, Grenzen)     |
|          |      3. tippecanoe: Vektorkacheln (Z12–Z16) -> openfiremap.pmtiles |
|          |      4. osmium export -> GeoJSON-Dateien                           |
|          |      5. Differenzanalyse & metadata.json schreiben                 |
|          |                                                                    |
|          |      Ablage: /srv/docker/data/openfiremap/publish/                 |
|          |                                                                    |
|          +--> [Container: openfiremap-web] (Nginx Alpine, interner Port 80)   |
|          |      - Liefert PMTiles (HTTP 206 Range Requests, gzip off)         |
|          |      - Liefert GeoJSON & metadata.json statisch aus (gzip on)      |
|          |      - Vollständige CORS-Header für Web-Clients                    |
|          |                                                                    |
|          +--> [Container: openfiremap-tunnel] (Cloudflare cloudflared)        |
|                 - Verschlüsselter Outbound-Tunnel (QUIC / UDP 443)            |
|                 - Verbindet VM 102 direkt mit Cloudflare Edge in Frankfurt    |
|                 - Keine Router-Ports / Portweiterleitungen an der FRITZ!Box   |
+----------------------------------------+--------------------------------------+
                                         | Outbound TLS (QUIC)
                                         v
                      +--------------------------------------+
                      | Cloudflare Zero Trust Edge           |
                      | https://pipeline.openfiremap.org     |
                      | (TLS 1.3 Let's Encrypt Wildcard)     |
                      +------------------+-------------------+
                                         |
                                         v
                      +--------------------------------------+
                      | OpenFireMap Web-Client (HTTPS)       |
                      | https://openfiremap.org              |
                      +------------------+-------------------+
```

---

### 📡 Bereitgestellte Endpunkte

* **Öffentlich (HTTPS):** `https://pipeline.openfiremap.org`
* **Lokal im LAN (HTTP):** `http://192.168.178.152:8080`

Alle Endpunkte unterstützen `CORS` (`Access-Control-Allow-Origin: *`) und HTTP Byte-Range-Requests:

| Endpunkt | Typ | Beschreibung | Typischer Umfang (Freistaat Bayern) |
|---|---|---|---|
| `/metadata.json` | JSON | Status, Build-Zeitstempel, Quell-URL, Objektstatistiken | Status-Info |
| `/openfiremap.pmtiles` | PMTiles | **Vektor-Kacheln** (Z12–Z16, inkl. 12.493 Grenzen & aller Objekte) | **~88,6 MB** |
| `/hydrants.geojson` | GeoJSON | Über-/Unterflurhydranten, WSH, Wandhydranten | ~233.534 Objekte (~65 MB) |
| `/fire_stations.geojson` | GeoJSON | Feuerwehrhäuser, Berufs-/Freiwillige Feuerwehren | ~8.802 Objekte |
| `/water_points.geojson` | GeoJSON | Zisternen, Löschwasserteiche, Saugestellen | ~6.180 Objekte |
| `/defibrillators.geojson` | GeoJSON | Öffentlich zugängliche AED-Geräte | ~5.785 Objekte |
| `/boundaries.geojson` | GeoJSON | Gemeindegrenzen zur Einsatzgebiets-Erkennung | ~12.493 Polygone |

---

### 🚀 Schnellstart & Installation

#### Voraussetzungen
* Ein Linux-Server oder VM mit Docker & Docker Compose (z. B. Debian 13 auf Proxmox).
* SSH-Zugang zum Server.

#### 1-Klick-Setup auf dem Zielserver
Vom Mac/PC aus kann die gesamte Pipeline mit einem einzigen Befehl eingerichtet, gebaut und gestartet werden:

```bash
ssh frank@192.168.178.152 'bash -s' < setup-vm102.sh
```

---

### ⏰ Automatische Updates (Cronjob)

Um die Daten jede Nacht um **03:30 Uhr** automatisch zu aktualisieren:

```bash
( crontab -l 2>/dev/null | grep -v "update.sh" || true; echo "30 3 * * * /srv/docker/projects/openfiremap-pipeline/update.sh" ) | crontab -
```

---

### 🛠️ Verwaltung & Betrieb

```bash
# Status prüfen
docker ps
curl http://localhost:8080/metadata.json

# Manueller Datenbuild
cd /srv/docker/projects/openfiremap-pipeline
docker compose run --rm builder

# Andere Region verarbeiten (z. B. ganz Bayern)
OSM_EXTRACT_URL="https://download.geofabrik.de/europe/germany/bayern-latest.osm.pbf" docker compose run --rm builder

# Webserver-Logs ansehen
docker logs -f openfiremap-web
```

---

### 🗺️ Abdeckungspolygon erzeugen (Coverage Polygon)

Damit OpenFireMap im Frontend entscheiden kann, ob ein Viewport vollständig innerhalb der Pipeline-Abdeckung liegt oder über Overpass angefragt werden muss, wird ein nach innen gepuffertes Abdeckungspolygon genutzt (`src/js/coverage/bayern.js`):

```bash
# Voraussetzungen: Python 3 mit shapely, pyproj, requests
pip install shapely pyproj requests

# Bayern-Polygon neu generieren:
python3 pipeline/tools/build_coverage_polygon.py
```

Das Skript:
1. Lädt die offizielle Landesgrenze von Bayern (OSM-Relation `R2145268`) via Nominatim.
2. Projiziert nach `EPSG:25832` (UTM 32N), puffert **500 m nach innen** (`buffer(-500)`), vereinfacht mit **250 m Toleranz** (`simplify(250)`).
3. Transformiert zurück nach WGS84, rundet auf 4 Nachkommastellen (`[lat, lon]`).
4. Verifiziert strikt per Shapely (`within`), dass das vereinfachte Polygon zu 100 % innerhalb der realen Landesgrenze liegt.
5. Exportiert das ES-Modul `src/js/coverage/bayern.js` (ca. 1.296 Punkte, ca. 1.129 km² verlorene Randfläche, die an Overpass übergeben wird).

---

## 🇬🇧 English

Automated data pipeline and serving infrastructure for fire-service-related geodata (hydrants, fire stations, water supply points, defibrillators) based on OpenStreetMap (OSM) for **OpenFireMap**.

---

### 📌 Overview

This project provides an independent, fast, and resilient data source for OpenFireMap in the DACH region:
- **Zero reliance on public Overpass servers** for your local area.
- **Lightning-fast GeoJSON serving** via Nginx with CORS and Gzip compression.
- **Resource-efficient**: Runs reliably on small hardware (2 vCPUs, 4 GiB RAM) without heavy databases (no PostGIS or Overpass DB required).
- **C++ Performance**: Filters millions of OSM objects in seconds using `osmium-tool`.
- **Fully automated**: Daily/weekly updates via cron job.

📘 **Detailed Architecture & Docker Guide:** Check out our [Docker & Architecture Guide (German)](docs/DOCKER_LEITFADEN.md) for an in-depth educational walkthrough of containers, volumes, port mapping, and portability.

---

### 📡 Provided Endpoints (Port 8080)

All endpoints support `CORS` (`Access-Control-Allow-Origin: *`) and `Gzip`:

| Endpoint | Type | Description | Typical Size (Bavaria) |
|---|---|---|---|
| `/metadata.json` | JSON | Status, build timestamp, source URL, object counts | Status info |
| `/openfiremap.pmtiles` | PMTiles | **Vector Tiles** (Z12–Z16) as a single compact archive for range requests | **~88.6 MB** |
| `/hydrants.geojson` | GeoJSON | Underground/pillar hydrants, WSH, wall hydrants | ~233,534 objects (~65 MB) |
| `/fire_stations.geojson` | GeoJSON | Fire stations, volunteer & professional departments | ~8,802 objects |
| `/water_points.geojson` | GeoJSON | Cisterns, fire water ponds, suction points | ~6,180 objects |
| `/defibrillators.geojson` | GeoJSON | Publicly accessible AED devices | ~5,785 objects |
| `/boundaries.geojson` | GeoJSON | Municipal boundaries for operational areas | ~12,493 polygons |

---

### 🚀 Quickstart & Installation

#### Prerequisites
* Linux server or VM with Docker & Docker Compose (e.g. Debian 13 on Proxmox).
* SSH access to the server.

#### 1-Click Setup on the Target Server
Run this single command from your Mac/PC to provision, build, and launch the pipeline:

```bash
ssh frank@192.168.178.152 'bash -s' < setup-vm102.sh
```

---

### ⏰ Automated Updates (Cron Job)

To automatically update data every night at **03:30 AM**:

```bash
( crontab -l 2>/dev/null | grep -v "update.sh" || true; echo "30 3 * * * /srv/docker/projects/openfiremap-pipeline/update.sh" ) | crontab -
```

---

### 🛠️ Operations & Management

```bash
# Check status
docker ps
curl http://localhost:8080/metadata.json

# Trigger manual data build
cd /srv/docker/projects/openfiremap-pipeline
docker compose run --rm builder

# Process a different region (e.g. all of Bavaria)
OSM_EXTRACT_URL="https://download.geofabrik.de/europe/germany/bayern-latest.osm.pbf" docker compose run --rm builder

# View web server logs
docker logs -f openfiremap-web
```

---

### 🗺️ Generating the Coverage Polygon

To determine client-side whether a map viewport lies completely inside the pipeline extract or should fall back to Overpass, an inwardly buffered coverage polygon is generated (`src/js/coverage/bayern.js`):

```bash
# Requirements: Python 3 with shapely, pyproj, requests
pip install shapely pyproj requests

# Regenerate Bavaria coverage polygon:
python3 pipeline/tools/build_coverage_polygon.py
```

The script fetches the administrative boundary (OSM relation `R2145268`), projects to UTM 32N (`EPSG:25832`), buffers inward by 500 m (`buffer(-500)`), simplifies with a 250 m tolerance (`simplify(250)`), checks strict containment (`within`), and outputs the coordinates into `src/js/coverage/bayern.js`.

---

## 📄 License & Attribution

* **Software:** MIT License
* **Map Data:** © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under [ODbL](https://opendatacommons.org/licenses/odbl/).
* **Extracts:** Provided by [Geofabrik GmbH](https://download.geofabrik.de/).
