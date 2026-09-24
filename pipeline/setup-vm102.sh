#!/usr/bin/env bash
# ==============================================================================
# OpenFireMap DACH Data Pipeline - 1-Klick Setup für VM 102 (docker-lab-KW3)
# ==============================================================================
# Dieses Skript kann entweder direkt auf VM 102 ausgeführt werden ODER vom Mac aus:
#   ssh frank@192.168.178.152 'bash -s' < pipeline/setup-vm102.sh
# ==============================================================================

set -euo pipefail

PROJECT_DIR="/srv/docker/projects/openfiremap-pipeline"
DATA_DIR="/srv/docker/data/openfiremap"

echo "================================================================="
echo "🚀 Starte OpenFireMap Pipeline Setup auf $(hostname) ($USER)"
echo "================================================================="

# 1. Verzeichnisstruktur anlegen
echo "📁 [1/5] Erstelle Verzeichnisse unter /srv/docker/..."
sudo mkdir -p "${PROJECT_DIR}/nginx"
sudo mkdir -p "${PROJECT_DIR}/builder"
sudo mkdir -p "${DATA_DIR}/raw"
sudo mkdir -p "${DATA_DIR}/publish"

# Berechtigungen für frank setzen
sudo chown -R "$USER":"$USER" "$PROJECT_DIR" "$DATA_DIR"

# 2. Dateien schreiben
echo "📝 [2/5] Schreibe Projekt- und Konfigurationsdateien..."

# Nginx Konfiguration
cat << 'EOF' > "${PROJECT_DIR}/nginx/default.conf"
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html metadata.json;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types application/json application/geo+json text/plain application/javascript text/css;
    gzip_min_length 256;

    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
    add_header Access-Control-Allow-Headers "*" always;
    add_header Access-Control-Expose-Headers "Content-Range, Content-Length, Accept-Ranges" always;

    types {
        application/vnd.pmtiles pmtiles;
    }

    location / {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
            add_header Access-Control-Allow-Headers "*" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        autoindex on;
        autoindex_exact_size off;
        autoindex_localtime on;

        add_header Cache-Control "public, max-age=3600, must-revalidate";
        try_files $uri $uri/ =404;
    }

    location /healthz {
        access_log off;
        return 200 "healthy\n";
    }
}
EOF

# Builder Dockerfile
cat << 'EOF' > "${PROJECT_DIR}/builder/Dockerfile"
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    osmium-tool \
    tippecanoe \
    curl \
    ca-certificates \
    jq \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN pip install --no-cache-dir requests

COPY build_features.py /app/build_features.py
RUN chmod +x /app/build_features.py

ENTRYPOINT ["python", "/app/build_features.py"]
EOF

# Builder Python-Skript
cat << 'EOF' > "${PROJECT_DIR}/builder/build_features.py"
#!/usr/bin/env python3
import os
import sys
import time
import json
import shutil
import subprocess
from datetime import datetime, timezone
import requests

RAW_DIR = os.getenv("DATA_RAW_DIR", "/data/raw")
PUBLISH_DIR = os.getenv("DATA_PUBLISH_DIR", "/data/publish")
TMP_DIR = os.path.join(RAW_DIR, "tmp")

EXTRACT_URL = os.getenv(
    "OSM_EXTRACT_URL",
    "https://download.geofabrik.de/europe/germany/bayern/mittelfranken-latest.osm.pbf"
)
FORCE_DOWNLOAD = os.getenv("FORCE_DOWNLOAD", "false").lower() in ("true", "1", "yes")

FEATURE_CONFIGS = [
    {
        "name": "hydrants",
        "filter": ["nwr/emergency=fire_hydrant"],
        "geom_types": ["point"],
        "output": "hydrants.geojson",
        "description": "Hydranten (Über-/Unterflur, WSH, etc.)"
    },
    {
        "name": "fire_stations",
        "filter": ["nwr/amenity=fire_station", "nwr/building=fire_station"],
        "geom_types": ["point", "polygon"],
        "output": "fire_stations.geojson",
        "description": "Feuerwachen und Gerätehäuser"
    },
    {
        "name": "water_points",
        "filter": ["nwr/emergency=water_tank,suction_point,fire_water_pond,cistern"],
        "geom_types": ["point", "polygon"],
        "output": "water_points.geojson",
        "description": "Löschwasserentnahmestellen und Zisternen"
    },
    {
        "name": "defibrillators",
        "filter": ["n/emergency=defibrillator"],
        "geom_types": ["point"],
        "output": "defibrillators.geojson",
        "description": "Defibrillatoren (AED)"
    }
]

def log(msg):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] {msg}", flush=True)

def ensure_dirs():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(PUBLISH_DIR, exist_ok=True)
    os.makedirs(TMP_DIR, exist_ok=True)

def download_extract(url, target_path):
    log(f"Prüfe OSM-Auszug: {target_path}")
    if os.path.exists(target_path) and not FORCE_DOWNLOAD:
        file_size_mb = os.path.getsize(target_path) / (1024 * 1024)
        log(f"Auszug bereits vorhanden ({file_size_mb:.1f} MB). Überspringe Download.")
        return target_path

    log(f"Starte Download mit curl: {url}")
    tmp_download = target_path + ".download"
    start_time = time.time()

    curl_cmd = [
        "curl", "-f", "-L", "-C", "-",
        "--retry", "5",
        "--retry-delay", "3",
        "--connect-timeout", "30",
        "--max-time", "600",
        "-o", tmp_download,
        url
    ]
    run_cmd(curl_cmd)

    shutil.move(tmp_download, target_path)
    duration = time.time() - start_time
    total_mb = os.path.getsize(target_path) / (1024 * 1024)
    log(f"Download abgeschlossen: {total_mb:.1f} MB in {duration:.1f}s.")
    return target_path

def run_cmd(cmd):
    log(f"Ausführen: {' '.join(cmd)}")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        log(f"FEHLER: {res.stderr}")
        raise RuntimeError(f"Befehl fehlgeschlagen: {' '.join(cmd)}\n{res.stderr}")
    return res.stdout

def count_geojson_features(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return len(data.get("features", []))
    except Exception as e:
        log(f"Warnung beim Zählen: {e}")
        return -1

def process_features(input_pbf):
    stats = {}
    total_start = time.time()

    for item in FEATURE_CONFIGS:
        name = item["name"]
        filter_args = item["filter"]
        output_file = os.path.join(PUBLISH_DIR, item["output"])
        tmp_pbf = os.path.join(TMP_DIR, f"{name}.pbf")

        log(f"--- Verarbeite {item['description']} ({name}) ---")
        t0 = time.time()

        run_cmd(["osmium", "tags-filter", input_pbf, *filter_args, "-o", tmp_pbf, "--overwrite"])

        export_cmd = ["osmium", "export", tmp_pbf, "-o", output_file, "--overwrite"]
        if item.get("geom_types"):
            export_cmd.extend(["--geometry-types", ",".join(item["geom_types"])])
        run_cmd(export_cmd)

        count = count_geojson_features(output_file)
        file_size_kb = os.path.getsize(output_file) / 1024
        duration = time.time() - t0

        log(f"Erfolgreich: {count} Objekte exportiert ({file_size_kb:.1f} KB in {duration:.1f}s)")

        stats[name] = {
            "count": count,
            "file": item["output"],
            "size_bytes": os.path.getsize(output_file),
            "size_kb": round(file_size_kb, 1),
            "duration_sec": round(duration, 2),
            "description": item["description"]
        }

        if os.path.exists(tmp_pbf):
            os.remove(tmp_pbf)

    metadata = {
        "status": "ok",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_extract": os.path.basename(EXTRACT_URL),
        "source_url": EXTRACT_URL,
        "total_duration_sec": round(time.time() - total_start, 2),
        "features": stats
    }

    meta_file = os.path.join(PUBLISH_DIR, "metadata.json")
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    log(f"Metadata geschrieben: {meta_file}")
    log("=== Alle Datensätze erfolgreich erstellt! ===")
    return metadata

def main():
    ensure_dirs()
    filename = os.path.basename(EXTRACT_URL)
    local_pbf = os.path.join(RAW_DIR, filename)

    try:
        download_extract(EXTRACT_URL, local_pbf)
        metadata = process_features(local_pbf)
        print("\n" + "=" * 50)
        print(" Zusammenfassung der extrahierten Daten:")
        print("=" * 50)
        for k, v in metadata["features"].items():
            print(f" * {v['description']}: {v['count']} Objekte ({v['size_kb']} KB)")
        print("=" * 50 + "\n")
    except Exception as e:
        log(f"ABBRUCH MIT FEHLER: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF

# Docker Compose Datei
cat << 'EOF' > "${PROJECT_DIR}/docker-compose.yml"
services:
  web:
    image: nginx:alpine
    container_name: openfiremap-web
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - /srv/docker/data/openfiremap/publish:/usr/share/nginx/html:ro
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://localhost/healthz || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3

  builder:
    build:
      context: ./builder
      dockerfile: Dockerfile
    container_name: openfiremap-builder
    volumes:
      - /srv/docker/data/openfiremap/raw:/data/raw
      - /srv/docker/data/openfiremap/publish:/data/publish
    environment:
      - OSM_EXTRACT_URL=${OSM_EXTRACT_URL:-https://download.geofabrik.de/europe/germany/bayern/mittelfranken-latest.osm.pbf}
      - FORCE_DOWNLOAD=${FORCE_DOWNLOAD:-false}
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
EOF

# 3. Docker Image bauen
echo "🔨 [3/5] Baue Builder-Image..."
cd "$PROJECT_DIR"
docker compose build builder

# 4. Ersten Daten-Build ausführen
echo "⚡ [4/5] Führe Datenextraktion aus (Mittelfranken-Auszug)..."
docker compose run --rm builder

# 5. Web-Server starten
echo "🌐 [5/5] Starte Nginx Webserver..."
docker compose up -d web

echo ""
echo "================================================================="
echo "✅ OpenFireMap Pipeline erfolgreich eingerichtet & gestartet!"
echo "================================================================="
echo "Test-URLs im Heimnetz:"
echo " * Status & Metadaten: http://192.168.178.152:8080/metadata.json"
echo " * Hydranten GeoJSON: http://192.168.178.152:8080/hydrants.geojson"
echo " * Feuerwachen:       http://192.168.178.152:8080/fire_stations.geojson"
echo " * Löschwasserstellen:http://192.168.178.152:8080/water_points.geojson"
echo " * Defibrillatoren:   http://192.168.178.152:8080/defibrillators.geojson"
echo "================================================================="
