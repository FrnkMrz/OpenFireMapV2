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

#### Setup auf dem Zielserver
Da `setup-vm102.sh` die Konfigurations- und Builder-Dateien direkt aus dem Repository bezieht, wird das Setup im geklonten Repository auf VM 102 ausgeführt:

```bash
# Auf VM 102 (einmalig klonen oder aktualisieren):
git clone https://github.com/FrnkMrz/OpenFireMapV2.git
cd OpenFireMapV2
bash pipeline/setup-vm102.sh
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

# Standard-Datenbuild (DACHLiLu: DE, AT, CH, LU, LI mit Filter-then-Merge)
cd /srv/docker/projects/openfiremap-pipeline
docker compose run --rm builder

# Einzel-Region verarbeiten (z. B. nur Bayern zum schnellen Testen)
OSM_EXTRACT_URL="https://download.geofabrik.de/europe/germany/bayern-latest.osm.pbf" docker compose run --rm builder

# Re-Download erzwingen (ignoriert intelligenten HEAD-Check)
FORCE_DOWNLOAD=true docker compose run --rm builder

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

### 🧪 Verifikation & Simulation der Abdeckung

Zur Qualitätssicherung stehen zwei komplementäre Werkzeuge zur Verfügung:

1. **`pipeline/tools/verify_coverage_js.mjs` (Simulation mit echtem JS-Code):**
   * **Aufruf:** `node pipeline/tools/verify_coverage_js.mjs [--samples 4000] [--seed 42] [--out <datei.json>]`
   * **Abhängigkeiten:** Node.js v20+ (importiert nativ `src/js/pipeline.js`).
   * **Funktion:** Simuliert 40.000 Viewports (Desktop 1440×800, Mobil 390×750; Zoom 12–16), misst die Ausführungszeit pro Call und speichert alle durch `isPipelineEligible` positiv bewerteten Viewports in einer JSON-Datei.

2. **`pipeline/tools/verify_coverage.py` (Geometrische Validierung):**
   * **Aufruf (JS-Validierung):** `python3 pipeline/tools/verify_coverage.py --from-js pipeline/tools/js_approved_viewports.json`
   * **Aufruf (Python-Simulation Alt vs. Neu):** `python3 pipeline/tools/verify_coverage.py [--samples 4000] [--seed 42]`
   * **Abhängigkeiten:** Python 3 mit `shapely`, `pyproj`, `requests`.
   * **Funktion:** Berechnet per Shapely & PyProj in `EPSG:25832` den exakten Flächenüberhang zur amtlichen Landesgrenze (OSM `R2145268`). Abnahmekriterium: 0 Viewports mit > 0,1 % Fläche außerhalb Bayerns.

3. **`pipeline/tools/test_builder.py` (Unit-Tests für Feature-Builder):**
   * **Aufruf:** `python3 pipeline/tools/test_builder.py`
   * **Funktion:** Prüft Layer-Konfigurationen, DACHLiLu-Länderdefinitionen, Modus-Erkennung (Single vs. Multi) und temporäre Arbeitsverzeichnisse.

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

#### Setup on the Target Server
Since `setup-vm102.sh` copies configuration and builder files directly from the repository, run the setup inside the cloned repository on VM 102:

```bash
# On VM 102 (clone once or pull updates):
git clone https://github.com/FrnkMrz/OpenFireMapV2.git
cd OpenFireMapV2
bash pipeline/setup-vm102.sh
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

# Default data build (DACHLiLu: DE, AT, CH, LU, LI via Filter-then-Merge)
cd /srv/docker/projects/openfiremap-pipeline
docker compose run --rm builder

# Process single extract (e.g. Bavaria only for quick testing)
OSM_EXTRACT_URL="https://download.geofabrik.de/europe/germany/bayern-latest.osm.pbf" docker compose run --rm builder

# Force re-download (bypasses smart HEAD If-Modified-Since check)
FORCE_DOWNLOAD=true docker compose run --rm builder

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

### 🧪 Coverage Verification & Simulation

Two tools ensure zero false-positive viewports outside Bavaria:

1. **`pipeline/tools/verify_coverage_js.mjs` (Native JS Simulation):**
   * **Run:** `node pipeline/tools/verify_coverage_js.mjs [--samples 4000] [--seed 42] [--out <file.json>]`
   * **Dependencies:** Node.js v20+ (imports `src/js/pipeline.js`).
   * **Purpose:** Runs 40,000 viewport checks through `isPipelineEligible`, benchmarks latency (< 1 ms), and exports approved viewports to JSON.

2. **`pipeline/tools/verify_coverage.py` (Geometric Validation):**
   * **Run (validate JS results):** `python3 pipeline/tools/verify_coverage.py --from-js pipeline/tools/js_approved_viewports.json`
   * **Run (Python simulation old vs new):** `python3 pipeline/tools/verify_coverage.py [--samples 4000] [--seed 42]`
   * **Dependencies:** Python 3 with `shapely`, `pyproj`, `requests`.
   * **Purpose:** Computes geometric overlap with OSM relation `R2145268` in EPSG:25832. Acceptance criterion: 0 viewports with > 0.1% area outside Bavaria.

3. **`pipeline/tools/test_builder.py` (Unit Tests for Feature Builder):**
   * **Run:** `python3 pipeline/tools/test_builder.py`
   * **Purpose:** Validates layer configs, DACHLiLu country extract definitions, target mode resolution, and temporary workspace handling.

---

## 📄 License & Attribution

* **Software:** MIT License
* **Map Data:** © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under [ODbL](https://opendatacommons.org/licenses/odbl/).
* **Extracts:** Provided by [Geofabrik GmbH](https://download.geofabrik.de/).
