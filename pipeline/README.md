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
                   |   (z. B. mittelfranken-latest.osm.pbf)     |
                   +---------------------+----------------------+
                                         |
                                         v
+-------------------------------------------------------------------------------+
| Proxmox Host (pve) - 192.168.178.8                                            |
|   |                                                                           |
|   +--> VM 102 (docker-lab-KW3) - 192.168.178.152                              |
|          |                                                                    |
|          +--> [Container: openfiremap-builder] (Python 3.12 + osmium-tool)    |
|          |      1. Download PBF (curl mit Retry & Resume)                     |
|          |      2. osmium tags-filter (Hydranten, Wachen, etc.)               |
|          |      3. osmium export -> GeoJSON                                   |
|          |      4. metadata.json schreiben                                    |
|          |                                                                    |
|          |      Ablage: /srv/docker/data/openfiremap/publish/                 |
|          |                                                                    |
|          +--> [Container: openfiremap-web] (Nginx Alpine, Port 8080)          |
|                 - Liefert GeoJSON & metadata.json statisch aus                |
|                 - Gzip-Kompression aktiv (8,5 MB -> ~1,5 MB Transfer)         |
|                 - Vollständige CORS-Header für Web-Clients                    |
+----------------------------------------+--------------------------------------+
                                         |
                                         v
                         +-------------------------------+
                         | OpenFireMap Web-Client        |
                         | (Desktop / Mobil / Tablet)    |
                         +-------------------------------+
```

---

### 📡 Bereitgestellte Endpunkte (Port 8080)

Alle Endpunkte unterstützen `CORS` (`Access-Control-Allow-Origin: *`) und `Gzip`:

| Endpunkt | Typ | Beschreibung | Typischer Umfang (Mittelfranken) |
|---|---|---|---|
| `/metadata.json` | JSON | Status, Build-Zeitstempel, Quell-URL, Objektstatistiken | Status-Info |
| `/openfiremap.pmtiles` | PMTiles | **Vektor-Kacheln** (Z12–Z16) als kompaktes Archiv für Range-Requests | **~1,9 MB** |
| `/hydrants.geojson` | GeoJSON | Über-/Unterflurhydranten, WSH, Wandhydranten | ~38.000 Objekte (8,5 MB) |
| `/fire_stations.geojson` | GeoJSON | Feuerwehrhäuser, Berufs-/Freiwillige Feuerwehren | ~1.200 Objekte |
| `/water_points.geojson` | GeoJSON | Zisternen, Löschwasserteiche, Saugestellen | ~760 Objekte |
| `/defibrillators.geojson` | GeoJSON | Öffentlich zugängliche AED-Geräte | ~950 Objekte |

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

| Endpoint | Type | Description | Typical Size (Middle Franconia) |
|---|---|---|---|
| `/metadata.json` | JSON | Status, build timestamp, source URL, object counts | Status info |
| `/openfiremap.pmtiles` | PMTiles | **Vector Tiles** (Z12–Z16) as a single compact archive for range requests | **~1.9 MB** |
| `/hydrants.geojson` | GeoJSON | Underground/pillar hydrants, WSH, wall hydrants | ~38,000 objects (8.5 MB) |
| `/fire_stations.geojson` | GeoJSON | Fire stations, volunteer & professional departments | ~1,200 objects |
| `/water_points.geojson` | GeoJSON | Cisterns, fire water ponds, suction points | ~760 objects |
| `/defibrillators.geojson` | GeoJSON | Publicly accessible AED devices | ~950 objects |

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

## 📄 License & Attribution

* **Software:** MIT License
* **Map Data:** © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under [ODbL](https://opendatacommons.org/licenses/odbl/).
* **Extracts:** Provided by [Geofabrik GmbH](https://download.geofabrik.de/).
